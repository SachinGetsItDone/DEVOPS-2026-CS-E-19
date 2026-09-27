'use strict';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config');

const DEV_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

async function getOrCreateDevUser() {
  const { User, Progress } = require('../models');
  let devUser = await User.findById(DEV_USER_ID);
  if (!devUser) {
    try {
      devUser = await User.findOneAndUpdate(
        { _id: DEV_USER_ID },
        {
          $setOnInsert: {
            _id: DEV_USER_ID,
            email: 'guest@prepline.local',
            name: 'Guest Candidate',
            passwordHash: 'dev-guest-bypass',
          },
        },
        { upsert: true, new: true }
      );
      await Progress.findOneAndUpdate(
        { user: DEV_USER_ID },
        { $setOnInsert: { user: DEV_USER_ID } },
        { upsert: true }
      );
    } catch {}
  }
  return devUser || { _id: DEV_USER_ID, email: 'guest@prepline.local' };
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

// Bearer-token guard with guest bypass when auth is turned off for development.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) {
    try {
      const payload = verifyToken(match[1]);
      req.user = { id: payload.sub, email: payload.email };
      return next();
    } catch {}
  }

  // Auth disabled / dev guest bypass:
  try {
    const devUser = await getOrCreateDevUser();
    req.user = { id: String(devUser._id), email: devUser.email };
    return next();
  } catch {
    req.user = { id: String(DEV_USER_ID), email: 'guest@prepline.local' };
    return next();
  }
}

module.exports = { signToken, verifyToken, requireAuth };
