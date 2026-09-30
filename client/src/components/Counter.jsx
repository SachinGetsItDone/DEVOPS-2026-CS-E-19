import { useEffect, useState } from 'react'

/**
 * Animated number counter with spring interpolation and reduced motion support.
 */
export default function Counter({
  value,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDisplayValue(value)
      return
    }

    const start = 0
    const target = Number(value) || 0
    const startTime = performance.now()

    let raf = 0
    function update(now) {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      // Custom ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = start + (target - start) * ease

      setDisplayValue(current)

      if (progress < 1) {
        raf = requestAnimationFrame(update)
      } else {
        setDisplayValue(target)
      }
    }

    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  )
}
