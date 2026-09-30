import { useEffect, useRef } from 'react'

/**
 * SolutionParticles:
 * Interactive canvas background for the dual-track Solutions section.
 * Type 'candidate': Acoustic voice spectrum particle cloud (amber hue)
 * Type 'cohort': Interconnected geometric lattice / matrix cube (teal/slate hue)
 */
export default function SolutionParticles({ type = 'candidate' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const ctx = canvas.getContext('2d')

    let width = 0
    let height = 0
    let raf = 0
    let hover = false
    let mouse = { x: -100, y: -100 }

    function resize() {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    // Generate particles
    const particleCount = type === 'candidate' ? 36 : 30
    const particles = []

    for (let i = 0; i < particleCount; i++) {
      if (type === 'candidate') {
        // Acoustic orbital waveform rings
        const angle = (i / particleCount) * Math.PI * 2
        const dist = 30 + (i % 4) * 22
        particles.push({
          angle,
          dist,
          baseDist: dist,
          speed: 0.008 + (i % 3) * 0.004,
          r: 1.5 + (i % 3) * 0.8,
          phase: Math.random() * Math.PI * 2,
        })
      } else {
        // Geometric lattice nodes
        particles.push({
          x: (i % 6) * 45 + 25,
          y: Math.floor(i / 5) * 45 + 30,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          baseX: (i % 6) * 45 + 25,
          baseY: Math.floor(i / 5) * 45 + 30,
          r: 2,
        })
      }
    }

    const parent = canvas.closest('.solution-section')
    if (parent) {
      parent.addEventListener('mouseenter', () => { hover = true })
      parent.addEventListener('mouseleave', () => { hover = false })
      parent.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect()
        mouse.x = e.clientX - r.left
        mouse.y = e.clientY - r.top
      })
    }

    if (reduced) {
      drawStatic()
      return () => window.removeEventListener('resize', resize)
    }

    function drawStatic() {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = type === 'candidate' ? 'rgba(94, 207, 168, 0.25)' : 'rgba(56, 189, 248, 0.25)'
      particles.forEach((p) => {
        const x = type === 'candidate' ? width * 0.5 + Math.cos(p.angle) * p.dist : p.x
        const y = type === 'candidate' ? height * 0.5 + Math.sin(p.angle) * p.dist : p.y
        ctx.beginPath()
        ctx.arc(x, y, p.r, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    let t = 0
    function animate() {
      t += 0.02
      ctx.clearRect(0, 0, width, height)

      const cx = width * 0.5
      const cy = height * 0.5

      if (type === 'candidate') {
        // Draw acoustic harmonic resonance
        ctx.fillStyle = hover ? '#5ecfa8' : '#9fb0a6'
        ctx.strokeStyle = hover ? 'rgba(94, 207, 168, 0.25)' : 'rgba(159, 176, 166, 0.12)'
        ctx.lineWidth = 1

        // Subtle guide ring
        ctx.beginPath()
        ctx.arc(cx, cy, 65 + Math.sin(t * 1.5) * 4, 0, Math.PI * 2)
        ctx.stroke()

        particles.forEach((p, idx) => {
          p.angle += p.speed * (hover ? 1.8 : 1)
          const wobble = Math.sin(t * 2 + p.phase) * (hover ? 14 : 6)
          const curDist = p.baseDist + wobble

          const px = cx + Math.cos(p.angle) * curDist
          const py = cy + Math.sin(p.angle) * curDist

          ctx.globalAlpha = hover ? 0.8 : 0.35
          ctx.beginPath()
          ctx.arc(px, py, p.r, 0, Math.PI * 2)
          ctx.fill()

          // Connect nearby orbital points
          if (idx % 3 === 0) {
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.lineTo(px, py)
            ctx.stroke()
          }
        })
      } else {
        // Draw connected geometric cohort mesh
        ctx.strokeStyle = hover ? 'rgba(56, 189, 248, 0.28)' : 'rgba(159, 176, 166, 0.12)'
        ctx.fillStyle = hover ? '#38bdf8' : '#9fb0a6'
        ctx.lineWidth = 1

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          p.x += p.vx * (hover ? 1.4 : 0.8)
          p.y += p.vy * (hover ? 1.4 : 0.8)

          if (p.x < 10 || p.x > width - 10) p.vx *= -1
          if (p.y < 10 || p.y > height - 10) p.vy *= -1

          ctx.globalAlpha = hover ? 0.75 : 0.3
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fill()

          // Connect adjacent nodes
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j]
            const dx = p.x - p2.x
            const dy = p.y - p2.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 64) {
              ctx.beginPath()
              ctx.moveTo(p.x, p.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.stroke()
            }
          }
        }
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [type])

  return (
    <div className="morphing-particles-container" data-container="">
      <canvas ref={canvasRef} className="solution-canvas" />
    </div>
  )
}
