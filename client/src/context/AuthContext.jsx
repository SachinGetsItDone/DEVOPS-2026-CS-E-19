import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, register as apiRegister, getMe, getToken, setToken } from '../lib/api.js'

/**
 * Real authentication against the Node backend's JWT auth
 * (server/src/routes/auth.js). Almost every other endpoint requires this
 * token now, so nothing else in the app (interviews, progress,
 * leaderboard) works until someone is logged in.
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!getToken()) {
      setLoading(false)
      return
    }
    getMe()
      .then((u) => !cancelled && setUser(u))
      .catch(() => {
        // Token expired or invalid — clear it rather than keep retrying.
        if (!cancelled) setToken(null)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await apiLogin({ email, password })
    setToken(token)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (email, password, name) => {
    const { token, user: u } = await apiRegister({ email, password, name })
    setToken(token)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
