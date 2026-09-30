import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * ThreeHeroScene — 3D Studious Environment
 * Inspired by three.js webgl_animation_skinning_ik.
 * Renders a geometric study desk scene: desk, books, lamp, mug, pencil holder
 * in a white foggy environment with warm directional lighting.
 * Mouse interaction rotates the camera orbit gently.
 */
export default function ThreeHeroScene() {
  const containerRef = useRef(null)
  const [hasWebGL, setHasWebGL] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    // WebGL detection
    try {
      const testCanvas = document.createElement('canvas')
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
      if (!gl) { setHasWebGL(false); return }
    } catch { setHasWebGL(false); return }

    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || 500

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    scene.fog = new THREE.FogExp2(0xffffff, 0.032)

    // Camera
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000)
    camera.position.set(8, 7, 12)
    camera.lookAt(0, 1.5, 0)

    // Renderer
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: true,
        powerPreference: 'high-performance',
      })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.1
      container.appendChild(renderer.domElement)
    } catch (e) {
      console.warn('WebGL init failed:', e)
      setHasWebGL(false)
      return
    }

    // ─── Materials ───
    const mat = {
      // Warm wood
      wood: new THREE.MeshStandardMaterial({
        color: 0xc8a882,
        roughness: 0.7,
        metalness: 0.0,
      }),
      // Dark wood for desk legs
      darkWood: new THREE.MeshStandardMaterial({
        color: 0x8b7355,
        roughness: 0.75,
        metalness: 0.0,
      }),
      // White paper
      paper: new THREE.MeshStandardMaterial({
        color: 0xf8f6f0,
        roughness: 0.9,
        metalness: 0.0,
      }),
      // Book colors
      bookRed: new THREE.MeshStandardMaterial({ color: 0xe8603c, roughness: 0.6, metalness: 0.0 }),
      bookBlue: new THREE.MeshStandardMaterial({ color: 0x4d6675, roughness: 0.6, metalness: 0.0 }),
      bookGreen: new THREE.MeshStandardMaterial({ color: 0x6b8f71, roughness: 0.6, metalness: 0.0 }),
      bookYellow: new THREE.MeshStandardMaterial({ color: 0xe8c170, roughness: 0.6, metalness: 0.0 }),
      bookDark: new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.5, metalness: 0.0 }),
      // Metal lamp
      metal: new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.3,
        metalness: 0.8,
      }),
      // Ceramic mug
      ceramic: new THREE.MeshStandardMaterial({
        color: 0xf0ebe3,
        roughness: 0.5,
        metalness: 0.0,
      }),
      // Floor
      floor: new THREE.MeshStandardMaterial({
        color: 0xf5f0e8,
        roughness: 0.95,
        metalness: 0.0,
      }),
      // Pencils
      pencilBody: new THREE.MeshStandardMaterial({ color: 0xf7c948, roughness: 0.5, metalness: 0.0 }),
      pencilTip: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.0 }),
      // Monitor
      screen: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.1, metalness: 0.3 }),
      screenGlow: new THREE.MeshBasicMaterial({ color: 0xd0e8f5 }),
    }

    // ─── Floor ───
    const floorGeo = new THREE.PlaneGeometry(60, 60)
    const floor = new THREE.Mesh(floorGeo, mat.floor)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // ─── Desk ───
    // Tabletop
    const deskTopGeo = new THREE.BoxGeometry(6, 0.18, 3)
    const deskTop = new THREE.Mesh(deskTopGeo, mat.wood)
    deskTop.position.set(0, 2.8, 0)
    deskTop.castShadow = true
    deskTop.receiveShadow = true
    scene.add(deskTop)

    // Desk legs
    const legGeo = new THREE.BoxGeometry(0.14, 2.8, 0.14)
    const legPositions = [
      [-2.85, 1.4, -1.35],
      [2.85, 1.4, -1.35],
      [-2.85, 1.4, 1.35],
      [2.85, 1.4, 1.35],
    ]
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, mat.darkWood)
      leg.position.set(x, y, z)
      leg.castShadow = true
      scene.add(leg)
    })

    // ─── Books (stacked) ───
    const bookMats = [mat.bookRed, mat.bookBlue, mat.bookGreen, mat.bookYellow, mat.bookDark]
    const bookStack = [
      { w: 1.4, h: 0.18, d: 1.0, y: 0, rot: 0.05 },
      { w: 1.3, h: 0.22, d: 0.95, y: 0.20, rot: -0.03 },
      { w: 1.5, h: 0.15, d: 1.05, y: 0.39, rot: 0.08 },
      { w: 1.2, h: 0.20, d: 0.9, y: 0.57, rot: -0.02 },
    ]
    bookStack.forEach((b, i) => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d)
      const book = new THREE.Mesh(geo, bookMats[i % bookMats.length])
      book.position.set(-2, 2.89 + b.y + b.h / 2, -0.3)
      book.rotation.y = b.rot
      book.castShadow = true
      scene.add(book)
    })

    // Standing book (leaning)
    const standBookGeo = new THREE.BoxGeometry(0.15, 1.3, 0.9)
    const standBook = new THREE.Mesh(standBookGeo, mat.bookDark)
    standBook.position.set(-1.05, 2.89 + 0.65, -0.3)
    standBook.rotation.z = 0.08
    standBook.castShadow = true
    scene.add(standBook)

    // ─── Desk Lamp ───
    // Base
    const lampBaseGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.12, 16)
    const lampBase = new THREE.Mesh(lampBaseGeo, mat.metal)
    lampBase.position.set(2.2, 2.89 + 0.06, -0.6)
    lampBase.castShadow = true
    scene.add(lampBase)

    // Arm
    const lampArmGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8)
    const lampArm = new THREE.Mesh(lampArmGeo, mat.metal)
    lampArm.position.set(2.2, 2.89 + 1.22, -0.6)
    lampArm.rotation.z = 0.15
    lampArm.castShadow = true
    scene.add(lampArm)

    // Shade (cone)
    const shadeGeo = new THREE.ConeGeometry(0.55, 0.5, 16, 1, true)
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xe8603c,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })
    const shade = new THREE.Mesh(shadeGeo, shadeMat)
    shade.position.set(2.35, 2.89 + 2.4, -0.55)
    shade.rotation.z = 0.12
    shade.castShadow = true
    scene.add(shade)

    // Lamp light (warm point light from lamp)
    const lampLight = new THREE.PointLight(0xffeedd, 0.6, 8, 2)
    lampLight.position.set(2.35, 2.89 + 2.1, -0.55)
    lampLight.castShadow = true
    lampLight.shadow.mapSize.set(512, 512)
    scene.add(lampLight)

    // ─── Coffee Mug ───
    const mugGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.4, 16)
    const mug = new THREE.Mesh(mugGeo, mat.ceramic)
    mug.position.set(1.2, 2.89 + 0.2, 0.6)
    mug.castShadow = true
    scene.add(mug)

    // Mug handle (torus)
    const handleGeo = new THREE.TorusGeometry(0.1, 0.025, 8, 12, Math.PI)
    const handle = new THREE.Mesh(handleGeo, mat.ceramic)
    handle.position.set(1.38, 2.89 + 0.2, 0.6)
    handle.rotation.y = Math.PI / 2
    scene.add(handle)

    // ─── Pencil Holder ───
    const holderGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.5, 12)
    const holder = new THREE.Mesh(holderGeo, mat.ceramic)
    holder.position.set(2.5, 2.89 + 0.25, 0.7)
    holder.castShadow = true
    scene.add(holder)

    // Pencils inside holder
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const pencilGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6)
      const pencil = new THREE.Mesh(pencilGeo, i % 2 === 0 ? mat.pencilBody : mat.bookRed)
      pencil.position.set(
        2.5 + Math.cos(angle) * 0.08,
        2.89 + 0.6,
        0.7 + Math.sin(angle) * 0.08
      )
      pencil.rotation.x = (Math.random() - 0.5) * 0.15
      pencil.rotation.z = (Math.random() - 0.5) * 0.15
      scene.add(pencil)
    }

    // ─── Paper on desk ───
    const paperGeo = new THREE.BoxGeometry(1.2, 0.01, 1.6)
    const paper = new THREE.Mesh(paperGeo, mat.paper)
    paper.position.set(0.3, 2.89 + 0.005, 0.2)
    paper.rotation.y = 0.06
    paper.receiveShadow = true
    scene.add(paper)

    // Paper lines (thin dark strips on paper)
    for (let i = 0; i < 8; i++) {
      const lineGeo = new THREE.BoxGeometry(0.9, 0.002, 0.015)
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xd5d0c8 })
      const line = new THREE.Mesh(lineGeo, lineMat)
      line.position.set(0.3, 2.9 + 0.008, -0.35 + i * 0.14)
      line.rotation.y = 0.06
      scene.add(line)
    }

    // ─── Small Monitor / Laptop ───
    // Screen base
    const monitorBaseGeo = new THREE.BoxGeometry(2.2, 0.08, 1.4)
    const monitorBase = new THREE.Mesh(monitorBaseGeo, mat.metal)
    monitorBase.position.set(0, 2.89 + 0.04, -1.05)
    monitorBase.receiveShadow = true
    scene.add(monitorBase)

    // Screen
    const screenGeo = new THREE.BoxGeometry(2.1, 1.4, 0.06)
    const screenMesh = new THREE.Mesh(screenGeo, mat.screen)
    screenMesh.position.set(0, 2.89 + 0.78, -1.3)
    screenMesh.rotation.x = -0.1
    screenMesh.castShadow = true
    scene.add(screenMesh)

    // Screen glow (front face)
    const glowGeo = new THREE.PlaneGeometry(1.95, 1.28)
    const glowMesh = new THREE.Mesh(glowGeo, mat.screenGlow)
    glowMesh.position.set(0, 2.89 + 0.78, -1.27)
    glowMesh.rotation.x = -0.1
    scene.add(glowMesh)

    // Screen light
    const screenLight = new THREE.PointLight(0xd0e8f5, 0.3, 4, 2)
    screenLight.position.set(0, 3.5, -0.8)
    scene.add(screenLight)

    // ─── Chair (simple) ───
    // Seat
    const seatGeo = new THREE.BoxGeometry(1.6, 0.12, 1.4)
    const seat = new THREE.Mesh(seatGeo, mat.darkWood)
    seat.position.set(0, 1.8, 2.5)
    seat.castShadow = true
    scene.add(seat)

    // Chair legs
    const chairLegGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8)
    const chairLegPositions = [
      [-0.65, 0.9, 1.9],
      [0.65, 0.9, 1.9],
      [-0.65, 0.9, 3.05],
      [0.65, 0.9, 3.05],
    ]
    chairLegPositions.forEach(([x, y, z]) => {
      const cleg = new THREE.Mesh(chairLegGeo, mat.metal)
      cleg.position.set(x, y, z)
      cleg.castShadow = true
      scene.add(cleg)
    })

    // Chair back
    const backGeo = new THREE.BoxGeometry(1.5, 1.3, 0.1)
    const back = new THREE.Mesh(backGeo, mat.darkWood)
    back.position.set(0, 2.52, 3.1)
    back.castShadow = true
    scene.add(back)

    // ─── Lighting ───
    // Ambient — soft warm fill
    const ambient = new THREE.AmbientLight(0xfff5e6, 0.5)
    scene.add(ambient)

    // Key light — warm directional from upper-right
    const dirLight = new THREE.DirectionalLight(0xfff0d6, 0.8)
    dirLight.position.set(6, 10, 4)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(1024, 1024)
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 30
    dirLight.shadow.camera.left = -10
    dirLight.shadow.camera.right = 10
    dirLight.shadow.camera.top = 10
    dirLight.shadow.camera.bottom = -10
    dirLight.shadow.normalBias = 0.02
    scene.add(dirLight)

    // Fill light — cool from left
    const fillLight = new THREE.DirectionalLight(0xe0e8f0, 0.3)
    fillLight.position.set(-5, 6, -2)
    scene.add(fillLight)

    // Hemisphere
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xf5e8d6, 0.35)
    scene.add(hemiLight)

    // ─── Interaction & Animation ───
    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }
    let clock = new THREE.Clock()
    let animationFrameId = null

    function onPointerMove(e) {
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      mouse.targetX = x
      mouse.targetY = y
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })

    function onResize() {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight || 500
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', onResize)

    // Animation loop
    function animate() {
      animationFrameId = requestAnimationFrame(animate)

      const time = clock.getElapsedTime()

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.03
      mouse.y += (mouse.targetY - mouse.y) * 0.03

      // Orbit camera around desk
      const baseAngle = 0.6
      const camRadius = 16
      const camHeight = 7.5

      const angle = baseAngle + mouse.x * 0.4 + Math.sin(time * 0.15) * 0.05
      camera.position.x = Math.cos(angle) * camRadius
      camera.position.z = Math.sin(angle) * camRadius
      camera.position.y = camHeight + mouse.y * -1.5 + Math.sin(time * 0.2) * 0.15

      camera.lookAt(0, 2.4, 0)

      // Subtle lamp shade sway
      shade.rotation.z = 0.12 + Math.sin(time * 1.2) * 0.02

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', onResize)
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      // Dispose all geometries and materials
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      })
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="three-hero-scene"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        opacity: hasWebGL ? 1 : 0,
        transition: 'opacity 0.6s ease',
      }}
    />
  )
}
