import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Global ErrorBoundary preventing uncaught JavaScript runtime exceptions
 * from white-screening the application.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary captured error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#101713',
          color: '#e6ece7',
          padding: '2rem',
          fontFamily: "'Instrument Sans', sans-serif"
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#17211b',
            border: '1px solid rgba(94, 207, 168, 0.14)',
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.12)',
              color: '#ff6b6b',
              marginBottom: '1.25rem'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.75rem', margin: '0 0 0.75rem 0' }}>
              Acoustic Channel Disruption
            </h1>
            <p style={{ color: '#9fb0a6', fontSize: '0.9375rem', lineHeight: '1.6', margin: '0 0 1.5rem 0' }}>
              An unexpected runtime state occurred in the telemetry pipeline. Your current profile data and settings have been safely preserved.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: '#5ecfa8',
                  color: '#08120d',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Re-initialize Engine
              </button>
              <Link
                to="/"
                onClick={() => this.setState({ hasError: false })}
                style={{
                  background: 'transparent',
                  color: '#e6ece7',
                  border: '1px solid #55695a',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Return to Base
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
