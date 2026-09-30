import { useRef, useState, useEffect } from 'react'

/**
 * MagneticButton — A spring-damped tactile button component
 * Tracks pointer proximity with progressive distance attenuation so the initial
 * follow starts slow and gentle, building into a smooth magnetic pull.
 */
export default function MagneticButton({
  children,
  className = '',
  onClick,
  disabled = false,
  as: Component = 'button',
  to,
  href,
  pullFactor = 0.32,
  ...props
}) {
  const buttonRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [isInitial, setIsInitial] = useState(false)
  const hoveredRef = useRef(false)
  const initialTimerRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const el = buttonRef.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    function onPointerMove(e) {
      if (disabled) return
      if (rafRef.current) return

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        if (!el) return

        const rect = el.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        // Distance from button rectangular perimeter (0 when hovering over button)
        const dx = Math.max(0, Math.abs(e.clientX - centerX) - rect.width / 2)
        const dy = Math.max(0, Math.abs(e.clientY - centerY) - rect.height / 2)
        const distFromEdge = Math.hypot(dx, dy)

        // Influence perimeter outside the button
        const attractionRadius = Math.max(60, Math.min(rect.width, rect.height) * 1.2)

        if (distFromEdge < attractionRadius) {
          // Normalized progress: 0 at outer perimeter, 1 when on or inside button
          const progress = 1 - distFromEdge / attractionRadius
          // Progressive power easing so initial pull starts ultra-gentle and smooth
          const ease = Math.pow(progress, 2.4)

          const rawX = (e.clientX - centerX) * pullFactor * ease
          const rawY = (e.clientY - centerY) * pullFactor * ease

          // Soft clamp maximum displacement
          const maxDisplacement = 28
          const curDist = Math.hypot(rawX, rawY)
          let finalX = rawX
          let finalY = rawY
          if (curDist > maxDisplacement) {
            finalX = (rawX / curDist) * maxDisplacement
            finalY = (rawY / curDist) * maxDisplacement
          }

          setPosition({
            x: Math.round(finalX * 10) / 10,
            y: Math.round(finalY * 10) / 10,
          })

          if (!hoveredRef.current) {
            hoveredRef.current = true
            setIsHovered(true)
            setIsInitial(true)
            clearTimeout(initialTimerRef.current)
            initialTimerRef.current = setTimeout(() => {
              setIsInitial(false)
            }, 380)
          }
        } else if (hoveredRef.current) {
          hoveredRef.current = false
          setPosition({ x: 0, y: 0 })
          setIsHovered(false)
          setIsInitial(false)
          clearTimeout(initialTimerRef.current)
        }
      })
    }

    function onPointerLeave() {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (hoveredRef.current) {
        hoveredRef.current = false
        setPosition({ x: 0, y: 0 })
        setIsHovered(false)
        setIsInitial(false)
        clearTimeout(initialTimerRef.current)
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('blur', onPointerLeave)
    document.addEventListener('pointerleave', onPointerLeave)
    el.addEventListener('pointerleave', onPointerLeave)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('blur', onPointerLeave)
      document.removeEventListener('pointerleave', onPointerLeave)
      if (el) el.removeEventListener('pointerleave', onPointerLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimeout(initialTimerRef.current)
    }
  }, [disabled, pullFactor])

  const transformStyle = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
    willChange: isHovered ? 'transform' : 'auto',
    transition: !isHovered
      ? 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
      : isInitial
      ? 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)'
      : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
  }

  const combinedProps = {
    ref: buttonRef,
    className: `magnetic-btn ${className}`,
    style: transformStyle,
    onClick,
    disabled,
    ...props,
  }

  if (to) {
    return <Component to={to} {...combinedProps}>{children}</Component>
  }
  if (href) {
    return <Component href={href} {...combinedProps}>{children}</Component>
  }
  return <Component {...combinedProps}>{children}</Component>
}
