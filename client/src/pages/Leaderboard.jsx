import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import { useGame } from '../context/GameContext.jsx'
import { getLeaderboard, ApiError } from '../lib/api.js'
import './Leaderboard.css'

const LEAGUE_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' }

export default function Leaderboard() {
  const { userId } = useGame()
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getLeaderboard(20)
      .then((data) => {
        if (cancelled) return
        setRows(data?.rows ?? [])
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load the leaderboard.')
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="leaderboard-page">
      <Navbar />
      <div className="container leaderboard">
        <span className="eyebrow">This week</span>
        <h1>Leaderboard</h1>

        {status === 'loading' && <p className="leaderboard__empty">Loading…</p>}
        {status === 'error' && <p className="leaderboard__empty leaderboard__empty--error">{error}</p>}
        {status === 'ready' && rows.length === 0 && (
          <p className="leaderboard__empty">No one's completed a practice interview yet this week — be the first.</p>
        )}

        {status === 'ready' && rows.length > 0 && (
          <div className="leaderboard__list">
            {rows.map((row) => (
              <div
                key={row.rank}
                className={`leaderboard__row ${row.user_id === userId ? 'leaderboard__row--me' : ''}`}
              >
                <span className="leaderboard__rank">#{row.rank}</span>
                <span className="leaderboard__name">{row.name}</span>
                <span className={`leaderboard__league leaderboard__league--${row.league}`}>
                  {LEAGUE_LABEL[row.league] || row.league}
                </span>
                <span className="leaderboard__xp">{row.weekly_xp} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
