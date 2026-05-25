import { useState } from 'react'
import { X, BookOpen, Sparkles, Terminal, Database, Cloud } from 'lucide-react'
import styles from './DocsModal.module.css'

const DOC_SECTIONS = [
  {
    id: 'prompting',
    title: 'Prompting Guidelines',
    icon: Terminal,
    content: (
      <div className={styles.docsSection}>
        <p className={styles.docsLead}>To get the most precise blueprints from InfraMind, structure your requirements using these guidelines:</p>
        
        <div className={styles.docsCard}>
          <h5 className={styles.cardHeader}><Terminal size={14} /> 1. Define Operational Flows</h5>
          <p>Describe primary actors and events. For example: <em>"Drivers receive dispatcher updates via WebSocket when a rider orders a trip."</em></p>
        </div>
        
        <div className={styles.docsCard}>
          <h5 className={styles.cardHeader}><Database size={14} /> 2. Specify Third-Party Integrations</h5>
          <p>Indicate integrations clearly to let the AI route endpoints. For example: <em>"Use Stripe for billing checkout and Twilio for SMS alerts."</em></p>
        </div>

        <div className={styles.docsCard}>
          <h5 className={styles.cardHeader}><Cloud size={14} /> 3. State Scaling Constraints</h5>
          <p>Mention load expectations. For example: <em>"Needs high database writes for streaming metrics and Redis cache for active sessions."</em></p>
        </div>
        
        <h5 className={styles.sectionSubtitle}>Example Golden Prompt</h5>
        <pre className={styles.codeBlock}>
{`A real-time ride sharing app with driver dispatching:
- Real-time location tracking using WebSockets
- Relational schema modeling for trips and payments
- Stripe gateway integration for passenger charging
- Redis caching layer for active dispatcher drivers`}
        </pre>
      </div>
    ),
  },
  {
    id: 'diagrams',
    title: 'Understanding Visual Blueprints',
    icon: Sparkles,
    content: (
      <div className={styles.docsSection}>
        <p className={styles.docsLead}>InfraMind generates two separate visual system diagrams inside the workspace canvas:</p>
        
        <div className={styles.docsGrid}>
          <div className={styles.gridCard}>
            <span className={`${styles.badge} ${styles.badgeBlue}`}>System Architecture</span>
            <p>A network topology layout showcasing client devices, gateway reverse proxies, API servers, cache databases, and persistence queues.</p>
          </div>
          <div className={styles.gridCard}>
            <span className={`${styles.badge} ${styles.badgePurple}`}>User Flow Sequence</span>
            <p>A chronological sequence blueprint diagram outlining service-to-service message loops and database transaction cycles.</p>
          </div>
        </div>
        
        <div className={styles.infoCallout}>
          <span>💡 <strong>Quick Action:</strong> Click on any node directly in the System Architecture visual flow chart to automatically inspect its specs in the right sidebar panel!</span>
        </div>
      </div>
    ),
  },
  {
    id: 'stack',
    title: 'Tech Stack Decisions',
    icon: Database,
    content: (
      <div className={styles.docsSection}>
        <p className={styles.docsLead}>The AI engine evaluates your preferred tools against the system requirements and scores them:</p>
        
        <div className={styles.tableWrapper}>
          <table className={styles.docsTable}>
            <thead>
              <tr>
                <th>Fit Level</th>
                <th>Architectural Evaluation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className={`${styles.fitBadge} ${styles.fitHigh}`}>High Fit</span></td>
                <td>Optimal pairing. Handled directly with fast latency, standard drivers, and minimal setup.</td>
              </tr>
              <tr>
                <td><span className={`${styles.fitBadge} ${styles.fitMedium}`}>Medium Fit</span></td>
                <td>Acceptable stack selection. Requires minor performance adapters or custom scaling setups.</td>
              </tr>
              <tr>
                <td><span className={`${styles.fitBadge} ${styles.fitLow}`}>Low Fit</span></td>
                <td>Alternative recommended. Suggests superior options to prevent performance bottlenecks.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    id: 'deployment',
    title: 'Deployment Rollout',
    icon: Cloud,
    content: (
      <div className={styles.docsSection}>
        <p className={styles.docsLead}>Infrastructure deployment rollouts are divided into three environment strategies:</p>
        
        <div className={styles.envTiers}>
          <div className={styles.envTierCard}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadge}>DEV</span>
              <strong>Development Environment</strong>
            </div>
            <p>Local Docker-Compose files, database containers with hot-reload mapping, and sandbox terminal logs.</p>
            <pre className={styles.codeSnippet}>docker-compose up -d --build</pre>
          </div>
          
          <div className={styles.envTierCard}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadge} style={{ background: '#f59e0b' }}>STG</span>
              <strong>Staging Environment</strong>
            </div>
            <p>CI/CD pipelines, container orchestration testing, mock webhook endpoints, and data migrations.</p>
          </div>
          
          <div className={styles.envTierCard}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadge} style={{ background: '#10b981' }}>PRD</span>
              <strong>Production Environment</strong>
            </div>
            <p>Load balancers, TLS reverse proxies, globally distributed DB clusters, CDNs, and VPC subnets.</p>
          </div>
        </div>
      </div>
    ),
  },
]

export default function DocsModal({ isOpen, onClose }) {
  const [activeSec, setActiveSec] = useState('prompting')

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <BookOpen size={18} className={styles.titleIcon} />
            <h3>Platform Documentation</h3>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.layout}>
          {/* Docs Sidebar Nav */}
          <aside className={styles.sidebar}>
            {DOC_SECTIONS.map((sec) => {
              const Icon = sec.icon
              const isActive = activeSec === sec.id
              return (
                <button
                  key={sec.id}
                  type="button"
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  onClick={() => setActiveSec(sec.id)}
                >
                  <Icon size={14} className={styles.navIcon} />
                  <span>{sec.title}</span>
                </button>
              )
            })}
          </aside>

          {/* Docs Main Content */}
          <main className={styles.main}>
            {DOC_SECTIONS.map((sec) => {
              if (activeSec !== sec.id) return null
              return (
                <div key={sec.id} className={styles.article}>
                  <h4 className={styles.articleTitle}>{sec.title}</h4>
                  <div className={styles.articleContent}>{sec.content}</div>
                </div>
              )
            })}
          </main>
        </div>
      </div>
    </div>
  )
}
