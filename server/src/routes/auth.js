'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errors');
const { requireAuth, signToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { User, Progress } = require('../models');

const router = express.Router();

const authLimiter = rateLimit({ max: 10, windowMs: 60_000, key: 'auth' });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function userPayload(user) {
  return { id: String(user._id), email: user.email, name: user.name };
}

router.post(
  '/api/auth/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body || {};
    if (!email || !EMAIL_RE.test(String(email))) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 8-128 characters.' });
    }
    if (!name || !String(name).trim() || String(name).trim().length > 80) {
      return res.status(400).json({ error: 'Name is required (max 80 characters).' });
    }

    const normalized = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalized });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: normalized, passwordHash, name: String(name).trim() });
    await Progress.create({ user: user._id });

    res.status(201).json({ token: signToken(user), user: userPayload(user) });
  })
);

router.post(
  '/api/auth/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    // Same error for unknown email and wrong password: no account enumeration.
    if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.json({ token: signToken(user), user: userPayload(user) });
  })
);

router.get(
  '/api/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    res.json({ user: userPayload(user) });
  })
);

module.exports = router;
