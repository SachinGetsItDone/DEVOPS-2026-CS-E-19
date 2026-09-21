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

  const prevTurn =
    turnNumber > 1
      ? await Turn.findOne({ interview: interview._id, turn_number: turnNumber - 1 }).lean()
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
  });

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

  const audio = await stsService.synthesizeText(evaluation.next_question);
  return {
    user_transcript: transcript,
    evaluation,
    response_text: evaluation.next_question,
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

  const out = await llmService.chatJson(
    'You are an expert technical interviewer. Reply only with JSON.',
    `The candidate skipped the last question for a ${interview.role} interview. ` +
      'Return {"next_question": string} - a different angle on the same area.'
  );
  const nextQuestion =
    out?.next_question && String(out.next_question).trim()
      ? String(out.next_question).trim()
      : QUESTION_BANK[(interview.current_turn + 1) % QUESTION_BANK.length];
  const audio = await stsService.synthesizeText(nextQuestion);
  return {
    next_question: nextQuestion,
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

  const rep = await llmService.synthesizeReport(turns);
  const report = await Report.create({
    interview: interview._id,
    user: userId,
    overall_score: rep.overall_score,
    summary: rep.summary,
    strengths: rep.strengths,
    weaknesses: rep.weaknesses,
    roadmap: rep.roadmap,
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

module.exports = { services, createInterview, processTurn, skipTurn, generateReport, findOwnedInterview };
