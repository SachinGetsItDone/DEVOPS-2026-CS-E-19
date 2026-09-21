import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import { getUserProgress } from '../lib/api.js'

/**
 * Reads XP/streak/league from the backend's gamification system
 * (server/src/routes/user.js, server/src/services/progress.js).
 *
 * Unlike the version of this file written before the backend migration,
 * XP is now computed and awarded server-side in real time as each
 * interview turn is scored (services/progress.js: awardXp) — the client
 * only reads it, it never computes or pushes XP itself. That also means
 * there is nothing to "record" client-side when an interview ends;
 * refetching progress is enough to pick up whatever the server already
 * awarded during the interview.
 *
 * Known gap (backend, not this file): the `streak` field exists on the
 * Progress model but nothing in services/progress.js currently
 * increments it, so it will likely just stay at 0 for now.
 */

const GameContext = createContext(null)

const DEFAULT_STATE = {
  xp: 0,
  weeklyXp: 0,
  streak: 0,
  gems: 0,
  hearts: 5,
  league: 'bronze',
  interviewsCompleted: 0,
}

export function GameProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState(DEFAULT_STATE)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setState(DEFAULT_STATE)
      setLoaded(false)
      return
    }
    try {
      const p = await getUserProgress()
      setState({
        xp: p.xp ?? 0,
        weeklyXp: p.weekly_xp ?? 0,
        streak: p.streak ?? 0,
        gems: p.gems ?? 0,
        hearts: p.hearts ?? 5,
        league: p.league ?? 'bronze',
        interviewsCompleted: p.interviews_completed ?? 0,
      })
    } catch {
      // Not fatal — the rest of the UI works without a gamification badge.
    } finally {
      setLoaded(true)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <GameContext.Provider value={{ ...state, loaded, refresh }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside GameProvider')
  return ctx
}
