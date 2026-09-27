'use strict';

const config = require('../config');
const { services } = require('../interviewEngine');

const DEFAULT_SKILLS = [
  'javascript', 'typescript', 'react', 'node', 'express', 'mongodb', 'python',
  'docker', 'kubernetes', 'aws', 'git', 'rest api', 'sql', 'html', 'css',
  'ci/cd', 'testing', 'linux', 'system design', 'microservices'
];

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 2);
}

function extractKeywords(text) {
  const tokens = tokenize(text);
  const found = [];
  const textLower = String(text || '').toLowerCase();
  for (const skill of DEFAULT_SKILLS) {
    if (textLower.includes(skill)) {
      found.push(skill);
    }
  }
  return [...new Set(found)];
}

function analyzeResumeLanguage(resumeText) {
  const text = String(resumeText || '');
  const lower = text.toLowerCase();

  const weakVerbsFound = [];
  const weakPatterns = [
    { phrase: 'worked on', replacement: 'Engineered / Developed' },
    { phrase: 'responsible for', replacement: 'Spearheaded / Managed' },
    { phrase: 'helped with', replacement: 'Facilitated / Accelerated' },
    { phrase: 'assisted in', replacement: 'Co-authored / Implemented' },
    { phrase: 'handled', replacement: 'Orchestrated / Resolved' },
    { phrase: 'participated in', replacement: 'Delivered / Contributed directly to' },
  ];

  for (const { phrase, replacement } of weakPatterns) {
    if (lower.includes(phrase)) {
      weakVerbsFound.push(`Replace passive "${phrase}" with high-impact "${replacement}".`);
    }
  }

  const buzzwordsFound = [];
  const buzzwordList = ['synergy', 'hard worker', 'team player', 'detail oriented', 'go getter', 'self starter'];
  for (const bw of buzzwordList) {
    if (lower.includes(bw)) {
      buzzwordsFound.push(`Remove cliché "${bw}" — replace with measurable business results.`);
    }
  }

  const grammarImprovements = [];
  const pronounMatches = text.match(/\b(I|me|my|we|our)\b/gi);
  if (pronounMatches && pronounMatches.length > 0) {
    grammarImprovements.push({
      issue: `Personal pronouns detected (${pronounMatches.length} times, e.g. "${pronounMatches[0]}").`,
      fix: 'Standard ATS resumes should use third-person elliptical style (e.g. "Engineered scalable REST APIs" instead of "I engineered...").'
    });
  }

  const numbersCount = (text.match(/\b\d+(?:%|\+|k|m|x)?\b/gi) || []).length;
  if (numbersCount < 4) {
    grammarImprovements.push({
      issue: 'Low quantification in experience bullet points.',
      fix: 'Use Google’s X-Y-Z formula: "Accomplished [X] as measured by [Y] by doing [Z]" with metrics (%, $, latency).'
    });
  }

  return {
    weak_verbs: weakVerbsFound.slice(0, 4),
    buzzwords: buzzwordsFound.slice(0, 3),
    grammar_improvements: grammarImprovements,
    bullet_structure_score: numbersCount >= 6 ? 9 : numbersCount >= 3 ? 7 : 5,
  };
}

function generateInterviewAlignment(matchedSkills) {
  const alignment = [];
  const skillMap = {
    react: 'React: Expect questions on state management (Redux/Zustand), Reconciliation, and useEffect lifecycle pitfalls.',
    node: 'Node.js: Prepare for Event Loop architecture, streams vs buffers, and cluster scaling questions.',
    docker: 'Docker: Expect questions on multi-stage builds, rootless containers, and image layer caching.',
    kubernetes: 'Kubernetes: Be ready to explain pod lifecycles, Deployments vs StatefulSets, and ingress controllers.',
    mongodb: 'MongoDB: Interviewers will likely test indexing strategies (compound vs single-field) and aggregation pipelines.',
    aws: 'AWS: Expect questions on IAM least-privilege, VPC routing, and S3 / Lambda serverless trade-offs.',
    python: 'Python: Be ready for GIL (Global Interpreter Lock) nuances, generator memory efficiency, and decorators.',
    'system design': 'System Design: Practice drawing block diagrams, CAP theorem tradeoffs, and caching strategies (Cache-Aside, Write-Through).'
  };

  for (const s of matchedSkills) {
    if (skillMap[s]) {
      alignment.push(skillMap[s]);
    }
  }

  if (alignment.length === 0) {
    alignment.push('Technical breadth: Be prepared to defend every tool, library, and project version listed on your resume.');
    alignment.push('STAR methodology: Have concrete stories ready explaining technical failures and how you recovered.');
  }

  return alignment.slice(0, 4);
}

async function calculateAtsScore({ resumeText, jdText, prevScan = null }) {
  const { llm } = services();

  const resumeLower = String(resumeText || '').toLowerCase();
  const jdLower = String(jdText || '').toLowerCase();
  const langAnalysis = analyzeResumeLanguage(resumeText);

  // Fast heuristic fallback
  const fallbackScoring = () => {
    const resumeSkills = extractKeywords(resumeText);
    const jdSkills = jdText ? extractKeywords(jdText) : DEFAULT_SKILLS.slice(0, 8);

    const matched = jdSkills.filter((s) => resumeLower.includes(s));
    const missing = jdSkills.filter((s) => !resumeLower.includes(s));

    const kwRatio = jdSkills.length ? matched.length / jdSkills.length : 0.6;
    const keywordsScore = Math.round(kwRatio * 25 * 10) / 10;

    // Formatting checks
    let formattingScore = 18;
    const issues = [];
    if (resumeText.length < 500) {
      formattingScore -= 5;
      issues.push('Resume content appears very brief (< 500 characters).');
    }
    if (!/@/.test(resumeText)) {
      formattingScore -= 4;
      issues.push('Missing email address in contact section.');
    }
    if (!/(?:phone|\+?\d{10,})/.test(resumeText)) {
      formattingScore -= 3;
      issues.push('Missing phone number in contact section.');
    }

    const contentScore = Math.min(25, Math.max(12, Math.round((resumeText.length / 2000) * 20)));
    const skillValidationScore = Math.min(15, Math.max(8, Math.round(kwRatio * 15)));
    const atsCompScore = Math.min(15, Math.max(9, Math.round((formattingScore / 20) * 15)));

    const total = Math.min(100, Math.round(formattingScore + keywordsScore + contentScore + skillValidationScore + atsCompScore));
    const scoreDelta = prevScan ? total - (prevScan.ats_score || 0) : 0;

    return {
      ATS_score: total,
      component_scores: {
        formatting: Math.max(0, formattingScore),
        keywords: keywordsScore,
        content: contentScore,
        skill_validation: skillValidationScore,
        ats_compatibility: atsCompScore,
      },
      matched_keywords: matched,
      missing_keywords: missing,
      language_analysis: langAnalysis,
      real_interview_alignment: generateInterviewAlignment(matched),
      strengths: [
        'Clear standard text structure parsable by modern ATS systems.',
        matched.length ? `Matching core skills identified: ${matched.slice(0, 4).join(', ')}.` : 'Standard technical profile format.',
      ],
      critical_issues: issues.length ? issues : ['Add more quantifiable impact metrics (%, $, numbers) in experience bullets.'],
      suggestions: [
        missing.length ? `Incorporate relevant missing skills: ${missing.slice(0, 4).join(', ')}.` : 'Add certifications or relevant project links.',
        'Use strong action verbs (Spearheaded, Architected, Engineered) at the start of each bullet point.',
        'Ensure section titles use conventional ATS headers (Experience, Skills, Education).',
      ],
      score_delta: scoreDelta,
      engine: 'heuristic',
    };
  };

  // If Groq LLM is available, perform full deep semantic ATS analysis
  if (llm.client) {
    try {
      const prompt = `You are an expert Application Tracking System (ATS) and Senior Technical Recruiter.
Analyze this resume against the job description (if provided) and score it according to industry ATS standards.
Also perform grammar auditing, identify weak passive verbs, and provide real technical interview watch-outs based on the resume.
Output strictly valid JSON.

Resume:
${String(resumeText).slice(0, 6000)}

Job Description:
${String(jdText || 'General software engineer role focusing on web development, backend, and cloud.').slice(0, 3000)}

Return JSON adhering exactly to:
{
  "ATS_score": number (0-100),
  "component_scores": {
    "formatting": number (0-20),
    "keywords": number (0-25),
    "content": number (0-25),
    "skill_validation": number (0-15),
    "ats_compatibility": number (0-15)
  },
  "matched_keywords": string[],
  "missing_keywords": string[],
  "weak_verbs_to_replace": string[],
  "grammar_critique": [
    { "issue": string, "fix": string }
  ],
  "real_interview_alignment": string[],
  "strengths": string[],
  "critical_issues": string[],
  "suggestions": string[]
}`;

      const res = await llm.chatJson('You are an expert ATS scanner. Reply with JSON.', prompt);
      if (res && typeof res.ATS_score === 'number' && res.component_scores) {
        const total = Math.min(100, Math.max(0, Math.round(res.ATS_score)));
        const scoreDelta = prevScan ? total - (prevScan.ats_score || 0) : 0;
        const matched = Array.isArray(res.matched_keywords) ? res.matched_keywords : [];

        const mergedWeakVerbs = [
          ...langAnalysis.weak_verbs,
          ...(Array.isArray(res.weak_verbs_to_replace) ? res.weak_verbs_to_replace : [])
        ].slice(0, 4);

        const mergedGrammar = [
          ...langAnalysis.grammar_improvements,
          ...(Array.isArray(res.grammar_critique) ? res.grammar_critique : [])
        ].slice(0, 4);

        const mergedAlignment = [
          ...(Array.isArray(res.real_interview_alignment) && res.real_interview_alignment.length ? res.real_interview_alignment : generateInterviewAlignment(matched))
        ].slice(0, 4);

        return {
          ATS_score: total,
          component_scores: {
            formatting: Math.min(20, Math.max(0, Number(res.component_scores.formatting) || 16)),
            keywords: Math.min(25, Math.max(0, Number(res.component_scores.keywords) || 18)),
            content: Math.min(25, Math.max(0, Number(res.component_scores.content) || 18)),
            skill_validation: Math.min(15, Math.max(0, Number(res.component_scores.skill_validation) || 12)),
            ats_compatibility: Math.min(15, Math.max(0, Number(res.component_scores.ats_compatibility) || 13)),
          },
          matched_keywords: matched,
          missing_keywords: Array.isArray(res.missing_keywords) ? res.missing_keywords : [],
          language_analysis: {
            weak_verbs: mergedWeakVerbs,
            buzzwords: langAnalysis.buzzwords,
            grammar_improvements: mergedGrammar,
            bullet_structure_score: langAnalysis.bullet_structure_score,
          },
          real_interview_alignment: mergedAlignment,
          strengths: Array.isArray(res.strengths) ? res.strengths : ['Solid technical foundation.'],
          critical_issues: Array.isArray(res.critical_issues) ? res.critical_issues : [],
          suggestions: Array.isArray(res.suggestions) ? res.suggestions : ['Optimize keywords matching the target JD.'],
          score_delta: scoreDelta,
          engine: 'groq',
        };
      }
    } catch (err) {
      console.warn(`[ats] LLM scoring failed, using heuristic fallback: ${err.message}`);
    }
  }

  return fallbackScoring();
}

module.exports = { calculateAtsScore };
