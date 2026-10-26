'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('GET /metrics', () => {
  it('returns valid Prometheus metrics format with correct content-type', async () => {
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.headers['content-type']).toContain('version=0.0.4');

    expect(res.text).toContain('# HELP mock_interview_api_up');
    expect(res.text).toContain('# TYPE mock_interview_api_up gauge');
    expect(res.text).toContain('mock_interview_api_up 1');
  });
});
