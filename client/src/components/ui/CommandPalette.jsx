// src/components/ui/CommandPalette.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, FileDown, Share2, Settings, BookOpen, Layers,
  Zap, Search, ArrowRight, CornerDownLeft, Cpu
} from 'lucide-react'
import { trackEvent, EVENTS } from '../../utils/analytics.js'
import styles from './CommandPalette.module.css'

function buildCommands({ onExport, onScaffold, onShare, onOpenSettings, onOpenDocs, onOpenTemplates, onNewProject }) {
  return [
    {
      group: 'Actions',
      items: [
        {
          id: 'new-project',
          label: 'New Architecture',
          desc: 'Start a fresh design from the dashboard',
          icon: Plus,
          kbd: 'N',
          action: onNewProject,
          always: true,
        },
        {
          id: 'export-pdf',
          label: 'Export Blueprint PDF',
          desc: 'Download the full architecture as PDF',
          icon: FileDown,
          kbd: 'E',
          action: onExport,
        },
        {
          id: 'download-scaffold',
          label: 'Download Project Scaffold',
          desc: 'Get a .zip with code stubs based on your stack',
          icon: Zap,
          action: onScaffold,
        },
        {
          id: 'share',
          label: 'Share Architecture',
          desc: 'Generate a public shareable link',
          icon: Share2,
          action: onShare,
        },
      ],
    },
    {
      group: 'Navigation',
      items: [
        {
          id: 'templates',
          label: 'Browse Templates',
          desc: 'Explore architecture blueprints',
          icon: Layers,
          action: onOpenTemplates,
          always: true,
        },
        {
          id: 'docs',
          label: 'Documentation',
          desc: 'View InfraMind guides and API reference',
          icon: BookOpen,
          action: onOpenDocs,
          always: true,
        },
        {
          id: 'settings',
          label: 'Settings',
          desc: 'Configure API keys and preferences',
          icon: Settings,
          action: onOpenSettings,
          always: true,
        },
      ],
    },
    {
      group: 'Quick Generate',
      items: [
        {
          id: 'qg-saas',
          label: 'Generate SaaS Platform',
          desc: 'Multi-tenant B2B app with billing & auth',
          icon: Cpu,
          action: () => onNewProject?.('saas'),
          always: true,
        },
        {
          id: 'qg-api',
          label: 'Generate REST API',
          desc: 'Scalable API with auth & database',
          icon: ArrowRight,
          action: () => onNewProject?.('api'),
          always: true,
        },
      ],
    },
  ]
}

export default function CommandPalette({
  visible,
  onClose,
  onExport,
  onScaffold,
  onShare,
  onOpenSettings,
  onOpenDocs,
  onOpenTemplates,
  onSubmit,
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const handleNewProject = useCallback((template) => {
    if (template === 'saas') {
      onSubmit?.({ idea: 'A multi-tenant B2B SaaS platform with subscription billing, Okta SSO, and tenant isolation.', knownStack: ['Next.js', 'PostgreSQL', 'Stripe', 'Auth0'] })
    } else if (template === 'api') {
      onSubmit?.({ idea: 'A scalable REST API with JWT authentication, rate limiting, and PostgreSQL database.', knownStack: ['Node.js', 'Express', 'PostgreSQL', 'Redis'] })
    } else {
      navigate('/dashboard')
    }
    onClose()
  }, [onSubmit, navigate, onClose])

  const commands = buildCommands({
    onExport: () => { onExport?.(); onClose() },
    onScaffold: () => { onScaffold?.(); onClose() },
    onShare: () => { onShare?.(); onClose() },
    onOpenSettings: () => { onOpenSettings?.(); onClose() },
    onOpenDocs: () => { onOpenDocs?.(); onClose() },
    onOpenTemplates: () => { onOpenTemplates?.(); onClose() },
    onNewProject: handleNewProject,
  })

  // Flatten with filtering
  const allItems = commands.flatMap(g => g.items)
  const filtered = query.trim()
    ? allItems.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.desc.toLowerCase().includes(query.toLowerCase())
      )
    : allItems

  useEffect(() => { setActiveIdx(0) }, [query])
  useEffect(() => {
    if (visible) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
      trackEvent(EVENTS.COMMAND_PALETTE_OPENED)
    }
  }, [visible])

  const executeItem = useCallback((item) => {
    trackEvent(EVENTS.COMMAND_EXECUTED, { command: item.id })
    item.action?.()
  }, [])

  useEffect(() => {
    if (!visible) return
    const handler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[activeIdx]
        if (item) executeItem(item)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, filtered, activeIdx, onClose, executeItem])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (!visible) return null

  // Build grouped view when no search
  const renderItems = () => {
    if (query.trim()) {
      return (
        <div className={styles.group}>
          <div className={styles.groupLabel}>Results ({filtered.length})</div>
          {filtered.length === 0
            ? <div className={styles.empty}>No matching commands</div>
            : filtered.map((item, i) => <CommandItem key={item.id} item={item} idx={i} active={activeIdx === i} onHover={() => setActiveIdx(i)} onClick={() => executeItem(item)} />)
          }
        </div>
      )
    }
    let globalIdx = 0
    return commands.map(group => (
      <div key={group.group} className={styles.group}>
        <div className={styles.groupLabel}>{group.group}</div>
        {group.items.map(item => {
          const idx = globalIdx++
          return <CommandItem key={item.id} item={item} idx={idx} active={activeIdx === idx} onHover={() => setActiveIdx(idx)} onClick={() => executeItem(item)} />
        })}
      </div>
    ))
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()} role="dialog" aria-label="Command palette">
        {/* Search input */}
        <div className={styles.searchRow}>
          <Search size={15} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search commands…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={styles.escKbd}>Esc</kbd>
        </div>

        {/* Command list */}
        <div className={styles.list} ref={listRef}>
          {renderItems()}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd><CornerDownLeft size={10} /></kbd> Select</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}

function CommandItem({ item, idx, active, onHover, onClick }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      data-idx={idx}
      className={`${styles.item} ${active ? styles.itemActive : ''}`}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      <div className={`${styles.itemIcon} ${active ? styles.itemIconActive : ''}`}>
        <Icon size={15} />
      </div>
      <div className={styles.itemText}>
        <span className={styles.itemLabel}>{item.label}</span>
        <span className={styles.itemDesc}>{item.desc}</span>
      </div>
      {item.kbd && <kbd className={styles.itemKbd}>{item.kbd}</kbd>}
      {active && <ArrowRight size={12} className={styles.itemArrow} />}
    </button>
  )
}
