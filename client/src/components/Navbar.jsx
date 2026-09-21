import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGame } from '../context/GameContext.jsx'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { xp, streak, loaded } = useGame()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand">
          <span className="navbar__dot" />
          Prepline
        </Link>
        <nav className="navbar__links">
          <a href="#how-it-works">How it works</a>
          <Link to="/leaderboard">Leaderboard</Link>
          {user && loaded && (
            <span className="navbar__stats" title={`${streak}-day streak`}>
              <span className="navbar__xp">{xp} XP</span>
              {streak > 0 && <span className="navbar__streak">🔥 {streak}</span>}
            </span>
          )}
          {user ? (
            <button className="navbar__login" onClick={handleLogout}>Log out</button>
          ) : (
            <Link to="/login" className="navbar__login">Log in</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
