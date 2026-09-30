/**
 * Client for the Prepline Express backend.
 *
 * Every function here talks to the real API and surfaces real failures.
 * There is deliberately no offline simulation: an earlier version of this
 * file fabricated a login for any password, invented résumé skills, and
 * returned a graded 8.2/10 interview report when the server was down. A
 * candidate cannot tell a fake score from a real one, so a failed request
 * must look like a failed request.
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

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
  /** The server never answered — a network/DNS/CORS failure, not a rejection. */
  get isOffline() {
    return this.status === 0
  }
}

const OFFLINE_MESSAGE =
  "Can't reach the Prepline server. Start it with `npm start` in the server folder, then try again."

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
    throw new ApiError(OFFLINE_MESSAGE, 0)
  }

  const data = await parseJsonSafely(response)

  if (!response.ok) {
    const message = data?.error || data?.detail || `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return data
}

function jsonBody(obj) {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }
}

// ---------- Health ----------

/**
 * Is the API reachable? Used to show an honest "server offline" banner
 * instead of letting every action fail one at a time.
 *
 * The path must sit under /api: the dev server proxies only /api and /ws, and
 * serves index.html for anything else — so probing a bare path would return
 * 200 text/html and report the API healthy while it was down.
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { headers: { Accept: 'application/json' } })
    if (!res.ok) return false
    return (res.headers.get('content-type') || '').includes('application/json')
  } catch {
    return false
  }
}

// ---------- Auth ----------

export async function register({ email, password, name }) {
  return request('/api/auth/register', { method: 'POST', ...jsonBody({ email, password, name }) })
}

export async function login({ email, password }) {
  return request('/api/auth/login', { method: 'POST', ...jsonBody({ email, password }) })
}

export async function getMe() {
  const data = await request('/api/auth/me', { method: 'GET' })
  return data?.user ?? null
}

// ---------- Resume / JD / ATS ----------

/** Extract plain text from a résumé PDF. Throws if the PDF has no text layer. */
export async function parseResume(file) {
  const formData = new FormData()
  formData.append('file', file)
  const data = await request('/api/resume/parse', { method: 'POST', body: formData })
  return data?.text || ''
}

/** Analyse a job description into structured requirements. Requires auth. */
export async function analyzeJd(jdText) {
  return request('/api/jd/analyze', { method: 'POST', ...jsonBody({ jd_text: jdText }) })
}

/**
 * Score a résumé against a job description.
 * Response: { ATS_score, component_scores{formatting, keywords, content,
 * skill_validation, ats_compatibility}, matched_keywords[], missing_keywords[],
 * language_analysis{weak_verbs[], buzzwords[], grammar_improvements[]},
 * strengths[], critical_issues[], suggestions[], real_interview_alignment[],
 * score_delta }
 */
export async function calculateAts({ file, resumeText, jdText }) {
  const formData = new FormData()
  if (file) formData.append('file', file)
  if (resumeText) formData.append('resume_text', resumeText)
  if (jdText) formData.append('jd_text', jdText)
  return request('/api/ats/calculate', { method: 'POST', body: formData })
}

// ---------- Interview flow ----------

/**
 * Open a session. Requires auth.
 * Response: { interview_id, role, first_question, engine, sts_model,
 * sts_latency_ms, sts_audio_base64 }
 */
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
 * Submit one answer. Send audio when we have it, transcript when we don't.
 * Response: { user_transcript, evaluation, response_text, turn_number,
 * xp_earned, sts_* }
 */
export async function submitTurn({ interviewId, audioBlob, transcript }) {
  if (!interviewId) throw new ApiError('No interview session is open.', 400)

  const formData = new FormData()
  formData.append('interview_id', interviewId)
  if (audioBlob) formData.append('audio_file', audioBlob, 'answer.webm')
  if (transcript) formData.append('transcript', transcript)
  return request('/api/interview/turn', { method: 'POST', body: formData })
}

/** The logged-in user's past interviews, newest first (paginated). */
export async function getInterviews({ page = 1, limit = 20 } = {}) {
  return request(`/api/interviews?page=${page}&limit=${limit}`, { method: 'GET' })
}

/** Generate (POST) or fetch (GET) the report for a finished session. */
export async function generateReport(interviewId) {
  return request(`/api/interviews/${interviewId}/report`, { method: 'POST' })
}

export async function getReport(interviewId) {
  return request(`/api/interviews/${interviewId}/report`, { method: 'GET' })
}

// ---------- Progression ----------

export async function getUserProgress() {
  return request('/api/user/progress', { method: 'GET' })
}

export async function getLeaderboard(limit = 20) {
  return request(`/api/leaderboard?limit=${limit}`, { method: 'GET' })
}
