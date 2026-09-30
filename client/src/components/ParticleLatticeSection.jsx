import { useEffect, useRef } from 'react'
import './ParticleLatticeSection.css'

/**
 * ParticleLatticeSection — Google-Antigravity-style "two borderless cards over a
 * particle lattice" section. Self-contained: one <canvas> behind, content above.
 *
 * Resting: a staggered dot lattice. Hover a card: nearby dots are yanked out of
 * the lattice into a dotted shape (braces for card 1, a hex network for card 2)
 * which then trembles like an earthquake. Leave: dots spring home.
 *
 * Everything is tunable from the single CONFIG object below.
 */

const CONFIG = {
  // Lattice spacing in CSS px. Lower = denser field (more dots, more CPU).
  latticeSpacing: 30,
  // Dot radius in CSS px (active dots render very slightly larger).
  dotSize: 2.5,
  // Faint resting dot color (fractional alpha is the 4th channel).
  restColor: 'rgba(60, 80, 140, 0.35)',
  // Saturated color dots lerp toward when they belong to the hovered shape.
  activeColor: '#3B5BFF',
  // Extra random scatter (CSS px) applied to every shape dot so the outline
  // reads as a 2-3 dot thick fuzzy stroke instead of a hairline.
  shapeThickness: 2.5,
  // Fraction of shape dots given a large extra offset, so stray dots halo it.
  strayFraction: 0.12,
  // Max size (CSS px) of that stray offset.
  strayRange: 25,
  // Spring stiffness (per frame). Higher = snappier, lower = looser.
  stiffness: 0.045,
  // Velocity retained per frame while forming. Lower = MORE damped.
  // 0.8-0.85 is underdamped (overshoot = the "impact"); 0.9+ rings down.
  dampingEnter: 0.85,
  // Velocity retained per frame while returning home.
  dampingExit: 0.9,
  // Pulse (contract/expand) relative amplitude and angular frequency (rad/s).
  pulseAmp: 0.045,
  pulseFreq: 3,
  // Fast tremor shake: amplitude (CSS px) and samples-per-second of the noise.
  tremorAmp: 2.5,
  tremorSpeed: 12,
  // Slow drift dispersion: amplitude (CSS px) and noise speed.
  driftAmp: 14,
  driftSpeed: 0.35,
  // Max stagger (ms) before a dot starts moving, scaled by distance from center.
  staggerMax: 300,
  // Expanding shockwave kick on hover start.
  shockwave: true,
  shockwaveSpeed: 900,
  shockwaveKick: 6,
}

const TAU = Math.PI * 2

// ---------------------------------------------------------------------------
// Perlin gradient noise (2D) with a precomputed permutation table.
// Sampled by position (not Math.random) so neighbouring dots shake together.
// ---------------------------------------------------------------------------
const PERM = new Uint8Array(512)
;(function initPerm() {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  let seed = 1337
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0
    const t = p[i]; p[i] = p[j]; p[j] = t
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]
})()

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10) }
function grad(h, x, y) {
  switch (h & 3) {
    case 0: return x + y
    case 1: return -x + y
    case 2: return x - y
    default: return -x - y
  }
}
function noise2(x, y) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const X = xi & 255
  const Y = yi & 255
  const xf = x - xi
  const yf = y - yi
  const u = fade(xf)
  const v = fade(yf)
  const aa = PERM[PERM[X] + Y]
  const ab = PERM[PERM[X] + Y + 1]
  const ba = PERM[PERM[X + 1] + Y]
  const bb = PERM[PERM[X + 1] + Y + 1]
  const x1 = x1lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u)
  const x2 = x1lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u)
  return x1lerp(x1, x2, v)
}
function x1lerp(a, b, t) { return a + (b - a) * t }

// ---------------------------------------------------------------------------
// Shape path generators (SVG path data, sampled later with getPointAtLength).
// ---------------------------------------------------------------------------

// Curly brace occupying [X, X+W] x [Y, Y+H]. dir=1 -> "{" (cusp left),
// dir=-1 -> "}" (mirrored about the box center).
function braceD(X, Y, W, H, dir) {
  const mx = (x) => (dir === 1 ? x : 2 * (X + W / 2) - x)
  return [
    `M ${mx(X + W)} ${Y}`,
    `C ${mx(X + W * 0.35)} ${Y} ${mx(X + W * 0.52)} ${Y + H * 0.06} ${mx(X + W * 0.52)} ${Y + H * 0.22}`,
    `C ${mx(X + W * 0.52)} ${Y + H * 0.36} ${mx(X + W * 0.2)} ${Y + H * 0.4} ${mx(X + W * 0.2)} ${Y + H * 0.5}`,
    `C ${mx(X + W * 0.2)} ${Y + H * 0.6} ${mx(X + W * 0.52)} ${Y + H * 0.64} ${mx(X + W * 0.52)} ${Y + H * 0.78}`,
    `C ${mx(X + W * 0.52)} ${Y + H * 0.94} ${mx(X + W * 0.35)} ${Y + H} ${mx(X + W)} ${Y + H}`,
  ].join(' ')
}

// Hexagonal network: outer hexagon + spokes to center + rotated inner hexagon.
function hexMeshD(cx, cy, R) {
  const parts = []
  const v = []
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3
    v.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R])
  }
  parts.push(`M ${v[0][0]} ${v[0][1]}`)
  for (let i = 1; i < 6; i++) parts.push(`L ${v[i][0]} ${v[i][1]}`)
  parts.push('Z')
  for (let i = 0; i < 6; i++) parts.push(`M ${cx} ${cy} L ${v[i][0]} ${v[i][1]}`)
  const r2 = R * 0.42
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + Math.PI / 6 + (i * Math.PI) / 3
    const x = cx + Math.cos(a) * r2
    const y = cy + Math.sin(a) * r2
    parts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

// Color helpers -------------------------------------------------------------
function parseColor(c) {
  if (typeof c !== 'string') return [0, 0, 0, 1]
  if (c[0] === '#') {
    const h = c.slice(1)
    const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
    const n = parseInt(v, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const parts = m[1].split(',').map((s) => parseFloat(s.trim()))
    return [parts[0], parts[1], parts[2], parts[3] === undefined ? 1 : parts[3]]
  }
  return [0, 0, 0, 1]
}
function mix(a, b, t) { return a + (b - a) * t }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

const COLOR_BUCKETS = 12

export default function ParticleLatticeSection({ onDownload, onReadMore }) {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const apiRef = useRef(null)
  const cardRefs = [useRef(null), useRef(null)]
  const contentRefs = [useRef(null), useRef(null)]

  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isTouch = window.matchMedia('(hover: none)').matches

    // Precomputed per-bucket fill colors / radii (batch one path per bucket).
    const [restR, restG, restB, restA] = parseColor(CONFIG.restColor)
    const [actR, actG, actB, actA] = parseColor(CONFIG.activeColor)
    const bucketColor = new Array(COLOR_BUCKETS)
    const bucketRadius = new Array(COLOR_BUCKETS)
    for (let b = 0; b < COLOR_BUCKETS; b++) {
      const t = b / (COLOR_BUCKETS - 1)
      const r = Math.round(mix(restR, actR, t))
      const g = Math.round(mix(restG, actG, t))
      const bl = Math.round(mix(restB, actB, t))
      const a = mix(restA, actA, t)
      bucketColor[b] = `rgba(${r}, ${g}, ${bl}, ${a.toFixed(3)})`
      bucketRadius[b] = CONFIG.dotSize * (1 + 0.25 * t)
    }
    const bucketBins = Array.from({ length: COLOR_BUCKETS }, () => [])

    let width = 0
    let height = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let dots = []
    let grid = []
    let gridCols = 1
    let gridRows = 1
    const gridCell = CONFIG.latticeSpacing
    let shapeData = { points: [], cx: 0, cy: 0 }
    let raf = 0
    let lastTs = 0
    let visible = true
    let time = 0
    let activeCard = null
    let resizeTimer = 0
    const activeIndexRef = { current: null }
    const shock = { active: false, x: 0, y: 0, r: 0 }

    // Hidden SVG path used to sample shape outlines.
    const SVG_NS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.setAttribute('aria-hidden', 'true')
    svg.style.position = 'absolute'
    svg.style.overflow = 'hidden'
    svg.style.pointerEvents = 'none'
    const pathEl = document.createElementNS(SVG_NS, 'path')
    svg.appendChild(pathEl)
    section.appendChild(svg)

    function sampleInto(points, d, step) {
      pathEl.setAttribute('d', d)
      let total = 0
      try { total = pathEl.getTotalLength() } catch { return }
      if (!total || !isFinite(total)) return
      const n = Math.max(2, Math.ceil(total / step))
      for (let i = 0; i <= n; i++) {
        const pt = pathEl.getPointAtLength((i / n) * total)
        points.push({ x: pt.x, y: pt.y })
      }
    }

    function computeShape(cardIndex) {
      const sRect = section.getBoundingClientRect()
      const el = contentRefs[cardIndex] && contentRefs[cardIndex].current
      const cxFallback = width / 2
      const cyFallback = height / 2
      if (!el) return { points: [], cx: cxFallback, cy: cyFallback }
      const r = el.getBoundingClientRect()
      const cx = r.left - sRect.left + r.width / 2
      const cy = r.top - sRect.top + r.height / 2
      const points = []
      const step = clamp(CONFIG.latticeSpacing * 0.7, 8, 24)

      if (cardIndex === 0) {
        const H = Math.min(Math.max(r.height * 2, 240), Math.max(240, height * 0.94))
        const W = 36
        const gap = 44
        const left = r.left - sRect.left
        const right = left + r.width
        const top = cy - H / 2
        sampleInto(points, braceD(left - gap - W, top, W, H, 1), step)
        sampleInto(points, braceD(right + gap, top, W, H, -1), step)
      } else {
        const R = Math.min(Math.max(r.height * 0.95, 150), Math.max(150, height * 0.46))
        sampleInto(points, hexMeshD(cx, cy, R), step)
      }
      return { points, cx, cy }
    }

    function buildGrid() {
      gridCols = Math.max(1, Math.ceil(width / gridCell))
      gridRows = Math.max(1, Math.ceil(height / gridCell))
      grid = new Array(gridCols * gridRows)
      for (let i = 0; i < dots.length; i++) {
        const p = dots[i]
        const gx = clamp(Math.floor(p.hx / gridCell), 0, gridCols - 1)
        const gy = clamp(Math.floor(p.hy / gridCell), 0, gridRows - 1)
        const idx = gy * gridCols + gx
        if (grid[idx]) grid[idx].push(i)
        else grid[idx] = [i]
      }
    }

    function findNearest(tx, ty) {
      const gx = clamp(Math.floor(tx / gridCell), 0, gridCols - 1)
      const gy = clamp(Math.floor(ty / gridCell), 0, gridRows - 1)
      let best = -1
      let bestD = Infinity
      const maxRing = 10
      for (let r = 0; r <= maxRing; r++) {
        if (best >= 0 && (r - 1) * gridCell > Math.sqrt(bestD)) break
        const x0 = gx - r, x1 = gx + r, y0 = gy - r, y1 = gy + r
        for (let yy = y0; yy <= y1; yy++) {
          if (yy < 0 || yy >= gridRows) continue
          for (let xx = x0; xx <= x1; xx++) {
            if (xx < 0 || xx >= gridCols) continue
            if (r > 0 && Math.max(Math.abs(xx - gx), Math.abs(yy - gy)) !== r) continue
            const cell = grid[yy * gridCols + xx]
            if (!cell) continue
            for (let k = 0; k < cell.length; k++) {
              const p = dots[cell[k]]
              if (p.assigned) continue
              const dx = p.hx - tx
              const dy = p.hy - ty
              const d2 = dx * dx + dy * dy
              if (d2 < bestD) { bestD = d2; best = cell[k] }
            }
          }
        }
      }
      return best
    }

    function seed() {
      const rect = section.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cols = Math.ceil(width / CONFIG.latticeSpacing) + 1
      const rows = Math.ceil(height / CONFIG.latticeSpacing) + 1
      const sp = CONFIG.latticeSpacing
      dots = []
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * sp * 0.5
        for (let c = 0; c < cols; c++) {
          const x = c * sp + offset + (Math.random() - 0.5) * sp * 0.18
          const y = r * sp + (Math.random() - 0.5) * sp * 0.18
          dots.push({
            hx: x, hy: y, x, y, vx: 0, vy: 0,
            phase: Math.random() * TAU,
            assigned: false,
            shapePoint: null,
            strayX: 0, strayY: 0,
            jitX: 0, jitY: 0,
            delayUntil: 0,
            energy: 0,
            colorMix: 0,
          })
        }
      }
      buildGrid()
    }

    function assign(cardIndex) {
      const shape = computeShape(cardIndex)
      shapeData = shape
      const pts = shape.points
      for (let i = 0; i < dots.length; i++) dots[i].assigned = false
      if (!pts.length) return
      buildGrid()
      const nowMs = performance.now()
      const maxD = 520
      for (let k = 0; k < pts.length; k++) {
        const pt = pts[k]
        const idx = findNearest(pt.x, pt.y)
        if (idx < 0) continue
        const p = dots[idx]
        p.assigned = true
        p.shapePoint = pt
        const d = Math.hypot(pt.x - shape.cx, pt.y - shape.cy)
        p.delayUntil = nowMs + CONFIG.staggerMax * Math.min(1, d / maxD) + Math.random() * 70
        if (Math.random() < CONFIG.strayFraction) {
          const a = Math.random() * TAU
          const rr = CONFIG.strayRange * (0.4 + Math.random() * 0.6)
          p.strayX = Math.cos(a) * rr
          p.strayY = Math.sin(a) * rr
        } else {
          p.strayX = 0
          p.strayY = 0
        }
        const ja = Math.random() * TAU
        const jr = Math.random() * CONFIG.shapeThickness * 1.6
        p.jitX = Math.cos(ja) * jr
        p.jitY = Math.sin(ja) * jr
      }
    }

    function paint() {
      for (let b = 0; b < COLOR_BUCKETS; b++) bucketBins[b].length = 0
      for (let i = 0; i < dots.length; i++) {
        const p = dots[i]
        let b = Math.round(p.colorMix * (COLOR_BUCKETS - 1))
        if (b < 0) b = 0
        else if (b > COLOR_BUCKETS - 1) b = COLOR_BUCKETS - 1
        bucketBins[b].push(p.x, p.y)
      }
      ctx.clearRect(0, 0, width, height)
      for (let b = 0; b < COLOR_BUCKETS; b++) {
        const arr = bucketBins[b]
        if (!arr.length) continue
        const rad = bucketRadius[b]
        ctx.fillStyle = bucketColor[b]
        ctx.beginPath()
        for (let i = 0; i < arr.length; i += 2) {
          const x = arr[i]
          const y = arr[i + 1]
          ctx.moveTo(x + rad, y)
          ctx.arc(x, y, rad, 0, TAU)
        }
        ctx.fill()
      }
    }

    function applyStatic() {
      for (let i = 0; i < dots.length; i++) {
        const p = dots[i]
        if (activeCard !== null && p.assigned) {
          p.x = p.shapePoint.x + p.strayX + p.jitX
          p.y = p.shapePoint.y + p.strayY + p.jitY
          p.colorMix = 1
        } else {
          p.x = p.hx
          p.y = p.hy
          p.colorMix = 0
        }
      }
      paint()
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame)
      let dt = lastTs ? (ts - lastTs) / 1000 : 1 / 60
      lastTs = ts
      if (!(dt > 0)) dt = 1 / 60
      if (dt > 0.05) dt = 0.05
      const step = dt * 60
      time += dt
      const nowMs = ts

      const active = activeCard
      const damping = active !== null ? CONFIG.dampingEnter : CONFIG.dampingExit
      const dampStep = Math.pow(damping, step)
      const sd = shapeData

      // Expanding shockwave: one radial kick as the ring passes each dot.
      if (shock.active) {
        const prev = shock.r
        shock.r += CONFIG.shockwaveSpeed * dt
        for (let i = 0; i < dots.length; i++) {
          const p = dots[i]
          const dx = p.x - shock.x
          const dy = p.y - shock.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d > prev && d <= shock.r && d > 0.5) {
            const fall = Math.max(0, 1 - d / 620)
            const k = CONFIG.shockwaveKick * fall
            p.vx += (dx / d) * k
            p.vy += (dy / d) * k
          }
        }
        if (shock.r > 900) shock.active = false
      }

      let maxVel = 0
      let maxEnergy = 0

      for (let i = 0; i < dots.length; i++) {
        const p = dots[i]
        const inShape = active !== null && p.assigned && nowMs >= p.delayUntil
        let tx
        let ty

        if (inShape && sd && p.shapePoint) {
          const sp = p.shapePoint
          const dx = sp.x - sd.cx
          const dy = sp.y - sd.cy
          const s = 1 + CONFIG.pulseAmp * Math.sin(time * CONFIG.pulseFreq + p.phase)
          tx = sd.cx + dx * s + p.strayX + p.jitX
          ty = sd.cy + dy * s + p.strayY + p.jitY
          if (p.energy > 0.001) {
            const e = p.energy
            tx += noise2(p.x * 0.01, time * CONFIG.driftSpeed) * CONFIG.driftAmp * e
            ty += noise2(p.y * 0.01, time * CONFIG.driftSpeed + 41.3) * CONFIG.driftAmp * e
            tx += noise2(p.x * 0.05, time * CONFIG.tremorSpeed) * CONFIG.tremorAmp * e
            ty += noise2(p.y * 0.05, time * CONFIG.tremorSpeed + 17.7) * CONFIG.tremorAmp * e
          }
          p.energy += (1 - p.energy) * Math.min(1, 8 * dt)
        } else {
          tx = p.hx
          ty = p.hy
          p.energy += (0 - p.energy) * Math.min(1, 8 * dt)
        }

        p.vx = (p.vx + (tx - p.x) * CONFIG.stiffness * step) * dampStep
        p.vy = (p.vy + (ty - p.y) * CONFIG.stiffness * step) * dampStep
        p.x += p.vx * step
        p.y += p.vy * step

        const target = inShape ? 1 : 0
        p.colorMix += (target - p.colorMix) * Math.min(1, 6 * dt)

        const av = Math.abs(p.vx) + Math.abs(p.vy)
        if (av > maxVel) maxVel = av
        if (p.energy > maxEnergy) maxEnergy = p.energy
      }

      paint()

      // Idle and fully settled: park the loop until the next interaction.
      if (active === null && !shock.active && maxVel < 0.02 && maxEnergy < 0.02) {
        stop()
        lastTs = 0
      }
    }

    function start() {
      if (!raf && !document.hidden && visible) raf = requestAnimationFrame(frame)
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    function activate(index) {
      if (activeIndexRef.current === index) return
      activeIndexRef.current = index
      activeCard = index
      assign(index)
      if (reduced) { applyStatic(); return }
      if (CONFIG.shockwave) {
        shock.active = true
        shock.x = shapeData.cx
        shock.y = shapeData.cy
        shock.r = 0
      }
      start()
    }

    function deactivate(index) {
      if (activeIndexRef.current !== index) return
      activeIndexRef.current = null
      activeCard = null
      shock.active = false
      if (reduced) applyStatic()
      else start()
    }

    apiRef.current = { activate, deactivate }

    function onResize() {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        seed()
        if (activeIndexRef.current !== null) {
          assign(activeIndexRef.current)
          if (CONFIG.shockwave) {
            shock.active = true
            shock.x = shapeData.cx
            shock.y = shapeData.cy
            shock.r = 0
          }
        }
        if (reduced) applyStatic()
        else start()
      }, 160)
    }

    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    // Touch / pen taps: tap a card to morph it, tap elsewhere to release.
    function onPointerDown(e) {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return
      const target = e.target
      const card = target && target.closest ? target.closest('.pl-card') : null
      if (card && cardRefs[0].current === card) activate(0)
      else if (card && cardRefs[1].current === card) activate(1)
      else if (activeIndexRef.current !== null) deactivate(activeIndexRef.current)
    }

    seed()
    if (reduced) {
      applyStatic()
      window.addEventListener('resize', onResize)
    } else {
      window.addEventListener('resize', onResize)
      document.addEventListener('visibilitychange', onVisibility)
      document.addEventListener('pointerdown', onPointerDown)
      start()
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        visible = entry ? entry.isIntersecting : true
        if (reduced) return
        if (visible) start()
        else stop()
      },
      { threshold: 0 }
    )
    io.observe(section)

    return () => {
      stop()
      io.disconnect()
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('pointerdown', onPointerDown)
      if (svg.parentNode === section) section.removeChild(svg)
      apiRef.current = null
    }
  }, [])

  const enter = (i) => () => apiRef.current && apiRef.current.activate(i)
  const leave = (i) => () => apiRef.current && apiRef.current.deactivate(i)

  return (
    <section ref={sectionRef} className="pl-section" aria-label="Get started with Prepline">
      <canvas ref={canvasRef} className="pl-canvas" aria-hidden="true" />

      <div className="pl-inner">
        <div className="pl-grid">
          <article
            ref={cardRefs[0]}
            className="pl-card"
            onMouseEnter={enter(0)}
            onMouseLeave={leave(0)}
            onFocus={enter(0)}
            onBlur={leave(0)}
          >
            <div className="pl-card__content" ref={contentRefs[0]}>
              <span className="pl-pill">Available at no charge</span>
              <h3 className="pl-headline">
                <span className="pl-headline__l1">For developers</span>
                <span className="pl-headline__l2">Achieve new heights</span>
              </h3>
              <button type="button" className="pl-btn pl-btn--primary" onClick={onDownload}>
                Download
              </button>
            </div>
          </article>

          <article
            ref={cardRefs[1]}
            className="pl-card"
            onMouseEnter={enter(1)}
            onMouseLeave={leave(1)}
            onFocus={enter(1)}
            onBlur={leave(1)}
          >
            <div className="pl-card__content" ref={contentRefs[1]}>
              <span className="pl-pill">Now Available!</span>
              <h3 className="pl-headline">
                <span className="pl-headline__l1">For organizations</span>
                <span className="pl-headline__l2">Level up your entire team</span>
              </h3>
              <button type="button" className="pl-btn pl-btn--secondary" onClick={onReadMore}>
                Read More
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
