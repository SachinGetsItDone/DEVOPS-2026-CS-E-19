import { useEffect, useRef } from 'react'
import './AntigravityField.css'

/**
 * AntigravityField - Google-Antigravity-style hero particle field.
 *
 * Single <canvas> + 2D context + requestAnimationFrame. No libraries.
 *
 * VISUAL SPEC
 *  - Tiny rounded dashes (line segments, round caps)
 *  - ~one particle per density px2 - jittered grid, feels organic
 *  - Dashes rotate radially toward cursor (iron-filings style)
 *  - Cursor repulsion: clear empty hole + bright ring at edge
 *  - Conic color palette wraps around cursor; grey-blue outside
 *  - Opacity/size PEAK at ring edge, fade inward and outward
 *
 * MOTION SPEC
 *  - Spring physics: velocity += (target - pos) * stiffness; vel *= damping
 *  - Cursor lerped so ring follows with a slight lag
 *  - Idle sine drift so field breathes without mouse
 *  - Mouse-leave eases influence to 0 (no snap)
 *  - prefers-reduced-motion -> static field, no interaction
 *
 * PERFORMANCE
 *  - Batch draw calls: all resting particles share one beginPath/stroke
 *  - Colored particles sorted by thickness to minimise GPU state changes
 *  - DPR-aware (cap at 2), debounced resize re-seeds
 *  - Pauses on hidden tab (visibilitychange) + off-screen (IntersectionObserver)
 *  - Pointer tracked on window (canvas is pointer-events: none)
 */

// ---------------------------------------------------------------
// CONFIG - all tunables in one place, with comments.
// ---------------------------------------------------------------
const CONFIG = {
  // px2 of hero area per particle. Lower = denser field.
  // ~2000 gives ~575 particles on a 1440x800 hero.
  density: 2000,

  // Dash length range in CSS px (before DPR scaling). Longer near ring.
  dashLengthMin: 3,
  dashLengthMax: 7,

  // Dash stroke thickness in CSS px (round caps). Slightly thicker at ring.
  dashThickness: 1.8,

  // Cursor influence radius in CSS px.
  // Particles inside are pushed outward and colored.
  influenceRadius: 230,

  // Max outward displacement in CSS px for a particle at the cursor center.
  // Must be >= influenceRadius to guarantee a fully clear hole.
  pushStrength: 265,

  // Spring stiffness: velocity increment toward target per frame.
  // 0.04 = very floaty, 0.12 = snappy. 0.055-0.08 glides nicely.
  stiffness: 0.062,

  // Velocity damping per frame (fraction retained).
  // 0.80 = quick settle, 0.94 = long glide. 0.86-0.90 settles smooth.
  damping: 0.87,

  // Cursor smoothing factor per frame (lerp).
  // 0.05 = heavy lag, 0.35 = near-instant. 0.12-0.20 = visible soft lag.
  cursorLerp: 0.15,

  // Idle drift amplitude in CSS px (sine/cosine noise so field breathes).
  idleDrift: 0.75,

  // Conic palette wrapped around cursor. First === last so it loops.
  // Swap these hexes to re-theme the halo without touching any logic.
  colors: ['#4285F4', '#9B72F2', '#EA4335', '#FBBC04', '#34A853', '#4285F4'],

  // Opacity of far-away resting specks (faint grey-blue).
  restingOpacity: 0.22,

  // Max opacity of dashes right at the ring peak (fully saturated halo).
  activeOpacity: 1.0,

  // Fraction of influenceRadius where the glow ring PEAKS (0..1).
  // 0.70 = inner ring, 0.85 = outer edge. 0.78 matches the visual spec best.
  ringPeak: 0.78,
}

// Faint neutral grey-blue used for resting (far-away) particles.
const REST_RGB = [139, 155, 175]

// ---------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(v, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * Shortest-path lerp for dash angles.
 * Dashes are symmetric mod PI (a dash at 0deg looks identical at 180deg),
 * so we clamp the delta into (-PI/2, PI/2) to prevent 180deg flip artifacts.
 */
function lerpAngleSymmetric(a, b, t) {
  const d = ((b - a) % Math.PI + Math.PI * 1.5) % Math.PI - Math.PI / 2
  return a + d * t
}

/**
 * Sample a palette of RGB stops at position t in [0, 1].
 * Linear interpolation between the two surrounding stops.
 */
function sampleConic(rgbStops, t) {
  const n = rgbStops.length
  const clamped = Math.min(0.9999, Math.max(0, t))
  const x = clamped * (n - 1)
  const i = Math.floor(x)
  const f = x - i
  const c0 = rgbStops[i]
  const c1 = rgbStops[Math.min(n - 1, i + 1)]
  return [
    Math.round(lerp(c0[0], c1[0], f)),
    Math.round(lerp(c0[1], c1[1], f)),
    Math.round(lerp(c0[2], c1[2], f)),
  ]
}

/**
 * Ring-shaped glow function.
 *
 * norm = dist / influenceRadius  (0 = cursor center, 1 = influence edge)
 * Returns a value that PEAKS at `peak` and falls to 0 at both ends:
 *   norm = 0    -> glow = 0  (dead center, cursor is here)
 *   norm = peak -> glow = 1  (bright ring at the push edge)
 *   norm = 1    -> glow = 0  (outside influence, resting)
 *
 * This creates the visible ring of bright saturated dashes at the
 * boundary of the push radius instead of a center-weighted blob.
 */
function ringGlow(norm, peak) {
  if (norm >= 1) return 0
  const raw = norm < peak
    ? norm / peak                    // rises 0->1 as norm reaches peak
    : (1 - norm) / (1 - peak)       // falls 1->0 as norm reaches edge
  // Cubic ease for softer shoulders on both sides.
  return raw * raw * (3 - 2 * raw)
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------

export default function AntigravityField({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rgbStops = CONFIG.colors.map(hexToRgb)

    // Mutable state
    let w = 0, h = 0
    let dpr = 1
    let particles = []
    let raf = 0
    let isVisible = true
    let resizeTimer = 0
    let time = Math.random() * 1000   // seconds-ish ticker for idle drift

    // Smoothed cursor position in canvas-relative CSS px. Start off-screen.
    const cursor = { x: -9999, y: -9999, tx: -9999, ty: -9999 }
    // Global influence strength 0..1 (eases to 0 on pointer leave).
    let strength = 0
    let targetStrength = 0

    // Build particle array covering the canvas with a jittered grid.
    function seed() {
      const rect = canvas.getBoundingClientRect()
      const pw = canvas.parentElement ? canvas.parentElement.clientWidth  : 0
      const ph = canvas.parentElement ? canvas.parentElement.clientHeight : 0
      w = rect.width  || pw || window.innerWidth
      h = rect.height || ph || 520
      if (w < 2 || h < 2) return

      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width  = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const area = w * h
      let count = Math.round(area / CONFIG.density)
      count = Math.max(350, Math.min(1400, count))

      // Jittered grid: even coverage with organic scatter (not visibly gridded).
      const cols = Math.max(1, Math.ceil(Math.sqrt((count * w) / Math.max(1, h))))
      const rows = Math.max(1, Math.ceil(count / cols))
      const cellW = w / cols
      const cellH = h / rows

      particles = []
      let idx = 0
      for (let r = 0; r < rows && idx < count; r++) {
        for (let c = 0; c < cols && idx < count; c++) {
          const hx = (c + 0.5) * cellW + (Math.random() - 0.5) * cellW * 0.82
          const hy = (r + 0.5) * cellH + (Math.random() - 0.5) * cellH * 0.82
          const baseLen = CONFIG.dashLengthMin +
            Math.random() * (CONFIG.dashLengthMax - CONFIG.dashLengthMin)
          particles.push({
            hx: Math.min(w - 2, Math.max(2, hx)),  // home x
            hy: Math.min(h - 2, Math.max(2, hy)),  // home y
            x: 0, y: 0,                             // current (interpolated) position
            vx: 0, vy: 0,                           // velocity
            restAngle: Math.random() * Math.PI,     // idle orientation 0..PI
            len: baseLen,                           // base dash length
            phase: Math.random() * Math.PI * 2,    // idle drift phase offset
            driftSpeed: 0.35 + Math.random() * 0.9,// idle drift frequency
          })
          idx++
        }
      }
      // Start settled at home so there is no pop-in on first render.
      for (const p of particles) { p.x = p.hx; p.y = p.hy }
    }

    // Static render for prefers-reduced-motion.
    function drawStatic() {
      ctx.clearRect(0, 0, w, h)
      ctx.lineCap = 'round'
      ctx.lineWidth = CONFIG.dashThickness
      ctx.strokeStyle = `rgba(${REST_RGB[0]},${REST_RGB[1]},${REST_RGB[2]},${CONFIG.restingOpacity})`
      ctx.beginPath()
      for (const p of particles) {
        const half = p.len / 2
        const dx = Math.cos(p.restAngle) * half
        const dy = Math.sin(p.restAngle) * half
        ctx.moveTo(p.hx - dx, p.hy - dy)
        ctx.lineTo(p.hx + dx, p.hy + dy)
      }
      ctx.stroke()
    }

    /**
     * Main animation frame.
     *
     * Draw strategy each frame:
     *   1. RESTING bucket (colorMix < 0.02):
     *      All grey-blue particles share a single beginPath/stroke.
     *      Zero per-particle strokeStyle string allocations.
     *
     *   2. COLORED bucket (colorMix >= 0.02, inside influence radius):
     *      Each needs its own hue based on angular position around cursor.
     *      Buffer, sort by lineWidth to minimise GPU state changes, then draw.
     */
    function frame() {
      raf = 0
      if (document.hidden || !isVisible) return
      time += 0.016

      // Smooth cursor toward target (creates the slight ring lag).
      cursor.x += (cursor.tx - cursor.x) * CONFIG.cursorLerp
      cursor.y += (cursor.ty - cursor.y) * CONFIG.cursorLerp

      // Ease global influence strength (fades out gracefully on pointer leave).
      strength += (targetStrength - strength) * 0.07
      if (Math.abs(targetStrength - strength) < 0.0008) strength = targetStrength

      const R    = CONFIG.influenceRadius
      const PEAK = CONFIG.ringPeak
      const n    = particles.length

      ctx.clearRect(0, 0, w, h)
      ctx.lineCap = 'round'

      let restingPathOpen = false
      const coloredBuf = []

      for (let i = 0; i < n; i++) {
        const p = particles[i]

        // Vector from particle HOME to cursor (stable anchor for physics + orientation).
        const dhx = p.hx - cursor.x
        const dhy = p.hy - cursor.y
        const dist = Math.sqrt(dhx * dhx + dhy * dhy)
        const norm = dist / R  // 0 = at cursor, 1 = at edge, >1 = outside

        // Cosine envelope: 1 at center, 0 at influence edge.
        const pushFall = norm < 1 ? (0.5 + 0.5 * Math.cos(Math.PI * norm)) : 0

        let dirX = 0, dirY = 0
        if (dist > 0.001) {
          dirX = dhx / dist
          dirY = dhy / dist
        } else {
          dirX = Math.cos(p.restAngle)
          dirY = Math.sin(p.restAngle)
        }

        // Push: particles at center go furthest (clear hole in field);
        // particles near ring edge barely move (dense ring forms at boundary).
        const push = (1 - pushFall * 0.3) * CONFIG.pushStrength * (norm < 1 ? 1 : 0) * strength

        // Gentle idle drift so field breathes without any mouse movement.
        const idleX = Math.sin(time * p.driftSpeed + p.phase) * CONFIG.idleDrift
        const idleY = Math.cos(time * p.driftSpeed * 0.83 + p.phase * 1.4) * CONFIG.idleDrift

        const targetX = p.hx + dirX * push + idleX
        const targetY = p.hy + dirY * push + idleY

        // Spring toward target: glide out, settle back, no snapping.
        p.vx += (targetX - p.x) * CONFIG.stiffness
        p.vy += (targetY - p.y) * CONFIG.stiffness
        p.vx *= CONFIG.damping
        p.vy *= CONFIG.damping
        p.x  += p.vx
        p.y  += p.vy

        // Orientation: radial around cursor -> own random rest angle when far.
        const radial = Math.atan2(dhy, dhx)
        const blend  = Math.min(1, Math.max(0, pushFall * strength))
        const angle  = lerpAngleSymmetric(p.restAngle, radial, blend)

        // Ring glow: PEAKS at PEAK * R (the push edge), zero at center + outside.
        const glow   = ringGlow(norm, PEAK) * strength

        const len    = p.len * (1 + 0.85 * glow)
        const opacity = lerp(CONFIG.restingOpacity, CONFIG.activeOpacity, Math.min(1, glow * 1.2))
        const thick  = CONFIG.dashThickness * (1 + 0.35 * glow)

        const half = len / 2
        const ex   = Math.cos(angle) * half
        const ey   = Math.sin(angle) * half

        // Color mix: 0 = grey-blue, 1 = full conic hue.
        const colorMix = Math.min(1, glow * 1.8 + pushFall * strength * 0.08)

        if (colorMix < 0.02) {
          // RESTING: add to shared batch path (no per-particle state changes).
          if (!restingPathOpen) {
            ctx.beginPath()
            ctx.lineWidth = CONFIG.dashThickness
            restingPathOpen = true
          }
          ctx.moveTo(p.x - ex, p.y - ey)
          ctx.lineTo(p.x + ex, p.y + ey)
        } else {
          // COLORED: buffer for individual draw after resting batch.
          const t01 = (Math.atan2(dhy, dhx) + Math.PI) / (Math.PI * 2)
          const cc = sampleConic(rgbStops, t01)
          coloredBuf.push({
            x: p.x, y: p.y, ex, ey,
            rr: Math.round(lerp(REST_RGB[0], cc[0], colorMix)),
            gg: Math.round(lerp(REST_RGB[1], cc[1], colorMix)),
            bb: Math.round(lerp(REST_RGB[2], cc[2], colorMix)),
            opacity, thick,
          })
        }
      }

      // Flush resting batch: one GPU draw call for all grey-blue particles.
      if (restingPathOpen) {
        ctx.strokeStyle = `rgba(${REST_RGB[0]},${REST_RGB[1]},${REST_RGB[2]},${CONFIG.restingOpacity})`
        ctx.stroke()
      }

      // Draw colored particles, sorted by lineWidth to minimise GPU state changes.
      coloredBuf.sort((a, b) => a.thick - b.thick)
      let lastThick = -1
      for (let j = 0; j < coloredBuf.length; j++) {
        const d = coloredBuf[j]
        if (d.thick !== lastThick) {
          ctx.lineWidth = d.thick
          lastThick = d.thick
        }
        ctx.strokeStyle = `rgba(${d.rr},${d.gg},${d.bb},${d.opacity.toFixed(3)})`
        ctx.beginPath()
        ctx.moveTo(d.x - d.ex, d.y - d.ey)
        ctx.lineTo(d.x + d.ex, d.y + d.ey)
        ctx.stroke()
      }

      raf = requestAnimationFrame(frame)
    }

    // Loop control helpers.
    function start() {
      if (!raf && !document.hidden && isVisible) raf = requestAnimationFrame(frame)
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    // Event handlers.
    function updatePointer(clientX, clientY) {
      const rect = canvas.getBoundingClientRect()
      cursor.tx = clientX - rect.left
      cursor.ty = clientY - rect.top
      targetStrength = 1
      start()
    }

    function onPointerMove(e) {
      if (e.pointerType === 'touch' && !e.isPrimary) return
      updatePointer(e.clientX, e.clientY)
    }

    function onTouchMove(e) {
      if (!e.touches || e.touches.length === 0) return
      updatePointer(e.touches[0].clientX, e.touches[0].clientY)
    }

    function onLeave() {
      targetStrength = 0
    }

    function onResize() {
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        seed()
        if (reduced) drawStatic()
        else start()
      }, 160)
    }

    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    // Initialize.
    seed()

    if (reduced) {
      drawStatic()
      window.addEventListener('resize', onResize)
      return () => {
        window.removeEventListener('resize', onResize)
        clearTimeout(resizeTimer)
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('touchmove',   onTouchMove,   { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur',              onLeave)
    window.addEventListener('resize',            onResize)
    document.addEventListener('visibilitychange', onVisibility)

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry ? entry.isIntersecting : true
        if (isVisible) start()
        else stop()
      },
      { threshold: 0 }
    )
    observer.observe(canvas)

    start()

    return () => {
      stop()
      observer.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('touchmove',   onTouchMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur',              onLeave)
      window.removeEventListener('resize',            onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      clearTimeout(resizeTimer)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`antigravity-field ${className}`.trim()}
      aria-hidden="true"
    />
  )
}
