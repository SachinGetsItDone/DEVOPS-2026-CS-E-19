import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import PreInterviewModal from '../components/PreInterviewModal.jsx'
import { useInterviewSession } from '../context/InterviewSessionContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import AntigravityField from '../components/AntigravityField.jsx'
// import ThreeHeroScene from '../components/ThreeHeroScene.jsx' // previous hero bg — swap back to revert
import BentoGrid from '../components/BentoGrid.jsx'
import AntigravitySolutions from '../components/AntigravitySolutions.jsx'
import MagneticButton from '../components/MagneticButton.jsx'
import Counter from '../components/Counter.jsx'
import './Home.css'

const HERO_HEADLINE = 'Walk into the real interview already having done this one.'

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()
  const { startSession, isStarting, startError } = useInterviewSession()
  const { user } = useAuth()
  const proofRef = useRef(null)

  // Pointer-tracked spotlight inside the session proof card
  useEffect(() => {
    const el = proofRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return
    let raf = 0
    function onMove(e) {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const pct = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
        el.style.setProperty('--spot-x', `${(pct * 100).toFixed(1)}%`)
      })
    }
    el.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
    }
  }, [])

  function handleTakeInterviewClick() {
    setModalOpen(true)
  }

  async function handleModalSubmit(data) {
    const started = await startSession(data)
    if (started) {
      setModalOpen(false)
      navigate('/interview')
    }
  }

  return (
    <div className="home">
      <Navbar onOpenInterview={handleTakeInterviewClick} />

      {/* Hero Section with Interactive 3D Acoustic Field */}
      <section className="hero-frame container">
        {/* Cursor-reactive dash field (Google-Antigravity-style halo).
            Replaces the 3D desk scene as the hero background — content,
            layout, and buttons above it are untouched. To revert, swap
            <AntigravityField /> back to <ThreeHeroScene />. */}
        <AntigravityField />
        <div className="hero-frame__corner hero-frame__corner--tl">Prepline / study room</div>
        <div className="hero-frame__corner hero-frame__corner--tr">Practice engine</div>

        <div className="hero__grid">
          <div className="hero__copy">
            <span className="eyebrow">AI Mock-Interview Engine</span>
            <h1 className="hero__title">
              Walk into the real interview already having done this one.
            </h1>
            <p className="hero__sub">
              Upload your resume and the target job description. The interviewer asks
              adaptive questions anchored to both — measuring delivery, reasoning,
              and confidence with zero subjective fluff.
            </p>
            <div className="hero__actions">
              <MagneticButton
                className="btn btn--primary"
                onClick={handleTakeInterviewClick}
                pullFactor={0.32}
              >
                <span>Take an AI Interview</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7h9M8 3.5 11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </MagneticButton>
              <a href="#how-it-works" className="btn btn--ghost">Protocol walkthrough</a>
              <Link to="/ats" className="btn btn--secondary">Scan ATS Score</Link>
            </div>

            <div className="hero__waveform" aria-hidden="true" title="Acoustic cadence visualizer">
              <div className="hero__waveform-legend">VOX CADENCE (240ms)</div>
              <div className="hero__waveform-bars">
                {Array.from({ length: 28 }).map((_, i) => (
                  <span key={i} style={{ '--i': i }} />
                ))}
              </div>
            </div>
          </div>

          {/* Session proof: a real transcript fragment with acoustic telemetry HUD */}
          <aside className="hero__proof" ref={proofRef} aria-label="Example interview exchange">
            <div className="hero__spot" aria-hidden="true" />
            <div className="proof__head">
              <span className="proof__rec">
                <span className="proof__rec-dot" />
                REC 00:42
              </span>
              <span className="proof__meta-metric">STT 98.4%</span>
              <span className="proof__role">Frontend Engineer</span>
            </div>

            <div className="proof__acoustic-meter" aria-hidden="true">
              <div className="acoustic-bar acoustic-bar--active" style={{ height: '45%' }} />
              <div className="acoustic-bar acoustic-bar--active" style={{ height: '70%' }} />
              <div className="acoustic-bar acoustic-bar--active" style={{ height: '90%' }} />
              <div className="acoustic-bar acoustic-bar--active" style={{ height: '60%' }} />
              <div className="acoustic-bar acoustic-bar--active" style={{ height: '35%' }} />
              <div className="acoustic-bar" style={{ height: '15%' }} />
              <div className="acoustic-bar" style={{ height: '10%' }} />
              <span className="acoustic-db">-12 dB</span>
            </div>

            <p className="proof__q">“Walk me through how you isolated that 401 token refresh loop in your state layer.”</p>
            <p className="proof__a">Inspected the request interceptor, noted token expiry race conditions, and queued retry promises behind a mutex…</p>

            <div className="proof__foot">
              <span className="proof__score">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 6l1.5 1.5L8 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Scored 8.8/10
              </span>
              <span className="proof__strength">Strength: mutex concurrency control</span>
            </div>
          </aside>
        </div>
      </section>

      {/* Asymmetric 12-Column Bento Grid */}
      <BentoGrid onOpenInterview={handleTakeInterviewClick} />

      {/* 3-Step Protocol Walkthrough */}
      <section className="steps container" id="how-it-works">
        <span className="eyebrow">The Calibration Protocol</span>
        <h2 className="section__title">Three steps, one honest read on where you stand</h2>
        <div className="steps__grid">
          <div className="step">
            <div className="step__header">
              <span className="step__num">01</span>
              <div className="step__visual-svg" aria-hidden="true">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect x="6" y="6" width="22" height="28" rx="3" stroke="var(--border)" strokeWidth="1.5" fill="var(--surface-high)" />
                  <line x1="11" y1="12" x2="21" y2="12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="11" y1="17" x2="23" y2="17" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="11" y1="22" x2="18" y2="22" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                  <rect x="16" y="12" width="22" height="26" rx="3" stroke="var(--amber)" strokeWidth="1.5" fill="var(--surface)" />
                  <line x1="21" y1="18" x2="31" y2="18" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="21" y1="23" x2="33" y2="23" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="27" cy="27" r="7" fill="var(--surface-high)" stroke="var(--amber)" strokeWidth="1.5" />
                  <path d="M25 27h4M27 25v4" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <h3>Upload résumé &amp; target JD</h3>
            <p>The reasoning model parses both before synthesizing candidate-specific technical probes.</p>
          </div>

          <div className="step">
            <div className="step__header">
              <span className="step__num">02</span>
              <div className="step__visual-svg" aria-hidden="true">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect x="16" y="8" width="12" height="18" rx="6" stroke="var(--live)" strokeWidth="1.5" fill="var(--surface-high)" />
                  <path d="M11 21a11 11 0 0022 0" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="22" y1="32" x2="22" y2="38" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="16" y1="38" x2="28" y2="38" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="22" cy="17" r="2.5" fill="var(--live)" />
                  <path d="M7 17a15 15 0 014-7M37 17a15 15 0 00-4-7" stroke="var(--live)" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 3" />
                </svg>
              </div>
            </div>
            <h3>Speak out loud in real time</h3>
            <p>Live microphone capture with continuous speech recognition and adaptive follow-up challenges.</p>
          </div>

          <div className="step">
            <div className="step__header">
              <span className="step__num">03</span>
              <div className="step__visual-svg" aria-hidden="true">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <circle cx="22" cy="22" r="16" stroke="var(--border)" strokeWidth="1.5" />
                  <circle cx="22" cy="22" r="16" stroke="var(--amber)" strokeWidth="2" strokeDasharray="100" strokeDashoffset="35" strokeLinecap="round" />
                  <circle cx="22" cy="22" r="4" fill="var(--amber)" />
                  <line x1="22" y1="22" x2="29" y2="15" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <h3>Unvarnished scored dossier</h3>
            <p>Competency-by-competency evaluation, filler word frequency, and concrete improvement roadmap.</p>
          </div>
        </div>
      </section>

      {/* The two halves of the product: interview room and progress record */}
      <AntigravitySolutions onTakeInterview={handleTakeInterviewClick} />

      {/* Post-Interview Report Teaser */}
      <section className="report-teaser container">
        <div className="report-teaser__copy">
          <span className="eyebrow">Post-interview Analytics</span>
          <h2 className="section__title">See exactly where the interview succeeded or stalled</h2>
          <p>
            Every session ends with a comprehensive diagnostic report: an overall score,
            individual competency breakdown bars, speech cadence diagnostics, and targeted roadmap items.
          </p>
          <div className="report-teaser__pill-list">
            <span className="teaser-pill">System Architecture</span>
            <span className="teaser-pill">Cadence &amp; Pace</span>
            <span className="teaser-pill">Behavioral Grounding</span>
          </div>
        </div>

        <div className="report-teaser__card" aria-hidden="true">
          <div className="report-teaser__top">
            <div className="report-teaser__ring">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="var(--surface-high)" strokeWidth="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="var(--amber)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="201"
                  strokeDashoffset="44"
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <div className="ring-text">8.2<span>/10</span></div>
            </div>
            <div className="report-teaser__verdict">
              <span className="eyebrow">Evaluated Dossier</span>
              <span className="verdict-status">High Technical Conviction</span>
              <span className="verdict-delta">+0.8 vs cohort baseline</span>
            </div>
          </div>

          <div className="report-teaser__bars">
            <div className="tbar-row">
              <div className="tbar-meta">
                <span>System Design</span>
                <span>8.8/10</span>
              </div>
              <div className="tbar"><span style={{ width: '88%' }} /></div>
            </div>
            <div className="tbar-row">
              <div className="tbar-meta">
                <span>Problem Decomposition</span>
                <span>7.4/10</span>
              </div>
              <div className="tbar"><span style={{ width: '74%' }} /></div>
            </div>
            <div className="tbar-row">
              <div className="tbar-meta">
                <span>Fluency &amp; Cadence</span>
                <span>9.0/10</span>
              </div>
              <div className="tbar"><span style={{ width: '90%' }} /></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer container" id="about">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '4px' }}>Prepline — Acoustic Practice Engine</strong>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              DEVOPS-2026-CS-E-19 • Calibrated for technical placement interviews &amp; campus cohorts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
            <Link to="/ats" style={{ color: 'var(--text-muted)' }}>ATS Scorer</Link>
            <Link to="/leaderboard" style={{ color: 'var(--text-muted)' }}>Leaderboard</Link>
            <a href="#features" style={{ color: 'var(--text-muted)' }}>Architecture</a>
          </div>
        </div>
      </footer>

      <PreInterviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        isSubmitting={isStarting}
        serverError={startError}
      />
    </div>
  )
}
