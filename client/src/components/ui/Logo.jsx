import React from 'react'

export default function Logo({ size = 32, showText = true, className = '' }) {
  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          {/* Cyan to Royal Blue to Indigo Gradient */}
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00b4d8" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="logoGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g filter="url(#logoGlow)">
          {/* Left Brain - Circuit board representation */}
          <path
            d="M58 22C43 22 31 34 31 49C31 53 32 57 34 61L42 71C43 72 44 74 44 76V85C44 91 48 95 54 95"
            stroke="url(#logoGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Connectors and Nodes */}
          <path d="M31 49H42" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="45" cy="49" r="4.5" fill="none" stroke="url(#logoGradient)" strokeWidth="2.5" />
          
          <path d="M34 61H46" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" />
          <path d="M46 61L51 53" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="53" cy="51" r="4.5" fill="none" stroke="url(#logoGradient)" strokeWidth="2.5" />

          <path
            d="M38 35C43 29 50 26 58 26"
            stroke="url(#logoGradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="38" cy="35" r="4.5" fill="none" stroke="url(#logoGradient)" strokeWidth="2.5" />

          <path d="M44 79H54" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="54" cy="79" r="4.5" fill="none" stroke="url(#logoGradient)" strokeWidth="2.5" />

          <circle cx="54" cy="95" r="5" fill="none" stroke="url(#logoGradient)" strokeWidth="3" />

          {/* Right Brain - Cloud representation */}
          <path
            d="M62 22C74 22 84 30 86 42C93 42 99 48 99 55C99 62 93 68 86 68C84 76 77 82 68 82C66 82 64 82 62 81V95"
            stroke="url(#logoGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Cloud internal nodes */}
          <circle cx="68" cy="43" r="4" fill="none" stroke="url(#logoGradient)" strokeWidth="2.5" />
          <path d="M62 43H64" stroke="url(#logoGradient)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M68 47V56" stroke="url(#logoGradient)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="68" cy="60" r="4" fill="none" stroke="url(#logoGradient)" strokeWidth="2.5" />

          <circle cx="82" cy="54" r="4" fill="none" stroke="url(#logoGradient)" strokeWidth="2.5" />
          <path d="M82 58V67" stroke="url(#logoGradient)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="82" cy="71" r="4" fill="none" stroke="url(#logoGradient)" strokeWidth="2.5" />
          
          <circle cx="62" cy="95" r="5" fill="none" stroke="url(#logoGradient)" strokeWidth="3" />
        </g>
      </svg>
      {showText && (
        <span 
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: `${size * 0.65}px`,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(90deg, #00b4d8 0%, #2563eb 50%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          InfraMind
        </span>
      )}
    </div>
  )
}
