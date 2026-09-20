import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getUserProgress, upsertUserProgress } from '../lib/api.js'

/**
 * Tracks XP, streak, hearts and league, and keeps it synced with the
 * backend's gamification endpoints (server/core/gateway.py already has
 * GET/POST /api/user/progress and GET /api/leaderboard — this is the
 * "GameContext.jsx" its GameState model's docstring already refers to).
 *
 * There's no login system yet, so "who the user is" is a random id
 * generated once and kept in localStorage — not real auth, just enough
 * identity for progress tracking and the leaderboard to work.
 */

const GameContext = createContext(null)

const USER_ID_KEY = 'prepline_user_id'
const DEFAULT_STATE = {
  xp: 0,
  streak: 0,
  lastPracticeDate: null,
  gems: 0,
  hearts: 5,
  league: 'bronze',
  weeklyXp: 0,
  totalInterviews: 0,
}

function getOrCreateUserId() {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function GameProvider({ children }) {
  const [userId] = useState(getOrCreateUserId)
  const [state, setState] = useState(DEFAULT_STATE)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getUserProgress(userId)
      .then((doc) => {
        if (cancelled || !doc?.exists) return
        setState({
          xp: doc.xp ?? 0,
          streak: doc.streak ?? 0,
          lastPracticeDate: doc.last_practice_date ?? null,
          gems: doc.gems ?? 0,
          hearts: doc.hearts ?? 5,
          league: doc.league ?? 'bronze',
          weeklyXp: doc.weekly_xp ?? 0,
          totalInterviews: doc.total_interviews ?? 0,
        })
      })
      .catch(() => {
        // No backend reachable yet, or brand-new user — DEFAULT_STATE is fine.
      })
      .finally(() => !cancelled && setLoaded(true))
    return () => { cancelled = true }
  }, [userId])

  const persist = useCallback((next) => {
    upsertUserProgress({
      user_id: userId,
      xp: next.xp,
      streak: next.streak,
      last_practice_date: next.lastPracticeDate,
      gems: next.gems,
      hearts: next.hearts,
      achievements: [],
      skill_tree: {},
      league: next.league,
      weekly_xp: next.weeklyXp,
      weekly_start_date: null,
      total_interviews: next.totalInterviews,
    }).catch(() => {
      // Best-effort — local state already updated, so the UI is correct
      // even if the sync fails; it'll retry next time progress changes.
    })
  }, [userId])

  /** Call once when an interview finishes, with its report's overall_score (1-10). */
  const recordCompletedInterview = useCallback((overallScore = 0) => {
    setState((prev) => {
      const today = todayStr()
      const alreadyPracticedToday = prev.lastPracticeDate === today
      const nextStreak = alreadyPracticedToday
        ? prev.streak
        : prev.streak + 1

      const earnedXp = Math.round(10 + Number(overallScore || 0) * 10)
      const next = {
        ...prev,
        xp: prev.xp + earnedXp,
        weeklyXp: prev.weeklyXp + earnedXp,
        streak: nextStreak,
        lastPracticeDate: today,
        totalInterviews: prev.totalInterviews + 1,
      }
      persist(next)
      return next
    })
  }, [persist])

  return (
    <GameContext.Provider value={{ userId, ...state, loaded, recordCompletedInterview }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside GameProvider')
  return ctx
}
