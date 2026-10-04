import { useState } from 'react'

export default function SettingsPanel({ onClose }) {
  const [fontSize, setFontSize] = useState(
    localStorage.getItem('fontSize') || 'medium'
  )

  const [animations, setAnimations] = useState(
    localStorage.getItem('animations') !== 'off'
  )

  const changeFontSize = (size) => {
    setFontSize(size)
    localStorage.setItem('fontSize', size)

    document.documentElement.setAttribute('data-font-size', size)
  }

  const toggleAnimations = () => {
    const newValue = !animations

    setAnimations(newValue)
    localStorage.setItem('animations', newValue ? 'on' : 'off')

    document.documentElement.setAttribute(
      'data-animations',
      newValue ? 'on' : 'off'
    )
  }

  const resetSettings = () => {
    localStorage.removeItem('fontSize')
    localStorage.removeItem('animations')

    setFontSize('medium')
    setAnimations(true)

    document.documentElement.removeAttribute('data-font-size')
    document.documentElement.removeAttribute('data-animations')
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <section
        className="settings-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-header">
          <div>
            <h2>Settings</h2>
            <p>Customize your Prepline experience.</p>
          </div>

          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="settings-section">
          <h3>Font Size</h3>

          <div className="settings-options">
            {['small', 'medium', 'large'].map((size) => (
              <button
                key={size}
                type="button"
                className={`settings-option ${
                  fontSize === size ? 'settings-option--active' : ''
                }`}
                onClick={() => changeFontSize(size)}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3>Animations</h3>

          <button
            type="button"
            className={`settings-toggle ${
              animations ? 'settings-toggle--active' : ''
            }`}
            onClick={toggleAnimations}
          >
            <span>{animations ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>

        <button
          type="button"
          className="settings-reset"
          onClick={resetSettings}
        >
          Reset Settings
        </button>
      </section>
    </div>
  )
}