import { X, Layers, Database, Sparkles, Network } from 'lucide-react'
import styles from './TemplatesModal.module.css'

const TEMPLATE_PRESETS = [
  {
    id: 'ride-sharing',
    title: 'Ride Sharing Platform',
    desc: 'Real-time driver dispatching, location tracking, payment gateways, and high-concurrency dispatch queuing.',
    prompt: 'A real-time ride sharing app with driver dispatching, geo-tracking, stripe payments, and redis caching.',
    stack: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'WebSockets', 'Stripe'],
    difficulty: 'Complex',
    icon: Network,
  },
  {
    id: 'saas-billing',
    title: 'Multi-Tenant B2B SaaS',
    desc: 'Subscription billing, tenant isolation database modeling, OAuth single sign-on, and central organization admin dashboards.',
    prompt: 'A B2B SaaS platform with subscription billing, multi-tenant database partitioning, Okta SSO integration, and analytics dashboard.',
    stack: ['Next.js', 'Express', 'MongoDB', 'Stripe', 'Auth0', 'TailwindCSS'],
    difficulty: 'Medium',
    icon: Layers,
  },
  {
    id: 'iot-telemetry',
    title: 'IoT Telemetry Pipeline',
    desc: 'Ingests millions of telemetry updates per minute, processes alerts via streaming rules, and aggregates stats.',
    prompt: 'An IoT analytics system that processes millions of temperature telemetry messages per second, aggregates data, and raises alerts via slack.',
    stack: ['Kafka', 'Apache Spark', 'InfluxDB', 'Node.js', 'Redis', 'Slack API'],
    difficulty: 'Enterprise',
    icon: Database,
  },
  {
    id: 'doc-collab',
    title: 'Collaborative Doc Editor',
    desc: 'Rich-text doc updates via CRDT conflict resolution, live cursor indicators, and document revision version history.',
    prompt: 'A collaborative rich-text document editor like Google Docs with real-time sync, Yjs conflict resolution, WebSockets, and document version history.',
    stack: ['React', 'WebSockets', 'Yjs', 'Redis', 'Express', 'PostgreSQL'],
    difficulty: 'Complex',
    icon: Sparkles,
  },
]

export default function TemplatesModal({ isOpen, onClose, onSelectTemplate }) {
  if (!isOpen) return null

  function handleSelect(template) {
    onSelectTemplate({
      idea: template.prompt,
      knownStack: template.stack,
    })
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <Sparkles size={18} className={styles.titleIcon} />
            <h3>System Templates Presets</h3>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.intro}>
            Select a production template to pre-fill the workspace composer. You can customize the prompt and technologies before generating.
          </p>

          <div className={styles.grid}>
            {TEMPLATE_PRESETS.map((tmpl) => {
              const Icon = tmpl.icon
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  className={styles.card}
                  onClick={() => handleSelect(tmpl)}
                  title={`Use template: ${tmpl.title}`}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.iconBox}>
                      <Icon size={18} />
                    </div>
                    <span className={`${styles.badge} ${styles[tmpl.difficulty.toLowerCase()]}`}>
                      {tmpl.difficulty}
                    </span>
                  </div>

                  <h4 className={styles.cardTitle}>{tmpl.title}</h4>
                  <p className={styles.cardDesc}>{tmpl.desc}</p>

                  <div className={styles.cardTags}>
                    {tmpl.stack.map((tag) => (
                      <span key={tag} className={styles.tag}>{tag}</span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
