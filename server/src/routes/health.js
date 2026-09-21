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

module.exports = router;
