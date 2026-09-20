import { Link } from 'react-router-dom'
import { useGame } from '../context/GameContext.jsx'
import './Navbar.css'

export default function Navbar() {
  const { xp, streak, loaded } = useGame()

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
          {loaded && (
            <span className="navbar__stats" title={`${streak}-day streak`}>
              <span className="navbar__xp">{xp} XP</span>
              {streak > 0 && <span className="navbar__streak">🔥 {streak}</span>}
            </span>
          )}
          <button className="navbar__login">Log in</button>
        </nav>
      </div>
    </header>
  )
}
