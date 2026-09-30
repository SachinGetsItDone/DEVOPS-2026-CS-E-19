import { createContext, useContext, useState, useCallback } from 'react'
import { parseResume, createInterview, ApiError } from '../lib/api.js'

/**
 * Holds the data collected on the Home page (resume + job description),
 * talks to the backend to start a real interview, and makes the result
 * available to the Interview Room.
 *
 * `startSession` does real work: it uploads the resume for parsing, then
 * creates the interview (JD-aware first question) via the Node backend.
 * That backend requires a logged-in user (JWT) for interview creation —
 * if nobody's logged in, this will fail with the backend's own
 * "Authentication required." message rather than silently proceeding.
 */

const InterviewSessionContext = createContext(null)

const STORAGE_KEY = 'prepline_session'

/** Corrupt or half-written sessionStorage must not take the whole app down. */
function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function writeStoredSession(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Private mode or quota exceeded — the in-memory session still works.
  }
}

export function InterviewSessionProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState('')

  const startSession = useCallback(async ({ resumeFile, jobDescription, role }) => {
    setIsStarting(true)
    setStartError('')

    try {
      let resumeText = ''
      if (resumeFile) {
        // Let a parse failure surface. Passing a filename through as though it
        // were résumé text makes the interviewer ask questions about a string
        // like "resume.pdf", which is worse than an honest error.
        resumeText = await parseResume(resumeFile)
      }
      const { interview_id, first_question, role: resolvedRole } = await createInterview({
        role,
        jdText: jobDescription,
        resumeText,
      })

      const next = {
        interviewId: interview_id,
        resumeName: resumeFile?.name ?? null,
        resumeText,
        jobDescription,
        role: resolvedRole || role,
        openingQuestion: first_question || '',
        startedAt: new Date().toISOString(),
      }
      setSession(next)
      // Files can't be JSON-serialized; only metadata + extracted text persist.
      writeStoredSession(next)
      return next
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : 'Something went wrong starting the interview. Please try again.'
      setStartError(message)
      return null
    } finally {
      setIsStarting(false)
    }
  }, [])

  const clearSession = useCallback(() => {
    setSession(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to do — the in-memory session is already cleared.
    }
  }, [])

  return (
    <InterviewSessionContext.Provider
      value={{ session, startSession, clearSession, isStarting, startError }}
    >
      {children}
    </InterviewSessionContext.Provider>
  )
}

export function useInterviewSession() {
  const ctx = useContext(InterviewSessionContext)
  if (!ctx) throw new Error('useInterviewSession must be used inside InterviewSessionProvider')
  return ctx
}
