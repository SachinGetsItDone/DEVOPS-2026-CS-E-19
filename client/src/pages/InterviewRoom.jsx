import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInterviewSession } from '../context/InterviewSessionContext.jsx'
import { useGame } from '../context/GameContext.jsx'
import { submitTurn, generateReport, ApiError } from '../lib/api.js'
import { speak, stopSpeaking } from '../lib/speech.js'
import './InterviewRoom.css'

export default function InterviewRoom() {
  const { session, clearSession } = useInterviewSession()
  const { refresh: refreshProgress } = useGame()
  const navigate = useNavigate()

  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [turnError, setTurnError] = useState('')
  const [transcript, setTranscript] = useState([])

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const audioPlayerRef = useRef(null)
  const transcriptEndRef = useRef(null)

  const isRecordingRef = useRef(false)
  const isProcessingRef = useRef(false)
  const pttStartTimeRef = useRef(0)

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    isProcessingRef.current = isProcessing
  }, [isProcessing])

  // Guard: you can't land here without having gone through the modal.
  useEffect(() => {
    if (!session) navigate('/')
  }, [session, navigate])

  // Seed transcript and speak the opening question out loud
  useEffect(() => {
    if (session) {
      const q = session.openingQuestion ||
        'Welcome — whenever you\'re ready, click "Start answering" and walk me through your background.'
      setTranscript([{ speaker: 'ai', text: q }])
      speak(q)
    }
    return () => stopSpeaking()
  }, [session])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  if (!session) return null

  async function handleEndInterview() {
    stopSpeaking()
    if (isEnding) return
    // Stop any in-flight recording so the mic is released cleanly.
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    // Only a real, scored interview is worth a report — if nothing was
    // ever answered, there's nothing for the backend to grade.
    const hasAnsweredATurn = transcript.some((line) => line.speaker === 'user')
    if (!hasAnsweredATurn || !session.interviewId) {
      setTurnError('Please answer or skip at least one question first so the AI can evaluate and generate your final report.')
      return
    }

    setIsEnding(true)
    try {
      const report = await generateReport(session.interviewId)
      await refreshProgress()
      const interviewId = session.interviewId
      clearSession()
      navigate(`/report/${interviewId}`, { state: { report } })
    } catch (err) {
      setTurnError(err instanceof ApiError ? err.message : 'Report generation error: ' + (err?.message || 'failed'))
      setIsEnding(false)
    }
  }

  function playInterviewerAudio(base64Audio) {
    if (!base64Audio || !audioPlayerRef.current) return
    audioPlayerRef.current.src = `data:audio/wav;base64,${base64Audio}`
    audioPlayerRef.current.play().catch(() => {
      // Autoplay can be blocked before the user has interacted with the
      // page; not fatal, the text is already in the transcript.
    })
  }

  function handleRepeatQuestion() {
    const lastAi = [...transcript].reverse().find((line) => line.speaker === 'ai')
    if (lastAi?.text) {
      speak(lastAi.text)
    }
  }

  async function sendTurn({ audioBlob, transcriptText }) {
    setIsProcessing(true)
    setTurnError('')
    try {
      const result = await submitTurn({
        interviewId: session.interviewId,
        audioBlob,
        transcript: transcriptText,
      })

      setTranscript((prev) => [
        ...prev,
        { speaker: 'user', text: result.user_transcript || transcriptText || '(No speech detected)' },
        { speaker: 'ai', text: result.response_text || "Let's move on to the next question." },
      ])
      if (result.response_text) {
        speak(result.response_text)
      } else {
        playInterviewerAudio(result.sts_audio_base64)
      }
    } catch (err) {
      setTurnError(err instanceof ApiError ? err.message : 'Could not reach the interviewer. Try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  async function startRecordingAudio() {
    if (isProcessingRef.current || isRecordingRef.current) return
    setTurnError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        sendTurn({ audioBlob })
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (err) {
      setTurnError('Microphone access was blocked. Allow mic access to answer out loud, or use "Skip question".')
    }
  }

  function stopRecordingAudio() {
    if (isRecordingRef.current && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  function handleToggleRecording() {
    if (isRecordingRef.current) {
      stopRecordingAudio()
    } else {
      startRecordingAudio()
    }
  }

  // Conflict-free Push-to-Talk / Toggle shortcut (Ctrl+M or Alt+M):
  // - Tap to toggle recording
  // - Hold >=400ms to speak, release to stop & send
  useEffect(() => {
    function isPttKey(e) {
      const isM = e.key === 'm' || e.key === 'M' || e.code === 'KeyM'
      return isM && (e.ctrlKey || e.altKey || e.metaKey)
    }

    function handleKeyDown(e) {
      if (isPttKey(e)) {
        e.preventDefault()
        e.stopPropagation()
        if (e.repeat) return

        pttStartTimeRef.current = Date.now()
        if (!isRecordingRef.current) {
          startRecordingAudio()
        } else {
          stopRecordingAudio()
        }
      }
    }

    function handleKeyUp(e) {
      if (isPttKey(e) || ((e.key === 'Control' || e.key === 'Meta' || e.key === 'Alt') && isRecordingRef.current)) {
        const holdDuration = Date.now() - pttStartTimeRef.current
        if (holdDuration >= 400 && isRecordingRef.current) {
          e.preventDefault()
          e.stopPropagation()
          stopRecordingAudio()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    window.addEventListener('keyup', handleKeyUp, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      window.removeEventListener('keyup', handleKeyUp, { capture: true })
    }
  }, [])

  function handleSkip() {
    if (isProcessing || isRecording) return
    sendTurn({ transcriptText: '(Candidate skipped this question.)' })
  }

  return (
    <div className="room">
      <header className="room__nav">
        <div className="room__nav-left">
          <span className="room__dot" />
          <span>Prepline</span>
          <span className="room__stream-badge">LIVE AUDIO SESSION</span>
        </div>
        <div className="room__nav-meta">
          <span className="eyebrow">{session.role || 'General role'}</span>
          <span className="room__resume-chip">{session.resumeName}</span>
          <span className="room__turn-badge">Turn {transcript.filter((l) => l.speaker === 'user').length + 1}</span>
        </div>
        <button className="room__end" onClick={handleEndInterview} disabled={isEnding}>
          {isEnding ? 'Scoring…' : 'End interview'}
        </button>
      </header>

      <div className="room__body">
        <div className="room__left">
          {/* Candidate acoustic telemetry console */}
          <div className={`panel panel--user ${isRecording ? 'panel--user-active' : ''}`}>
            <div className="panel__top-meta">
              <span className="eyebrow">Candidate Seat</span>
              <span className={`panel__live-badge ${isRecording ? 'panel__live-badge--hot' : ''}`}>
                {isRecording ? 'MIC HOT' : 'MUTED'}
              </span>
            </div>

            <div className={`panel__avatar panel__avatar--user ${isRecording ? 'panel__avatar--live' : ''}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="8" y="3" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
              </svg>
            </div>

            {/* Dynamic VU Meter bars */}
            <div className="vu-meter" aria-hidden="true" title="Mic acoustic level">
              <div className="vu-meter__bars">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`vu-bar ${isRecording ? 'vu-bar--live' : ''}`}
                    style={{ '--v-i': idx }}
                  />
                ))}
              </div>
              <div className="vu-meter__scale">
                <span>-36dB</span>
                <span>-18dB</span>
                <span>-6dB</span>
                <span>0dB</span>
              </div>
            </div>

            <span className={`panel__status ${isRecording ? 'panel__status--live' : ''}`}>
              {isRecording ? 'Listening out loud… (Ctrl+M to mute)' : 'Muted (Tap or hold Ctrl+M to answer)'}
            </span>
          </div>

          {/* AI Interviewer neural presence console */}
          <div className={`panel panel--ai ${isProcessing ? 'panel--ai-thinking' : ''}`}>
            <div className="panel__top-meta">
              <span className="eyebrow">Lead Interviewer</span>
              <span className={`panel__ai-badge ${isProcessing ? 'panel__ai-badge--thinking' : ''}`}>
                {isProcessing ? 'SYNTHESIZING' : 'ATTENTIVE'}
              </span>
            </div>

            <div className={`panel__avatar panel__avatar--ai ${isProcessing ? 'panel__avatar--thinking' : ''}`}>
              {/* Harmonic neural resonator vector */}
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="neural-resonator" aria-hidden="true">
                <circle cx="19" cy="19" r="17" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <circle cx="19" cy="19" r="11" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
                <circle cx="19" cy="19" r="4.5" fill="currentColor" />
                <path d="M7 19h4M27 19h4M19 7v4M19 27v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Cognitive activity spectrum */}
            <div className="neural-spectrum" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, idx) => (
                <span
                  key={idx}
                  className={`neural-bar ${isProcessing ? 'neural-bar--thinking' : ''}`}
                  style={{ '--n-i': idx }}
                />
              ))}
            </div>

            <span className="panel__status">
              {isProcessing ? 'Evaluating answer & forming follow-up…' : 'Listening attentively for your response'}
            </span>
          </div>

          <div className="action-buttons">
            <button
              className={`btn-record ${isRecording ? 'btn-record--active' : ''}`}
              onClick={handleToggleRecording}
              disabled={isProcessing}
              title="Shortcut: Ctrl+M or Alt+M"
            >
              {isRecording ? (
                <>
                  <span className="btn-rec-indicator" />
                  Stop answering (Ctrl+M)
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <rect x="5" y="2" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M3 6a4 4 0 0 0 8 0M7 10v2M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Start answering (Ctrl+M)
                </>
              )}
            </button>
            <button
              className="btn-secondary"
              onClick={handleRepeatQuestion}
              disabled={isProcessing}
              type="button"
              title="Speak the current question aloud"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 5.5v3h2.5L8 11V3L4.5 5.5H2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M9.5 5c.8.8.8 3.2 0 4M11.5 3.5c1.4 1.6 1.4 5.4 0 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Hear question
            </button>
            <button className="btn-secondary" onClick={handleSkip} disabled={isProcessing || isRecording}>
              Skip question
            </button>
          </div>

          {turnError && <p className="room__error">{turnError}</p>}
        </div>

        <div className="panel panel--transcript">
          <div className="panel__transcript-header">
            <span className="eyebrow">Transcript</span>
          </div>
          <div className="transcript__scroll">
            {transcript.map((line, i) => (
              <p key={i} className={`transcript__line transcript__line--${line.speaker}`}>
                <span className="transcript__speaker">
                  {line.speaker === 'ai' ? 'Interviewer' : 'You'}
                </span>
                {line.text}
              </p>
            ))}
            {isProcessing && (
              <p className="transcript__line transcript__line--ai transcript__line--pending">
                <span className="transcript__speaker">Interviewer</span>
                Thinking…
              </p>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>

      {/* Hidden player for the interviewer's synthesized voice. */}
      <audio ref={audioPlayerRef} style={{ display: 'none' }} />
    </div>
  )
}
