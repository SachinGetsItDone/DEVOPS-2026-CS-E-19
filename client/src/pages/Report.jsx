import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
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
    if (status === 'ready' && report && (Number(report.overall_score) >= 7.0)) {
      try {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!reduced) {
          confetti({
            particleCount: 45,
            spread: 65,
            origin: { y: 0.65 },
            colors: ['#5ecfa8', '#38bdf8', '#e6ece7'],
          })
        }
      } catch {}
    }
  }, [status, report])

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

  // Derive competency vector points for the Radar visual
  const overallScoreNum = report ? (Number(report.overall_score) || 7.5) : 7.5
  const radarDimensions = [
    { label: 'System Design', score: Math.min(10, Math.max(3, overallScoreNum * 0.95)) },
    { label: 'Decomposition', score: Math.min(10, Math.max(4, overallScoreNum * 1.05)) },
    { label: 'Technical Depth', score: Math.min(10, Math.max(3, overallScoreNum * 1.0)) },
    { label: 'Vocal Cadence', score: Math.min(10, Math.max(4, overallScoreNum * 0.9)) },
    { label: 'Edge Handling', score: Math.min(10, Math.max(3, overallScoreNum * 0.85)) },
  ]

  // Calculate polygon points for pentagonal radar
  const radarCenter = 120
  const radarRadius = 80
  const pentagonPoints = radarDimensions.map((dim, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const r = (dim.score / 10) * radarRadius
    const x = radarCenter + r * Math.cos(angle)
    const y = radarCenter + r * Math.sin(angle)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

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
              <span className="eyebrow">Interview Evaluation Dossier</span>
              <h1>Performance &amp; Diagnostic Readout</h1>
            </div>

            <div className="report__score-row">
              {(() => {
                const score = Number(report.overall_score) || 0
                const frac = Math.min(1, Math.max(0, score / 10))
                const R = 40
                const C = 2 * Math.PI * R
                return (
                  <div className="score-ring" role="img" aria-label={`Scored ${score} out of 10`}>
                    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
                      <circle cx="48" cy="48" r={R} fill="none" stroke="var(--surface-high)" strokeWidth="7" />
                      <circle
                        cx="48"
                        cy="48"
                        r={R}
                        fill="none"
                        stroke="var(--amber)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={C.toFixed(1)}
                        strokeDashoffset={(C * (1 - frac)).toFixed(1)}
                        transform="rotate(-90 48 48)"
                        className="score-ring__arc"
                      />
                    </svg>
                    <span className="score-ring__label">
                      <span className="score-ring__value">{report.overall_score}</span>
                      <span className="score-ring__max">/10</span>
                    </span>
                  </div>
                )
              })()}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <p className="report__summary" style={{ margin: 0 }}>{report.summary}</p>
                  {report.comparison?.has_previous && (
                    <span className={`delta-badge ${report.comparison.score_delta >= 0 ? 'delta-badge--up' : 'delta-badge--down'}`}>
                      {report.comparison.score_delta >= 0 ? `+${report.comparison.score_delta.toFixed(1)}` : report.comparison.score_delta.toFixed(1)} vs previous round
                    </span>
                  )}
                </div>
                {report.xp_earned > 0 && (
                  <p className="report__xp-earned">+{report.xp_earned} XP earned this interview</p>
                )}
              </div>
            </div>

            {/* Diagnostic Visual 1: Multi-Vector Competency Radar */}
            <div className="report__radar-card">
              <div className="report__radar-header">
                <div>
                  <span className="eyebrow">Competency Vector Field</span>
                  <h3>Multi-Dimensional Skill Envelope</h3>
                </div>
                <div className="radar-legend">
                  <span className="radar-legend__dot" />
                  <span>Candidate Evaluation Matrix</span>
                </div>
              </div>

              <div className="report__radar-body">
                <svg width="240" height="240" viewBox="0 0 240 240" className="radar-svg" aria-label="Competency radar matrix">
                  {/* Concentric pentagon grid guides */}
                  {[0.25, 0.5, 0.75, 1.0].map((level, lIdx) => {
                    const pts = [0, 1, 2, 3, 4].map((step) => {
                      const angle = (step * 2 * Math.PI) / 5 - Math.PI / 2
                      const r = level * radarRadius
                      const x = radarCenter + r * Math.cos(angle)
                      const y = radarCenter + r * Math.sin(angle)
                      return `${x.toFixed(1)},${y.toFixed(1)}`
                    }).join(' ')
                    return (
                      <polygon
                        key={lIdx}
                        points={pts}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth={lIdx === 3 ? '1.5' : '1'}
                        strokeDasharray={lIdx < 3 ? '2 3' : 'none'}
                        opacity={0.6 + lIdx * 0.1}
                      />
                    )
                  })}

                  {/* Spokes */}
                  {[0, 1, 2, 3, 4].map((step) => {
                    const angle = (step * 2 * Math.PI) / 5 - Math.PI / 2
                    const x = radarCenter + radarRadius * Math.cos(angle)
                    const y = radarCenter + radarRadius * Math.sin(angle)
                    return (
                      <line
                        key={step}
                        x1={radarCenter}
                        y1={radarCenter}
                        x2={x}
                        y2={y}
                        stroke="var(--border)"
                        strokeWidth="1"
                        opacity="0.7"
                      />
                    )
                  })}

                  {/* Candidate Score Polygon */}
                  <polygon
                    points={pentagonPoints}
                    fill="rgba(94, 207, 168, 0.18)"
                    stroke="var(--amber)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="radar-polygon"
                  />

                  {/* Vertices */}
                  {radarDimensions.map((dim, i) => {
                    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
                    const r = (dim.score / 10) * radarRadius
                    const x = radarCenter + r * Math.cos(angle)
                    const y = radarCenter + r * Math.sin(angle)
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="var(--amber)"
                        stroke="var(--surface)"
                        strokeWidth="1.5"
                      />
                    )
                  })}
                </svg>

                <div className="radar-breakdown">
                  {radarDimensions.map((dim, i) => (
                    <div key={i} className="radar-breakdown__item">
                      <div className="radar-breakdown__meta">
                        <span className="radar-dim-name">{dim.label}</span>
                        <span className="radar-dim-score">{dim.score.toFixed(1)}/10</span>
                      </div>
                      <div className="radar-bar-track">
                        <span className="radar-bar-fill" style={{ width: `${(dim.score / 10) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Longitudinal Tracking: What Improved vs Persistent Habits */}
            {report.comparison && (
              <div className="report__comparison-card">
                <div className="report__comparison-header">
                  <div>
                    <span className="eyebrow">Performance Trajectory</span>
                    <h3>{report.comparison.has_previous ? "What Improved From Last Time" : "Baseline Performance Established"}</h3>
                  </div>
                  {report.comparison.has_previous && report.comparison.filler_delta < 0 && (
                    <span className="chip chip--success">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: '4px' }} aria-hidden="true">
                        <path d="M2 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {Math.abs(report.comparison.filler_delta)} fewer filler words
                    </span>
                  )}
                </div>
                <p className="report__comparison-message">{report.comparison.message}</p>

                <div className="report__columns" style={{ marginTop: '16px' }}>
                  {report.comparison.improvements?.length > 0 && (
                    <div className="comparison-box comparison-box--improved">
                      <h4>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: '6px' }} aria-hidden="true">
                          <path d="M7 11V3M3.5 6.5L7 3l3.5 3.5" stroke="var(--live)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Measurable Improvements
                      </h4>
                      <ul>
                        {report.comparison.improvements.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.comparison.persistent_issues?.length > 0 && (
                    <div className="comparison-box comparison-box--persistent">
                      <h4>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: '6px' }} aria-hidden="true">
                          <path d="M7 2L1 12h12L7 2zM7 6v3M7 10.5v.5" stroke="var(--danger)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Recurring Habits to Break
                      </h4>
                      <ul>
                        {report.comparison.persistent_issues.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Behavioral & Speech Diagnostics */}
            {report.behavioral_metrics && (
              <div className="report__behavioral-section">
                <div className="report__header" style={{ marginBottom: '16px' }}>
                  <span className="eyebrow">Speech &amp; Delivery Diagnostics</span>
                  <h2>Habits &amp; Delivery Telemetry</h2>
                </div>

                <div className="behavioral-grid">
                  {/* Filler words breakdown */}
                  <div className="behavioral-card">
                    <div className="card-top">
                      <span className="card-title">Filler Words</span>
                      <span className="card-stat">
                        {report.behavioral_metrics.filler_words?.total_count || 0} total
                      </span>
                    </div>
                    <p className="card-sub">
                      Density: {report.behavioral_metrics.filler_words?.frequency_per_100_words || 0} per 100 words
                    </p>
                    <div className="chips-wrap">
                      {report.behavioral_metrics.filler_words?.breakdown?.length > 0 ? (
                        report.behavioral_metrics.filler_words.breakdown.map((f, i) => (
                          <span key={i} className="chip chip--filler">
                            "{f.word}": {f.count}
                          </span>
                        ))
                      ) : (
                        <span className="chip chip--success">Zero verbal fillers detected — clear delivery.</span>
                      )}
                    </div>
                  </div>

                  {/* Repeated words */}
                  <div className="behavioral-card">
                    <div className="card-top">
                      <span className="card-title">Repeated Crutch Words</span>
                      <span className="card-stat">
                        {report.behavioral_metrics.repeated_words?.length || 0} detected
                      </span>
                    </div>
                    <p className="card-sub">Words repeated frequently across turns:</p>
                    <div className="chips-wrap">
                      {report.behavioral_metrics.repeated_words?.length > 0 ? (
                        report.behavioral_metrics.repeated_words.map((r, i) => (
                          <span key={i} className="chip chip--warning">
                            "{r.word}": {r.count}x
                          </span>
                        ))
                      ) : (
                        <span className="chip chip--success">Diverse, non-repetitive vocabulary.</span>
                      )}
                    </div>
                  </div>

                  {/* Delivery pace & Audio Cadence Waveform */}
                  <div className="behavioral-card">
                    <div className="card-top">
                      <span className="card-title">Pacing &amp; Conciseness</span>
                      <span className="badge-pace">
                        {report.behavioral_metrics.delivery_and_pacing?.pace_assessment || 'Optimal'}
                      </span>
                    </div>

                    {/* Speech Delivery Rhythm Barometer */}
                    <div className="cadence-barometer" aria-hidden="true" title="Pacing telemetry">
                      <div className="cadence-spectrum">
                        <span className="cad-bar" style={{ height: '35%' }} />
                        <span className="cad-bar" style={{ height: '60%' }} />
                        <span className="cad-bar" style={{ height: '85%' }} />
                        <span className="cad-bar cad-bar--target" style={{ height: '100%' }} />
                        <span className="cad-bar cad-bar--target" style={{ height: '95%' }} />
                        <span className="cad-bar" style={{ height: '70%' }} />
                        <span className="cad-bar" style={{ height: '40%' }} />
                      </div>
                      <div className="cadence-scale">
                        <span>Slow</span>
                        <span className="cadence-sweet-spot">Target (130-150 WPM)</span>
                        <span>Fast</span>
                      </div>
                    </div>

                    <p className="card-sub">
                      Avg words per turn: <strong>{report.behavioral_metrics.delivery_and_pacing?.avg_words_per_turn || 0}</strong>
                    </p>
                    <p className="pacing-notes">
                      {report.behavioral_metrics.delivery_and_pacing?.notes || 'Good conversational response length.'}
                    </p>
                  </div>
                </div>

                {/* Grammar & Phrasing Critique */}
                {report.behavioral_metrics.grammar_issues?.length > 0 && (
                  <div className="report__grammar-critique">
                    <h3>Grammar &amp; Phrasing Slips</h3>
                    <div className="grammar-cards">
                      {report.behavioral_metrics.grammar_issues.map((g, i) => (
                        <div key={i} className="grammar-card">
                          <div className="grammar-card__issue">
                            <strong>Issue:</strong> {g.issue}
                          </div>
                          {g.example && (
                            <div className="grammar-card__example">
                              <span>You said:</span> <em>"{g.example.replace(/^"|"$/g, '')}"</em>
                            </div>
                          )}
                          <div className="grammar-card__suggestion">
                            <span>Professional phrasing:</span> <strong>{g.suggestion}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real Interview Watch-Outs */}
                {report.behavioral_metrics.real_interview_tips?.length > 0 && (
                  <div className="report__real-interview-tips">
                    <h3>Real Interview Cues to Take Care Of</h3>
                    <ul className="real-tips-list">
                      {report.behavioral_metrics.real_interview_tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
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

            {/* ATS Resume Alignment Link Card */}
            <div className="report__ats-banner">
              <div className="ats-banner__content">
                <span className="eyebrow">Resume Alignment</span>
                <h3>Want to maximize your interview conversion?</h3>
                <p>Ensure your resume passes ATS filters and highlights the right action verbs, metrics, and technical keywords for this role.</p>
              </div>
              <Link to="/ats" className="report__btn report__btn--secondary" style={{ whiteSpace: 'nowrap' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: '6px' }} aria-hidden="true">
                  <path d="M2 12l9-9M11 9V3H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Check ATS Score
              </Link>
            </div>

            {report.engine && report.engine.includes('offline') && (
              <p className="report__engine-note">
                Scored with the offline fallback (no LLM key configured on the backend) — feedback is
                heuristic, not model-generated.
              </p>
            )}

            <div className="report__actions">
              <span className="report__xp">You now have {xp} XP</span>
              <button type="button" onClick={() => window.print()} className="report__btn report__btn--secondary">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: '6px' }} aria-hidden="true">
                  <path d="M3 5V2h8v3M3 10H2a1 1 0 01-1-1V6a1 1 0 011-1h10a1 1 0 011 1v3a1 1 0 01-1 1h-1M3 8h8v4H3V8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                Download / Print PDF
              </button>
              <Link to="/ats" className="report__btn report__btn--secondary">ATS Scanner</Link>
              <Link to="/leaderboard" className="report__btn report__btn--secondary">View leaderboard</Link>
              <Link to="/" className="report__btn report__btn--primary">Practice again</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
