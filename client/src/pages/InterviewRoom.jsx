import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInterviewSession } from '../context/InterviewSessionContext.jsx'
import { useGame } from '../context/GameContext.jsx'
import { submitTurn, generateReport, ApiError } from '../lib/api.js'
import './InterviewRoom.css'

export default function InterviewRoom() {
  const { session, clearSession } = useInterviewSession()
  const { recordCompletedInterview } = useGame()
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

  // Guard: you can't land here without having gone through the modal.
  useEffect(() => {
    if (!session) navigate('/')
  }, [session, navigate])

  // Seed the transcript with the real opening question from the backend
  // once the session is available.
  useEffect(() => {
    if (session) {
      setTranscript([
        {
          speaker: 'ai',
          text: session.openingQuestion
            || 'Welcome — whenever you\'re ready, click "Start answering" and walk me through your background.',
        },
      ])
    }
  }, [session])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  if (!session) return null

  async function handleEndInterview() {
    if (isEnding) return
    // Stop any in-flight recording so the mic is released cleanly.
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    // Only a real, scored interview is worth a report — if nothing was
    // ever answered, there's nothing for the backend to grade.
    const hasAnsweredATurn = transcript.some((line) => line.speaker === 'user')
    if (!hasAnsweredATurn || !session.interviewId) {
      clearSession()
      navigate('/')
      return
    }

    setIsEnding(true)
    try {
      const report = await generateReport(session.interviewId)
      recordCompletedInterview(report?.overall_score)
      const interviewId = session.interviewId
      clearSession()
      navigate(`/report/${interviewId}`, { state: { report } })
    } catch (err) {
      // Report generation failing shouldn't trap the candidate in the
      // room — fall back to just ending the session.
      clearSession()
      navigate('/')
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

  async function sendTurn({ audioBlob, transcriptText }) {
    setIsProcessing(true)
    setTurnError('')
    try {
      const result = await submitTurn({
        interviewId: session.interviewId,
        audioBlob,
        transcript: transcriptText,
        resumeContext: session.resumeText,
      })

      setTranscript((prev) => [
        ...prev,
        { speaker: 'user', text: result.user_transcript || transcriptText || '(No speech detected)' },
        { speaker: 'ai', text: result.response_text || "Let's move on to the next question." },
      ])
      playInterviewerAudio(result.sts_audio_base64)
    } catch (err) {
      setTurnError(err instanceof ApiError ? err.message : 'Could not reach the interviewer. Try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleToggleRecording() {
    if (isProcessing) return

    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      return
    }

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
        </div>
        <div className="room__nav-meta">
          <span className="eyebrow">{session.role || 'General role'}</span>
          <span className="room__resume-chip">{session.resumeName}</span>
        </div>
        <button className="room__end" onClick={handleEndInterview} disabled={isEnding}>
          {isEnding ? 'Scoring…' : 'End interview'}
        </button>
      </header>

      <div className="room__body">
        <div className="room__left">
          <div className="panel panel--user">
            <span className="eyebrow">You</span>
            <div className="panel__avatar panel__avatar--user">U</div>
            <span className={`panel__status ${isRecording ? 'panel__status--live' : ''}`}>
              {isRecording ? 'Listening…' : 'Muted'}
            </span>
          </div>

          <div className="panel panel--ai">
            <span className="eyebrow">Interviewer</span>
            <div className="panel__avatar panel__avatar--ai">AI</div>
            <span className="panel__status">{isProcessing ? 'Thinking…' : 'Ready'}</span>
          </div>

          <div className="action-buttons">
            <button
              className={`btn-record ${isRecording ? 'btn-record--active' : ''}`}
              onClick={handleToggleRecording}
              disabled={isProcessing}
            >
              {isRecording ? 'Stop answering' : 'Start answering'}
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
