'use strict';

const express = require('express');
const multer = require('multer');
const config = require('../config');
const { asyncHandler } = require('../middleware/errors');
const { requireAuth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { services } = require('../interviewEngine');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_RESUME_BYTES, files: 1 },
});

// Local PDF text extraction only (no LLM call) - stays open but rate-limited.
router.post(
  '/api/resume/parse',
  rateLimit({ max: 20, windowMs: 60_000, key: 'resume' }),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Upload a resume file in the "file" field.' });
    let pdfParse;
    try {
      // Direct lib path: the package root has a debug-mode quirk under test runners.
      pdfParse = require('pdf-parse/lib/pdf-parse.js');
    } catch {
      return res.status(500).json({ error: 'PDF parser is not installed correctly.' });
    }
    try {
      const parsed = await pdfParse(req.file.buffer);
      const text = String(parsed.text || '').trim();
      if (!text) return res.status(422).json({ error: 'No extractable text in this PDF (scanned image?).' });
      res.json({ text: text.slice(0, 60000), pages: parsed.numpages || 1, name: req.file.originalname || '' });
    } catch {
      res.status(422).json({ error: 'Could not read this file as a PDF.' });
    }
  })
);

const { calculateAtsScore } = require('../services/ats');
const { AtsScan } = require('../models');

// Calls the LLM, so it requires auth.
router.post(
  '/api/jd/analyze',
  requireAuth,
  rateLimit({ max: 20, windowMs: 60_000, key: 'jd' }),
  asyncHandler(async (req, res) => {
    const jdText = String((req.body || {}).jd_text || '').trim();
    if (!jdText) return res.status(400).json({ error: 'jd_text is required.' });
    const { llm } = services();
    const analysis = await llm.analyzeJD(jdText.slice(0, config.MAX_TEXT_CHARS));
    res.json(analysis);
  })
);

// ATS Resume Score Calculator (matches SachinGetsItDone/ATS_calculator contract)
router.post(
  '/api/ats/calculate',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    let resumeText = '';

    if (req.file) {
      try {
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        const parsed = await pdfParse(req.file.buffer);
        resumeText = String(parsed.text || '').trim();
      } catch (err) {
        resumeText = `Uploaded document: ${req.file.originalname}`;
      }
    }

    if (!resumeText && req.body?.resume_text) {
      resumeText = String(req.body.resume_text).trim();
    }

    if (!resumeText) {
      return res.status(400).json({ error: 'Please provide a resume file or resume text.' });
    }

    const jdText = String(req.body?.jd_text || req.body?.job_description || '').trim();

    // Check for previous scan if user is authenticated (or guest)
    const userId = req.user?.id || '000000000000000000000001';
    let prevScan = null;
    try {
      prevScan = await AtsScan.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
    } catch {
      // ignore
    }

    const result = await calculateAtsScore({ resumeText, jdText, prevScan });

    try {
      await AtsScan.create({
        user: userId,
        ats_score: result.ATS_score,
        component_scores: result.component_scores,
        matched_keywords: result.matched_keywords,
        missing_keywords: result.missing_keywords,
        language_analysis: result.language_analysis,
        strengths: result.strengths,
        critical_issues: result.critical_issues,
        suggestions: result.suggestions,
        real_interview_alignment: result.real_interview_alignment,
        score_delta: result.score_delta,
      });
    } catch {
      // Non-fatal if scan saving fails
    }

    res.json(result);
  })
);

module.exports = router;
