'use strict';

// Integration tests for GET /api/interviews (interview history).
//
// These drive the real Express app and the real interview engine (offline
// fallbacks - env.js blanks the LLM/STS keys), so what's asserted is what a
// logged-in user would actually get back after really answering questions.
//
// Database: by default an in-memory MongoDB (mongodb-memory-server, which
// downloads a mongod binary on first run). Set MONGODB_TEST_URI to run
// against any other Mongo-compatible server instead (e.g. a CI service
// container). Tests never drop a database you point them at - they create
// uniquely-named users and only assert on their own data.

const request = require('supertest');
const mongoose = require('mongoose');

let mongod = null;
let app;

const RUN = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;

async function register(label) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: `${label}-${RUN}@example.com`, password: 'password123', name: `User ${label}` });
  expect(res.status).toBe(201);
  return { token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` } };
}

async function startInterview(user, role) {
  const res = await request(app)
    .post('/api/interviews')
    .set(user.auth)
    .send({ role, resume_text: 'Built REST APIs in Node.', jd_text: 'Backend engineer' });
  expect(res.status).toBe(201);
  return res.body.interview_id;
}

async function answer(user, interviewId, text) {
  const res = await request(app)
    .post('/api/interview/turn')
    .set(user.auth)
    .field('interview_id', interviewId)
    .field('transcript', text);
  expect(res.status).toBe(200);
  return res.body;
}

beforeAll(async () => {
  let uri = process.env.MONGODB_TEST_URI;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  }
  await mongoose.connect(uri, { dbName: 'prepline_test', serverSelectionTimeoutMS: 10000 });
  // Load the app only after env.js has run and the connection exists.
  app = require('../src/app');
  // Make sure unique indexes exist before the first writes.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('GET /api/interviews', () => {
  test('rejects requests without a token', async () => {
    const res = await request(app).get('/api/interviews');
    expect(res.status).toBe(401);
  });

  test('returns an empty history for a brand-new user', async () => {
    const user = await register('empty');
    const res = await request(app).get('/api/interviews').set(user.auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 0, page: 1, limit: 20, has_more: false, interviews: [] });
  });

  test('summarises real interviews, newest first, and only for the owner', async () => {
    const alice = await register('alice');
    const bob = await register('bob');

    // Alice: one interview with 2 answered turns and a report, then one untouched.
    const first = await startInterview(alice, 'Backend Engineer');
    await answer(alice, first, 'I designed a REST API with Node and Express and added JWT authentication.');
    await answer(alice, first, 'I would index the query, add caching, and measure latency before and after.');
    const reportRes = await request(app).post(`/api/interviews/${first}/report`).set(alice.auth);
    expect(reportRes.status).toBe(201);

    const second = await startInterview(alice, 'Frontend Engineer');

    // Bob has his own interview that Alice must never see.
    const bobs = await startInterview(bob, 'Data Engineer');

    const res = await request(app).get('/api/interviews').set(alice.auth);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);

    const ids = res.body.interviews.map((i) => i.interview_id);
    expect(ids).toEqual([second, first]); // newest first
    expect(ids).not.toContain(bobs);

    const [untouched, answered] = res.body.interviews;

    expect(untouched).toMatchObject({
      role: 'Frontend Engineer',
      turns_answered: 0,
      avg_score: null,
      has_report: false,
      overall_score: null,
      status: 'active',
    });

    expect(answered).toMatchObject({ role: 'Backend Engineer', turns_answered: 2, has_report: true });
    expect(typeof answered.avg_score).toBe('number');
    expect(answered.overall_score).toBe(reportRes.body.overall_score);
    expect(new Date(answered.created_at).toString()).not.toBe('Invalid Date');

    const bobsRes = await request(app).get('/api/interviews').set(bob.auth);
    expect(bobsRes.body.total).toBe(1);
    expect(bobsRes.body.interviews[0].interview_id).toBe(bobs);
  });

  test('paginates and clamps bad paging parameters', async () => {
    const user = await register('pager');
    const made = [];
    for (let i = 0; i < 3; i += 1) made.push(await startInterview(user, `Role ${i}`));

    const p1 = await request(app).get('/api/interviews?limit=2&page=1').set(user.auth);
    expect(p1.body.interviews).toHaveLength(2);
    expect(p1.body).toMatchObject({ total: 3, page: 1, limit: 2, has_more: true });

    const p2 = await request(app).get('/api/interviews?limit=2&page=2').set(user.auth);
    expect(p2.body.interviews).toHaveLength(1);
    expect(p2.body).toMatchObject({ page: 2, has_more: false });

    // Together the two pages cover every interview exactly once.
    const seen = [...p1.body.interviews, ...p2.body.interviews].map((i) => i.interview_id).sort();
    expect(seen).toEqual([...made].sort());

    const huge = await request(app).get('/api/interviews?limit=100000&page=-4').set(user.auth);
    expect(huge.body).toMatchObject({ limit: 50, page: 1 });

    const junk = await request(app).get('/api/interviews?limit=abc&page=xyz').set(user.auth);
    expect(junk.body).toMatchObject({ limit: 20, page: 1 });
  });
});
