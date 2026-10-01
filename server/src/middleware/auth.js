'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

function signToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

// Bearer-token guard. A missing or invalid token is rejected with 401 - it
// does NOT fall back to a shared guest account. An earlier version of this
// function did: any request with no valid token was silently logged in as
// one fixed "Guest Candidate" user, which meant every unauthenticated
// visitor shared the same account, interviews, history and XP. That's gone.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const payload = verifyToken(match[1]);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { signToken, verifyToken, requireAuth };
