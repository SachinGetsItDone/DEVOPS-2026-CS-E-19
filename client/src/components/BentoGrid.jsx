import { useState, useRef, useEffect } from 'react'
import LiveAcousticVisualizer from './LiveAcousticVisualizer.jsx'
import Counter from './Counter.jsx'
import './BentoGrid.css'

export default function BentoGrid({ onOpenInterview }) {
  const [isPlayingDemo, setIsPlayingDemo] = useState(false)
  const [simulatedDecibels, setSimulatedDecibels] = useState(-18)

  useEffect(() => {
    let interval
    if (isPlayingDemo) {
      interval = setInterval(() => {
        setSimulatedDecibels(-12 + Math.floor((Math.random() - 0.5) * 6))
      }, 350)
    } else {
      setSimulatedDecibels(-24)
    }
    return () => clearInterval(interval)
  }, [isPlayingDemo])

  return (
    <section className="bento-section container" id="features">
      <div className="section-head">
        <span className="eyebrow">Engine Architecture</span>
        <h2 className="section__title">Surgical acoustic measurement for high-stakes interviews</h2>
        <p className="section__sub">
          Engineered as a diagnostic instrument. Every word, pause, and architectural rationale
          is captured, transcribed, and evaluated without subjective bias.
        </p>
      </div>

      <div className="bento-grid">
        {/* Card 1: 8-column wide anchor */}
        <div className="bento-card bento-card--large bento-card--acoustic">
          <div className="bento-card__inner">
            <div className="bento-card__header">
              <div>
                <span className="pill pill--live">Real-Time Telemetry</span>
                <h3 className="bento-card__title">Acoustic Cadence &amp; Speech Engine</h3>
                <p className="bento-card__desc">
                  Sub-250ms vocal turn loop with real-time waveform processing and speech rate monitoring.
                </p>
              </div>
              <button
                className={`btn btn--sm ${isPlayingDemo ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                aria-pressed={isPlayingDemo}
              >
                <span className={`status-indicator ${isPlayingDemo ? 'status-indicator--active' : ''}`} />
                {isPlayingDemo ? 'Mute Telemetry' : 'Simulate Cadence'}
              </button>
            </div>

            <div className="bento-visualizer-box">
              <div className="telemetry-bar-info">
                <span className="telemetry-tag">SPECTRAL FLUIDITY: <strong>{isPlayingDemo ? 'ACTIVE' : 'STANDBY'}</strong></span>
                <span className="telemetry-tag">SIGNAL: <strong>{simulatedDecibels} dB</strong></span>
                <span className="telemetry-tag">LATENCY: <strong>214 ms</strong></span>
              </div>
              <LiveAcousticVisualizer isActive={isPlayingDemo} barCount={42} height={70} theme="teal" />
            </div>

            <div className="bento-card__footer-metrics">
              <div className="metric-chip">
                <span className="metric-chip__label">STT Accuracy</span>
                <span className="metric-chip__value"><Counter value={98.4} decimals={1} suffix="%" /></span>
              </div>
              <div className="metric-chip">
                <span className="metric-chip__label">Turn Processing</span>
                <span className="metric-chip__value">&lt; 240 ms</span>
              </div>
              <div className="metric-chip">
                <span className="metric-chip__label">Evaluation Depth</span>
                <span className="metric-chip__value">5 Competencies</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: 4-column Semantic Matcher */}
        <div className="bento-card bento-card--match">
          <div className="bento-card__inner">
            <div>
              <span className="pill pill--warn">Semantic Radar</span>
              <h3 className="bento-card__title">Résumé × JD Grounding</h3>
              <p className="bento-card__desc">
                Extracts your exact claims and interrogates technical depth against what the role actually demands.
              </p>
            </div>

            <div className="radar-tags-container">
              <span className="skill-pill skill-pill--matched">✓ Distributed Systems</span>
              <span className="skill-pill skill-pill--matched">✓ React 18 Architecture</span>
              <span className="skill-pill skill-pill--matched">✓ Token Refresh Auth</span>
              <span className="skill-pill skill-pill--gap">⚠ P99 Tail Latency</span>
              <span className="skill-pill skill-pill--gap">⚠ Cache Invalidation</span>
            </div>

            <div className="radar-match-score">
              <span>JD Competency Alignment</span>
              <strong><Counter value={84} suffix="%" /></strong>
            </div>
          </div>
        </div>

        {/* Card 3: 4-column Behavioral Pacing */}
        <div className="bento-card">
          <div className="bento-card__inner">
            <div>
              <span className="pill pill--muted">Cadence Analysis</span>
              <h3 className="bento-card__title">Delivery Diagnostics</h3>
              <p className="bento-card__desc">
                Tracks words-per-minute, filler frequency, and vocal pauses under pressure.
              </p>
            </div>

            <div className="pacing-hud">
              <div className="pacing-circle">
                <span className="pacing-val"><Counter value={142} /></span>
                <span className="pacing-unit">WPM</span>
              </div>
              <div className="pacing-details">
                <div className="pacing-row">
                  <span>Pace Rating</span>
                  <strong className="text-success">Optimal</strong>
                </div>
                <div className="pacing-row">
                  <span>Filler Words</span>
                  <strong>0.8% freq</strong>
                </div>
                <div className="pacing-row">
                  <span>Repeated Phrases</span>
                  <strong>Low</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: 4-column Instant Scoring */}
        <div className="bento-card">
          <div className="bento-card__inner">
            <div>
              <span className="pill pill--warn">Diagnostic Readout</span>
              <h3 className="bento-card__title">Scored Dossier</h3>
              <p className="bento-card__desc">
                No vague compliments. Get explicit strengths, named blindspots, and an actionable roadmap.
              </p>
            </div>

            <div className="score-bars-preview">
              <div className="score-row">
                <span className="score-label">System Design</span>
                <span className="score-val">8.8/10</span>
                <div className="meter"><span style={{ width: '88%' }} /></div>
              </div>
              <div className="score-row">
                <span className="score-label">Problem Decomposition</span>
                <span className="score-val">7.4/10</span>
                <div className="meter"><span style={{ width: '74%' }} /></div>
              </div>
              <div className="score-row">
                <span className="score-label">Technical Fluency</span>
                <span className="score-val">9.0/10</span>
                <div className="meter"><span style={{ width: '90%' }} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: 4-column Gamification & Standings */}
        <div className="bento-card">
          <div className="bento-card__inner">
            <div>
              <span className="pill pill--ok">Placement League</span>
              <h3 className="bento-card__title">Streak &amp; Cohort XP</h3>
              <p className="bento-card__desc">
                Earn XP for technical accuracy and climb weekly divisions alongside your campus batch.
              </p>
            </div>

            <div className="league-preview-box">
              <div className="league-badge">
                <span className="league-icon">💎</span>
                <div>
                  <strong>Diamond League</strong>
                  <span className="league-sub">Top 4% of Candidates</span>
                </div>
              </div>
              <div className="league-progress-track">
                <div className="league-progress-fill" style={{ width: '78%' }} />
              </div>
              <div className="league-stats-row">
                <span>Current Streak: <strong>5 Days</strong></span>
                <span>Reward: <strong>+150 XP</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
