import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGame } from '../context/GameContext.jsx'
import './Navbar.css'

export default function Navbar({ onOpenInterview = null }) {
  const { user, logout } = useAuth()
  const { xp, streak, loaded } = useGame()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  function handleLogout() {
    logout()
    navigate('/')
    setMobileMenuOpen(false)
  }

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <header className={`navbar ${isScrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand" aria-label="Prepline Home">
          <span className="navbar__dot" aria-hidden="true" />
          <span className="navbar__brand-text">Prepline</span>
          <span className="navbar__badge">v2.4</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="navbar__links" aria-label="Main Navigation">
          <Link
            to="/ats"
            className={`navbar__link ${location.pathname === '/ats' ? 'navbar__link--active' : ''}`}
          >
            ATS Scorer
          </Link>
          <Link
            to="/leaderboard"
            className={`navbar__link ${location.pathname === '/leaderboard' ? 'navbar__link--active' : ''}`}
          >
            Leaderboard
          </Link>
          {user && (
            <Link
              to="/history"
              className={`navbar__link ${location.pathname === '/history' ? 'navbar__link--active' : ''}`}
            >
              History
            </Link>
          )}
          <a href="/#features" className="navbar__link">
            Engine
          </a>
          <a href="/#how-it-works" className="navbar__link">
            Protocol
          </a>
          {user && loaded && (
            <div className="navbar__stats" title={`${streak}-day practice streak`}>
              <span className="navbar__xp">
                <span className="navbar__xp-icon">⚡</span>
                {xp} XP
              </span>
              {streak > 0 && (
                <span className="navbar__streak">
                  <span className="navbar__streak-fire">🔥</span>
                  {streak}d
                </span>
              )}
            </div>
          )}

          <div className="navbar__actions">
            {onOpenInterview ? (
              <button onClick={onOpenInterview} className="btn btn--sm btn--primary">
                Take Interview
              </button>
            ) : (
              <Link to="/interview" className="btn btn--sm btn--primary">
                Practice Room
              </Link>
            )}

            {user ? (
              <button className="navbar__login-btn" onClick={handleLogout}>
                Sign out
              </button>
            ) : (
              <Link to="/login" className="navbar__login-btn">
                Log in
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          className={`navbar__hamburger ${mobileMenuOpen ? 'navbar__hamburger--open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="navbar__mobile-drawer" role="dialog" aria-modal="true">
          <nav className="mobile-drawer__links">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/ats" onClick={() => setMobileMenuOpen(false)}>ATS Resume Scorer</Link>
            <Link to="/leaderboard" onClick={() => setMobileMenuOpen(false)}>Leaderboard &amp; XP</Link>
            <Link to="/interview" onClick={() => setMobileMenuOpen(false)}>Live Interview Room</Link>
            <hr className="mobile-drawer__divider" />
            {user ? (
              <button onClick={handleLogout} className="btn btn--secondary" style={{ width: '100%' }}>
                Log out ({user.name || user.email})
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link to="/login" className="btn btn--secondary" style={{ textAlign: 'center' }}>
                  Log in
                </Link>
                <Link to="/register" className="btn btn--primary" style={{ textAlign: 'center' }}>
                  Create Account
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
