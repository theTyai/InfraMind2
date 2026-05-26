import { useState, useEffect, useMemo } from 'react'
import MermaidDiagram from '../MermaidDiagram.jsx'
import ComponentsView from './ComponentsView.jsx'
import { 
  Send, Terminal, Network, Shield, Cpu, Activity, X, Database, Cloud, 
  TrendingUp, Maximize2, ExternalLink, Calendar, Layers, Sliders,
  FileDown, Share2, FolderDown, Zap, CheckCircle, AlertCircle, Info, ChevronRight,
  AlertTriangle, Sparkles
} from 'lucide-react'
import { getTechIconUrl } from '../../utils/techIcons.js'
import InspectorPanel from '../layout/InspectorPanel.jsx'
import FoundersPanel from './FoundersPanel.jsx'
import styles from './Workspace.module.css'
import CostEstimator, { detectStack } from './CostEstimator.jsx'
import AnimatedDataflow from './AnimatedDataflow.jsx'
import { useArchitectureStore } from '../../store/useArchitectureStore.js'
import { useAuthContext } from '../../context/AuthContext.jsx'
import ExportStudioModal from './ExportStudioModal.jsx'

// ── Collaborators Invite Sub-Component ──────────────────────────────────────
function CollaboratorsInvite() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleInvite = (e) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return
    setSending(true)
    setTimeout(() => {
      setSent(true)
      setSending(false)
      setEmail('')
      setTimeout(() => setSent(false), 3000)
    }, 800)
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px' }}>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Invite Teammate</h4>
      <p style={{ margin: '0 0 14px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>They will receive an email with access instructions.</p>
      {sent ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.25)', borderRadius: '6px', fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
          ✓ Invitation sent successfully!
        </div>
      ) : (
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              borderRadius: '6px',
              flex: 1,
              fontSize: '0.78rem',
              outline: 'none',
              transition: 'border-color 0.15s'
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--primary)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)' }}
          />
          <button
            type="submit"
            disabled={sending || !email.trim()}
            style={{
              background: sending ? 'var(--bg-elevated)' : 'var(--primary)',
              color: sending ? 'var(--text-muted)' : '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: sending ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
          >
            {sending ? 'Sending…' : 'Send Invitation'}
          </button>
        </form>
      )}
    </div>
  )
}

function ModalHeader({ title, onClose }) {
  return (
    <div className={styles.modalDiagramHeader}>
      <span className={styles.modalDiagramTitle}>{title}</span>
      <button type="button" className={styles.modalDiagramCloseBtn} onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  )
}

export default function ArchitectureTabs({ 
  data, 
  idea, 
  onExport, 
  onScaffold,
  onOpenShare,
  exporting, 
  onSubmit, 
  envKeyStatus,
  selectedNode,
  onSelectNode,
  comments,
  onAddComment,
  activeMode,
  setActiveMode,
  workspaceView,
  setWorkspaceView
}) {
  const [refinementText, setRefinementText] = useState('')

  // Lifted state from CostEstimator to share with Dataflow SVG
  const [customCosts, setCustomCosts] = useState({})
  const [enabledServices, setEnabledServices] = useState({})
  const [totalCost, setTotalCost] = useState(0)
  const projectScalingStage = useArchitectureStore(state => state.projectScalingStage)
  const setProjectScalingStage = useArchitectureStore(state => state.setProjectScalingStage)

  const detectedStack = useMemo(() => detectStack(data), [data])

  useEffect(() => {
    const initial = {}
    const seenCategories = new Set()
    
    detectedStack.forEach(item => {
      // Don't overwrite if we already toggled it off, just initialize new ones
      if (enabledServices[item.tech] === undefined) {
        if (!seenCategories.has(item.category)) {
          initial[item.tech] = true
          seenCategories.add(item.category)
        } else {
          initial[item.tech] = false
        }
      } else {
         if (enabledServices[item.tech]) {
           seenCategories.add(item.category)
         }
      }
    })
    if (Object.keys(initial).length > 0) {
      setEnabledServices(prev => ({ ...prev, ...initial }))
    }
  }, [detectedStack])

  // Modal toggles
  const [modals, setModals] = useState({
    apis: false,
    database: false,
    deployment: false,
    scalability: false,
    archDiagram: false,
    userFlow: false,
  })
  const [accordions, setAccordions] = useState({
    apis: false,
    database: false,
    infrastructure: false,
    security: false,
    scalability: false
  })
  const toggleAccordion = (sec) => {
    setAccordions(prev => ({ ...prev, [sec]: !prev[sec] }))
  }
  const [activeSpecTab, setActiveSpecTab] = useState('apis')

  const { getFreshToken, idToken, appUser } = useAuthContext()
  const currentProjectId = useArchitectureStore(s => s.currentProjectId)
  const fetchNodes = useArchitectureStore(s => s.fetchNodes)
  const fetchEdges = useArchitectureStore(s => s.fetchEdges)
  const fetchSchemas = useArchitectureStore(s => s.fetchSchemas)
  const fetchRoutes = useArchitectureStore(s => s.fetchRoutes)

  const currentNodes = useArchitectureStore(s => s.currentNodes)
  const currentEdges = useArchitectureStore(s => s.currentEdges)
  const currentSchemas = useArchitectureStore(s => s.currentSchemas)
  const currentRoutes = useArchitectureStore(s => s.currentRoutes)

  const githubLinked = useArchitectureStore(s => s.githubLinked)
  const fetchGithubStatus = useArchitectureStore(s => s.fetchGithubStatus)
  const unlinkGithubAccount = useArchitectureStore(s => s.unlinkGithubAccount)
  const linkGithubRepo = useArchitectureStore(s => s.linkGithubRepo)
  const runSecurityScan = useArchitectureStore(s => s.runSecurityScan)
  const runSecurityFix = useArchitectureStore(s => s.runSecurityFix)
  const fetchSecurityHistory = useArchitectureStore(s => s.fetchSecurityHistory)
  const securityHistory = useArchitectureStore(s => s.securityHistory)
  const runDriftScan = useArchitectureStore(s => s.runDriftScan)
  const fetchDriftHistory = useArchitectureStore(s => s.fetchDriftHistory)
  const driftHistory = useArchitectureStore(s => s.driftHistory)

  const [opsTab, setOpsTab] = useState('security')
  const [repoName, setRepoName] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [branchName, setBranchName] = useState('main')
  const [opsLoading, setOpsLoading] = useState(false)

  // AI Cofounder viability metrics derived from architecture data
  const viabilityMetrics = useMemo(() => {
    if (!data) return null
    const allText = JSON.stringify(data).toLowerCase()
    let speed = 85, hiring = 80, ops = 75
    if (allText.includes('kubernetes') || allText.includes('k8s')) { speed -= 20; ops -= 25 }
    if (allText.includes('kafka') || allText.includes('rabbitmq')) { speed -= 10; ops -= 12 }
    if (allText.includes('cassandra') || allText.includes('hadoop')) { speed -= 15; hiring -= 15; ops -= 15 }
    if (allText.includes('rust') || allText.includes('c++') || allText.includes('scala')) { speed -= 12; hiring -= 25 }
    if (allText.includes('supabase') || allText.includes('firebase')) { speed += 12; ops += 15 }
    if (allText.includes('vercel') || allText.includes('netlify')) { speed += 10; ops += 10 }
    if (allText.includes('react') || allText.includes('node.js') || allText.includes('python')) { hiring += 12 }
    speed = Math.max(20, Math.min(99, speed))
    hiring = Math.max(20, Math.min(99, hiring))
    ops = Math.max(20, Math.min(99, ops))
    const overall = Math.round((speed + hiring + ops) / 3)
    return { speed, hiring, ops, overall }
  }, [data])
  const [opsError, setOpsError] = useState('')
  const [opsSuccess, setOpsSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [fixPlan, setFixPlan] = useState(null)
  const [showFixModal, setShowFixModal] = useState(false)
  const [fixLoading, setFixLoading] = useState(false)

  useEffect(() => {
    if (idToken && currentProjectId) {
      fetchGithubStatus(idToken)
    }
  }, [idToken, currentProjectId, fetchGithubStatus])

  // Populate repo input with existing repo name if it's connected
  useEffect(() => {
    const activeProject = useArchitectureStore.getState().projects.find(p => p.id === currentProjectId)
    if (activeProject?.githubRepo) {
      setRepoName(activeProject.githubRepo)
      setBranchName(activeProject.githubBranch || 'main')
    }
  }, [currentProjectId])

  const latestSecurityReport = securityHistory?.[0] || null
  const latestDriftReport = driftHistory?.[0] || null

  const handleLinkGithub = async () => {
    if (!idToken) return
    setOpsLoading(true)
    setOpsError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/github/url`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      })
      if (!res.ok) throw new Error('Failed to fetch GitHub redirect URL')
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setOpsError(err.message || 'GitHub OAuth setup failed')
      setOpsLoading(false)
    }
  }

  const handleUnlinkGithub = async () => {
    if (!idToken || !window.confirm('Are you sure you want to unlink your GitHub integration?')) return
    setOpsLoading(true)
    setOpsError('')
    try {
      await unlinkGithubAccount(idToken)
      setOpsSuccess('GitHub integration unlinked successfully.')
    } catch (err) {
      setOpsError(err.message || 'Unlink failed')
    } finally {
      setOpsLoading(false)
    }
  }

  const handleConnectRepo = async (e) => {
    e.preventDefault()
    if (!repoName.trim() || !idToken || !currentProjectId) return
    setOpsLoading(true)
    setOpsError('')
    setOpsSuccess('')
    try {
      await linkGithubRepo(currentProjectId, repoName.trim(), branchName.trim(), idToken)
      setOpsSuccess(`Successfully linked repository ${repoName.trim()} to this project.`)
      await useArchitectureStore.getState().fetchProjects(idToken)
    } catch (err) {
      setOpsError(err.message || 'Linking repository failed')
    } finally {
      setOpsLoading(false)
    }
  }

  const handleSecurityScan = async () => {
    if (!idToken || !currentProjectId) return
    setOpsLoading(true)
    setOpsError('')
    setOpsSuccess('')
    setFixPlan(null)
    try {
      const report = await runSecurityScan(currentProjectId, idToken)
      setOpsSuccess(`Security audit completed! Score: ${report.securityScore}% (Grade ${report.grade}).`)
    } catch (err) {
      setOpsError(err.message || 'Security scan failed')
    } finally {
      setOpsLoading(false)
    }
  }

  const handleSecurityFix = async () => {
    if (!idToken || !currentProjectId) return
    setFixLoading(true)
    setOpsError('')
    try {
      const plan = await runSecurityFix(currentProjectId, idToken)
      setFixPlan(plan)
      setShowFixModal(true)
    } catch (err) {
      setOpsError(err.message || 'Could not generate fix plan')
    } finally {
      setFixLoading(false)
    }
  }

  const handleDriftScan = async () => {
    if (!idToken || !currentProjectId) return
    setOpsLoading(true)
    setOpsError('')
    setOpsSuccess('')
    try {
      const report = await runDriftScan(currentProjectId, idToken)
      setOpsSuccess(`Drift scan completed! Compliance score: ${report.complianceScore}%.`)
    } catch (err) {
      setOpsError(err.message || 'Drift scan failed')
    } finally {
      setOpsLoading(false)
    }
  }

  const badgeImgUrl = data.shareId 
    ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + (window.location.port === '3000' ? '5000' : window.location.port) : ''}/api/public/${data.shareId}/badge`
    : ''
  const badgeLinkUrl = data.shareId
    ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/p/${data.shareId}`
    : ''
  const badgeMarkdown = `[![InfraMind Compliance](${badgeImgUrl})](${badgeLinkUrl})`

  const handleCopyBadge = async () => {
    try {
      await navigator.clipboard.writeText(badgeMarkdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const openModal = async (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }))
    try {
      const token = await getFreshToken()
      if (modalName === 'apis') {
        await fetchRoutes(currentProjectId, token)
      } else if (modalName === 'database') {
        await fetchSchemas(currentProjectId, token)
      } else if (modalName === 'archDiagram') {
        localStorage.setItem('inframind_checklist_diagram', 'true')
        await Promise.all([
          fetchNodes(currentProjectId, token),
          fetchEdges(currentProjectId, token)
        ])
      }
    } catch (err) {
      console.error(`Failed to lazy load ${modalName} subcollections:`, err)
    }
  }

  const closeModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }))
  }

  const routesToDisplay = currentRoutes && currentRoutes.length > 0 ? currentRoutes : (data.apis || []);
  const schemasToDisplay = currentSchemas && currentSchemas.length > 0 ? currentSchemas : (data.dbSchema || []);

  const nodeDetails = useMemo(() => {
    if (!selectedNode || !data) return null

    const nodeLabel = selectedNode.toLowerCase().trim()

    const stackItem = data.stack?.find(
      (item) =>
        item.layer?.toLowerCase().includes(nodeLabel) ||
        nodeLabel.includes(item.layer?.toLowerCase() || '') ||
        item.recommendation?.toLowerCase().includes(nodeLabel) ||
        nodeLabel.includes(item.recommendation?.toLowerCase() || '')
    )
    if (stackItem) {
      return { type: 'stack', item: stackItem }
    }

    const dbItem = schemasToDisplay?.find(
      (model) =>
        model.collection?.toLowerCase().includes(nodeLabel) ||
        nodeLabel.includes(model.collection?.toLowerCase() || '')
    )
    if (dbItem) {
      return { type: 'db', item: dbItem }
    }

    if (
      nodeLabel.includes('api') || 
      nodeLabel.includes('backend') || 
      nodeLabel.includes('server') || 
      nodeLabel.includes('gateway') ||
      nodeLabel.includes('route') ||
      nodeLabel.includes('/')
    ) {
      return { type: 'api', items: routesToDisplay || [] }
    }

    return { type: 'general', label: selectedNode }
  }, [selectedNode, data, schemasToDisplay, routesToDisplay])

  const nodeTypeLabel = useMemo(() => {
    if (!nodeDetails) return ''
    if (nodeDetails.type === 'stack') return 'Stack Layer'
    if (nodeDetails.type === 'db') return 'Database Schema'
    if (nodeDetails.type === 'api') return 'API Specifications'
    return 'System Component'
  }, [nodeDetails])

  const handleSelectNodePerspective = (nodeLabel) => {
    if (!nodeLabel) {
      onSelectNode && onSelectNode(null);
      return;
    }
    
    closeModal('archDiagram');
    
    const isDbNode = schemasToDisplay.some(
      (model) => model.collection?.toLowerCase() === nodeLabel.toLowerCase()
    );
    
    if (isDbNode) {
      setActiveSpecTab('database');
      fetchSchemas(currentProjectId, idToken);
    } 
    else if (
      nodeLabel.toLowerCase().includes('api') ||
      nodeLabel.toLowerCase().includes('backend') ||
      nodeLabel.toLowerCase().includes('gateway') ||
      nodeLabel.toLowerCase().includes('route') ||
      nodeLabel.toLowerCase().includes('/')
    ) {
      setActiveSpecTab('apis');
    }
    else if (
      nodeLabel.toLowerCase().includes('vercel') ||
      nodeLabel.toLowerCase().includes('railway') ||
      nodeLabel.toLowerCase().includes('supabase') ||
      nodeLabel.toLowerCase().includes('aws') ||
      nodeLabel.toLowerCase().includes('deploy') ||
      nodeLabel.toLowerCase().includes('host')
    ) {
      setActiveSpecTab('deployment');
    }
    else if (
      nodeLabel.toLowerCase().includes('redis') ||
      nodeLabel.toLowerCase().includes('kafka') ||
      nodeLabel.toLowerCase().includes('scale') ||
      nodeLabel.toLowerCase().includes('cluster')
    ) {
      setActiveSpecTab('scalability');
    }

    onSelectNode && onSelectNode(nodeLabel);
  };

  function handleRefinementSubmit(e) {
    e.preventDefault()
    const inputEl = e.target.elements.refinementInput
    const refinementText = inputEl.value
    if (!refinementText.trim()) return

    const combinedIdea = `${idea} (Refinement: ${refinementText.trim()})`
    onSubmit({ idea: combinedIdea, knownStack: [] })
  }

  if (workspaceView === 'architecture') {
    return (
      <div className={styles.controlDeckWrapper}>
        <div className={styles.ideationHeader} style={{ marginBottom: '24px' }}>
          <div className={styles.ideationTitleRow}>
            <div>
              <div className={styles.ideationEyebrow}>INTERACTIVE CLOUD ESTIMATOR</div>
              <h1 className={styles.ideationTitle}>Stack Architecture & Cost Planner</h1>
            </div>
          </div>
          <p className={styles.ideationSummary}>Configure options for each backend, database, and caching layer to calculate monthly charges.</p>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
          <CostEstimator 
            architecture={data} 
            detectedStack={detectedStack}
            customCosts={customCosts}
            setCustomCosts={setCustomCosts}
            enabledServices={enabledServices}
            setEnabledServices={setEnabledServices}
            sliderVal={projectScalingStage}
            setSliderVal={setProjectScalingStage}
            onTotalCostChange={setTotalCost}
          />
        </div>
      </div>
    )
  }

  if (workspaceView === 'components') {
    return (
      <div className={styles.controlDeckWrapper}>
        <ComponentsView data={data} onSelectNode={onSelectNode} />
      </div>
    )
  }


  if (workspaceView === 'dataflows') {
    return (
      <div className={styles.controlDeckWrapper}>
        <div className={styles.ideationHeader} style={{ marginBottom: '24px' }}>
          <div className={styles.ideationTitleRow}>
            <div>
              <div className={styles.ideationEyebrow}>DATA JOURNEY FLOW</div>
              <h1 className={styles.ideationTitle}>User Flow Diagram</h1>
            </div>
          </div>
          <p className={styles.ideationSummary}>Trace the user interaction lifecycle as it traverses your cloud architecture topology.</p>
        </div>

        {/* Main Flow Canvas */}
        <AnimatedDataflow 
          data={data}
          detectedStack={detectedStack}
          customCosts={customCosts}
          enabledServices={enabledServices}
          viabilityMetrics={viabilityMetrics}
        />

        {/* Live Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px'
        }}>
          {[
            { label: 'Est. Latency', value: `${140 - (viabilityMetrics?.speed || 60)}ms`, color: 'var(--success)', sub: 'end-to-end P95' },
            { label: 'Cache Hit Rate', value: `${viabilityMetrics?.speed || 90}%`, color: 'var(--primary)', sub: 'average performance' },
            { label: 'Dev Ops Score', value: `${viabilityMetrics?.ops || 80}/100`, color: 'var(--text-muted)', sub: 'operational ease' },
            { label: 'Hiring Score', value: `${viabilityMetrics?.hiring || 80}/100`, color: 'var(--success)', sub: 'talent availability' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: m.color, marginTop: '4px' }}>{m.value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (workspaceView === 'collaborators') {
    return (
      <div className={styles.controlDeckWrapper}>
        <div className={styles.ideationHeader} style={{ marginBottom: '24px' }}>
          <div className={styles.ideationTitleRow}>
            <div>
              <div className={styles.ideationEyebrow}>TEAM & COLLABORATION</div>
              <h1 className={styles.ideationTitle}>Teammates & Role Assignments</h1>
            </div>
          </div>
          <p className={styles.ideationSummary}>Manage team permissions and view active workspaces collaborators.</p>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Active Collaborators</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {appUser ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {appUser.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{appUser.name} (You)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{appUser.email}</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '4px' }}>Owner (Editor)</span>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sign in to manage collaborators</div>
            )}
            
            {/* Empty state for other collaborators */}
            {appUser && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                You are the only person with access to this project. Use the form above to invite others.
              </div>
            )}
          </div>
        </div>

        <CollaboratorsInvite />
      </div>
    )
  }

  return (
    <div className={styles.controlDeckWrapper}>
      {/* Decisions Ticker Bar */}
      {data.architectureExplanation?.keyDecisions?.length > 0 && (
        <div className={styles.decisionsTicker}>
          <span className={styles.tickerLabel}>SYSTEM DECISIONS:</span>
          <div className={styles.tickerContent}>
            {data.architectureExplanation.keyDecisions.map((dec, idx) => (
              <span key={idx} className={styles.tickerItem}>
                ✦ {dec}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* 1. Project Ideation Header */}
      <div className={styles.ideationHeader}>
        <div className={styles.ideationTitleRow}>
          <div>
            <div className={styles.ideationEyebrow}>AI ARCHITECT CONTROL DECK</div>
            <h1 className={styles.ideationTitle}>{data.projectTitle}</h1>
          </div>
          <div className={styles.deckHeaderActions}>
            <button 
              type="button" 
              className={styles.deckActionBtn} 
              onClick={() => setShowExportModal(true)} 
              disabled={exporting}
              title="Export Full Blueprint"
            >
              <FileDown size={14} />
              {exporting ? 'Exporting…' : 'Export'}
            </button>
            {onScaffold && (
              <button
                type="button"
                className={styles.deckActionBtn}
                onClick={() => {
                  localStorage.setItem('inframind_checklist_scaffold', 'true')
                  onScaffold()
                }}
                title="Download project scaffold .zip"
              >
                <FolderDown size={14} />
                Scaffold
              </button>
            )}
            {onOpenShare && (
              <button
                type="button"
                className={`${styles.deckActionBtn} ${styles.deckActionBtnShare}`}
                onClick={onOpenShare}
                title="Share this architecture publicly"
              >
                <Share2 size={14} />
                Share
              </button>
            )}
          </div>
        </div>
        <p className={styles.ideationSummary}>{data.projectSummary}</p>
        
        {/* Rationale Inline */}
        <div className={styles.ideationRationale}>
          <div className={styles.ideationRationaleHeader}>
            <Layers size={14} className={styles.ideationRationaleIcon} />
            <strong>Architecture Rationale</strong>
          </div>
          <p className={styles.ideationRationaleText}>
            {data.architectureExplanation?.whyThisStack || "AI recommendation based on project constraints and selected technologies."}
          </p>
        </div>
      </div>
      {showExportModal && (
        <ExportStudioModal 
          data={data} 
          onClose={() => setShowExportModal(false)}
          onExportPdf={onExport}
        />
      )}

      {/* 2. Tech Stack Section */}
      <div className={styles.techStackSection}>
        <h4 className={styles.sectionHeaderTitle}>Primary Stack / Technologies</h4>
        <div className={styles.stackTagCloud}>
          {data.stack?.map((item, idx) => {
            const iconUrl = getTechIconUrl(item.recommendation);
            return (
              <div 
                key={idx} 
                className={styles.stackTagItem}
                title={`${item.layer}: ${item.recommendation}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {iconUrl && (
                  <img 
                    src={iconUrl} 
                    alt="" 
                    style={{ width: '12px', height: '12px', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <span className={styles.stackTagLayer}>{item.layer}:</span>
                <span className={styles.stackTagRec}>{item.recommendation}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Bento-Grid Dashboard (Top Row Metrics) */}
      <div className={styles.bentoMetricsGrid} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Health Score */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ overflow: 'visible' }}>
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border-subtle)" strokeWidth="3.5" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--success)" strokeWidth="3.5"
                    strokeDasharray="113.1" strokeDashoffset={113.1 - (92 / 100) * 113.1}
                    strokeLinecap="round" transform="rotate(-90 22 22)" />
          </svg>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Health Score</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>92 / 100</div>
          </div>
        </div>

        {/* Card 2: Est. Monthly Cost */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Monthly Cost</span>
            {totalCost === 0 && <span style={{ fontSize: '0.68rem', color: 'var(--success)', fontWeight: 600 }}>MVP Budget</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '6px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>${totalCost.toLocaleString()}/mo</div>
            <svg width="70" height="20" viewBox="0 0 70 20" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              <path d="M0,18 L10,13 L20,15 L30,8 L40,11 L50,4 L60,8 L70,2" fill="none" stroke="var(--success)" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Card 3: Reliability */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)' }}>
            <CheckCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reliability SLA</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>99.95%</div>
          </div>
        </div>

        {/* Card 4: Deployment Frequency */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deploy Frequency</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '6px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>24 / week</div>
            <svg width="60" height="16" viewBox="0 0 60 16" preserveAspectRatio="none">
              <rect x="0" y="6" width="5" height="10" fill="var(--primary)" opacity="0.6" rx="0.5" />
              <rect x="8" y="3" width="5" height="13" fill="var(--primary)" opacity="0.6" rx="0.5" />
              <rect x="16" y="8" width="5" height="8" fill="var(--primary)" opacity="0.8" rx="0.5" />
              <rect x="24" y="1" width="5" height="15" fill="var(--primary)" opacity="0.9" rx="0.5" />
              <rect x="32" y="10" width="5" height="6" fill="var(--primary)" opacity="0.7" rx="0.5" />
              <rect x="40" y="5" width="5" height="11" fill="var(--primary)" opacity="0.8" rx="0.5" />
              <rect x="48" y="11" width="5" height="5" fill="var(--primary)" opacity="0.6" rx="0.5" />
              <rect x="56" y="0" width="5" height="16" fill="var(--primary)" rx="0.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* AI Cofounder Viability Panel */}
      {viabilityMetrics && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                <Sparkles size={11} style={{ display: 'inline', marginRight: '4px' }} />
                AI Cofounder Assessment
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Stack Viability: <span style={{ color: viabilityMetrics.overall >= 80 ? 'var(--success)' : viabilityMetrics.overall >= 60 ? 'var(--warning)' : 'var(--danger)' }}>{viabilityMetrics.overall}%</span>
              </div>
            </div>
            {onSubmit && (
              <button
                type="button"
                onClick={() => onSubmit({ idea: 'Strip away all enterprise complexity, keep only free-tier services for MVP launch.', knownStack: [] })}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 600, padding: '6px 14px', background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <Zap size={12} />
                Simplify to MVP
              </button>
            )}
          </div>
          {/* Viability bar */}
          <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '4px', marginBottom: '16px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${viabilityMetrics.overall}%`,
              background: `linear-gradient(90deg, ${viabilityMetrics.overall >= 80 ? '#10b981' : viabilityMetrics.overall >= 60 ? '#f59e0b' : '#ef4444'}, #3b82f6)`,
              borderRadius: '4px',
              transition: 'width 0.8s ease'
            }} />
          </div>
          {/* 3 metric bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Speed to Market', value: viabilityMetrics.speed, hint: 'How fast you can ship' },
              { label: 'Developer Hiring', value: viabilityMetrics.hiring, hint: 'Talent availability' },
              { label: 'Ops Simplicity', value: viabilityMetrics.ops, hint: 'Maintenance overhead' },
            ].map(m => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{m.label}</span>
                  <span style={{ fontSize: '0.7rem', color: m.value >= 80 ? 'var(--success)' : m.value >= 60 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>{m.value}%</span>
                </div>
                <div style={{ height: '3px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${m.value}%`,
                    background: m.value >= 80 ? 'var(--success)' : m.value >= 60 ? 'var(--warning)' : 'var(--danger)',
                    borderRadius: '3px'
                  }} />
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px' }}>{m.hint}</div>
              </div>
            ))}
          </div>
          {/* AI suggestions based on stack */}
          {data.architectureExplanation?.tradeoffs?.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Tradeoff Alerts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.architectureExplanation.tradeoffs.slice(0, 3).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <AlertTriangle size={12} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '1px' }} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Interactive Topology Canvas */}
      <div className={styles.canvasCard} style={{ marginBottom: '24px' }}>
        <div className={styles.canvasHeader} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
          <span className={styles.canvasTitle} style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>SYSTEM TOPOLOGY</span>
          <span className={styles.canvasTip} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flex: '1 1 auto', textAlign: 'right' }}>💡 Scroll to zoom · Drag to pan · Click nodes</span>
        </div>
        <div className={styles.canvasEmbed} style={{ height: '350px', background: 'var(--bg-base)', border: 'none' }}>
          <MermaidDiagram
            code={data.mermaidDiagram}
            onSelectNode={handleSelectNodePerspective}
          />
        </div>
      </div>

      {/* 4. Specifications Card Grid & Expanded View */}
      <div style={{ marginTop: '32px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Specifications & Policies</h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {/* Card 1: APIs */}
          <div 
            onClick={() => setActiveSpecTab(activeSpecTab === 'apis' ? null : 'apis')}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${activeSpecTab === 'apis' ? 'var(--primary)' : 'var(--border-subtle)'}`,
              borderRadius: '8px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '100px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interface</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>APIs</div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, marginTop: '12px' }}>
              {routesToDisplay?.length || 0} routes configured
            </div>
          </div>

          {/* Card 2: Database Schema */}
          <div 
            onClick={() => setActiveSpecTab(activeSpecTab === 'database' ? null : 'database')}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${activeSpecTab === 'database' ? 'var(--primary)' : 'var(--border-subtle)'}`,
              borderRadius: '8px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '100px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Storage</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>Database Schema</div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, marginTop: '12px' }}>
              {schemasToDisplay?.length || 0} models defined
            </div>
          </div>

          {/* Card 3: Deployment & Audits */}
          <div 
            onClick={() => setActiveSpecTab(activeSpecTab === 'deployment' ? null : 'deployment')}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${activeSpecTab === 'deployment' ? 'var(--primary)' : 'var(--border-subtle)'}`,
              borderRadius: '8px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '100px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ops & Security</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>Deployment Strategy</div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, marginTop: '12px' }}>
              {data.stack?.length || 0} tech systems
            </div>
          </div>

          {/* Card 4: Scalability */}
          <div 
            onClick={() => setActiveSpecTab(activeSpecTab === 'scalability' ? null : 'scalability')}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${activeSpecTab === 'scalability' ? 'var(--primary)' : 'var(--border-subtle)'}`,
              borderRadius: '8px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '100px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Architecture</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>Scalability</div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, marginTop: '12px' }}>
              {data.scalability?.length || 0} scaling rules
            </div>
          </div>

          {/* Card 5: + Add Spec */}
          <div 
            onClick={() => {
              const inputEl = document.querySelector('input[name="refinementInput"]');
              if (inputEl) {
                inputEl.focus();
                inputEl.placeholder = "Describe the specification or policy you want to add...";
              }
            }}
            style={{
              background: 'transparent',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100px'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>+ Add Spec</span>
          </div>
        </div>

        {/* Active Specification Detail View Panel */}
        {activeSpecTab && (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '16px'
          }}>
            {/* Spec Panel Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeSpecTab === 'apis' && 'API Specifications'}
                {activeSpecTab === 'database' && 'Database Schema & Models'}
                {activeSpecTab === 'deployment' && 'Deployment Strategy & Audits'}
                {activeSpecTab === 'scalability' && 'Scalability & Caching'}
              </h5>
              <button 
                type="button" 
                onClick={() => setActiveSpecTab(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Spec Panel Body Content */}
            {activeSpecTab === 'apis' && (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '8px', width: '100px' }}>Method</th>
                      <th style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '8px', width: '250px' }}>Path</th>
                      <th style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '8px' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routesToDisplay?.map((api, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 0' }}>
                          <span className={`${styles.methodPillBadge} ${styles[api.method]}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                            {api.method}
                          </span>
                        </td>
                        <td style={{ padding: '8px 0' }}><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{api.route}</code></td>
                        <td style={{ padding: '8px 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{api.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeSpecTab === 'database' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {schemasToDisplay?.map((model, idx) => (
                  <div key={idx} style={{ padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '6px', background: 'var(--bg-elevated)' }}>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '12px' }}>{model.collection}</strong>
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <th style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '6px', width: '200px' }}>Field</th>
                            <th style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '6px', width: '150px' }}>Type</th>
                            <th style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'left', paddingBottom: '6px' }}>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {model.fields?.map((field, fIdx) => (
                            <tr key={fIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '6px 0' }}><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{field.name}</code></td>
                              <td style={{ padding: '6px 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{field.type}</td>
                              <td style={{ padding: '6px 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{field.note || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSpecTab === 'deployment' && (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                  {data.stack?.map((item, idx) => (
                    <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-subtle)', padding: '6px 10px', borderRadius: '4px', background: 'var(--bg-elevated)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.layer}:</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>{item.recommendation}</span>
                    </div>
                  ))}
                </div>
                
                {data.deploymentStrategy && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {Object.entries(data.deploymentStrategy).map(([env, text]) => (
                      <div key={env} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-soft)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{env}</span>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Operations & Audits Dashboard inside Deployment */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '12px' }}>
                    <button 
                      type="button" 
                      onClick={() => { setOpsTab('security'); setOpsError(''); setOpsSuccess(''); }}
                      style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '4px', background: opsTab === 'security' ? 'var(--primary-soft)' : 'transparent', color: opsTab === 'security' ? 'var(--primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                    >
                      <Shield size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      <span>Security Auditor</span>
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={() => { setOpsTab('drift'); setOpsError(''); setOpsSuccess(''); }}
                      style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '4px', background: opsTab === 'drift' ? 'var(--primary-soft)' : 'transparent', color: opsTab === 'drift' ? 'var(--primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                    >
                      <Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      <span>Drift Monitor</span>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => { setOpsTab('badge'); setOpsError(''); setOpsSuccess(''); }}
                      style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '4px', background: opsTab === 'badge' ? 'var(--primary-soft)' : 'transparent', color: opsTab === 'badge' ? 'var(--primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                    >
                      <Share2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      <span>Readme Badge</span>
                    </button>
                  </div>

                  {opsError && <div style={{ color: 'var(--danger)', fontSize: '0.74rem', marginBottom: '8px' }}>{opsError}</div>}
                  {opsSuccess && <div style={{ color: 'var(--success)', fontSize: '0.74rem', marginBottom: '8px' }}>{opsSuccess}</div>}

                  <div>
                    {opsTab === 'security' && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            Security Posture:{' '}
                            {latestSecurityReport ? (
                              <>
                                <strong style={{ color: 'var(--primary)' }}>{latestSecurityReport.securityScore}%</strong>
                                <span className={`${styles.scoreGrade} ${styles['grade' + latestSecurityReport.grade]}`} style={{ marginLeft: '6px', fontSize: '0.7rem' }}>
                                  Grade {latestSecurityReport.grade}
                                </span>
                              </>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>No scans executed</span>
                            )}
                          </div>
                          <button 
                            type="button" 
                            onClick={handleSecurityScan}
                            disabled={opsLoading}
                            style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'var(--primary)', color: 'var(--bg-base)', borderRadius: '4px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                          >
                            {opsLoading ? 'Running...' : 'Run Audit'}
                          </button>
                        </div>

                        {latestSecurityReport && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className={styles.vulnList}>
                              {latestSecurityReport.alerts?.length === 0 ? (
                                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>✓ Zero critical issues detected.</p>
                              ) : (
                                latestSecurityReport.alerts.map((alert) => (
                                  <div key={alert.id} style={{ padding: '10px', border: '1px solid var(--border-subtle)', borderRadius: '6px', marginBottom: '6px', background: 'var(--bg-elevated)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
                                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{alert.title}</span>
                                      <span className={`${styles.severityTag} ${styles['sev' + alert.severity]}`} style={{ fontSize: '0.66rem' }}>
                                        {alert.severity}
                                      </span>
                                    </div>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0' }}>{alert.description}</p>
                                    <p style={{ fontSize: '0.72rem', margin: 0, color: 'var(--text-primary)' }}><strong>Remediation:</strong> {alert.remediation}</p>
                                  </div>
                                ))
                              )}
                            </div>

                            {latestSecurityReport.securityScore < 80 && latestSecurityReport.alerts?.length > 0 && (
                              <div style={{ marginTop: '12px' }}>
                                <button
                                  type="button"
                                  onClick={handleSecurityFix}
                                  disabled={fixLoading}
                                  style={{ width: '100%', fontSize: '0.74rem', padding: '6px', background: 'var(--primary)', color: 'var(--bg-base)', borderRadius: '4px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                                >
                                  <Zap size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                  {fixLoading ? 'Generating...' : 'AI Fix Security Issues'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {opsTab === 'drift' && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            GitHub Status: <strong>{githubLinked ? 'Linked' : 'Not Linked'}</strong>
                          </div>
                          {!githubLinked ? (
                            <button type="button" onClick={handleLinkGithub} disabled={opsLoading} style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'var(--primary)', color: 'var(--bg-base)', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                              Link GitHub
                            </button>
                          ) : (
                            <button type="button" onClick={handleUnlinkGithub} disabled={opsLoading} style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>
                              Unlink
                            </button>
                          )}
                        </div>

                        {githubLinked && (
                          <>
                            <form onSubmit={handleConnectRepo} style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                              <input 
                                type="text" 
                                placeholder="owner/repository" 
                                value={repoName}
                                onChange={(e) => setRepoName(e.target.value)}
                                required
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px', flex: 1, fontSize: '0.78rem', outline: 'none' }}
                              />
                              <button type="submit" disabled={opsLoading} style={{ fontSize: '0.72rem', padding: '6px 12px', background: 'var(--primary)', color: 'var(--bg-base)', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                                Link Repo
                              </button>
                            </form>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                Drift Compliance:{' '}
                                {latestDriftReport ? (
                                  <strong style={{ color: 'var(--primary)' }}>{latestDriftReport.complianceScore}% alignment</strong>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>No scans run</span>
                                )}
                              </div>
                              <button 
                                type="button" 
                                onClick={handleDriftScan}
                                disabled={opsLoading}
                                style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'var(--primary)', color: 'var(--bg-base)', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                              >
                                Check Alignment
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {opsTab === 'badge' && (
                      <div>
                        {data.shareId ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input 
                              type="text" 
                              value={badgeMarkdown} 
                              readOnly 
                              style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '6px', borderRadius: '4px', flex: 1, fontSize: '0.74rem', outline: 'none' }}
                            />
                            <button type="button" onClick={handleCopyBadge} style={{ fontSize: '0.72rem', padding: '6px 12px', background: 'var(--primary)', color: 'var(--bg-base)', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                              {copied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Share links must be enabled.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSpecTab === 'scalability' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.scalability?.map((item, idx) => (
                  <div key={idx} style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{item.area}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>


      {/* Floating Prompt Refiner Bar (Bottom-Center) */}
      {onSubmit && (
        <div className={styles.floatingPromptBarWrapper}>
          <form className={styles.floatingPromptBarForm} onSubmit={handleRefinementSubmit}>
            <Terminal size={16} className={styles.promptBarIcon} />
            <input
              name="refinementInput"
              type="text"
              className={styles.promptBarInput}
              placeholder="Refine this architecture (e.g. 'Add Redis cache layer')..."
            />
            <button 
              type="submit" 
              className={styles.promptBarSubmitBtn}
              title="Refine Blueprint"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* ================= MODAL WINDOWS ================= */}

      {/* Modal: System Topology Diagram */}
      {modals.archDiagram && data.mermaidDiagram && (
        <div className={`${styles.modalBackdrop} ${styles.modalDiagramBackdrop}`} onClick={() => closeModal('archDiagram')}>
          <div className={`${styles.modalContent} ${styles.modalDiagram}`} onClick={(e) => e.stopPropagation()}>
            <ModalHeader title="SYSTEM TOPOLOGY CANVAS" onClose={() => closeModal('archDiagram')} />
            <div className={styles.modalBody} style={{ padding: 0, position: 'relative', flex: 1 }}>
              {/* Floating Info Guide */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                zIndex: 10000,
                background: 'rgba(10, 10, 10, 0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                💡 System Architecture Topology — Scroll to Zoom · Drag to Pan · Click nodes to view detailed specifications
              </div>

              <div className={styles.diagramModalEmbed}>
                <MermaidDiagram
                  code={data.mermaidDiagram}
                  onSelectNode={handleSelectNodePerspective}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: User Flow Diagram */}
      {modals.userFlow && data.userFlowDiagram && (
        <div className={`${styles.modalBackdrop} ${styles.modalDiagramBackdrop}`} onClick={() => closeModal('userFlow')}>
          <div className={`${styles.modalContent} ${styles.modalDiagram}`} onClick={(e) => e.stopPropagation()}>
            <ModalHeader title="USER FLOW SEQUENCE" onClose={() => closeModal('userFlow')} />
            <div className={styles.modalBody} style={{ padding: 0, position: 'relative', flex: 1 }}>
              {/* Floating Info Guide */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                zIndex: 10000,
                background: 'rgba(10, 10, 10, 0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                💡 User Flow Sequence — Scroll to Zoom · Drag to Pan
              </div>

              <div className={styles.diagramModalEmbed}>
                <MermaidDiagram code={data.userFlowDiagram} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: APIs Spec */}
      {modals.apis && (
        <div className={styles.modalBackdrop} onClick={() => closeModal('apis')}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitleGroup}>
                <Network size={18} className={styles.modalIcon} />
                <h3>REST API Interface Specs</h3>
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => closeModal('apis')}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalScrollContent}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table className={styles.specsTable}>
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Path</th>
                        <th>Operational Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routesToDisplay?.map((api, idx) => (
                        <tr key={idx}>
                          <td>
                            <span className={`${styles.methodPillBadge} ${styles[api.method]}`}>
                              {api.method}
                            </span>
                          </td>
                          <td><code className={styles.specsRouteCode}>{api.route}</code></td>
                          <td className={styles.specsRouteDesc}>{api.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <span className={styles.modalFooterTip}>Generated by AI Architect based on constraints</span>
              <button type="button" className={styles.modalCloseFooterBtn} onClick={() => closeModal('apis')}>
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Database Schemas */}
      {modals.database && (
        <div className={styles.modalBackdrop} onClick={() => closeModal('database')}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitleGroup}>
                <Database size={18} className={styles.modalIcon} />
                <h3>Relational Tables & Schema Layout</h3>
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => closeModal('database')}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalScrollContent}>
                <div className={styles.dbModelList}>
                  {schemasToDisplay?.map((model, idx) => (
                    <div key={idx} className={styles.dbModelCard}>
                      <div className={styles.dbModelHeader} onClick={() => {
                        onSelectNode(model.collection)
                        closeModal('database')
                      }}>
                        <strong className={styles.dbModelName}>{model.collection}</strong>
                        <span className={styles.dbClickHint}>Click to Inspect Node Details</span>
                      </div>
                      <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table className={styles.dbModelTable}>
                          <thead>
                            <tr>
                              <th>Field</th>
                              <th>Type</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {model.fields?.map((field, fIdx) => (
                              <tr key={fIdx}>
                                <td><code>{field.name}</code></td>
                                <td>{field.type}</td>
                                <td>{field.note}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <span className={styles.modalFooterTip}>💡 Click table names to inspect detailed relation in sidebar</span>
              <button type="button" className={styles.modalCloseFooterBtn} onClick={() => closeModal('database')}>
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Deployment Strategy */}
      {modals.deployment && (
        <div className={styles.modalBackdrop} onClick={() => closeModal('deployment')}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitleGroup}>
                <Cloud size={18} className={styles.modalIcon} />
                <h3>Environments Deployment Strategy</h3>
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => closeModal('deployment')}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalScrollContent} style={{ width: '100%' }}>
                <div className={styles.deployEnvironmentsList}>
                  {Object.entries(data.deploymentStrategy || {}).map(([env, text]) => (
                    <div key={env} className={styles.deployEnvRow}>
                      <span className={styles.deployEnvBadge}>{env}</span>
                      <p className={styles.deployText}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <span className={styles.modalFooterTip}>Configured architecture deployment pathways</span>
              <button type="button" className={styles.modalCloseFooterBtn} onClick={() => closeModal('deployment')}>
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Scalability & Roadmaps */}
      {modals.scalability && (
        <div className={styles.modalBackdrop} onClick={() => closeModal('scalability')}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitleGroup}>
                <TrendingUp size={18} className={styles.modalIcon} />
                <h3>Scalability & MVP Milestone</h3>
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => closeModal('scalability')}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalScrollContent} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Scaling */}
                <div className={styles.strategySectionCard}>
                  <h4>Scaling Guidelines</h4>
                  <div className={styles.scalingItemsList}>
                    {data.scalability?.map((item, idx) => (
                      <div key={idx} className={styles.scalingItem}>
                        <strong>{item.area}</strong>
                        <p>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MVP Roadmap */}
                {data.mvpRoadmap && (
                  <div className={styles.strategySectionCard}>
                    <h4>MVP Milestone Phases</h4>
                    <div className={styles.roadmapPhasesList}>
                      {data.mvpRoadmap.map((phase, idx) => (
                        <div key={idx} className={styles.roadmapPhaseRow}>
                          <div className={styles.phaseHeaderRow}>
                            <span className={styles.phaseBadge}>Phase {idx + 1}</span>
                            <strong>{phase.phase} ({phase.duration})</strong>
                          </div>
                          <ul className={styles.phaseTasksList}>
                            {phase.tasks?.map((task, tIdx) => (
                              <li key={tIdx}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
            <div className={styles.modalFooter}>
              <span className={styles.modalFooterTip}>Strategic scaling & release milestones</span>
              <button type="button" className={styles.modalCloseFooterBtn} onClick={() => closeModal('scalability')}>
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======= SECURITY FIX PLAN MODAL ======= */}
      {showFixModal && fixPlan && (
        <div className={styles.modalBackdrop} onClick={() => setShowFixModal(false)}>
          <div className={`${styles.modalContent} ${styles.securityFixModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitleGroup}>
                <Zap size={18} className={styles.securityFixModalIcon} />
                <div>
                  <h3>AI Security Remediation Plan</h3>
                  <span className={styles.securityFixModalSubtitle}>
                    Score: {fixPlan.securityScore}% · Grade {fixPlan.grade} · {fixPlan.fixes?.length} targeted fixes
                  </span>
                </div>
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setShowFixModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.securityFixIntro}>
                <AlertCircle size={14} />
                <span>These fixes address the exact vulnerabilities found in your last scan. Apply them to harden your architecture.</span>
              </div>

              <div className={styles.securityFixList}>
                {fixPlan.fixes?.length === 0 ? (
                  <div className={styles.securityFixEmpty}>
                    <CheckCircle size={20} />
                    <span>No specific fixes generated. Your architecture may already be close to secure.</span>
                  </div>
                ) : (
                  fixPlan.fixes.map((fix, idx) => (
                    <div key={fix.fixId} className={`${styles.securityFixCard} ${styles['sevCard' + fix.severity]}`}>
                      <div className={styles.securityFixCardHeader}>
                        <div className={styles.securityFixCardLeft}>
                          <span className={styles.securityFixNumber}>#{idx + 1}</span>
                          <div>
                            <div className={styles.securityFixCardTitle}>{fix.title}</div>
                            {fix.addressesVulnerability && (
                              <div className={styles.securityFixAddresses}>
                                Fixes: <em>{fix.addressesVulnerability}</em>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={styles.securityFixCardBadges}>
                          <span className={`${styles.fixCategoryBadge} ${styles['cat' + fix.category]}`}>
                            {fix.category}
                          </span>
                          <span className={`${styles.severityTag} ${styles['sev' + fix.severity]}`}>
                            {fix.severity}
                          </span>
                        </div>
                      </div>

                      <div className={styles.securityFixWhat}>
                        <ChevronRight size={12} className={styles.securityFixChevron} />
                        <span><strong>What:</strong> {fix.what}</span>
                      </div>

                      {fix.how && (
                        <div className={styles.securityFixHow}>
                          <Info size={12} className={styles.securityFixInfoIcon} />
                          <span><strong>How:</strong> {fix.how}</span>
                        </div>
                      )}

                      {fix.codeHint && (
                        <pre className={styles.securityFixCodeHint}><code>{fix.codeHint}</code></pre>
                      )}

                      {fix.impact && (
                        <div className={styles.securityFixImpact}>
                          <CheckCircle size={11} />
                          <span>{fix.impact}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <span className={styles.modalFooterTip}>
                💡 Use the refinement bar below to apply these fixes (e.g., "Add rate limiting middleware and JWT refresh token rotation")
              </span>
              <button type="button" className={styles.modalCloseFooterBtn} onClick={() => setShowFixModal(false)}>
                Close Plan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
