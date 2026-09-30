import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, register as apiRegister, getMe, getToken, setToken } from '../lib/api.js'

/**
 * Real authentication against the Node backend's JWT auth
 * (server/src/routes/auth.js). Almost every other endpoint requires this
 * token now, so nothing else in the app (interviews, progress,
 * leaderboard) works until someone is logged in.
 */

const AuthContext = createContext(null)

const GUEST_USER = {
  id: '000000000000000000000001',
  name: 'Guest Candidate',
  email: 'guest@prepline.local',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(GUEST_USER)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!getToken()) {
      setUser(GUEST_USER)
      setLoading(false)
      return
    }
    setLoading(true)
    getMe()
      .then((u) => !cancelled && setUser(u || GUEST_USER))
      .catch((err) => {
        if (cancelled) return
        // A token the server rejects is worse than no token: it makes every
        // later request fail with a confusing 401. Drop it and fall back to
        // guest. A network failure leaves the token alone so a flaky
        // connection doesn't sign the user out.
        if (err?.status === 401 || err?.status === 403) setToken(null)
        setUser(GUEST_USER)
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
    setUser(GUEST_USER)
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
