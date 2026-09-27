'use strict';

const OpenAI = require('openai');
const config = require('../config');

const QUESTION_BANK = [
  'Tell me about yourself and the kind of problems you are best at solving.',
  'Walk me through a project you are proud of. What was your specific contribution?',
  'Describe a technical decision you made that you would change today, and why.',
  'How do you approach debugging a problem you have never seen before?',
  'Tell me about a time you disagreed with a teammate on a technical approach.',
  'What is something you learned in the last month, and how did you apply it?',
  'Describe how you would test a feature you just finished building.',
  'Where do you want to grow next, and what are you doing about it?',
];

function bandFeedback(score) {
  if (score >= 8) return 'Strong answer: specific, structured, and grounded in real experience.';
  if (score >= 5) return 'Decent answer with the right idea, but it needs more concrete detail.';
  if (score > 0) return 'The answer is thin. Anchor it in a specific example and state the outcome.';
  return 'No substantive answer was given.';
}

function tokenize(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter((t) => t.length > 2)
  );
}

function clampScore(value) {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n * 2) / 2));
}

function safeList(value) {
  // Guard against LLMs returning a string like "python, sql" (which would
  // otherwise be split into single characters by a naive list() cast).
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' || typeof v === 'number').map(String);
  if (typeof value === 'string' && value.trim()) return value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

class LLMService {
  constructor() {
    this.client = null;
    if (config.DEEPSEEK_API_KEY) {
      this.client = new OpenAI({
        apiKey: config.DEEPSEEK_API_KEY,
        baseURL: config.DEEPSEEK_BASE_URL,
        timeout: 30_000,
        maxRetries: 1,
      });
    } else {
      console.warn('[llm] DEEPSEEK_API_KEY not set - using offline heuristic fallback.');
    }
  }

  get engine() {
    return this.client ? 'deepseek' : 'offline-heuristic';
  }

  async chatJson(system, user) {
    if (!this.client) return null;
    try {
      const res = await this.client.chat.completions.create({
        model: config.DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1200,
      });
      const raw = res.choices?.[0]?.message?.content;
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[llm] call failed, using fallback: ${err.message}`);
      return null;
    }
  }

  async firstQuestion({ role, resumeText, jdText }) {
    const out = await this.chatJson(
      'You are an expert technical interviewer. Reply only with JSON.',
      `Generate one warm opening interview question for a candidate targeting the role "${role}".` +
        ` Resume excerpt: ${String(resumeText || '').slice(0, 1200)}. Job description excerpt: ${String(jdText || '').slice(0, 1200)}.` +
        ' Return {"question": string}.'
    );
    if (out?.question && String(out.question).trim()) return { question: String(out.question).trim(), engine: this.engine };
    return { question: QUESTION_BANK[0], engine: 'offline-heuristic' };
  }

  async evaluateAndGenerateNext({ transcript, facts, resumeContext, role, question, turnNumber, pastTurns = [] }) {
    const trimmed = String(transcript || '').trim();
    const askedQuestions = [
      question,
      ...(pastTurns || []).map((t) => t.question).filter(Boolean),
    ];
    const uniqueAsked = [...new Set(askedQuestions)];

    const isCourtesy = /^(?:thank you|thanks|hello|hi|yes|ok|okay|sure|hey|alright)[\s.!]*$/i.test(trimmed) || trimmed.length < 5;

    const fallback = () => {
      const score = isCourtesy ? 1 : Math.min(10, Math.max(2, Math.round((trimmed.length / 50) * 3)));
      let nextQ = QUESTION_BANK.find((q) => !uniqueAsked.includes(q)) || QUESTION_BANK[(turnNumber || 0) % QUESTION_BANK.length];
      
      let conversational = '';
      if (isCourtesy) {
        if (turnNumber <= 2) {
          conversational = "You're very welcome! Let's get right into your technical work. What programming languages or frameworks are you most comfortable using on a daily basis?";
          nextQ = "What programming languages or frameworks are you most comfortable using on a daily basis?";
        } else {
          conversational = `No problem at all, let's pivot to something else: ${nextQ}`;
        }
      } else {
        conversational = `Thanks for explaining that. Building on your experience, ${nextQ.toLowerCase()}`;
      }

      return {
        correctness_score: score,
        feedback: bandFeedback(score),
        conversational_response: conversational,
        next_question: nextQ,
        engine: 'offline-heuristic',
      };
    };

    const historyLines = (pastTurns || [])
      .map((t) => `Turn ${t.turn_number}: Interviewer asked: "${t.question}" | Candidate answered: "${t.user_answer}"`)
      .join('\n');

    const systemPrompt = `You are a Principal Technical Interviewer and Senior Engineering Director conducting a live technical interview for a ${role} position.
You behave and speak like a REAL human interviewer: warm, professional, attentive, and intellectually curious.

CRITICAL INTERVIEWING RULES:
1. NEVER REPEAT OR LOOP: Under NO circumstances should you repeat, re-phrase, or ask a question that has already been asked in this interview. Every single turn MUST advance the conversation.
2. DYNAMICALLY HANDLE SHORT RESPONSES & COURTESIES:
   - If the candidate says "Thank you", "Thanks", "Hello", or similar pleasantries:
     * Acknowledge it naturally (e.g. "You're very welcome! Let's get right into your technical experience...").
     * If they repeated "Thank you" without answering the previous prompt, DO NOT ask the same question again. Pivot to an easy, approachable technical question: "No worries at all, let's start with your core stack: what programming languages and frameworks do you use most in your day-to-day work?"
   - If the candidate says "I don't know" or asks to pass:
     * Never press them repeatedly. Gracefully bridge: "No problem at all, let's explore a different topic..." and ask a new question.
3. CONVERSATIONAL RESPONSE:
   - Provide a "conversational_response" that bridges from what the candidate actually said before asking the next question.
   - For strong answers, validate their approach (e.g., "That's a solid strategy for sharding the database. Building on that...").
   - For partial answers, ask a sharp follow-up on a specific missing detail (e.g., "How did you monitor the query latency?").
4. INTERVIEW PROGRESSION:
   - Turn 1-2: Core stack, background, and specific project challenge.
   - Turn 3: Technical architecture, concurrency, caching, and failure recovery.
   - Turn 4: System design & scalability trade-offs (e.g. relational vs NoSQL, synchronous vs event-driven).
   - Turn 5: Production monitoring, troubleshooting fires, CI/CD, and metrics/observability.
   - Turn 6+: Behavioral leadership, technical disagreements, and code quality standards.

Return strictly valid JSON:
{
  "correctness_score": number (0-10),
  "feedback": string (brief evaluation notes on candidate's answer),
  "conversational_response": string (the exact natural words spoken out loud by the interviewer, acknowledging candidate's words and introducing the next question),
  "next_question": string (the specific core question being asked next)
}`;

    const userPrompt = `Role: ${role}
Current turn number: ${turnNumber}
Question asked in this turn: "${question}"
Candidate just said: "${trimmed}"

Previous conversation history in this interview:
${historyLines || '(First turn of the interview)'}

Questions already asked in this interview (DO NOT REPEAT ANY OF THESE):
${uniqueAsked.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

Resume Context:
${String(resumeContext || '').slice(0, 1000)}

Domain Facts:
${String(facts || '').slice(0, 1500)}`;

    const out = await this.chatJson(systemPrompt, userPrompt);
    if (!out) return fallback();

    const nextQ =
      typeof out.next_question === 'string' && out.next_question.trim()
        ? out.next_question.trim()
        : QUESTION_BANK.find((q) => !uniqueAsked.includes(q)) || QUESTION_BANK[(turnNumber || 0) % QUESTION_BANK.length];

    const conversational =
      typeof out.conversational_response === 'string' && out.conversational_response.trim()
        ? out.conversational_response.trim()
        : nextQ;

    return {
      correctness_score: clampScore(out.correctness_score),
      feedback: typeof out.feedback === 'string' ? out.feedback : bandFeedback(clampScore(out.correctness_score)),
      conversational_response: conversational,
      next_question: nextQ,
      engine: this.engine,
    };
  }

  async analyzeJD(jdText) {
    const fallback = () => {
      const lines = String(jdText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const title = lines[0] ? lines[0].slice(0, 80) : 'Untitled role';
      const skillsDict = [
        'javascript', 'typescript', 'react', 'node', 'express', 'mongodb', 'python', 'java', 'sql',
        'postgresql', 'aws', 'docker', 'kubernetes', 'git', 'rest', 'graphql', 'ci/cd', 'jenkins',
        'css', 'html', 'django', 'flask', 'fastapi', 'machine learning', 'system design',
      ];
      const lower = String(jdText || '').toLowerCase();
      const key_skills = skillsDict.filter((s) => lower.includes(s)).slice(0, 12);
      const seniority = /senior|staff|principal/.test(lower)
        ? 'senior'
        : /junior|intern|entry|graduate/.test(lower)
          ? 'junior'
          : 'mid';
      return { title, key_skills, seniority, engine: 'offline-heuristic' };
    };

    const out = await this.chatJson(
      'You are a recruiting analyst. Reply only with JSON.',
      `Analyze this job description:\n${String(jdText || '').slice(0, 6000)}\n` +
        'Return {"title": string, "key_skills": string[], "seniority": "junior"|"mid"|"senior"}.'
    );
    if (!out) return fallback();
    return {
      title: typeof out.title === 'string' && out.title.trim() ? out.title.trim() : fallback().title,
      key_skills: safeList(out.key_skills).slice(0, 20),
      seniority: ['junior', 'mid', 'senior'].includes(out.seniority) ? out.seniority : 'mid',
      engine: this.engine,
    };
  }

  async synthesizeReport(turns, prevReport = null) {
    const { analyzeCandidateSpeech, compareWithPreviousReport } = require('./behavioral');
    const speechMetrics = analyzeCandidateSpeech(turns);

    const scores = turns.map((t) => (Number.isFinite(t.score) ? t.score : 0));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const fallback = () => {
      const overallScore = Math.round(avg * 2) / 2;
      const comparison = compareWithPreviousReport(overallScore, speechMetrics, prevReport);
      const strong = overallScore >= 7;
      return {
        overall_score: overallScore,
        summary: `You completed ${turns.length} answered questions with an average score of ${overallScore.toFixed(1)}/10.`,
        strengths: strong ? ['Consistent, specific answers', 'Good domain coverage'] : ['You showed up and finished the round'],
        weaknesses: strong ? ['Tighten time-to-answer', 'Quantify more outcomes'] : ['Answers need concrete examples', 'Ground answers in the asked topic'],
        roadmap: [
          'Re-attempt the weakest topic and record yourself answering',
          'Prepare two STAR stories you can reuse anywhere',
          'Do one more mock interview focused on system fundamentals',
        ],
        behavioral_metrics: speechMetrics,
        comparison,
        engine: 'offline-heuristic',
      };
    };

    const digest = turns
      .slice(0, 30)
      .map((t, i) => `${i + 1}. Q: ${String(t.question || '').slice(0, 120)} | Answer: "${String(t.user_answer || '').slice(0, 180)}" | Score: ${t.score}`)
      .join('\n');

    let historyContext = '';
    if (prevReport) {
      historyContext = `\nPrevious round score: ${prevReport.overall_score}/10. Previous weaknesses: ${(prevReport.weaknesses || []).join(', ')}`;
    }

    const prompt = `You are a Principal Engineering Director and Senior Technical Interview Coach conducting an honest performance audit.
Review the candidate's turn-by-turn answers, speech patterns, grammar, and history.

Turns:
${digest}
${historyContext}

Speech Metrics:
- Total words spoken: ${speechMetrics.delivery_and_pacing.avg_words_per_turn * turns.length}
- Filler words identified: ${speechMetrics.filler_words.total_count} (${speechMetrics.filler_words.breakdown.map((b) => `${b.word}:${b.count}`).join(', ')})
- Repetitive words: ${speechMetrics.repeated_words.map((r) => `${r.word}:${r.count}`).join(', ')}

Return strictly JSON with:
{
  "overall_score": number (0-10),
  "summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "roadmap": string[],
  "grammar_critique": [
    { "issue": string, "example": string, "suggestion": string }
  ],
  "real_interview_tips": string[],
  "improvements_from_last_time": string[],
  "recurring_issues": string[]
}`;

    const out = await this.chatJson('You are an expert interview evaluator. Reply only with JSON.', prompt);
    if (!out) return fallback();

    const finalScore = clampScore(out.overall_score ?? avg);

    // Merge LLM grammar and tips with heuristic metrics
    const mergedGrammar = [
      ...speechMetrics.grammar_issues,
      ...(Array.isArray(out.grammar_critique) ? out.grammar_critique : [])
    ].slice(0, 6);

    const mergedTips = [
      ...(Array.isArray(out.real_interview_tips) && out.real_interview_tips.length ? out.real_interview_tips : speechMetrics.real_interview_tips),
    ].slice(0, 5);

    const finalBehavioralMetrics = {
      ...speechMetrics,
      grammar_issues: mergedGrammar,
      real_interview_tips: mergedTips,
    };

    // Calculate longitudinal comparison
    const comparison = compareWithPreviousReport(finalScore, finalBehavioralMetrics, prevReport);

    if (Array.isArray(out.improvements_from_last_time) && out.improvements_from_last_time.length) {
      comparison.improvements = [...new Set([...comparison.improvements, ...out.improvements_from_last_time])].slice(0, 5);
    }
    if (Array.isArray(out.recurring_issues) && out.recurring_issues.length) {
      comparison.persistent_issues = [...new Set([...comparison.persistent_issues, ...out.recurring_issues])].slice(0, 5);
    }

    return {
      overall_score: finalScore,
      summary: typeof out.summary === 'string' ? out.summary : fallback().summary,
      strengths: safeList(out.strengths).slice(0, 6),
      weaknesses: safeList(out.weaknesses).slice(0, 6),
      roadmap: safeList(out.roadmap).slice(0, 6),
      behavioral_metrics: finalBehavioralMetrics,
      comparison,
      engine: this.engine,
    };
  }
}

module.exports = { LLMService, QUESTION_BANK, clampScore };
