import React from 'react'

export default function AgentLogo({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Gate Hexagon */}
      <polygon
        points="50,5 90,28 90,72 50,95 10,72 10,28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      
      {/* Inner Segment Gate Lines */}
      <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" />
      
      {/* Gate Pillars */}
      <path
        d="M30,35 H42 V65 H30 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.05"
      />
      <path
        d="M58,35 H70 V65 H58 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.05"
      />
      
      {/* Central Human Verification Core (Accent Color) */}
      <circle cx="50" cy="50" r="5" fill="var(--color-accent)" />
    </svg>
  )
}
