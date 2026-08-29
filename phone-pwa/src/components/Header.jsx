import React, { useState } from 'react'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="app-header">
        <div className="header-logo">
          {/* Gold status indicator dot */}
          <span className="header-status-dot" aria-hidden="true"></span>
          <span className="logo-brand">AGENT GATE</span>
        </div>
        <button
          className="menu-btn"
          aria-label="Open Menu"
          onClick={() => setMenuOpen(true)}
        >
          <span className="menu-btn-text">MENU</span>
          <span className="menu-btn-arrow">→</span>
        </button>
      </header>

      {/* Mistral-style compact slide-in menu */}
      <div
        className={`menu-overlay${menuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="menu-overlay-header">
          <span className="menu-overlay-brand">AGENT GATE</span>
          <button
            className="menu-close-btn"
            aria-label="Close Menu"
            onClick={() => setMenuOpen(false)}
          >
            CLOSE ✕
          </button>
        </div>

        <nav className="menu-nav">
          {['HOME', 'ACTIONS', 'HISTORY', 'SECURITY', 'SETTINGS'].map((item) => (
            <span key={item} className="menu-nav-item">{item}</span>
          ))}
        </nav>

        <div className="menu-footer-note">
          SECURE AI AUTHORIZATION // 2026
        </div>
      </div>
    </>
  )
}
