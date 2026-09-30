import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import PreInterviewModal from '../components/PreInterviewModal.jsx'
import { useInterviewSession } from '../context/InterviewSessionContext.jsx'
import LiveAcousticVisualizer from '../components/LiveAcousticVisualizer.jsx'

export default function HowItWorks() {
  const [modalOpen, setModalOpen] = useState(false)
  const { startSession, isStarting, startError } = useInterviewSession()
  const navigate = useNavigate()

  async function handleModalSubmit(data) {
    const started = await startSession(data)
    if (started) {
      setModalOpen(false)
      navigate('/interview')
    }
  }

  return (
    <div className="how-it-works-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Navbar onOpenInterview={() => setModalOpen(true)} />

      <main className="container" style={{ flex: 1, paddingBlock: 'var(--s10)' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center', marginBottom: 'var(--s10)' }}>
          <span className="eyebrow" style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 'var(--t-xs)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            System Protocol
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-h1)', margin: 'var(--s2) 0 var(--s4) 0', color: 'var(--text)' }}>
            How Prepline Calibrates Your Interview Read
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--t-body-lg)', lineHeight: '1.6' }}>
            Unlike generic mock-interview chatbots, Prepline models a realistic technical screening panel.
            Here is the step-by-step telemetry pipeline from voice capture to diagnostic dossier.
          </p>
        </div>

        {/* 4 Detailed Interactive Phase Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--s6)', maxWidth: '1080px', margin: '0 auto' }}>
          
          <div className="panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--s6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--s4)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: '1.25rem', fontWeight: 700 }}>01</span>
              <span className="pill pill--warn">Ingest Phase</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-h3)', marginBottom: 'var(--s2)' }}>
              Dual Document Cross-Referencing
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--t-sm)', lineHeight: '1.6' }}>
              Your résumé PDF and target job description are parsed into vector representations.
              The reasoning model extracts specific technical claims, architecture dependencies,
              and metrics to identify potential gaps before generating question 1.
            </p>
          </div>

          <div className="panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--s6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--s4)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--live)', fontSize: '1.25rem', fontWeight: 700 }}>02</span>
              <span className="pill pill--live">Acoustic Loop</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-h3)', marginBottom: 'var(--s2)' }}>
              Sub-250ms Vocal Capture
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--t-sm)', lineHeight: '1.6', marginBottom: 'var(--s3)' }}>
              Continuous speech recognition captures natural vocal pauses, hesitation markers, and
              cadence fluctuations under pressure without forcing you to type.
            </p>
            <div style={{ background: 'var(--bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }}>
              <LiveAcousticVisualizer isActive={true} barCount={24} height={40} theme="teal" />
            </div>
          </div>

          <div className="panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--s6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--s4)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: '1.25rem', fontWeight: 700 }}>03</span>
              <span className="pill pill--warn">Adaptive Probing</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-h3)', marginBottom: 'var(--s2)' }}>
              Depth-First Follow Up
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--t-sm)', lineHeight: '1.6' }}>
              When you mention an architecture choice (e.g. Redis caching or token interceptors),
              the engine dynamically branches to pressure-test edge cases: cache stampede,
              concurrency race conditions, and error boundaries.
            </p>
          </div>

          <div className="panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'var(--s6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--s4)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)', fontSize: '1.25rem', fontWeight: 700 }}>04</span>
              <span className="pill pill--ok">Diagnostic Dossier</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-h3)', marginBottom: 'var(--s2)' }}>
              Unbiased Performance Readout
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--t-sm)', lineHeight: '1.6' }}>
              Upon ending the session, you receive an instant score broken down across 5 competencies,
              speech pace metrics (WPM), filler-word frequency, and actionable roadmap recommendations.
            </p>
          </div>

        </div>

        {/* CTA Banner */}
        <div style={{ textAlign: 'center', marginTop: 'var(--s10)' }}>
          <button onClick={() => setModalOpen(true)} className="btn btn--primary" style={{ minWidth: '220px' }}>
            Initialize Interview Session →
          </button>
        </div>
      </main>

      <PreInterviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        isSubmitting={isStarting}
        serverError={startError}
      />
    </div>
  )
}
