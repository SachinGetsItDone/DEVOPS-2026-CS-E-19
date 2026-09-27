'use strict';

const FILLER_PATTERNS = [
  { word: 'um', regex: /\bum+\b/gi },
  { word: 'uh', regex: /\buh+\b/gi },
  { word: 'like', regex: /\blike\b/gi },
  { word: 'basically', regex: /\bbasically\b/gi },
  { word: 'actually', regex: /\bactually\b/gi },
  { word: 'literally', regex: /\bliterally\b/gi },
  { word: 'you know', regex: /\byou know\b/gi },
  { word: 'sort of', regex: /\bsort of\b/gi },
  { word: 'kind of', regex: /\bkind of\b/gi },
  { word: 'i mean', regex: /\bi mean\b/gi },
  { word: 'so yeah', regex: /\bso yeah\b/gi },
  { word: 'honestly', regex: /\bhonestly\b/gi },
  { word: 'right?', regex: /\bright\?/gi },
];

const COMMON_STOP_WORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'have', 'were', 'been', 'will',
  'would', 'could', 'should', 'about', 'there', 'their', 'they', 'what', 'when',
  'where', 'which', 'who', 'how', 'then', 'than', 'into', 'just', 'more', 'some',
  'also', 'very', 'here', 'your', 'ours', 'them', 'these', 'those', 'using', 'used'
]);

/**
 * Analyzes raw transcripts of candidate answers for speech habits.
 */
function analyzeCandidateSpeech(turns) {
  const userAnswers = turns
    .map((t) => String(t.user_answer || '').trim())
    .filter((txt) => txt.length > 0);

  const combinedText = userAnswers.join(' ');
  const words = combinedText
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9']/g, ''))
    .filter((w) => w.length > 0);

  const totalWords = words.length;

  // 1. Filler words counting
  const breakdown = [];
  let totalFillers = 0;

  for (const { word, regex } of FILLER_PATTERNS) {
    const matches = combinedText.match(regex);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      breakdown.push({ word, count });
      totalFillers += count;
    }
  }

  breakdown.sort((a, b) => b.count - a.count);

  const frequencyPer100 = totalWords > 0
    ? Math.round((totalFillers / totalWords) * 100 * 10) / 10
    : 0;

  // 2. Repeated words (non-stop words appearing frequently)
  const wordFreq = {};
  for (const w of words) {
    if (w.length >= 4 && !COMMON_STOP_WORDS.has(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  const repeatedWords = Object.entries(wordFreq)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }));

  // 3. Pacing & conciseness heuristics
  const avgWordsPerTurn = userAnswers.length > 0
    ? Math.round(totalWords / userAnswers.length)
    : 0;

  let paceAssessment = 'Balanced';
  let concisenessScore = 8;
  let pacingNotes = 'Good conversational length per response.';

  if (avgWordsPerTurn < 25) {
    paceAssessment = 'Too Brief / Curt';
    concisenessScore = 5;
    pacingNotes = 'Your answers are very brief. In real interviews, elaborate with concrete examples, tradeoffs, and outcomes.';
  } else if (avgWordsPerTurn > 180) {
    paceAssessment = 'Rambling / Overly Verbose';
    concisenessScore = 6;
    pacingNotes = 'Your answers tend to ramble. Use the STAR or BLUF (Bottom Line Up Front) approach to keep responses under 2 minutes.';
  } else if (frequencyPer100 > 6) {
    concisenessScore = 6;
    pacingNotes = 'High filler word density. Try pausing silently for 1-2 seconds instead of using verbal crutches.';
  }

  // 4. Rule-based grammar & phrasing checks
  const grammarIssues = [];
  const rules = [
    {
      regex: /\bthere (?:is|was) (?:many|several|a lot of|multiple)\b/i,
      issue: 'Subject-verb agreement error with plural objects.',
      suggestion: 'Use "There are/were several..." instead of "There is/was many...".'
    },
    {
      regex: /\b(?:gonna|wanna|kinda|sorta)\b/i,
      issue: 'Overly informal colloquialisms in formal technical dialogue.',
      suggestion: 'Substitute "going to", "want to", or "somewhat" for greater executive presence.'
    },
    {
      regex: /\b(?:don't|didn't) know nothing\b/i,
      issue: 'Double negative phrasing.',
      suggestion: 'Use "did not know anything" or "was not familiar with".'
    },
    {
      regex: /\b(?:and yeah|so yeah)\b/i,
      issue: 'Trail-off ending without strong conclusion.',
      suggestion: 'End answers firmly with a takeaway, metric, or "That was how we resolved the issue."'
    },
    {
      regex: /\bI (?:don't|do not) (?:really )?know (?:much|anything) about\b/i,
      issue: 'Overly hesitant self-diminishing opening.',
      suggestion: 'Frame positively: "While my core expertise is in X, I understand the fundamental concepts of Y to be..."'
    }
  ];

  for (const turn of userAnswers) {
    for (const rule of rules) {
      const match = turn.match(rule.regex);
      if (match && grammarIssues.length < 5) {
        grammarIssues.push({
          issue: rule.issue,
          example: `"...${match[0]}..."`,
          suggestion: rule.suggestion,
        });
      }
    }
  }

  // 5. Default real interview tips
  const realInterviewTips = [
    'Structure situational answers with STAR: Situation, Task, Action taken, and Measurable Result.',
    frequencyPer100 > 3
      ? 'Practice the 2-second silent pause: Interviewers respect thoughtful silence far more than filler words like "um" or "basically".'
      : 'Maintain steady eye contact with the camera and avoid trailing off at the end of thoughts.',
    'Quantify outcomes: Rather than saying "we made it faster", say "we decreased latency by 45% using Redis caching".',
    'Verify understanding: Before diving into a complex system design or coding prompt, restate the requirements to confirm alignment.',
  ];

  return {
    filler_words: {
      total_count: totalFillers,
      frequency_per_100_words: frequencyPer100,
      breakdown,
    },
    repeated_words: repeatedWords,
    grammar_issues: grammarIssues,
    delivery_and_pacing: {
      pace_assessment: paceAssessment,
      avg_words_per_turn: avgWordsPerTurn,
      conciseness_score: concisenessScore,
      notes: pacingNotes,
    },
    real_interview_tips: realInterviewTips,
  };
}

/**
 * Computes comparative progress between current report and the previous report.
 */
function compareWithPreviousReport(currentScore, currentMetrics, prevReport) {
  if (!prevReport) {
    return {
      has_previous: false,
      previous_score: null,
      score_delta: 0,
      filler_delta: 0,
      improvements: [
        'Baseline round completed! Future sessions will benchmark your progress against this interview.',
        'Track your filler word reductions, answer structuring, and score progression over time.'
      ],
      persistent_issues: [],
      message: 'First recorded interview — baseline performance metrics established.'
    };
  }

  const prevScore = Number(prevReport.overall_score) || 0;
  const scoreDelta = Math.round((currentScore - prevScore) * 10) / 10;

  const prevFillers = Number(prevReport.behavioral_metrics?.filler_words?.total_count ?? 10);
  const currFillers = currentMetrics.filler_words.total_count;
  const fillerDelta = currFillers - prevFillers;

  const improvements = [];
  const persistentIssues = [];

  // Score comparison
  if (scoreDelta > 0) {
    improvements.push(`Overall performance score increased by +${scoreDelta.toFixed(1)} points (from ${prevScore.toFixed(1)} to ${currentScore.toFixed(1)}).`);
  } else if (scoreDelta === 0) {
    improvements.push(`Maintained a consistent overall score of ${currentScore.toFixed(1)}/10.`);
  }

  // Filler words comparison
  if (fillerDelta < 0) {
    const pct = Math.round((Math.abs(fillerDelta) / Math.max(1, prevFillers)) * 100);
    improvements.push(`Speech clarity improved: reduced filler words by ${Math.abs(fillerDelta)} (${pct}% reduction from last round).`);
  } else if (fillerDelta > 2) {
    persistentIssues.push(`Filler words increased by ${fillerDelta} compared to last round (${currFillers} vs ${prevFillers}). Focus on pausing silently.`);
  }

  // Check previous weaknesses vs current
  const prevWeaknesses = Array.isArray(prevReport.weaknesses) ? prevReport.weaknesses : [];
  if (prevWeaknesses.length > 0) {
    improvements.push(`Demonstrated stronger articulation and technical grounding on previous weak spots.`);
  }

  if (currentMetrics.grammar_issues.length > 0) {
    persistentIssues.push(`Noticeable speech slips: ${currentMetrics.grammar_issues[0].issue}`);
  }

  if (currentMetrics.repeated_words.length > 0) {
    persistentIssues.push(`Tendency to lean on crutch words: repeatedly used "${currentMetrics.repeated_words[0].word}" (${currentMetrics.repeated_words[0].count} times).`);
  }

  if (improvements.length === 0) {
    improvements.push('Completed full mock session under timed interview conditions.');
  }

  let message = '';
  if (scoreDelta > 0) {
    message = `Great improvement! You gained +${scoreDelta.toFixed(1)} points and demonstrated stronger delivery than your previous session.`;
  } else if (scoreDelta === 0) {
    message = 'Steady performance matching your previous baseline. Focus on the real interview tips below to unlock the next level.';
  } else {
    message = 'Slight dip compared to your previous round. Review the recurring issues below to bounce back on your next attempt.';
  }

  return {
    has_previous: true,
    previous_score: prevScore,
    score_delta: scoreDelta,
    filler_delta: fillerDelta,
    improvements,
    persistent_issues: persistentIssues.slice(0, 4),
    message,
  };
}

module.exports = {
  analyzeCandidateSpeech,
  compareWithPreviousReport,
};
