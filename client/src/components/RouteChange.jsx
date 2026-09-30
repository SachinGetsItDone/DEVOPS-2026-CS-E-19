import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Two jobs on every navigation: put the viewport back at the top, and move
 * keyboard focus to the page's main region. Without the second, a keyboard
 * user lands on a new route with focus still on the old nav link and has to
 * tab the whole header again.
 */
export default function RouteChange({ mainId = 'main' }) {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    const main = document.getElementById(mainId)
    if (!main) return
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
    main.focus({ preventScroll: true })
  }, [pathname, mainId])

  return null
}
