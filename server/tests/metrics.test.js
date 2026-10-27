'use strict';

const request = require('supertest');
const app = require('../src/app');
const { resetMetrics } = require('../src/metrics');

describe('Prometheus Metrics & Traffic Monitoring', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('returns valid Prometheus metrics format with correct content-type and mock_interview_api_up gauge', async () => {
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.headers['content-type']).toContain('version=0.0.4');

    expect(res.text).toContain('# HELP mock_interview_api_up');
    expect(res.text).toContain('# TYPE mock_interview_api_up gauge');
    expect(res.text).toContain('mock_interview_api_up 1');
  });

  it('excludes /metrics from request counter to prevent scrape loops from skewing traffic', async () => {
    // Initial scrape
    await request(app).get('/metrics');
    // Second scrape
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    // Neither counter nor histogram should record /metrics
    expect(res.text).not.toContain('route="/metrics"');
  });

  it('records http_requests_total and http_request_duration_seconds for real API requests', async () => {
    // Make 2 calls to /api/health and 1 call to /version
    const healthRes1 = await request(app).get('/api/health');
    expect(healthRes1.status).toBe(200);

    const healthRes2 = await request(app).get('/api/health');
    expect(healthRes2.status).toBe(200);

    const versionRes = await request(app).get('/version');
    expect(versionRes.status).toBe(200);

    // Scrape /metrics
    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.status).toBe(200);

    // Verify counter family and labels
    expect(metricsRes.text).toContain('# HELP http_requests_total');
    expect(metricsRes.text).toContain('# TYPE http_requests_total counter');
    expect(metricsRes.text).toMatch(/http_requests_total\{method="GET",route="\/api\/health",status_code="200"\}\s+2/);
    expect(metricsRes.text).toMatch(/http_requests_total\{method="GET",route="\/version",status_code="200"\}\s+1/);

    // Verify duration histogram family and bucket lines
    expect(metricsRes.text).toContain('# HELP http_request_duration_seconds');
    expect(metricsRes.text).toContain('# TYPE http_request_duration_seconds histogram');
    expect(metricsRes.text).toContain('http_request_duration_seconds_bucket{le=');
    expect(metricsRes.text).toContain('method="GET",route="/api/health",status_code="200"');
    expect(metricsRes.text).toMatch(/http_request_duration_seconds_count\{method="GET",route="\/api\/health",status_code="200"\}\s+2/);
  });

  it('uses normalized route labels for parameterized endpoints instead of raw IDs', async () => {
    // Request a parameterized route with a raw ID without auth (returns 401)
    const rawId = '6620f34b1234567890abcdef';
    const res = await request(app).get(`/api/interviews/${rawId}`);
    expect(res.status).toBe(401);

    const metricsRes = await request(app).get('/metrics');

    // Route should be normalized to /api/interviews/:id, not the raw ID
    expect(metricsRes.text).toContain('route="/api/interviews/:id"');
    expect(metricsRes.text).toContain('status_code="401"');
    expect(metricsRes.text).not.toContain(rawId);
  });

  it('normalizes 404 unmatched routes without leaking raw URLs', async () => {
    const rawPath = '/unknown-endpoint-xyz/98765';
    const res = await request(app).get(rawPath);
    expect(res.status).toBe(404);

    const metricsRes = await request(app).get('/metrics');

    expect(metricsRes.text).toContain('route="notFound"');
    expect(metricsRes.text).toContain('status_code="404"');
    expect(metricsRes.text).not.toContain(rawPath);
  });
});
