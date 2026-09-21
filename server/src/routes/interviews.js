'use strict';

const express = require('express');
const { asyncHandler } = require('../middleware/errors');
const { requireAuth } = require('../middleware/auth');
const { createInterview, findOwnedInterview, generateReport } = require('../interviewEngine');
const { Turn, Report } = require('../models');

const router = express.Router();

router.post(
  '/api/interviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { role, resume_text, jd_text, difficulty } = req.body || {};
    const result = await createInterview({
      userId: req.user.id,
      role,
      resumeText: resume_text,
      jdText: jd_text,
      difficulty,
    });
    res.status(201).json(result);
  })
);

router.get(
  '/api/interviews/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const interview = await findOwnedInterview(req.params.id, req.user.id);
    if (!interview) return res.status(404).json({ error: 'Interview not found.' });
    const turns = await Turn.find({ interview: interview._id }).sort({ turn_number: 1 }).limit(200).lean();
    res.json({
      interview: {
        interview_id: String(interview._id),
        role: interview.role,
        difficulty: interview.difficulty,
        status: interview.status,
        current_turn: interview.current_turn,
        created_at: interview.createdAt,
      },
      turns: turns.map((t) => ({
        turn_number: t.turn_number,
        question: t.question,
        user_answer: t.user_answer,
        score: t.score,
        feedback: t.feedback,
        next_question: t.next_question,
      })),
    });
  })
);

router.post(
  '/api/interviews/:id/report',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await generateReport({ userId: req.user.id, interviewId: req.params.id });
    if (result.notFound) return res.status(404).json({ error: 'Interview not found.' });
    if (result.noTurns) return res.status(400).json({ error: 'No answered turns to report on yet.' });
    res.status(result.cached ? 200 : 201).json({
      report_id: String(result.report._id),
      interview_id: String(result.report.interview),
      overall_score: result.report.overall_score,
      summary: result.report.summary,
      strengths: result.report.strengths,
      weaknesses: result.report.weaknesses,
      roadmap: result.report.roadmap,
      xp_earned: result.report.xp_earned,
      engine: result.report.engine,
      cached: result.cached,
    });
  })
);

router.get(
  '/api/interviews/:id/report',
  requireAuth,
  asyncHandler(async (req, res) => {
    const interview = await findOwnedInterview(req.params.id, req.user.id);
    if (!interview) return res.status(404).json({ error: 'Interview not found.' });
    const report = await Report.findOne({ interview: interview._id });
    if (!report) {
      return res.status(404).json({ error: 'Report not ready yet. POST to this URL to generate it.' });
    }
    res.json({
      report_id: String(report._id),
      interview_id: String(report.interview),
      overall_score: report.overall_score,
      summary: report.summary,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      roadmap: report.roadmap,
      xp_earned: report.xp_earned,
      engine: report.engine,
    });
  })
);

module.exports = router;
