import React from 'react'

export default function StatusSection() {
  return (
    <section className="editorial-section">
      <div className="section-meta">
        <span className="section-num">01 / DEVICE AUTHORIZATION</span>
        <h2 className="section-title">/STATUS</h2>
      </div>
      
      <div className="status-display">
        <div className="status-indicator">
          <span className="status-indicator-dot pulse-warning"></span>
          <span className="status-indicator-text">UNREGISTERED</span>
        </div>
        <h3 className="status-display-main">
          DEVICE<br />
          NOT REGISTERED
        </h3>
      </div>
      
      <div className="section-body">
        <p className="section-desc">
          This phone will become the human authorization endpoint for Agent Gate. 
          Pairing this client enables cryptographic verification of code changes and 
          sensitive tasks proposed by autonomous agents.
        </p>
      </div>

      <div className="section-action">
        <button className="editorial-btn" disabled aria-label="Register Device (Placeholder)">
          <span className="btn-label-text">REGISTER DEVICE</span>
          <span className="btn-label-arrow">→</span>
        </button>
      </div>
    </section>
  )
}
