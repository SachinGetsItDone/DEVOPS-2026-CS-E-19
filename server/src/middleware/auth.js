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

// Bearer-token guard. Identity always comes from the token, never the request
// body, which is what prevents one user from reading/writing another's data.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const payload = verifyToken(match[1]);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token. Log in again.' });
  }
}

module.exports = { signToken, verifyToken, requireAuth };
