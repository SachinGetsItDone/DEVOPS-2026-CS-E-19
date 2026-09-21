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

export function InterviewSessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState('')

  const startSession = useCallback(async ({ resumeFile, jobDescription, role }) => {
    setIsStarting(true)
    setStartError('')

    try {
      const resumeText = resumeFile ? await parseResume(resumeFile) : ''
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
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
    sessionStorage.removeItem(STORAGE_KEY)
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
