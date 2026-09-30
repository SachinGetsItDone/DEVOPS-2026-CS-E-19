import { useEffect, useState } from 'react'
import { checkHealth } from '../lib/api.js'
import '../styles/states.css'

/**
 * When the API is unreachable every action fails individually, which reads as
 * "the app is broken" rather than "the server is off". One banner up front
 * says which, once.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer

    async function probe() {
      const ok = await checkHealth()
      if (cancelled) return
      setOffline(!ok)
      // Re-probe while down so the banner clears without a manual reload.
      if (!ok) timer = setTimeout(probe, 10000)
    }

    probe()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="offline-banner" role="status">
      <div className="container offline-banner__inner">
        <span className="offline-banner__dot" aria-hidden="true" />
        <strong>The Prepline API is not responding.</strong>
        <span>
          Practice sessions, scoring and the leaderboard need it running. Start it with{' '}
          <code>npm start</code> inside the <code>server</code> folder.
        </span>
      </div>
    </div>
  )
}
