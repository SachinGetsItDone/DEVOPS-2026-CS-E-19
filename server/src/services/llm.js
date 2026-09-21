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

  async evaluateAndGenerateNext({ transcript, facts, resumeContext, role, question, turnNumber }) {
    const fallback = () => {
      const answerTokens = tokenize(transcript);
      const factTokens = tokenize(facts);
      let overlap = 0;
      for (const t of factTokens) if (answerTokens.has(t)) overlap += 1;
      const lengthSignal = Math.min(1, String(transcript || '').trim().split(/\s+/).filter(Boolean).length / 60);
      const score = Math.max(0, Math.min(10, Math.round((overlap * 0.7 + lengthSignal * 3) * 2) / 2));
      const nextIndex = (turnNumber || 0) % QUESTION_BANK.length;
      return {
        correctness_score: score,
        feedback: bandFeedback(score),
        next_question: QUESTION_BANK[nextIndex],
        engine: 'offline-heuristic',
      };
    };

    const out = await this.chatJson(
      'You are an expert technical interviewer. Evaluate the candidate answer honestly against the retrieved facts. Reply only with JSON.',
      `Role: ${role}\nQuestion asked: ${question}\nCandidate answer: ${String(transcript || '').slice(0, 4000)}\n` +
        `Retrieved domain facts: ${String(facts || '').slice(0, 3000)}\nResume context: ${String(resumeContext || '').slice(0, 1500)}\n` +
        'Return {"correctness_score": number 0-10, "feedback": string, "next_question": string}.'
    );
    if (!out) return fallback();
    return {
      correctness_score: clampScore(out.correctness_score),
      feedback: typeof out.feedback === 'string' ? out.feedback : bandFeedback(clampScore(out.correctness_score)),
      next_question:
        typeof out.next_question === 'string' && out.next_question.trim()
          ? out.next_question.trim()
          : QUESTION_BANK[(turnNumber || 0) % QUESTION_BANK.length],
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

  async synthesizeReport(turns) {
    const scores = turns.map((t) => (Number.isFinite(t.score) ? t.score : 0));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const fallback = () => {
      const strong = avg >= 7;
      return {
        overall_score: Math.round(avg * 2) / 2,
        summary: `You completed ${turns.length} answered questions with an average score of ${(Math.round(avg * 2) / 2).toFixed(1)}/10.`,
        strengths: strong ? ['Consistent, specific answers', 'Good domain coverage'] : ['You showed up and finished the round'],
        weaknesses: strong ? ['Tighten time-to-answer', 'Quantify more outcomes'] : ['Answers need concrete examples', 'Ground answers in the asked topic'],
        roadmap: [
          'Re-attempt the weakest topic and record yourself answering',
          'Prepare two STAR stories you can reuse anywhere',
          'Do one more mock interview focused on system fundamentals',
        ],
        engine: 'offline-heuristic',
      };
    };

    const digest = turns
      .slice(0, 40)
      .map((t, i) => `${i + 1}. Q: ${String(t.question || '').slice(0, 140)} | score ${t.score}`)
      .join('\n');
    const out = await this.chatJson(
      'You are an interview coach writing an honest end-of-session report. Reply only with JSON.',
      `Turn-by-turn summary:\n${digest}\n` +
        'Return {"overall_score": number 0-10, "summary": string, "strengths": string[], "weaknesses": string[], "roadmap": string[]}.'
    );
    if (!out) return fallback();
    return {
      overall_score: clampScore(out.overall_score ?? avg),
      summary: typeof out.summary === 'string' ? out.summary : fallback().summary,
      strengths: safeList(out.strengths).slice(0, 6),
      weaknesses: safeList(out.weaknesses).slice(0, 6),
      roadmap: safeList(out.roadmap).slice(0, 6),
      engine: this.engine,
    };
  }
}

module.exports = { LLMService, QUESTION_BANK, clampScore };
