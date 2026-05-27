import React, { useMemo } from 'react'
import { TECH_OPTIONS, DEFAULT_PRICING } from './CostEstimator.jsx'

export default function AnimatedDataflow({ data, detectedStack = [], customCosts = {}, enabledServices = {}, viabilityMetrics = {} }) {
  const usedTechs = new Set();

  const getEnabledServiceForCategory = (categories, fallbackName, fallbackService) => {
    for (const tech of Object.keys(enabledServices)) {
      if (enabledServices[tech] && !usedTechs.has(tech)) {
        let cat = '';
        if (TECH_OPTIONS[tech] && TECH_OPTIONS[tech].length > 0) {
          cat = TECH_OPTIONS[tech][0].category;
        } else if (DEFAULT_PRICING[tech]) {
          cat = DEFAULT_PRICING[tech].category;
        }

        if (categories.includes(cat)) {
          usedTechs.add(tech);
          const custom = customCosts[tech];
          let priceService = custom ? custom.service : (DEFAULT_PRICING[tech]?.service || 'Managed');
          
          let name = tech;
          if (name.length > 22) name = name.substring(0, 20) + '...';

          return { name, service: priceService };
        }
      }
    }
    return { name: fallbackName, service: fallbackService }
  }

  const frontend = getEnabledServiceForCategory(['Frontend'], 'Client App', 'Browser / Mobile')
  const gateway = getEnabledServiceForCategory(['Serverless', 'Cloud', 'Infra'], 'API Gateway', 'Routing & Rate Limit')
  const auth = getEnabledServiceForCategory(['Auth'], 'Auth Middleware', 'JWT / OAuth')
  const backend = getEnabledServiceForCategory(['Backend', 'Serverless'], 'App Service', 'Business Logic')
  const cache = getEnabledServiceForCategory(['Cache', 'Queue'], 'Cache / Queue', 'In-memory / Async')
  const db = getEnabledServiceForCategory(['Database', 'Storage'], 'Primary DB', 'Persistent Storage')

  // Latency estimates based on viability speed score (0-100)
  const speed = viabilityMetrics?.speed || 60
  const totalLatency = Math.max(10, 140 - speed)
  const l1 = Math.round(totalLatency * 0.1) // network
  const l2 = Math.round(totalLatency * 0.05) // gateway
  const l3 = Math.round(totalLatency * 0.1) // auth
  const l4 = Math.round(totalLatency * 0.15) // cache
  const l5 = Math.round(totalLatency * 0.6) // db miss

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '16px',
      padding: 'clamp(16px, 3vw, 32px) clamp(12px, 2vw, 24px)',
      marginBottom: '24px',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      width: '100%',
      maxWidth: '100%'
    }}>
      <svg width="100%" height="280" viewBox="0 0 780 280" style={{ overflow: 'visible', minWidth: '600px', display: 'block' }}>
        <defs>
          <filter id="nodeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--primary)" />
          </marker>
          <marker id="arrowWarn" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--warning)" />
          </marker>
          <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--success)" />
          </marker>
          <linearGradient id="nodeGradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59,130,246,0.25)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.1)" />
          </linearGradient>
          <linearGradient id="nodeGradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.25)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.05)" />
          </linearGradient>
          <linearGradient id="nodeGradWarn" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(245,158,11,0.2)" />
            <stop offset="100%" stopColor="rgba(245,158,11,0.05)" />
          </linearGradient>
        </defs>

        <style>{`
          .flow-dash {
            stroke-dasharray: 6 6;
            animation: flowAnim 1.8s linear infinite;
          }
          .flow-dash-warn {
            stroke-dasharray: 6 6;
            animation: flowAnim 2.4s linear infinite;
          }
          .flow-dash-green {
            stroke-dasharray: 6 6;
            animation: flowAnim 2s linear infinite;
          }
          @keyframes flowAnim {
            to { stroke-dashoffset: -200; }
          }
        `}</style>

        {/* ─── FLOW PATHS ─── */}
        {/* User → API GW */}
        <line x1="90" y1="80" x2="185" y2="80" stroke="var(--border-subtle)" strokeWidth="2" />
        <line x1="90" y1="80" x2="185" y2="80" className="flow-dash" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#arrowBlue)" />
        <rect x="120" y="62" width="38" height="16" rx="4" fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="0.5"/>
        <text x="139" y="74" textAnchor="middle" fill="var(--primary)" fontSize="8" fontWeight="700">{l1}ms</text>

        {/* API GW → Auth */}
        <line x1="255" y1="80" x2="345" y2="80" stroke="var(--border-subtle)" strokeWidth="2" />
        <line x1="255" y1="80" x2="345" y2="80" className="flow-dash" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#arrowBlue)" />
        <rect x="280" y="62" width="38" height="16" rx="4" fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="0.5"/>
        <text x="299" y="74" textAnchor="middle" fill="var(--primary)" fontSize="8" fontWeight="700">{l2}ms</text>

        {/* Auth → App Service */}
        <line x1="415" y1="80" x2="505" y2="80" stroke="var(--border-subtle)" strokeWidth="2" />
        <line x1="415" y1="80" x2="505" y2="80" className="flow-dash" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#arrowBlue)" />
        <rect x="440" y="62" width="38" height="16" rx="4" fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="0.5"/>
        <text x="459" y="74" textAnchor="middle" fill="var(--primary)" fontSize="8" fontWeight="700">{l3}ms</text>

        {/* App Service → Cache (up-right) */}
        <path d="M 575 65 Q 620 30 670 50" stroke="var(--border-subtle)" strokeWidth="2" fill="none" />
        <path d="M 575 65 Q 620 30 670 50" className="flow-dash-green" stroke="var(--success)" strokeWidth="2" fill="none" markerEnd="url(#arrowGreen)" />
        <rect x="604" y="20" width="50" height="16" rx="4" fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="0.5"/>
        <text x="629" y="32" textAnchor="middle" fill="var(--success)" fontSize="8" fontWeight="700">{l4}ms ⚡</text>

        {/* App Service → DB (down-right) */}
        <path d="M 575 95 Q 620 160 670 170" stroke="var(--border-subtle)" strokeWidth="2" fill="none" />
        <path d="M 575 95 Q 620 160 670 170" className="flow-dash-warn" stroke="var(--warning)" strokeWidth="2" fill="none" markerEnd="url(#arrowWarn)" />
        <rect x="604" y="140" width="50" height="16" rx="4" fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="0.5"/>
        <text x="629" y="152" textAnchor="middle" fill="var(--warning)" fontSize="8" fontWeight="700">{l5}ms</text>

        {/* Cache → App (response path, dashed lighter) */}
        <path d="M 670 58 Q 640 100 580 100" stroke="rgba(16,185,129,0.25)" strokeWidth="1.5" fill="none" strokeDasharray="3 4"/>

        {/* ─── NODES ─── */}

        {/* Node 1: Client */}
        <g transform="translate(50, 80)">
          <circle r="36" fill="url(#nodeGradBlue)" stroke="var(--primary)" strokeWidth="1.5" />
          <circle cx="0" cy="-8" r="10" fill="var(--primary)" opacity="0.9"/>
          <path d="M -16,18 Q -16,4 0,4 Q 16,4 16,18 Z" fill="var(--primary)" opacity="0.9"/>
          <text y="52" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="700">{frontend.name}</text>
          <text y="64" textAnchor="middle" fill="var(--text-muted)" fontSize="8">{frontend.service}</text>
        </g>

        {/* Node 2: API Gateway */}
        <g transform="translate(220, 80)">
          <rect x="-38" y="-36" width="76" height="72" rx="8" fill="url(#nodeGradBlue)" stroke="var(--primary)" strokeWidth="2" filter="url(#nodeGlow)" />
          <path d="M 0,-22 L 20,-12 L 20,4 Q 20,18 0,26 Q -20,18 -20,4 L -20,-12 Z" fill="var(--primary)" opacity="0.8"/>
          <path d="M -8,2 L -2,8 L 12,-6" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <text y="52" textAnchor="middle" fill="var(--primary)" fontSize="10" fontWeight="700">{gateway.name}</text>
          <text y="64" textAnchor="middle" fill="var(--text-muted)" fontSize="8">{gateway.service}</text>
        </g>

        {/* Node 3: Auth */}
        <g transform="translate(380, 80)">
          <circle r="32" fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <circle cx="0" cy="-6" r="11" fill="none" stroke="var(--text-secondary)" strokeWidth="2"/>
          <rect x="-2" y="4" width="4" height="14" rx="2" fill="var(--text-secondary)"/>
          <rect x="0" y="12" width="8" height="3" rx="1" fill="var(--text-secondary)"/>
          <rect x="0" y="17" width="6" height="3" rx="1" fill="var(--text-secondary)"/>
          <text y="50" textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="700">{auth.name}</text>
          <text y="61" textAnchor="middle" fill="var(--text-muted)" fontSize="8">{auth.service}</text>
        </g>

        {/* Node 4: Backend */}
        <g transform="translate(540, 80)">
          <rect x="-38" y="-36" width="76" height="72" rx="8" fill="url(#nodeGradBlue)" stroke="var(--primary)" strokeWidth="2" filter="url(#nodeGlow)" />
          <rect x="-16" y="-18" width="32" height="32" rx="4" fill="var(--primary)" opacity="0.15" stroke="var(--primary)" strokeWidth="1.5"/>
          <rect x="-10" y="-12" width="20" height="20" rx="2" fill="var(--primary)" opacity="0.7"/>
          <rect x="-14" y="-5" width="4" height="4" rx="1" fill="var(--primary)"/>
          <rect x="10" y="-5" width="4" height="4" rx="1" fill="var(--primary)"/>
          <rect x="-5" y="-22" width="4" height="4" rx="1" fill="var(--primary)"/>
          <rect x="1" y="-22" width="4" height="4" rx="1" fill="var(--primary)"/>
          <text y="52" textAnchor="middle" fill="var(--primary)" fontSize="10" fontWeight="700">{backend.name}</text>
          <text y="64" textAnchor="middle" fill="var(--text-muted)" fontSize="8">{backend.service}</text>
        </g>

        {/* Node 5: Cache */}
        <g transform="translate(700, 55)">
          <circle r="30" fill="url(#nodeGradGreen)" stroke="var(--success)" strokeWidth="1.5" />
          <path d="M 4,-16 L -6,2 L 2,2 L -4,16 L 8,-2 L 0,-2 Z" fill="var(--success)" />
          <text y="46" textAnchor="middle" fill="var(--success)" fontSize="10" fontWeight="700">{cache.name}</text>
          <text y="58" textAnchor="middle" fill="var(--text-muted)" fontSize="8">{cache.service}</text>
        </g>

        {/* Node 6: Database */}
        <g transform="translate(700, 175)">
          <circle r="30" fill="url(#nodeGradWarn)" stroke="var(--warning)" strokeWidth="1.5" />
          <ellipse cx="0" cy="-10" rx="14" ry="5" fill="var(--warning)" opacity="0.7"/>
          <rect x="-14" y="-10" width="28" height="18" fill="var(--warning)" opacity="0.5"/>
          <ellipse cx="0" cy="8" rx="14" ry="5" fill="var(--warning)" opacity="0.8"/>
          <ellipse cx="0" cy="-2" rx="14" ry="5" fill="var(--warning)" opacity="0.4"/>
          <text y="46" textAnchor="middle" fill="var(--warning)" fontSize="10" fontWeight="700">{db.name}</text>
          <text y="58" textAnchor="middle" fill="var(--text-muted)" fontSize="8">{db.service}</text>
        </g>
      </svg>
    </div>
  )
}
