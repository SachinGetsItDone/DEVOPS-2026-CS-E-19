import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getLeaderboard, ApiError } from '../lib/api.js'
import './Leaderboard.css'

const LEAGUE_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond' }

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

  return (
    <div className="leaderboard-page">
      <Navbar />
      <div className="container leaderboard">
        <span className="eyebrow">By total XP</span>
        <h1>Leaderboard</h1>

        {status === 'needs-login' && (
          <p className="leaderboard__empty">
            <Link to="/login">Log in</Link> to see the leaderboard and where you rank.
          </p>
        )}
        {status === 'loading' && <p className="leaderboard__empty">Loading…</p>}
        {status === 'error' && <p className="leaderboard__empty leaderboard__empty--error">{error}</p>}
        {status === 'ready' && rows.length === 0 && (
          <p className="leaderboard__empty">No one's completed a practice interview yet — be the first.</p>
        )}

        {status === 'ready' && rows.length > 0 && (
          <div className="leaderboard__list">
            {rows.map((row, i) => (
              <div
                key={row.user_id}
                className={`leaderboard__row ${row.user_id === user?.id ? 'leaderboard__row--me' : ''}`}
              >
                <span className="leaderboard__rank">#{i + 1}</span>
                <span className="leaderboard__name">{row.name}</span>
                <span className={`leaderboard__league leaderboard__league--${row.league}`}>
                  {LEAGUE_LABEL[row.league] || row.league}
                </span>
                <span className="leaderboard__xp">{row.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
