import { useState } from 'react'
import { Link } from 'react-router-dom'
import './AntigravitySolutions.css'

export default function AntigravitySolutions({ onTakeInterview }) {
  const [activeTrack, setActiveTrack] = useState(null)

  return (
    <section
      className="tracks"
      data-active-track={activeTrack || ''}
      aria-labelledby="tracks-heading"
    >
      <div className="container tracks__inner">
        <header className="tracks__head">
          <span className="eyebrow" style={{ color: 'var(--accent)', marginBottom: '8px', display: 'inline-block' }}>Dual Practice Engine</span>
          <h2 id="tracks-heading" className="tracks__heading">
            Where the practice happens
          </h2>
          <p className="tracks__lede">
            One half is the room you answer in. The other is the record of what
            that answering has added up to.
          </p>
        </header>

        <div className="tracks__grid">
          <article
            className="tracks__track"
            onMouseEnter={() => setActiveTrack('left')}
            onMouseLeave={() => setActiveTrack(null)}
          >
            <div className="tracks__content">
              <span className="tracks__pill">Available at no charge</span>
              <h3 className="tracks__title">The interview room</h3>
              <p className="tracks__copy">
                Answer out loud, the way you would in the real thing. Every session
                is scored on structure, pacing and filler words, and the report
                names the one thing to fix before the next attempt.
              </p>
              <div className="tracks__cta">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={onTakeInterview}
                  onFocus={() => setActiveTrack('left')}
                  onBlur={() => setActiveTrack(null)}
                >
                  Start a mock interview
                </button>
              </div>
            </div>
          </article>

          <article
            className="tracks__track"
            onMouseEnter={() => setActiveTrack('right')}
            onMouseLeave={() => setActiveTrack(null)}
          >
            <div className="tracks__content">
              <span className="tracks__pill tracks__pill--accent">Now Available!</span>
              <h3 className="tracks__title">Your record</h3>
              <p className="tracks__copy">
                Sessions earn XP, and XP moves you between leagues. Streaks keep the
                habit going, and the leaderboard shows where this week puts you
                against everyone else practising.
              </p>
              <div className="tracks__cta">
                <Link
                  to="/leaderboard"
                  className="btn btn--secondary"
                  onFocus={() => setActiveTrack('right')}
                  onBlur={() => setActiveTrack(null)}
                >
                  See the leaderboard
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
