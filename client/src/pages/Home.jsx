import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import PreInterviewModal from '../components/PreInterviewModal.jsx'
import { useInterviewSession } from '../context/InterviewSessionContext.jsx'
import './Home.css'

const FEATURES = [
  {
    tag: 'Core',
    title: '1:1 AI interview',
    body: "One interviewer, one seat. Questions are generated live from your resume against the job description you're targeting.",
  },
  {
    tag: 'Core',
    title: 'Speak, don\u2019t type',
    body: 'Answer out loud through your mic. The interviewer transcribes, evaluates, and replies in its own synthesized voice.',
  },
  {
    tag: 'Core',
    title: 'Resume + JD matching',
    body: "Upload once. Every question is anchored to what's actually on your resume and what the role actually asks for.",
  },
  {
    tag: 'Core',
    title: 'Instant scored report',
    body: 'A per-competency breakdown, concrete strengths, and named gaps — generated the moment you end the session.',
  },
  {
    tag: 'Core',
    title: 'XP & leaderboard',
    body: 'Every completed interview earns XP based on how you scored. Climb the weekly leaderboard as you keep practicing.',
  },
  {
    tag: 'Coming soon',
    title: 'AI group discussion',
    body: 'Hold your own in a panel-style discussion against multiple AI participants with distinct viewpoints.',
    muted: true,
  },
]

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()
  const { startSession, isStarting, startError } = useInterviewSession()

  async function handleModalSubmit(data) {
    const started = await startSession(data)
    if (started) {
      setModalOpen(false)
      navigate('/interview')
    }
  }

  return (
    <div className="home">
      <Navbar />

      <section className="hero-frame container">
        <div className="hero-frame__glow" aria-hidden="true" />
        <div className="hero-frame__corner hero-frame__corner--tl">Prepline / practice</div>
        <div className="hero-frame__corner hero-frame__corner--tr">Resume × JD matched</div>

        <div className="hero">
          <span className="eyebrow">AI-powered interview practice</span>
          <h1 className="hero__title">
            Walk into the real interview<br />already having done this one.
          </h1>
          <p className="hero__sub">
            Upload your resume and the job description. The interviewer asks
            questions built from both — then tells you exactly where you
            answered well, and where you didn't.
          </p>
          <div className="hero__actions">
            <button className="btn btn--primary" onClick={() => setModalOpen(true)}>
              Take an AI interview
            </button>
            <a href="#how-it-works" className="btn btn--ghost">How it works</a>
          </div>

          <div className="hero__waveform" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="steps container" id="how-it-works">
        <span className="eyebrow">How it works</span>
        <h2 className="section__title">Three steps, one honest read on where you stand</h2>
        <div className="steps__grid">
          <div className="step">
            <span className="step__num">01</span>
            <h3>Upload resume &amp; JD</h3>
            <p>The interviewer reads both before you ever get a question.</p>
          </div>
          <div className="step">
            <span className="step__num">02</span>
            <h3>Answer out loud</h3>
            <p>Real mic recording, real follow-up questions, no script.</p>
          </div>
          <div className="step">
            <span className="step__num">03</span>
            <h3>Get scored, honestly</h3>
            <p>Competency-by-competency feedback the moment you finish.</p>
          </div>
        </div>
      </section>

      <section className="features container">
        <span className="eyebrow">What's actually in here</span>
        <h2 className="section__title">Built, not promised</h2>
        <div className="features__grid">
          {FEATURES.map((f) => (
            <div className={`feature-card ${f.muted ? 'feature-card--muted' : ''}`} key={f.title}>
              <span className="feature-card__tag">{f.tag}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="report-teaser container">
        <div className="report-teaser__copy">
          <span className="eyebrow">Post-interview analytics</span>
          <h2 className="section__title">See exactly where the interview went well</h2>
          <p>
            Every session ends with a real report: an overall score, a bar
            for each competency, named strengths, and named gaps — not just
            a pass/fail.
          </p>
        </div>
        <div className="report-teaser__card" aria-hidden="true">
          <div className="report-teaser__ring">7.5<span>/10</span></div>
          <div className="report-teaser__bars">
            <div className="tbar"><span style={{ width: '82%' }} /></div>
            <div className="tbar"><span style={{ width: '64%' }} /></div>
            <div className="tbar"><span style={{ width: '90%' }} /></div>
          </div>
        </div>
      </section>

      <footer className="footer container" id="about">
        <p>Prepline — a student project. Built for practice, not perfection.</p>
      </footer>

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
