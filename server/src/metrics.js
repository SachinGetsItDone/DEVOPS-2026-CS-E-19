'use strict';

const client = require('prom-client');

const register = new client.Registry();

// Gauge indicating whether the Mock Interview API is running and operational (1 = up)
const mockInterviewApiUp = new client.Gauge({
  name: 'mock_interview_api_up',
  help: 'Indicates whether the Mock Interview API is running and operational (1 = up)',
  registers: [register],
});
mockInterviewApiUp.set(1);

// Counter for total HTTP requests
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Histogram for HTTP request duration in seconds
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

function normalizeRoutePath(basePath, routePath) {
  let combined = `${basePath || ''}${routePath || ''}`;
  if (!combined.startsWith('/')) {
    combined = '/' + combined;
  }
  if (combined.length > 1 && combined.endsWith('/')) {
    combined = combined.slice(0, -1);
  }
  return combined;
}

function getRoute(req, res) {
  if (req.route && req.route.path) {
    const basePath = req.baseUrl || '';
    let routePath = req.route.path;
    if (Array.isArray(routePath)) {
      routePath = routePath.join('|');
    } else if (routePath instanceof RegExp) {
      routePath = routePath.source;
    } else {
      routePath = String(routePath);
    }
    return normalizeRoutePath(basePath, routePath);
  }
  if (res.statusCode === 404) {
    return 'notFound';
  }
  return 'unmatched';
}

function metricsMiddleware(req, res, next) {
  const path = req.path || (req.url ? req.url.split('?')[0] : '');
  if (path === '/metrics' || path === '/metrics/') {
    return next();
  }

  const start = process.hrtime.bigint();
  let recorded = false;

  const record = () => {
    if (recorded) return;
    recorded = true;

    const durationInSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const method = req.method;
    const route = getRoute(req, res);
    const statusCode = String(res.statusCode || 200);

    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method, route, status_code: statusCode }, durationInSeconds);
  };

  res.once('finish', record);
  res.once('close', record);

  next();
}

function resetMetrics() {
  httpRequestsTotal.reset();
  httpRequestDurationSeconds.reset();
  mockInterviewApiUp.set(1);
}

module.exports = {
  register,
  mockInterviewApiUp,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  metricsMiddleware,
  getRoute,
  resetMetrics,
};
