import React from 'react'

export default function SecuritySection() {
  return (
    <section className="editorial-section">
      <div className="section-meta">
        <span className="section-num">03 / SYSTEM TELEMETRY</span>
        <h2 className="section-title">/SECURITY</h2>
      </div>

      <div className="telemetry-table">
        <div className="telemetry-row">
          <span className="telemetry-key">AUTHORIZATION GATE</span>
          <span className="telemetry-dots"></span>
          <span className="telemetry-val val-success">READY</span>
        </div>
        
        <div className="telemetry-row">
          <span className="telemetry-key">DEVICE</span>
          <span className="telemetry-dots"></span>
          <span className="telemetry-val val-warning">NOT REGISTERED</span>
        </div>
        
        <div className="telemetry-row">
          <span className="telemetry-key">PENDING ACTIONS</span>
          <span className="telemetry-dots"></span>
          <span className="telemetry-val">00</span>
        </div>
      </div>
      
      <div className="telemetry-footnote">
        SYSTEM CLIENT: ENCRYPTED STANDALONE GATEWAY CLIENT // 2026.
      </div>
    </section>
  )
}
