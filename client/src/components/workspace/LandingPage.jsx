import { useState } from 'react'
import {
  Cpu, ArrowRight, Layers, FileText, Zap, LogIn, Sparkles,
  Shield, Database, Cloud, Activity, HelpCircle, ChevronDown,
  GitBranch, Globe, Lock, BarChart3, CheckCircle2, Star
} from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import Footer from '../Footer.jsx'
import styles from './LandingPage.module.css'

const FEATURES = [
  {
    icon: Cpu,
    title: 'Network Topologies',
    desc: 'Visual architectural flowcharts showing API routers, firewalls, CDNs, microservices clusters, and data stores — all in one diagram.',
    color: '#3b82f6',
  },
  {
    icon: Layers,
    title: 'API Route Specs',
    desc: 'Auto-generated RESTful API specifications with path operations, query params, request/response schemas, and auth strategies.',
    color: '#8b5cf6',
  },
  {
    icon: Database,
    title: 'Schema Models',
    desc: 'Relational table blueprints, collection specs, column data types, indexing strategies, and normalization recommendations.',
    color: '#06b6d4',
  },
  {
    icon: Cloud,
    title: 'Deployment Strategies',
    desc: 'Production-ready container configs, staging CI/CD pipelines, multi-region deployment guides, and scaling playbooks.',
    color: '#10b981',
  },
  {
    icon: Activity,
    title: 'Observability & Roadmaps',
    desc: 'Telemetry setup guides, monitoring dashboards, alerting rules, and phased release milestones tailored to your stack.',
    color: '#f59e0b',
  },
  {
    icon: Shield,
    title: 'Stack Fit Analysis',
    desc: 'Intelligent scoring of your chosen technologies against your use-case. Get alternate suggestions when bottlenecks are detected.',
    color: '#ef4444',
  },
]

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'CTO @ Veloxi',
    text: 'InfraMind cut our architecture review cycle from 3 days to 45 minutes. The generated diagrams are board-presentation ready.',
    stars: 5,
  },
  {
    name: 'Marcus Okafor',
    role: 'Staff Eng @ Nexus Labs',
    text: 'Finally a tool that understands the difference between a CQRS pattern and a simple CRUD app. The schema outputs are exceptional.',
    stars: 5,
  },
  {
    name: 'Priya Iyer',
    role: 'Founder @ Stackr.io',
    text: 'I use it to prototype every new system idea. It catches potential bottlenecks I would have discovered weeks later in production.',
    stars: 5,
  },
]

const FAQS = [
  {
    q: 'How does InfraMind generate system diagrams?',
    a: 'InfraMind uses Google Gemini to parse your requirements and generate Mermaid.js markup, which is rendered as interactive vector diagrams directly in your browser — no exports needed.',
  },
  {
    q: 'Is my architecture design private?',
    a: 'Yes. Every project is stored in your personal isolated Firestore collection and is never shared or used to train public models.',
  },
  {
    q: 'Can I use my own Gemini API Key?',
    a: 'Absolutely. Configure your Google AI Studio key in Settings to bypass daily limits or enable advanced Gemini 2.5 Pro mode.',
  },
  {
    q: 'What formats can I export my workspace to?',
    a: 'Export the full workspace — topology diagrams, database tables, API schemas — as a single PDF. You can also copy Mermaid source or schema code directly.',
  },
  {
    q: 'Does it support microservices architectures?',
    a: 'Yes. InfraMind handles monoliths, microservices, event-driven, and serverless architectures. Just describe your constraints and it adapts accordingly.',
  },
]

export default function LandingPage({ onOpenAuth, onOpenDocs }) {
  const [activeFaq, setActiveFaq] = useState(null)

  return (
    <div className={styles.page}>
      {/* ── Ambient Background ── */}
      <div className={styles.ambientBg}>
        <div className={styles.ambientOrb1} />
        <div className={styles.ambientOrb2} />
        <div className={styles.ambientGrid} />
      </div>

      {/* ── Navbar ── */}
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.logoBlock}>
            <Logo size={32} showText={true} />
          </div>

          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#pricing" className={styles.navLink}>Pricing</a>
            <button type="button" className={styles.navLink} onClick={onOpenDocs}>Docs</button>
          </div>

          <div className={styles.navActions}>
            <button type="button" className={styles.navSignIn} onClick={onOpenAuth}>
              Sign In
            </button>
            <button type="button" className={styles.navCta} onClick={onOpenAuth}>
              Get Started
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Zap size={12} />
            <span>Powered by Gemini 2.5 Pro</span>
          </div>

          <h1 className={styles.heroTitle}>
            Ship Production
            <br />
            <span className={styles.heroTitleGradient}>Infrastructure</span>
            <br />
            in Seconds.
          </h1>

          <p className={styles.heroDesc}>
            Stop whiteboarding. Describe your product in plain English and get
            a complete, production-ready system architecture — API specs, database
            schemas, deployment strategies — in under a minute.
          </p>

          <div className={styles.heroCtas}>
            <button type="button" className={styles.heroPrimary} onClick={onOpenAuth}>
              <Zap size={15} />
              Start Building Free
              <ArrowRight size={16} />
            </button>
          </div>
          <p className={styles.heroNoCc}>No credit card required &middot; Free forever plan available</p>

          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>10k+</span>
              <span className={styles.heroStatLabel}>Teams shipped faster</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>45s</span>
              <span className={styles.heroStatLabel}>From idea to blueprint</span>
            </div>
          </div>
        </div>

        {/* Animated Architecture Diagram */}
        <div className={styles.heroVisual}>
          <div className={styles.diagramCard}>
            <div className={styles.diagramHeader}>
              <div className={styles.diagramDots}>
                <span className={styles.dot} style={{ background: '#ef4444' }} />
                <span className={styles.dot} style={{ background: '#f59e0b' }} />
                <span className={styles.dot} style={{ background: '#10b981' }} />
              </div>
              <span className={styles.diagramTitle}>Architecture Preview</span>
            </div>
            <div className={styles.diagramBody}>
              <svg viewBox="0 0 400 280" className={styles.archSvg}>
                <defs>
                  <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                  <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                  <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>

                {/* Connection Lines */}
                <g className={styles.connections}>
                  <line x1="95" y1="80" x2="155" y2="80" className={styles.flowLine} />
                  <line x1="245" y1="80" x2="305" y2="50" className={styles.flowLine} style={{ animationDelay: '0.3s' }} />
                  <line x1="245" y1="80" x2="305" y2="130" className={styles.flowLine} style={{ animationDelay: '0.6s' }} />
                  <line x1="305" y1="190" x2="305" y2="160" className={styles.flowLine} style={{ animationDelay: '0.9s' }} />
                  <line x1="245" y1="80" x2="305" y2="190" className={styles.flowLine} style={{ animationDelay: '1.2s' }} />
                </g>

                {/* Client Node */}
                <g>
                  <rect x="10" y="55" width="85" height="50" rx="8" fill="url(#blueGrad)" opacity="0.15" stroke="#3b82f6" strokeWidth="1.5" />
                  <text x="52" y="77" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="600">Client</text>
                  <text x="52" y="92" textAnchor="middle" fill="#64748b" fontSize="8">Web / Mobile</text>
                  <circle cx="95" cy="80" r="3.5" fill="#3b82f6" className={styles.pulse} />
                </g>

                {/* Gateway Node */}
                <g>
                  <rect x="155" y="55" width="90" height="50" rx="8" fill="url(#purpleGrad)" opacity="0.15" stroke="#8b5cf6" strokeWidth="1.5" />
                  <text x="200" y="77" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="600">API Gateway</text>
                  <text x="200" y="92" textAnchor="middle" fill="#64748b" fontSize="8">Rate Limiting</text>
                  <circle cx="245" cy="80" r="3.5" fill="#8b5cf6" className={styles.pulse} style={{ animationDelay: '0.3s' }} />
                </g>

                {/* Service A */}
                <g>
                  <rect x="305" y="25" width="85" height="50" rx="8" fill="url(#greenGrad)" opacity="0.15" stroke="#10b981" strokeWidth="1.5" />
                  <text x="347" y="47" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="600">Auth Service</text>
                  <text x="347" y="62" textAnchor="middle" fill="#64748b" fontSize="8">JWT / OAuth</text>
                  <circle cx="305" cy="50" r="3.5" fill="#10b981" className={styles.pulse} style={{ animationDelay: '0.6s' }} />
                </g>

                {/* Service B */}
                <g>
                  <rect x="305" y="105" width="85" height="50" rx="8" fill="url(#blueGrad)" opacity="0.15" stroke="#3b82f6" strokeWidth="1.5" />
                  <text x="347" y="127" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="600">Core API</text>
                  <text x="347" y="142" textAnchor="middle" fill="#64748b" fontSize="8">Node.js</text>
                  <circle cx="305" cy="130" r="3.5" fill="#3b82f6" className={styles.pulse} style={{ animationDelay: '0.9s' }} />
                </g>

                {/* Database */}
                <g>
                  <rect x="305" y="185" width="85" height="50" rx="8" fill="url(#purpleGrad)" opacity="0.15" stroke="#8b5cf6" strokeWidth="1.5" />
                  <text x="347" y="207" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="600">Database</text>
                  <text x="347" y="222" textAnchor="middle" fill="#64748b" fontSize="8">PostgreSQL</text>
                </g>
              </svg>
            </div>
            <div className={styles.diagramFooter}>
              <span className={styles.diagramPill} style={{ '--pill-color': '#10b981' }}>
                <CheckCircle2 size={10} /> Generated in 42s
              </span>
              <span className={styles.diagramPill} style={{ '--pill-color': '#3b82f6' }}>
                <Globe size={10} /> Production-ready
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logos / Social Proof Bar ── */}
      <div className={styles.trustBar}>
        <p className={styles.trustLabel}>Trusted by engineers at</p>
        <div className={styles.trustLogos}>
          {['Stripe', 'Vercel', 'Linear', 'Supabase', 'Railway', 'PlanetScale'].map((name) => (
            <span key={name} className={styles.trustLogo}>{name}</span>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className={styles.featuresSection} id="features">
        <div className={styles.sectionBadge}>
          <Sparkles size={13} />
          <span>Platform Capabilities</span>
        </div>
        <h2 className={styles.sectionTitle}>Everything you need to ship</h2>
        <p className={styles.sectionSubtitle}>
          From topology diagrams to deployment strategies — InfraMind covers the full infrastructure design lifecycle.
        </p>

        <div className={styles.featuresGrid}>
          {FEATURES.map((f, idx) => {
            const Icon = f.icon
            return (
              <div key={idx} className={styles.featureCard} style={{ '--feature-color': f.color }}>
                <div className={styles.featureIconWrap}>
                  <Icon size={20} />
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className={styles.howSection}>
        <div className={styles.sectionBadge}>
          <GitBranch size={13} />
          <span>How It Works</span>
        </div>
        <h2 className={styles.sectionTitle}>Three steps to your blueprint</h2>

        <div className={styles.stepsGrid}>
          {[
            {
              num: '01',
              title: 'Describe Your System',
              desc: 'Tell InfraMind what you\'re building — app type, user scale, known constraints, and preferred technologies.',
            },
            {
              num: '02',
              title: 'AI Designs the Architecture',
              desc: 'Gemini 2.5 Pro analyzes your requirements and generates a complete multi-tier architecture blueprint in seconds.',
            },
            {
              num: '03',
              title: 'Review, Export & Build',
              desc: 'Explore the interactive diagrams, refine with follow-up prompts, then export as a PDF for your team.',
            },
          ].map((step, i) => (
            <div key={i} className={styles.stepCard}>
              <div className={styles.stepNum}>{step.num}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className={styles.testimonialsSection}>
        <div className={styles.sectionBadge}>
          <Star size={13} />
          <span>What engineers say</span>
        </div>
        <h2 className={styles.sectionTitle}>Built for technical teams</h2>

        <div className={styles.testimonialsGrid}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className={styles.testimonialCard}>
              <div className={styles.testimonialStars}>
                {Array.from({ length: t.stars }).map((_, s) => (
                  <Star key={s} size={12} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className={styles.testimonialText}>"{t.text}"</p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.testimonialAvatar}>{t.name[0]}</div>
                <div>
                  <div className={styles.testimonialName}>{t.name}</div>
                  <div className={styles.testimonialRole}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className={styles.pricingSection} id="pricing">
        <div className={styles.sectionBadge}>
          <BarChart3 size={13} />
          <span>Pricing</span>
        </div>
        <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
        <p className={styles.sectionSubtitle}>
          Start free. Upgrade when you're ready to ship at scale.
        </p>

        <div className={styles.pricingGrid}>
          {/* Free */}
          <div className={styles.pricingCard}>
            <div className={styles.planName}>Developer</div>
            <div className={styles.planPrice}>
              <span className={styles.planPriceNum}>$0</span>
              <span className={styles.planPricePer}>/mo</span>
            </div>
            <p className={styles.planDesc}>Perfect for exploring and side projects.</p>
            <ul className={styles.planFeatureList}>
              {['5 generations / day', 'Interactive Mermaid diagrams', 'REST API specs', 'Basic schema models'].map((f) => (
                <li key={f} className={styles.planFeatureItem}>
                  <CheckCircle2 size={14} className={styles.planCheckIcon} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.planBtn} onClick={onOpenAuth}>
              Get Started Free
            </button>
          </div>

          {/* Pro — featured */}
          <div className={`${styles.pricingCard} ${styles.pricingCardPro}`}>
            <div className={styles.proBadge}>Most Popular</div>
            <div className={styles.planName}>Professional</div>
            <div className={styles.planPrice}>
              <span className={styles.planPriceNum}>$29</span>
              <span className={styles.planPricePer}>/mo</span>
            </div>
            <p className={styles.planDesc}>For serious builders and startup teams.</p>
            <ul className={styles.planFeatureList}>
              {[
                'Unlimited generations',
                'Private Firestore storage',
                'PDF export',
                'Gemini 2.5 Pro model',
                'Custom API key override',
              ].map((f) => (
                <li key={f} className={styles.planFeatureItem}>
                  <CheckCircle2 size={14} className={styles.planCheckIconPro} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.planBtnPro} onClick={onOpenAuth}>
              Upgrade to Pro
            </button>
          </div>

          {/* Enterprise */}
          <div className={styles.pricingCard}>
            <div className={styles.planName}>Enterprise</div>
            <div className={styles.planPrice}>
              <span className={styles.planPriceNum}>Custom</span>
            </div>
            <p className={styles.planDesc}>For scale organizations requiring VPC isolation.</p>
            <ul className={styles.planFeatureList}>
              {[
                'Dedicated model pipelines',
                'VPC deployment',
                'Corporate SSO',
                '24/7 Priority support SLA',
              ].map((f) => (
                <li key={f} className={styles.planFeatureItem}>
                  <CheckCircle2 size={14} className={styles.planCheckIcon} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.planBtn} onClick={() => alert('Contact sales@inframind.ai')}>
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={styles.faqSection}>
        <div className={styles.sectionBadge}>
          <HelpCircle size={13} />
          <span>FAQ</span>
        </div>
        <h2 className={styles.sectionTitle}>Common questions</h2>

        <div className={styles.faqList}>
          {FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx
            return (
              <div key={idx} className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ''}`}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={16} className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ''}`} />
                </button>
                <div className={`${styles.faqAnswer} ${isOpen ? styles.faqAnswerOpen : ''}`}>
                  <p>{faq.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaBannerGlow} />
        <h2 className={styles.ctaBannerTitle}>
          Ready to design your next system?
        </h2>
        <p className={styles.ctaBannerDesc}>
          Join thousands of engineers who ship better architectures with InfraMind.
        </p>
        <button type="button" className={styles.ctaBannerBtn} onClick={onOpenAuth}>
          Start Building — It's Free
          <ArrowRight size={16} />
        </button>
      </section>

      <Footer />
    </div>
  )
}
