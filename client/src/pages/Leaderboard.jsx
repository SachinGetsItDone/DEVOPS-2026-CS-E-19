import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getLeaderboard, ApiError } from '../lib/api.js'
import './Leaderboard.css'

const LEAGUE_LABEL = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
}

const LEAGUE_THRESHOLDS = [
  { league: 'bronze', next: 'silver', req: 500 },
  { league: 'silver', next: 'gold', req: 1500 },
  { league: 'gold', next: 'platinum', req: 3000 },
  { league: 'platinum', next: 'diamond', req: 5000 },
  { league: 'diamond', next: 'max', req: 10000 },
]

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      setStatus('needs-login')
      return
    }
    let cancelled = false
    getLeaderboard(20)
      .then((data) => {
        if (cancelled) return
        setRows(Array.isArray(data) ? data : [])
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load the leaderboard.')
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [user])

  const userRowIndex = rows.findIndex((r) => r.user_id === user?.id)
  const userRow = userRowIndex !== -1 ? rows[userRowIndex] : null
  const userXp = userRow ? userRow.xp : 0
  const userLeague = userRow ? userRow.league : 'bronze'

  const currentTier = LEAGUE_THRESHOLDS.find((t) => t.league === userLeague) || LEAGUE_THRESHOLDS[0]
  const xpToNext = Math.max(0, currentTier.req - userXp)
  const progressPct = Math.min(100, Math.max(10, (userXp / currentTier.req) * 100))

  const topThree = rows.slice(0, 3)
  const remainingRows = rows.slice(3)

  return (
    <div className="leaderboard-page">
      <Navbar />
      <div className="container leaderboard">
        <div className="leaderboard__header">
          <div>
            <span className="eyebrow">Cohort Rankings &amp; Standing</span>
            <h1>Competitive Standing</h1>
          </div>
          <div className="leaderboard__meta-legend">
            <span className="legend-tag">UPDATED CONTINUOUSLY</span>
          </div>
        </div>

        {status === 'needs-login' && (
          <div className="leaderboard__empty-card">
            <p className="leaderboard__empty">
              <Link to="/login" className="login-link">Sign in</Link> to inspect your rank, track cohort pacing, and climb the league standings.
            </p>
          </div>
        )}

        {status === 'loading' && (
          <div className="leaderboard__list" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="leaderboard__row leaderboard__row--skeleton">
                <span className="sk sk--rank" />
                <span className="sk sk--name" />
                <span className="sk sk--league" />
                <span className="sk sk--xp" />
              </div>
            ))}
          </div>
        )}

        {status === 'error' && <p className="leaderboard__empty leaderboard__empty--error">{error}</p>}

        {status === 'ready' && rows.length === 0 && (
          <p className="leaderboard__empty">No one's completed a practice interview yet — be the first to set the benchmark.</p>
        )}

        {status === 'ready' && rows.length > 0 && (
          <>
            {/* Visual 1: Personal League Trajectory Barometer */}
            {user && (
              <div className="user-trajectory-card">
                <div className="trajectory-top">
                  <div className="trajectory-rank-col">
                    <span className="eyebrow">Your Standing</span>
                    <div className="trajectory-rank-val">
                      {userRowIndex !== -1 ? `#${userRowIndex + 1}` : 'Unranked'}
                      <span className="trajectory-league-pill">
                        {LEAGUE_LABEL[userLeague] || 'Bronze'} League
                      </span>
                    </div>
                  </div>
                  <div className="trajectory-xp-col">
                    <span className="eyebrow">Accumulated XP</span>
                    <span className="trajectory-xp-val">{userXp} XP</span>
                  </div>
                </div>

                <div className="trajectory-progress-wrap">
                  <div className="trajectory-progress-meta">
                    <span>Current Tier: {LEAGUE_LABEL[userLeague]}</span>
                    <span>
                      {currentTier.next !== 'max'
                        ? `${xpToNext} XP to ${LEAGUE_LABEL[currentTier.next]}`
                        : 'Max League Attained'}
                    </span>
                  </div>
                  <div className="trajectory-track">
                    <span className="trajectory-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Visual 2: The Top 3 Podium Showcase */}
            {topThree.length >= 3 && (
              <div className="podium-showcase" aria-label="Top 3 candidates">
                {/* 2nd place */}
                <div className="podium-card podium-card--silver">
                  <div className="podium-crest">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" stroke="#e6ece7" strokeWidth="1.5" fill="var(--surface-high)" />
                      <path d="M14 18l6-6 6 6M14 24l6-6 6 6" stroke="#e6ece7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="podium-rank-badge">#2</span>
                  </div>
                  <h3 className="podium-name">{topThree[1].name}</h3>
                  <span className="podium-league">{LEAGUE_LABEL[topThree[1].league] || topThree[1].league}</span>
                  <span className="podium-xp">{topThree[1].xp} XP</span>
                </div>

                {/* 1st place */}
                <div className="podium-card podium-card--gold">
                  <div className="podium-crest">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <polygon points="24,3 41,13 41,35 24,45 7,35 7,13" stroke="var(--amber)" strokeWidth="2" fill="var(--surface-high)" />
                      <circle cx="24" cy="24" r="8" stroke="var(--amber)" strokeWidth="1.5" />
                      <path d="M24 18v12M18 24h12" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="podium-rank-badge podium-rank-badge--gold">#1</span>
                  </div>
                  <h3 className="podium-name podium-name--gold">{topThree[0].name}</h3>
                  <span className="podium-league podium-league--gold">{LEAGUE_LABEL[topThree[0].league] || topThree[0].league}</span>
                  <span className="podium-xp podium-xp--gold">{topThree[0].xp} XP</span>
                </div>

                {/* 3rd place */}
                <div className="podium-card podium-card--bronze">
                  <div className="podium-crest">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" stroke="#46b08c" strokeWidth="1.5" fill="var(--surface-high)" />
                      <line x1="20" y1="12" x2="20" y2="28" stroke="#46b08c" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="20" cy="20" r="3" fill="#46b08c" />
                    </svg>
                    <span className="podium-rank-badge">#3</span>
                  </div>
                  <h3 className="podium-name">{topThree[2].name}</h3>
                  <span className="podium-league">{LEAGUE_LABEL[topThree[2].league] || topThree[2].league}</span>
                  <span className="podium-xp">{topThree[2].xp} XP</span>
                </div>
              </div>
            )}

            {/* General table listing */}
            <div className="leaderboard__list">
              <div className="leaderboard__list-header">
                <span>Rank</span>
                <span>Candidate</span>
                <span>League</span>
                <span style={{ textAlign: 'right' }}>Telemetry XP</span>
              </div>
              {(topThree.length >= 3 ? remainingRows : rows).map((row, i) => {
                const actualRank = topThree.length >= 3 ? i + 4 : i + 1
                return (
                  <div
                    key={row.user_id}
                    className={`leaderboard__row ${row.user_id === user?.id ? 'leaderboard__row--me' : ''}`}
                  >
                    <span className="leaderboard__rank">#{actualRank}</span>
                    <span className="leaderboard__name">{row.name}</span>
                    <span className={`leaderboard__league leaderboard__league--${row.league}`}>
                      {LEAGUE_LABEL[row.league] || row.league}
                    </span>
                    <span className="leaderboard__xp">{row.xp} XP</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
