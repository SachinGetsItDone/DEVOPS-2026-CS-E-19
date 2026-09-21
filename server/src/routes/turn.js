'use strict';

const express = require('express');
const multer = require('multer');
const config = require('../config');
const { asyncHandler } = require('../middleware/errors');
const { requireAuth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { processTurn } = require('../interviewEngine');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_AUDIO_BYTES, files: 1 },
});

const turnLimiter = rateLimit({ max: 60, windowMs: 60_000, key: 'turn' });

// Attempt transcription through NVIDIA when a key is configured; returns
// null when unavailable so the caller can answer honestly with a 400.
async function transcribeAudio(file) {
  if (!config.NVIDIA_API_KEY) return null;
  try {
    const form = new FormData();
    form.append('file', new Blob([file.buffer], { type: file.mimetype || 'audio/wav' }), file.originalname || 'audio.wav');
    form.append('model', config.NVIDIA_TTS_MODEL);
    const res = await fetch(`${config.NVIDIA_TTS_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.NVIDIA_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.text === 'string' ? data.text : null;
  } catch {
    return null;
  }
}

router.post(
  '/api/interview/turn',
  requireAuth,
  turnLimiter,
  upload.single('audio_file'),
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    let transcript = String(body.transcript || '').trim().slice(0, config.MAX_TEXT_CHARS);
    const interviewId = String(body.interview_id || '').trim();

    if (!interviewId) {
      return res.status(400).json({ error: 'interview_id is required.' });
    }
    if (!transcript && req.file) {
      const text = await transcribeAudio(req.file);
      if (text) transcript = text.slice(0, config.MAX_TEXT_CHARS);
    }
    if (!transcript) {
      return res.status(400).json({
        error: 'Provide either audio_file or transcript (audio transcription requires NVIDIA_API_KEY).',
      });
    }

    const result = await processTurn({ userId: req.user.id, interviewId, transcript });
    if (result.notFound) return res.status(404).json({ error: 'Interview not found.' });
    if (result.ended) return res.status(409).json({ error: 'This interview has ended.' });
    res.json(result);
  })
);

module.exports = router;
