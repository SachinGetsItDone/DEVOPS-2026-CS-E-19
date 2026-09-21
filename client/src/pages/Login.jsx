import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ApiError } from '../lib/api.js'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(location.state?.from || '/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth">
        <span className="eyebrow">Welcome back</span>
        <h1>Log in</h1>
        <p className="auth__sub">Your interviews, XP, and leaderboard rank are tied to your account.</p>

        <form onSubmit={handleSubmit}>
          <div className="auth__field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="auth__field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="auth__error">{error}</p>}
          <button className="auth__submit" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
        </form>

        <p className="auth__switch">No account yet? <Link to="/register">Register</Link></p>
      </div>
    </div>
  )
}
