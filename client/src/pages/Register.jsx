import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ApiError } from '../lib/api.js'
import './Auth.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await register(email, password, name)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create an account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth">
        <span className="eyebrow">Get started</span>
        <h1>Create an account</h1>
        <p className="auth__sub">Needed to save your interviews, track XP, and show up on the leaderboard.</p>

        <form onSubmit={handleSubmit}>
          <div className="auth__field">
            <label htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          </div>
          <div className="auth__field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="auth__field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>
          {error && <p className="auth__error">{error}</p>}
          <button className="auth__submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        </form>

        <p className="auth__switch">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  )
}
