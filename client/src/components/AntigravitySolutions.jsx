import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './AntigravitySolutions.css'

/**
 * AntigravitySolutions — 3D Volumetric Particle System
 * Faithful to Google Antigravity:
 * - Left track: A 3D curved vertical arc / cylinder of particles with depth, perspective,
 *   and gentle rotation on the right side of the text.
 * - Right track: A 3D orbital particle cloud surrounding the text with depth and perspective.
 * - Atmosphere: Drifting ambient particles in Google Blue, Coral Red, and Slate Grey.
 */

const LEFT_COUNT = 280
const RIGHT_COUNT = 280
const BG_COUNT = 160
const TOTAL = LEFT_COUNT + RIGHT_COUNT + BG_COUNT

const PALETTE = [
  '#3b82f6', // Google / Electric Blue (dominant)
  '#3b82f6',
  '#2563eb',
  '#60a5fa', // Ice Blue highlight
  '#ef4444', // Coral Crimson
  '#f87171', // Soft Coral Red
  '#6b7280', // Slate Grey
  '#9ca3af', // Light Slate
]

const TAU = Math.PI * 2
const CAMERA_DIST = 380

export default function AntigravitySolutions({ onTakeInterview }) {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const [activeTrack, setActiveTrack] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return

    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let width = 0
    let height = 0
    let raf = 0
    let time = 0
    let spinLeft = 0.28
    let spinRight = 0.22
    let energyLeft = 1
    let energyRight = 1

    let leftBox = null
    let rightBox = null

    const particles = []

    function measure() {
      const blocks = section.querySelectorAll('.tracks__content')
      if (blocks.length < 2) return
      const sRect = section.getBoundingClientRect()

      const boxes = [blocks[0], blocks[1]].map((el) => {
        const r = el.getBoundingClientRect()
        return {
          cx: r.left - sRect.left + r.width / 2,
          cy: r.top - sRect.top + r.height / 2,
          rx: r.width / 2,
          ry: r.height / 2,
        }
      })

      leftBox = boxes[0]
      rightBox = boxes[1]
    }

    function resize() {
      const rect = section.getBoundingClientRect()
      width = rect.width
      height = Math.max(420, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      measure()
    }

    function seed() {
      particles.length = 0

      // 1. Left 3D Arc / Cylinder particles
      for (let i = 0; i < LEFT_COUNT; i++) {
        const u = (i / (LEFT_COUNT - 1)) * 2 - 1 // -1 (top) to +1 (bottom)
        const angle = ((i * 2.399963) % TAU) // Golden ratio spiral around column
        const radiusJitter = 0.65 + Math.random() * 0.7
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]

        particles.push({
          type: 'left',
          u,
          angle,
          radiusJitter,
          color,
          baseSize: 1.1 + Math.random() * 1.3,
          baseAlpha: 0.75 + Math.random() * 0.25,
          scatterX: (Math.random() - 0.5) * 8,
          scatterY: (Math.random() - 0.5) * 10,
          phase: Math.random() * TAU,
          // 3D coordinates calculated during render
          x: 0,
          y: 0,
          z: 0,
          projX: 0,
          projY: 0,
          projSize: 1,
          projAlpha: 1,
        })
      }

      // 2. Right 3D Orbital Cloud particles
      for (let i = 0; i < RIGHT_COUNT; i++) {
        // Fibonacci sphere distribution for uniform 3D shell
        const phi = Math.acos(1 - (2 * (i + 0.5)) / RIGHT_COUNT)
        const theta = Math.PI * (1 + Math.sqrt(5)) * i
        const radiusJitter = 0.6 + Math.random() * 0.65
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
        const orbitSpeed = 0.8 + Math.random() * 0.4

        particles.push({
          type: 'right',
          phi,
          theta,
          radiusJitter,
          orbitSpeed,
          color,
          baseSize: 1.1 + Math.random() * 1.3,
          baseAlpha: 0.75 + Math.random() * 0.25,
          phase: Math.random() * TAU,
          x: 0,
          y: 0,
          z: 0,
          projX: 0,
          projY: 0,
          projSize: 1,
          projAlpha: 1,
        })
      }

      // 3. Background Ambient Floating Dots
      for (let i = 0; i < BG_COUNT; i++) {
        particles.push({
          type: 'bg',
          x: Math.random() * (width || 1200),
          y: Math.random() * (height || 560),
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          size: 0.8 + Math.random() * 0.9,
          alpha: 0.2 + Math.random() * 0.35,
          projX: 0,
          projY: 0,
          projSize: 1,
          projAlpha: 1,
        })
      }
    }

    function updatePhysics() {
      const active = section.getAttribute('data-active-track')

      // Smooth spin and energy interpolation based on hover
      const targetSpinL = active === 'left' ? 0.65 : active === 'right' ? 0.12 : 0.28
      const targetSpinR = active === 'right' ? 0.58 : active === 'left' ? 0.12 : 0.22
      const targetEnergyL = active === 'left' ? 1.15 : 1.0
      const targetEnergyR = active === 'right' ? 1.15 : 1.0

      spinLeft += (targetSpinL - spinLeft) * 0.06
      spinRight += (targetSpinR - spinRight) * 0.06
      energyLeft += (targetEnergyL - energyLeft) * 0.08
      energyRight += (targetEnergyR - energyRight) * 0.08

      if (!leftBox || !rightBox) return

      // --- Left 3D Arc Geometry ---
      // Position the 3D arc right next to the left text block
      const isNarrow = width < 900
      const arcCenterX = isNarrow
        ? leftBox.cx + leftBox.rx * 0.7
        : leftBox.cx + leftBox.rx + 28
      const arcCenterY = leftBox.cy
      const arcHeight = Math.max(260, leftBox.ry * 2.2) * (isNarrow ? 0.85 : 1)
      const arcRx = (isNarrow ? 22 : 30) * energyLeft
      const arcRz = (isNarrow ? 30 : 42) * energyLeft
      const currentRotL = time * spinLeft

      // --- Right 3D Cloud Geometry ---
      const cloudCenterX = rightBox.cx
      const cloudCenterY = rightBox.cy
      const cloudRx = Math.max(140, rightBox.rx * 1.3) * energyRight * (isNarrow ? 0.85 : 1)
      const cloudRy = Math.max(120, rightBox.ry * 1.25) * energyRight * (isNarrow ? 0.85 : 1)
      const cloudRz = (isNarrow ? 55 : 80) * energyRight
      const currentRotR = time * spinRight

      // Update 3D coordinates & projection for all particles
      for (let i = 0; i < TOTAL; i++) {
        const p = particles[i]

        if (p.type === 'left') {
          // Arc spine curve: bows outward towards the right in the middle
          const curveX = (1 - p.u * p.u) * (isNarrow ? 16 : 24)
          const localY = p.u * (arcHeight * 0.5) + p.scatterY

          // 3D cylinder / ribbon cross-section around the curved spine
          const rawAngle = p.angle + currentRotL
          const localX = curveX + Math.cos(rawAngle) * arcRx * p.radiusJitter + p.scatterX
          const localZ = Math.sin(rawAngle) * arcRz * p.radiusJitter

          // Slight tilt around X for natural perspective angle
          const tiltAngle = 0.12
          const yTilted = localY * Math.cos(tiltAngle) - localZ * Math.sin(tiltAngle)
          const zTilted = localY * Math.sin(tiltAngle) + localZ * Math.cos(tiltAngle)

          // 3D Perspective Projection
          const depth = Math.max(60, CAMERA_DIST - zTilted)
          const scale = CAMERA_DIST / depth

          p.z = zTilted
          p.projX = arcCenterX + localX * scale
          p.projY = arcCenterY + yTilted * scale
          p.projSize = Math.max(0.6, p.baseSize * scale * (active === 'left' ? 1.2 : 1.0))
          p.projAlpha = Math.min(
            1,
            Math.max(0.28, p.baseAlpha * (0.6 + 0.4 * (zTilted + arcRz) / (2 * arcRz)))
          )
        } else if (p.type === 'right') {
          // 3D Orbital shell around right card
          const orbitAngle = p.theta + currentRotR * p.orbitSpeed
          const localX = Math.cos(orbitAngle) * Math.sin(p.phi) * cloudRx * p.radiusJitter
          const localY =
            Math.cos(p.phi) * cloudRy * p.radiusJitter + Math.sin(time * 0.8 + p.phase) * 6
          const localZ = Math.sin(orbitAngle) * Math.sin(p.phi) * cloudRz * p.radiusJitter

          // Perspective projection
          const depth = Math.max(60, CAMERA_DIST - localZ)
          const scale = CAMERA_DIST / depth

          p.z = localZ
          p.projX = cloudCenterX + localX * scale
          p.projY = cloudCenterY + localY * scale
          p.projSize = Math.max(0.6, p.baseSize * scale * (active === 'right' ? 1.2 : 1.0))
          p.projAlpha = Math.min(
            1,
            Math.max(0.28, p.baseAlpha * (0.55 + 0.45 * (localZ + cloudRz) / (2 * cloudRz)))
          )
        } else {
          // Background ambient dots
          p.x += p.vx
          p.y += p.vy
          if (p.x < -20) p.x = width + 20
          if (p.x > width + 20) p.x = -20
          if (p.y < -20) p.y = height + 20
          if (p.y > height + 20) p.y = -20

          p.z = -150
          p.projX = p.x
          p.projY = p.y
          p.projSize = p.size
          p.projAlpha = p.alpha
        }
      }

      // Sort particles by Z depth so background dots render first and foreground dots render crisply on top
      particles.sort((a, b) => a.z - b.z)
    }

    function draw() {
      ctx.clearRect(0, 0, width, height)
      updatePhysics()

      for (let i = 0; i < TOTAL; i++) {
        const p = particles[i]
        ctx.globalAlpha = p.projAlpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.projX, p.projY, p.projSize, 0, TAU)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    }

    function loop() {
      raf = requestAnimationFrame(loop)
      time += 0.03
      draw()
    }

    function onResize() {
      resize()
      if (reduced) draw()
    }

    resize()
    seed()
    if (reduced) draw()
    else loop()

    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="tracks"
      data-active-track={activeTrack || ''}
      aria-labelledby="tracks-heading"
    >
      <canvas ref={canvasRef} className="tracks__canvas" aria-hidden="true" />

      <div className="container tracks__inner">
        <header className="tracks__head">
          <h2 id="tracks-heading" className="tracks__heading">
            Where the practice happens
          </h2>
          <p className="tracks__lede">
            One half is the room you answer in. The other is the record of what
            that answering has added up to.
          </p>
        </header>

        <div className="tracks__grid">
          <article
            className="tracks__track"
            onMouseEnter={() => setActiveTrack('left')}
            onMouseLeave={() => setActiveTrack(null)}
          >
            <div className="tracks__content">
              <span className="tracks__pill">Available at no charge</span>
              <h3 className="tracks__title">The interview room</h3>
              <p className="tracks__copy">
                Answer out loud, the way you would in the real thing. Every session
                is scored on structure, pacing and filler words, and the report
                names the one thing to fix before the next attempt.
              </p>
              <button
                type="button"
                className="btn btn--dark tracks__cta"
                onClick={onTakeInterview}
                onFocus={() => setActiveTrack('left')}
                onBlur={() => setActiveTrack(null)}
              >
                Start a mock interview
              </button>
            </div>
          </article>

          <article
            className="tracks__track"
            onMouseEnter={() => setActiveTrack('right')}
            onMouseLeave={() => setActiveTrack(null)}
          >
            <div className="tracks__content">
              <span className="tracks__pill">Now Available!</span>
              <h3 className="tracks__title">Your record</h3>
              <p className="tracks__copy">
                Sessions earn XP, and XP moves you between leagues. Streaks keep the
                habit going, and the leaderboard shows where this week puts you
                against everyone else practising.
              </p>
              <Link
                to="/leaderboard"
                className="btn btn--secondary tracks__cta"
                onFocus={() => setActiveTrack('right')}
                onBlur={() => setActiveTrack(null)}
              >
                See the leaderboard
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
