import { Link } from 'react-router-dom'
import './Footer.css'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Link to="/" className="footer__mark">
            <span className="navbar__dot" aria-hidden="true" />
            Prepline
          </Link>
          <p className="footer__tagline">
            Mock interviews scored against your real résumé and a real job description — so the
            first time you hear the hard question isn&rsquo;t in the room that counts.
          </p>
        </div>

        <nav className="footer__col" aria-label="Practice">
          <h2 className="footer__heading">Practice</h2>
          <Link to="/">Mock interview</Link>
          <Link to="/interview">Interview room</Link>
          <Link to="/ats">ATS calculator</Link>
        </nav>

        <nav className="footer__col" aria-label="Progress">
          <h2 className="footer__heading">Progress</h2>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/login">Log in</Link>
          <Link to="/register">Create an account</Link>
        </nav>

        <nav className="footer__col" aria-label="About">
          <h2 className="footer__heading">About</h2>
          <Link to="/how-it-works">How scoring works</Link>
          <a href="https://github.com/SachinGetsItDone/DEVOPS-2026-CS-E-19" target="_blank" rel="noreferrer">
            Source code
          </a>
        </nav>
      </div>

      <div className="container footer__base">
        <span>© {YEAR} Prepline</span>
        <span className="footer__note">
          Scores come from the Prepline engine and are for practice, not hiring decisions.
        </span>
      </div>
    </footer>
  )
}
