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

module.exports = router;
