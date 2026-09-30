import { useEffect, useRef } from 'react'

/**
 * LiveAcousticVisualizer — High-precision audio frequency & cadence visualizer.
 * Supports live MediaStream via Web Audio API AnalyserNode with procedural
 * speech harmonic fallback when idle or simulating.
 */
export default function LiveAcousticVisualizer({
  stream = null,
  isActive = false,
  barCount = 36,
  height = 54,
  theme = 'amber', // 'amber' | 'teal'
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const ctx = canvas.getContext('2d')

    let width = canvas.clientWidth || 320
    let h = height
    canvas.width = width * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let audioCtx = null
    let analyser = null
    let dataArray = null
    let source = null

    if (stream && isActive) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        audioCtx = new AudioContextClass()
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 128
        analyser.smoothingTimeConstant = 0.8
        source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)
        dataArray = new Uint8Array(analyser.frequencyBinCount)
      } catch (err) {
        console.warn('AudioContext not started:', err)
      }
    }

    let raf = 0
    let step = 0

    function draw() {
      raf = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, width, h)

      step += 0.08
      const barWidth = Math.max(3, (width - (barCount - 1) * 3) / barCount)
      const accent = theme === 'teal' ? '#10b981' : '#e8603c'
      const dimAccent = theme === 'teal' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(232, 96, 60, 0.14)'

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray)
      }

      for (let i = 0; i < barCount; i++) {
        let val = 0.15

        if (reduced) {
          val = 0.35 + (i % 3) * 0.1
        } else if (analyser && dataArray) {
          const freqIdx = Math.floor((i / barCount) * (dataArray.length * 0.7))
          val = Math.max(0.12, (dataArray[freqIdx] || 0) / 255)
        } else if (isActive) {
          // Acoustic harmonic cadence simulation
          const wave1 = Math.sin(step * 2.2 + i * 0.28) * 0.35
          const wave2 = Math.cos(step * 1.5 - i * 0.42) * 0.25
          const centerWeight = Math.sin((i / barCount) * Math.PI)
          val = Math.max(0.15, (wave1 + wave2 + 0.6) * centerWeight * 0.9)
        } else {
          // Idle low-energy resting pulse
          const idleWave = Math.sin(step * 0.8 + i * 0.15) * 0.08 + 0.14
          val = idleWave
        }

        const barH = Math.max(4, val * (h - 6))
        const x = i * (barWidth + 3)
        const y = (h - barH) / 2

        ctx.fillStyle = val > 0.45 ? accent : dimAccent
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barH, 2)
        ctx.fill()
      }
    }

    draw()

    function handleResize() {
      if (!canvas) return
      width = canvas.clientWidth || 320
      canvas.width = width * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
      if (source) try { source.disconnect() } catch {}
      if (audioCtx && audioCtx.state !== 'closed') try { audioCtx.close() } catch {}
    }
  }, [stream, isActive, barCount, height, theme])

  return (
    <div className="live-acoustic-visualizer" style={{ width: '100%', height }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label="Acoustic frequency telemetry visualizer"
      />
    </div>
  )
}
