/**
 * Thin client for the Node/Express backend (server/src/*).
 *
 * The backend was migrated from Python/FastAPI to Node/Express on
 * 2026-09-21 (commit 5a64773) — this file matches THAT backend, not the
 * old one. Notable differences from the old contract:
 * - Almost every route requires a JWT: `Authorization: Bearer <token>`.
 * - The report shape uses `weaknesses`/`roadmap` (not `gaps`/`competencies`).
 * - Progress (XP/streak/league) is computed server-side from real turns —
 *   the client can only read it, and can only write `avatar`/`theme`.
 *
 * Base URL resolution: VITE_API_URL is left blank on purpose — with no
 * value, requests go to relative paths (`/api/...`) handled by the Vite
 * dev proxy (see vite.config.js) or, in production, whatever reverse
 * proxy sits in front of the built client.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'prepline_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseJsonSafely(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError("Couldn't reach the server. Is the backend running?", 0)
  }

  const data = await parseJsonSafely(response)

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return data
}

function jsonBody(obj) {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }
}

// ---------- Auth ----------

/** Register a new account. Returns { token, user }. */
export async function register({ email, password, name }) {
  return request('/api/auth/register', { method: 'POST', ...jsonBody({ email, password, name }) })
}

/** Log in. Returns { token, user }. */
export async function login({ email, password }) {
  return request('/api/auth/login', { method: 'POST', ...jsonBody({ email, password }) })
}

/** Fetch the current user from the stored token. Throws ApiError(401) if invalid/expired. */
export async function getMe() {
  const data = await request('/api/auth/me', { method: 'GET' })
  return data.user
}

// ---------- Resume / JD ----------

/** Upload a resume file (PDF only), get back extracted plain text. Does not require auth. */
export async function parseResume(file) {
  const formData = new FormData()
  formData.append('file', file)
  const data = await request('/api/resume/parse', { method: 'POST', body: formData })
  return data?.text || ''
}

// ---------- Interview flow ----------

/** Create an interview: generates the first question from role/resume/JD. */
export async function createInterview({ role, jdText, resumeText, difficulty }) {
  return request('/api/interviews', {
    method: 'POST',
    ...jsonBody({
      role: role || '',
      resume_text: resumeText || '',
      jd_text: jdText || '',
      difficulty: difficulty || 'standard',
    }),
  })
}

/**
 * Send one turn: either a recorded answer (audioBlob) or typed text
 * (transcript). Audio transcription only works if the backend has
 * NVIDIA_API_KEY configured — otherwise the backend itself returns a 400
 * asking for a transcript instead.
 */
export async function submitTurn({ interviewId, audioBlob, transcript }) {
  const formData = new FormData()
  if (interviewId) formData.append('interview_id', interviewId)
  if (audioBlob) formData.append('audio_file', audioBlob, 'answer.webm')
  if (transcript) formData.append('transcript', transcript)

  return request('/api/interview/turn', { method: 'POST', body: formData })
}

/** Generate (or fetch the cached) post-interview report. */
export async function generateReport(interviewId) {
  return request(`/api/interviews/${interviewId}/report`, { method: 'POST' })
}

/** Fetch a previously generated report (404s if not generated yet). */
export async function getReport(interviewId) {
  return request(`/api/interviews/${interviewId}/report`, { method: 'GET' })
}

// ---------- Gamification ----------

/** Fetch the logged-in user's XP/streak/league state. */
export async function getUserProgress() {
  return request('/api/user/progress', { method: 'GET' })
}

/** Weekly XP leaderboard (array, already sorted by XP desc). */
export async function getLeaderboard(limit = 20) {
  return request(`/api/leaderboard?limit=${limit}`, { method: 'GET' })
}

export { ApiError }
