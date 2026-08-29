import React from 'react'

export default function Marquee() {
  const text = "AI SECURITY // HUMAN CONTROL // WEBAUTHN // TRUST // AUTHORIZATION // ACTION GATE // "
  
  return (
    <div className="marquee-wrap" aria-hidden="true">
      <div className="marquee-content">
        <span className="marquee-span">{text}</span>
        <span className="marquee-span">{text}</span>
        <span className="marquee-span">{text}</span>
      </div>
    </div>
  )
}
