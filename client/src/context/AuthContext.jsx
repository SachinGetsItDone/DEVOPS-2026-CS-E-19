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
  // `user` is null when nobody's logged in - not a fake "guest" object. A
  // GUEST_USER stand-in used to live here and was always truthy, so every
  // `{user && ...}` / `{user ? ... : ...}` check in the app (Navbar's
  // Sign out vs Log in, the History link, XP badge, etc.) thought someone
  // was always logged in, even on a fresh visit with no token at all -
  // and clicking "Sign out" set state to that exact same object again, so
  // React saw no change and didn't even re-render.
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    getMe()
      .then((u) => !cancelled && setUser(u || null))
      .catch((err) => {
        if (cancelled) return
        // A token the server rejects is worse than no token: it makes every
        // later request fail with a confusing 401. Drop it. A network
        // failure leaves the token alone so a flaky connection doesn't
        // sign the user out.
        if (err?.status === 401 || err?.status === 403) setToken(null)
        setUser(null)
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
