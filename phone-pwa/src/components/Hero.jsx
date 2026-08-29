import React from 'react'
import AgentLogo from './AgentLogo'

export default function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-metadata">
        <span>AI SECURITY</span>
        <span className="meta-sep">/</span>
        <span>HUMAN CONTROL</span>
        <span className="meta-sep">/</span>
        <span>2026</span>
      </div>
      
      <div className="hero-headline-container">
        <h1 className="hero-headline">
          HUMAN<br />
          <span className="hero-headline-gold">AUTHORIZATION</span><br />
          FOR AUTONOMOUS AI.
        </h1>
        
        {/* Cropped abstract symbol in background */}
        <div className="hero-bg-symbol-wrap">
          <AgentLogo className="hero-bg-symbol" />
        </div>
      </div>

      <p className="hero-subtext">
        AI can propose the action.<br />
        You decide whether it executes.
      </p>

      <div className="hero-scroll">
        <span className="scroll-label">EXPLORE</span>
        <span className="scroll-arrow">↓</span>
      </div>
    </section>
  )
}
