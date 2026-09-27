'use strict';

const { Interview, Turn, Report, Progress } = require('./models');
const { LLMService, QUESTION_BANK } = require('./services/llm');
const { RAGService } = require('./services/rag');
const { STSService } = require('./services/sts');
const { xpForScore, awardXp, refreshLeague } = require('./services/progress');

let llm;
let rag;
let sts;

// Lazily constructed singletons (single-process server; avoids paying model
// load costs at import time so tests boot fast).
function services() {
  if (!llm) {
    llm = new LLMService();
    rag = new RAGService();
    sts = new STSService();
  }
  return { llm, rag, sts };
}

const DIFFICULTIES = ['easy', 'standard', 'hard'];

async function createInterview({ userId, role, resumeText, jdText, difficulty }) {
  const { llm: llmService, sts: stsService } = services();
  const interview = await Interview.create({
    user: userId,
    role: String(role || 'General').slice(0, 120),
    resume_text: String(resumeText || '').slice(0, 60000),
    jd_text: String(jdText || '').slice(0, 60000),
    difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : 'standard',
  });

  const q = await llmService.firstQuestion({
    role: interview.role,
    resumeText: interview.resume_text,
    jdText: interview.jd_text,
  });
  interview.started_question = q.question;
  await interview.save();

  const audio = await stsService.synthesizeText(q.question);
  return {
    interview_id: String(interview._id),
    role: interview.role,
    first_question: q.question,
    engine: q.engine,
    sts_model: audio.model,
    sts_latency_ms: audio.latency_ms,
    sts_audio_base64: audio.audio.toString('base64'),
  };
}

async function findOwnedInterview(interviewId, userId) {
  if (!interviewId || !/^[0-9a-fA-F]{24}$/.test(String(interviewId))) return null;
  return Interview.findOne({ _id: interviewId, user: userId });
}

// Paginated history of one user's interviews, newest first, with a per-interview
// summary (answered turns, average answer score, and the report score if one has
// been generated). Turn stats are computed from a small projection of just this
// page's turns (page size is capped at 50) rather than a Mongo aggregation, so the
// result is the same on any Mongo-compatible server.
async function listInterviews({ userId, page = 1, limit = 20 }) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);

  const [total, interviews] = await Promise.all([
    Interview.countDocuments({ user: userId }),
    Interview.find({ user: userId })
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  const ids = interviews.map((i) => i._id);
  const [turns, reports] = ids.length
    ? await Promise.all([
        Turn.find({ interview: { $in: ids } }).select('interview score').lean(),
        Report.find({ interview: { $in: ids } }).select('interview overall_score').lean(),
      ])
    : [[], []];

  const turnStats = new Map();
  for (const t of turns) {
    const key = String(t.interview);
    const s = turnStats.get(key) || { count: 0, sum: 0 };
    s.count += 1;
    s.sum += t.score || 0;
    turnStats.set(key, s);
  }
  const reportScores = new Map(reports.map((r) => [String(r.interview), r.overall_score]));

  return {
    total,
    page: safePage,
    limit: safeLimit,
    has_more: safePage * safeLimit < total,
    interviews: interviews.map((i) => {
      const id = String(i._id);
      const s = turnStats.get(id) || { count: 0, sum: 0 };
      return {
        interview_id: id,
        role: i.role,
        difficulty: i.difficulty,
        status: i.status,
        turns_answered: s.count,
        avg_score: s.count ? Math.round((s.sum / s.count) * 10) / 10 : null,
        has_report: reportScores.has(id),
        overall_score: reportScores.has(id) ? reportScores.get(id) : null,
        created_at: i.createdAt,
      };
    }),
  };
}

async function processTurn({ userId, interviewId, transcript }) {
  const { llm: llmService, rag: ragService, sts: stsService } = services();
  const interview = await findOwnedInterview(interviewId, userId);
  if (!interview) return { notFound: true };
  if (interview.status === 'ended') return { ended: true };

  // Atomic increment: two concurrent turns can never claim the same number.
  const updated = await Interview.findOneAndUpdate(
    { _id: interview._id },
    { $inc: { current_turn: 1 } },
    { new: true }
  );
  const turnNumber = updated.current_turn;

  const pastTurns = await Turn.find({ interview: interview._id })
    .sort({ turn_number: 1 })
    .lean();

  const prevTurn =
    pastTurns.length > 0
      ? pastTurns[pastTurns.length - 1]
      : null;
  const question = prevTurn?.next_question || interview.started_question;

  const facts = await ragService.retrieveFacts(transcript);
  const evaluation = await llmService.evaluateAndGenerateNext({
    transcript,
    facts,
    resumeContext: interview.resume_text,
    role: interview.role,
    question,
    turnNumber,
    pastTurns,
  });

  const responseText = evaluation.conversational_response || evaluation.next_question;

  await Turn.create({
    interview: interview._id,
    user: userId,
    turn_number: turnNumber,
    question,
    user_answer: String(transcript || '').slice(0, 20000),
    retrieved_facts: String(facts || '').slice(0, 20000),
    score: evaluation.correctness_score,
    feedback: evaluation.feedback,
    next_question: evaluation.next_question,
    engine: evaluation.engine,
  });

  const xp = xpForScore(evaluation.correctness_score);
  await awardXp(userId, xp);
  await refreshLeague(userId);

  const audio = await stsService.synthesizeText(responseText);
  return {
    user_transcript: transcript,
    evaluation,
    response_text: responseText,
    turn_number: turnNumber,
    xp_earned: xp,
    sts_model: audio.model,
    sts_latency_ms: audio.latency_ms,
    sts_audio_length: audio.audio.length,
    sts_audio_base64: audio.audio.toString('base64'),
  };
}

async function skipTurn({ userId, interviewId }) {
  const { llm: llmService, sts: stsService } = services();
  const interview = await findOwnedInterview(interviewId, userId);
  if (!interview) return { notFound: true };

  const pastTurns = await Turn.find({ interview: interview._id })
    .sort({ turn_number: 1 })
    .lean();
  const asked = [
    interview.started_question,
    ...pastTurns.map((t) => t.question),
    ...pastTurns.map((t) => t.next_question),
  ].filter(Boolean);

  const out = await llmService.chatJson(
    'You are an expert technical interviewer. Reply only with JSON.',
    `The candidate skipped the last question for a ${interview.role} interview. ` +
      `Already asked: ${asked.map((q) => `"${q}"`).join(', ')}. ` +
      'Return {"next_question": string, "conversational_response": string} - smoothly pivot to a different topic without repeating anything asked.'
  );
  const nextQuestion =
    out?.next_question && String(out.next_question).trim()
      ? String(out.next_question).trim()
      : QUESTION_BANK.find((q) => !asked.includes(q)) || QUESTION_BANK[(interview.current_turn + 1) % QUESTION_BANK.length];

  const conversational =
    out?.conversational_response && String(out.conversational_response).trim()
      ? String(out.conversational_response).trim()
      : `No problem at all, let's pivot to another area: ${nextQuestion}`;

  const audio = await stsService.synthesizeText(conversational);
  return {
    next_question: nextQuestion,
    response_text: conversational,
    engine: out ? llmService.engine : 'offline-heuristic',
    sts_model: audio.model,
    sts_audio_base64: audio.audio.toString('base64'),
  };
}

async function generateReport({ userId, interviewId }) {
  const { llm: llmService } = services();
  const interview = await findOwnedInterview(interviewId, userId);
  if (!interview) return { notFound: true };

  const existing = await Report.findOne({ interview: interview._id });
  if (existing) return { report: existing, cached: true };

  const turns = await Turn.find({ interview: interview._id }).sort({ turn_number: 1 }).limit(200).lean();
  if (!turns.length) return { noTurns: true };

  // Fetch the candidate's most recent prior completed report for longitudinal comparison
  const prevReport = await Report.findOne({
    user: userId,
    interview: { $ne: interview._id },
  })
    .sort({ createdAt: -1 })
    .lean();

  const rep = await llmService.synthesizeReport(turns, prevReport);
  const report = await Report.create({
    interview: interview._id,
    user: userId,
    overall_score: rep.overall_score,
    summary: rep.summary,
    strengths: rep.strengths,
    weaknesses: rep.weaknesses,
    roadmap: rep.roadmap,
    behavioral_metrics: rep.behavioral_metrics,
    comparison: rep.comparison,
    engine: rep.engine,
  });

  await Interview.updateOne({ _id: interview._id }, { $set: { status: 'ended' } });
  await Progress.updateOne(
    { user: userId },
    { $inc: { interviews_completed: 1 }, $set: { last_active: new Date() } },
    { upsert: true }
  );
  return { report, cached: false };
}

module.exports = { services, createInterview, processTurn, skipTurn, generateReport, findOwnedInterview, listInterviews };
