import { createContext, useContext, useState, useCallback } from 'react'
import { parseResume, createInterview, ApiError } from '../lib/api.js'

/**
 * Holds the data collected on the Home page (resume + job description),
 * talks to the backend to start a real interview, and makes the result
 * available to the Interview Room.
 *
 * `startSession` now does real work: it uploads the resume for parsing,
 * then creates the interview (JD analysis + opening question) via the
 * FastAPI gateway. It's async and can fail (network down, backend not
 * running, etc.) — callers should await it and check the return value
 * rather than assuming it always succeeds.
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
      const { interview_id, opening_question, role: resolvedRole } = await createInterview({
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
        openingQuestion: opening_question || '',
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
