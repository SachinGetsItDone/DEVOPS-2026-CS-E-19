'use strict';

// Wrap async route handlers so rejections reach the central error handler.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Central error handler: every thrown/rejected error lands here, so no route
// can leak a stack trace or return an HTML error page.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large.' });
  }
  if (err && err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large.' : `Upload error: ${err.message}`;
    return res.status(400).json({ error: msg });
  }
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id format.' });
  }
  if (err && (err.name === 'MongoServerError' || err.name === 'MongooseServerSelectionError' || err.code === 11000)) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate entry.' });
    }
    return res.status(503).json({ error: 'Database unavailable. Try again shortly.' });
  }

  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error.' });
}

module.exports = { asyncHandler, notFound, errorHandler };
