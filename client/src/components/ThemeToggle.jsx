import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      darkMode ? 'dark' : 'light'
    )

    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <button
      type="button"
      onClick={() => setDarkMode((current) => !current)}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className="theme-toggle"
    >
      {darkMode ? '☀️ Light' : '🌙 Dark'}
    </button>
  )
}