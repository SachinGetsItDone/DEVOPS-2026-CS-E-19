import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useGame } from '../context/GameContext.jsx'
import { getReport, generateReport, ApiError } from '../lib/api.js'
import './Report.css'

export default function Report() {
  const { interviewId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { xp, refresh: refreshProgress } = useGame()

  const [report, setReport] = useState(location.state?.report ?? null)
  const [status, setStatus] = useState(location.state?.report ? 'ready' : 'loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (report) return // Passed in directly from InterviewRoom — no fetch needed.

    let cancelled = false
    async function load() {
      try {
        const existing = await getReport(interviewId)
        if (cancelled) return
        setReport(existing)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          // Not generated yet (e.g. direct link / page refresh) — generate now.
          try {
            const generated = await generateReport(interviewId)
            if (cancelled) return
            setReport(generated)
            setStatus('ready')
            refreshProgress()
            return
          } catch (genErr) {
            if (cancelled) return
            setError(genErr instanceof ApiError ? genErr.message : 'Could not generate this report.')
            setStatus('error')
            return
          }
        }
        setError(err instanceof ApiError ? err.message : 'Could not load this report.')
        setStatus('error')
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId, report])

  return (
    <div className="report-page">
      <Navbar />
      <div className="container report">
        {status === 'loading' && (
          <div className="report__loading">
            <span className="eyebrow">Scoring your interview…</span>
          </div>
        )}

        {status === 'error' && (
          <div className="report__loading">
            <p className="report__error">{error}</p>
            <button className="report__btn report__btn--secondary" onClick={() => navigate('/')}>Back home</button>
          </div>
        )}

        {status === 'ready' && report && (
          <>
            <div className="report__header">
              <span className="eyebrow">Interview report</span>
              <h1>Here's how it went</h1>
            </div>

            <div className="report__score-row">
              <div className="score-ring">
                <span className="score-ring__value">{report.overall_score}</span>
                <span className="score-ring__max">/10</span>
              </div>
              <div>
                <p className="report__summary">{report.summary}</p>
                {report.xp_earned > 0 && (
                  <p className="report__xp-earned">+{report.xp_earned} XP earned this interview</p>
                )}
              </div>
            </div>

            <div className="report__columns">
              {report.strengths?.length > 0 && (
                <div className="report__section">
                  <h2>Strengths</h2>
                  <ul className="report__list report__list--strength">
                    {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {report.weaknesses?.length > 0 && (
                <div className="report__section">
                  <h2>Areas to work on</h2>
                  <ul className="report__list report__list--gap">
                    {report.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {report.roadmap?.length > 0 && (
              <div className="report__section">
                <h2>Suggested next steps</h2>
                <ol className="report__list report__list--roadmap">
                  {report.roadmap.map((r, i) => <li key={i}>{r}</li>)}
                </ol>
              </div>
            )}

            {report.engine && report.engine.includes('offline') && (
              <p className="report__engine-note">
                Scored with the offline fallback (no LLM key configured on the backend) — feedback is
                heuristic, not model-generated.
              </p>
            )}

            <div className="report__actions">
              <span className="report__xp">You now have {xp} XP</span>
              <Link to="/leaderboard" className="report__btn report__btn--secondary">View leaderboard</Link>
              <Link to="/" className="report__btn report__btn--primary">Practice again</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
