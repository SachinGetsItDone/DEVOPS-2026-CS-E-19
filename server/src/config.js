'use strict';

const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Always load server/.env regardless of cwd, so running from repo root works too.
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config(); // CWD .env as a secondary source (does not override existing)

// Placeholder values copied from templates are treated as "not configured",
// so a verbatim copy of .env.example never triggers real API calls with fake keys.
function clean(value) {
  if (value == null) return '';
  const v = String(value).trim();
  if (/^(your|change_me|placeholder|xxx|test)/i.test(v) || v.includes('_here')) return '';
  return v;
}

const env = clean(process.env.ENV);
if (env === 'test') process.env.NODE_ENV = 'test';

function str(key, fallback = '') {
  const v = clean(process.env[key]);
  return v || fallback;
}

function int(key, fallback) {
  const v = clean(process.env[key]);
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

let jwtSecret = str('JWT_SECRET');
let ephemeralSecret = false;
if (!jwtSecret) {
  ephemeralSecret = true;
  jwtSecret = crypto.randomBytes(32).toString('hex');
}

const config = {
  PORT: int('PORT', 8000),
  CORS_ORIGINS: str('CORS_ORIGIN', 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  JWT_SECRET: jwtSecret,
  JWT_EPHEMERAL_SECRET: ephemeralSecret,
  JWT_EXPIRES_IN: str('JWT_EXPIRES_IN', '24h'),

  MONGO_URI: str('MONGO_URI', 'mongodb://localhost:27017'),
  MONGO_DB: str('MONGO_DB', 'interview'),

  DEEPSEEK_API_KEY: str('DEEPSEEK_API_KEY'),
  DEEPSEEK_BASE_URL: str('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
  DEEPSEEK_MODEL: str('DEEPSEEK_MODEL', 'deepseek-chat'),

  NVIDIA_API_KEY: str('NVIDIA_API_KEY'),
  NVIDIA_TTS_URL: str('NVIDIA_STS_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
  NVIDIA_TTS_MODEL: str('NVIDIA_TTS_MODEL', 'nvidia/nemo-tts'),
  NVIDIA_TTS_VOICE: str('NVIDIA_TTS_VOICE', 'en-US-Standard-A'),
  SAMPLE_RATE: int('NVIDIA_STS_SAMPLE_RATE', 16000),

  RAG_MODE: str('RAG_MODE', 'auto'),
  EMBEDDING_MODEL: str('EMBEDDING_MODEL', 'Xenova/all-MiniLM-L6-v2'),

  MAX_AUDIO_BYTES: int('MAX_AUDIO_BYTES', 20 * 1024 * 1024),
  MAX_RESUME_BYTES: int('MAX_RESUME_BYTES', 5 * 1024 * 1024),
  MAX_TEXT_CHARS: int('MAX_TEXT_CHARS', 20000),
};

if (config.JWT_EPHEMERAL_SECRET && process.env.NODE_ENV === 'production') {
  // Fail loudly rather than silently issue tokens that die on restart.
  throw new Error('JWT_SECRET must be set in production.');
}
if (config.JWT_EPHEMERAL_SECRET) {
  console.warn('[config] JWT_SECRET not set - using an ephemeral secret (tokens reset on restart). Set JWT_SECRET for persistence.');
}

module.exports = config;
