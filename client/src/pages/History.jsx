import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getInterviews, ApiError } from '../lib/api.js'
import './History.css'

const PAGE_SIZE = 10

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function ScoreBadge({ item }) {
  if (item.has_report) {
    return (
      <span className="history__score">
        <strong>{item.overall_score}</strong>
        <span>/10 overall</span>
      </span>
    )
  }
  if (item.avg_score !== null) {
    return (
      <span className="history__score history__score--pending">
        <strong>{item.avg_score}</strong>
        <span>/10 avg &middot; no report yet</span>
      </span>
    )
  }
  return <span className="history__score history__score--none">Not answered</span>
}

export default function History() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState('loading') // loading | ready | error | needs-login
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const loadPage = useCallback(async (nextPage, { append }) => {
    try {
      const data = await getInterviews({ page: nextPage, limit: PAGE_SIZE })
      setItems((prev) => {
        if (!append) return data.interviews
        // A new interview could have been created since the first page loaded,
        // shifting rows between pages - never show the same interview twice.
        const seen = new Set(prev.map((i) => i.interview_id))
        return [...prev, ...data.interviews.filter((i) => !seen.has(i.interview_id))]
      })
      setTotal(data.total)
      setPage(data.page)
      setHasMore(data.has_more)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your interviews.')
      setStatus(append ? 'ready' : 'error')
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setStatus('needs-login')
      return
    }
    setStatus('loading')
    loadPage(1, { append: false })
  }, [user, authLoading, loadPage])

  async function handleLoadMore() {
    setLoadingMore(true)
    setError('')
    await loadPage(page + 1, { append: true })
    setLoadingMore(false)
  }

  return (
    <div className="history-page">
      <Navbar />
      <div className="container history">
        <span className="eyebrow">Your practice</span>
        <h1>Interview history</h1>

        {status === 'needs-login' && (
          <p className="history__empty">
            <Link to="/login" state={{ from: '/history' }}>Log in</Link> to see your past interviews.
          </p>
        )}
        {status === 'loading' && <p className="history__empty">Loading…</p>}
        {status === 'error' && <p className="history__empty history__empty--error">{error}</p>}

        {status === 'ready' && items.length === 0 && (
          <div className="history__empty">
            <p>You haven't taken an interview yet.</p>
            <Link to="/" className="history__cta">Take your first interview</Link>
          </div>
        )}

        {status === 'ready' && items.length > 0 && (
          <>
            <p className="history__count">
              {total} interview{total === 1 ? '' : 's'}
            </p>
            <ul className="history__list">
              {items.map((item) => {
                const canOpen = item.turns_answered > 0
                const body = (
                  <>
                    <div className="history__main">
                      <span className="history__role">{item.role || 'General'}</span>
                      <span className="history__meta">
                        {formatDate(item.created_at)} &middot; {item.turns_answered} answer
                        {item.turns_answered === 1 ? '' : 's'}
                        <span className={`history__tag history__tag--${item.difficulty}`}>{item.difficulty}</span>
                      </span>
                    </div>
                    <ScoreBadge item={item} />
                  </>
                )
                return (
                  <li key={item.interview_id}>
                    {canOpen ? (
                      <Link to={`/report/${item.interview_id}`} className="history__row">{body}</Link>
                    ) : (
                      <div className="history__row history__row--disabled">{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>

            {error && <p className="history__empty history__empty--error">{error}</p>}
            {hasMore && (
              <button className="history__more" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
