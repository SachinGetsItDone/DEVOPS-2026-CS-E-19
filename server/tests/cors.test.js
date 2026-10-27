'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('CORS validation for Vercel and local environments', () => {
  it('allows requests from Vercel production deployment', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://devops-2026-cs-e-19.vercel.app');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://devops-2026-cs-e-19.vercel.app');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('allows requests from Vercel preview branch deployments', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://devops-2026-cs-e-19-git-preview-sachingetsitdone.vercel.app');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://devops-2026-cs-e-19-git-preview-sachingetsitdone.vercel.app');
  });

  it('allows preflight OPTIONS requests from Vercel', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'https://devops-2026-cs-e-19.vercel.app')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://devops-2026-cs-e-19.vercel.app');
  });

  it('blocks requests from unauthorized origins with 403', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://unauthorized-domain.com');

    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
