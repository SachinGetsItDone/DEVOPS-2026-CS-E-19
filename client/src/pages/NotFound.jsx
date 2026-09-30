import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'

export default function NotFound() {
  return (
    <div className="not-found-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar />
      <main className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: '4rem' }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '3rem 2rem',
          boxShadow: 'var(--lift-2)'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--amber)',
            background: 'var(--amber-ghost)',
            border: '1px solid var(--amber-line)',
            padding: '4px 12px',
            borderRadius: '999px',
            marginBottom: '1.5rem'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
            404 SIGNAL DISSIPATION
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '0.75rem', color: 'var(--text)' }}>
            Frequency Unreachable
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            The requested chamber frequency does not correspond to an active interview or telemetry stream.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn--primary">
              Return to Practice Dashboard
            </Link>
            <Link to="/ats" className="btn btn--secondary">
              ATS Keyword Scorer
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
