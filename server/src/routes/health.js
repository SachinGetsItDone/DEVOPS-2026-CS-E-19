'use strict';

const express = require('express');

const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({
      message: 'Mock Interview Engine API is running',
      engine: 'DeepSeek LLM + NVIDIA STS with offline fallbacks',
      version: '3.0.0-mern',
    });
  })
);

// Liveness probe for the client's offline banner. It lives under /api so it
// travels through the dev proxy (which forwards only /api and /ws); a bare
// /version falls through to the SPA's index.html and reports healthy even
// when the API is down.
router.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()) });
});

// API version endpoint
router.get('/version', (req, res) => {
  res.json({
    version: '3.0.0',
    name: 'Mock Interview Engine API',
  });
});

module.exports = router;