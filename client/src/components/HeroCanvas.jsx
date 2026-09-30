import { useEffect, useRef } from 'react'

/**
 * Acoustic Wavefield Canvas:
 * Replaces generic morphing blobs with a precision acoustic resonance grid.
 * Draws subtle coordinate crosshairs and physics-damped circular wave fronts
 * responding to cursor interaction, resembling a studio acoustic analysis field.
 */
export default function HeroCanvas() {
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
    let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false }
    let ripples = []

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

    // Reduced motion: draw single crisp static grid and exit early
    if (reduced) {
      drawStaticGrid(ctx, width, height)
      return () => window.removeEventListener('resize', resize)
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect()
      mouse.targetX = e.clientX - rect.left
      mouse.targetY = e.clientY - rect.top
      mouse.active = true

      // Throttle ripple creation on motion
      if (Math.random() < 0.2) {
        ripples.push({
          x: mouse.targetX,
          y: mouse.targetY,
          radius: 12,
          maxRadius: Math.min(width, height) * 0.45,
          alpha: 0.28,
          speed: 1.6 + Math.random() * 0.8,
        })
        if (ripples.length > 8) ripples.shift()
      }
    }

    function onPointerLeave() {
      mouse.active = false
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)

    let t = 0
    function animate() {
      t += 0.015

      // Smooth cursor lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.08
      mouse.y += (mouse.targetY - mouse.y) * 0.08

      ctx.clearRect(0, 0, width, height)

      // 1. Draw subtle acoustic resonance grid
      const gridSize = 44
      const cols = Math.ceil(width / gridSize)
      const rows = Math.ceil(height / gridSize)

      ctx.fillStyle = '#9c9893'
      ctx.lineWidth = 1

      for (let c = 1; c < cols; c++) {
        for (let r = 1; r < rows; r++) {
          const gx = c * gridSize
          const gy = r * gridSize

          // Calculate displacement from mouse
          const dx = mouse.x - gx
          const dy = mouse.y - gy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const proximity = Math.max(0, 1 - dist / 180)

          // Grid node dot
          const alpha = 0.06 + proximity * 0.22
          ctx.fillStyle = proximity > 0.4 ? 'rgba(91, 95, 247, ' + alpha + ')' : 'rgba(156, 152, 147, ' + alpha + ')'

          ctx.beginPath()
          ctx.arc(gx, gy, 0.85 + proximity * 0.75, 0, Math.PI * 2)
          ctx.fill()

          // Corner tick marks near mouse
          if (proximity > 0.45) {
            ctx.strokeStyle = `rgba(91, 95, 247, ${proximity * 0.18})`
            ctx.beginPath()
            ctx.moveTo(gx - 3, gy)
            ctx.lineTo(gx + 3, gy)
            ctx.moveTo(gx, gy - 3)
            ctx.lineTo(gx, gy + 3)
            ctx.stroke()
          }
        }
      }

      // 2. Animate and draw acoustic wavefronts
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i]
        rip.radius += rip.speed
        const life = 1 - rip.radius / rip.maxRadius
        rip.alpha = life * 0.25

        if (life <= 0) {
          ripples.splice(i, 1)
          continue
        }

        ctx.strokeStyle = `rgba(91, 95, 247, ${rip.alpha})`
        ctx.lineWidth = 1
        ctx.setLineDash([4, 6])
        ctx.beginPath()
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.setLineDash([])

      // 3. Subtle ambient harmonic wave at proof center (right side)
      const anchorX = width * 0.75
      const anchorY = height * 0.5
      const harmonicR = 70 + Math.sin(t) * 8
      ctx.strokeStyle = 'rgba(91, 95, 247, 0.04)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(anchorX, anchorY, harmonicR, 0, Math.PI * 2)
      ctx.stroke()

      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="hero__canvas-wavefield"
      aria-hidden="true"
    />
  )
}

function drawStaticGrid(ctx, width, height) {
  const gridSize = 44
  const cols = Math.ceil(width / gridSize)
  const rows = Math.ceil(height / gridSize)
  ctx.fillStyle = 'rgba(156, 152, 147, 0.06)'
  for (let c = 1; c < cols; c++) {
    for (let r = 1; r < rows; r++) {
      ctx.beginPath()
      ctx.arc(c * gridSize, r * gridSize, 1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}