'use strict';

// Minimal in-memory rate limiter (per IP + bucket). Good enough for a single
// dev/college deployment; swap for a store if you ever scale horizontally.
const buckets = new Map();

function rateLimit({ max = 60, windowMs = 60_000, key = 'general' } = {}) {
  return function rateLimiter(req, res, next) {
    const id = `${key}:${req.ip}`;
    const now = Date.now();
    let bucket = buckets.get(id);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(id, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ error: 'Too many requests. Slow down and retry.' });
    }
    // Opportunistic cleanup so the map cannot grow unbounded.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
        if (now - v.start > windowMs) buckets.delete(k);
      }
    }
    return next();
  };
}

module.exports = { rateLimit };
