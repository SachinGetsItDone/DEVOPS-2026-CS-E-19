/**
 * Thin client for the FastAPI gateway (server/core/gateway.py).
 *
 * Base URL resolution: VITE_API_URL is left blank in .env.example on
 * purpose — with no value, requests go to relative paths (`/api/...`) and
 * are handled by the Vite dev proxy (see vite.config.js) or, in
 * production, whatever reverse proxy sits in front of the built client.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

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
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, options)
  } catch (networkErr) {
    throw new ApiError(
      "Couldn't reach the server. Is the backend running?",
      0,
    )
  }

  const data = await parseJsonSafely(response)

  if (!response.ok) {
    const message = data?.error || data?.detail || `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  if (data && data.error) {
    // The gateway returns 200 with { error: "..." } for a few cases
    // (e.g. missing interview) rather than a non-2xx status.
    throw new ApiError(data.error, response.status)
  }
  return data
}

/** Upload a resume file, get back extracted plain text. */
export async function parseResume(file) {
  const formData = new FormData()
  formData.append('file', file)
  const data = await request('/api/resume/parse', { method: 'POST', body: formData })
  return data?.text || ''
}

/** Create an interview: analyzes the JD, authors the opening question. */
export async function createInterview({ role, jdText, resumeText }) {
  return request('/api/interviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: role || '',
      interview_type: 'technical',
      jd_text: jdText || '',
      resume_text: resumeText || '',
      user_id: 'anonymous',
    }),
  })
}

/**
 * Send one turn of the interview: either a recorded answer (audioBlob) or
 * typed text (transcript). Returns evaluation, the next question, and
 * base64-encoded interviewer audio to play back.
 */
export async function submitTurn({ interviewId, audioBlob, transcript, resumeContext }) {
  const formData = new FormData()
  if (interviewId) formData.append('interview_id', interviewId)
  if (audioBlob) formData.append('audio_file', audioBlob, 'answer.webm')
  if (transcript) formData.append('transcript', transcript)
  if (resumeContext) formData.append('resume_context', resumeContext)

  return request('/api/interview/turn', { method: 'POST', body: formData })
}

export { ApiError }
