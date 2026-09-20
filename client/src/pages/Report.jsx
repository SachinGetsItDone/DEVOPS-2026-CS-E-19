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
  const { xp } = useGame()

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
        if (existing?.overall_score !== undefined) {
          setReport(existing)
          setStatus('ready')
          return
        }
        // Not generated yet (e.g. direct link / page refresh) — generate now.
        const generated = await generateReport(interviewId)
        if (cancelled) return
        setReport(generated)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load this report.')
        setStatus('error')
      }
    }
    load()
    return () => { cancelled = true }
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
              <p className="report__summary">{report.summary}</p>
            </div>

            {report.competencies?.length > 0 && (
              <div className="report__section">
                <h2>Competencies</h2>
                <div className="competency-list">
                  {report.competencies.map((c, i) => (
                    <div className="competency" key={i}>
                      <div className="competency__row">
                        <span className="competency__name">{c.name}</span>
                        <span className="competency__score">{c.score}/10</span>
                      </div>
                      <div className="competency__bar">
                        <div
                          className="competency__bar-fill"
                          style={{ width: `${Math.max(0, Math.min(100, (c.score / 10) * 100))}%` }}
                        />
                      </div>
                      {c.comment && <p className="competency__comment">{c.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="report__columns">
              {report.strengths?.length > 0 && (
                <div className="report__section">
                  <h2>Strengths</h2>
                  <ul className="report__list report__list--strength">
                    {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {report.gaps?.length > 0 && (
                <div className="report__section">
                  <h2>Areas to work on</h2>
                  <ul className="report__list report__list--gap">
                    {report.gaps.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
              )}
            </div>

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
