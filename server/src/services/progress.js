'use strict';

const { Progress } = require('../models');

function xpForScore(score) {
  return Math.max(0, Math.round(score * 10));
}

// Server-side gamification: XP and streaks are computed here, never trusted
// from the client, so the leaderboard cannot be cheated via the API.
async function awardXp(userId, xp) {
  if (!xp || xp <= 0) return null;
  await Progress.updateOne(
    { user: userId },
    {
      $inc: { xp, weekly_xp: xp },
      $set: { last_active: new Date() },
    },
    { upsert: true }
  );
  return xp;
}

function leagueForXp(xp) {
  if (xp >= 10000) return 'diamond';
  if (xp >= 5000) return 'platinum';
  if (xp >= 2500) return 'gold';
  if (xp >= 750) return 'silver';
  return 'bronze';
}

async function refreshLeague(userId) {
  const prog = await Progress.findOne({ user: userId });
  if (!prog) return null;
  const league = leagueForXp(prog.xp);
  if (league !== prog.league) {
    prog.league = league;
    await prog.save();
  }
  return league;
}

module.exports = { xpForScore, awardXp, refreshLeague, leagueForXp };
