'use strict';

const express = require('express');
const { asyncHandler } = require('../middleware/errors');
const { requireAuth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { Progress } = require('../models');

const router = express.Router();

function progressPayload(p) {
  return {
    user_id: String(p.user),
    xp: p.xp,
    weekly_xp: p.weekly_xp,
    streak: p.streak,
    gems: p.gems,
    hearts: p.hearts,
    league: p.league,
    achievements: p.achievements,
    interviews_completed: p.interviews_completed,
    avatar: p.avatar,
    theme: p.theme,
  };
}

async function ensureProgress(userId) {
  let p = await Progress.findOne({ user: userId });
  if (!p) p = await Progress.create({ user: userId });
  return p;
}

router.get(
  '/api/user/progress',
  requireAuth,
  asyncHandler(async (req, res) => {
    const p = await ensureProgress(req.user.id);
    res.json(progressPayload(p));
  })
);

// Only cosmetic preferences are client-writable. XP, streaks, gems, hearts,
// league and achievements are computed server-side from real interview turns,
// which is what keeps the leaderboard honest.
router.post(
  '/api/user/progress',
  requireAuth,
  rateLimit({ max: 30, windowMs: 60_000, key: 'progress' }),
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const update = {};
    if (typeof body.avatar === 'string') update.avatar = body.avatar.slice(0, 200);
    if (typeof body.theme === 'string') update.theme = body.theme.slice(0, 40);
    if (!Object.keys(update).length) {
      return res.status(400).json({ error: 'Only "avatar" and "theme" can be updated.' });
    }
    const p = await Progress.findOneAndUpdate(
      { user: req.user.id },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json(progressPayload(p));
  })
);

router.get(
  '/api/leaderboard',
  requireAuth,
  rateLimit({ max: 60, windowMs: 60_000, key: 'leaderboard' }),
  asyncHandler(async (req, res) => {
    const raw = Number.parseInt(String(req.query.limit || '10'), 10);
    if (!Number.isFinite(raw) || raw < 1 || raw > 100) {
      return res.status(400).json({ error: 'limit must be between 1 and 100.' });
    }
    const top = await Progress.find({})
      .sort({ xp: -1 })
      .limit(raw)
      .populate('user', 'name')
      .lean();
    res.json(
      top.map((p) => ({
        user_id: String(p.user?._id || p.user),
        name: p.user?.name || 'Anonymous',
        xp: p.xp,
        weekly_xp: p.weekly_xp,
        streak: p.streak,
        league: p.league,
      }))
    );
  })
);

module.exports = router;
