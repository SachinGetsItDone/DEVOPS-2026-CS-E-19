'use strict';

const express = require('express');
const cors = require('cors');
const config = require('./config');
const { rateLimit } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errors');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interviews');
const turnRoutes = require('./routes/turn');
const analysisRoutes = require('./routes/analysis');
const userRoutes = require('./routes/user');

const app = express();

// Explicit origins only. "No origin" (curl, server-to-server, tests) is allowed.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(rateLimit({ max: 300, windowMs: 60_000, key: 'global' }));

app.use(healthRoutes);
app.use(authRoutes);
app.use(interviewRoutes);
app.use(turnRoutes);
app.use(analysisRoutes);
app.use(userRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
