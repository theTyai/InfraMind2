import { useState, useEffect } from 'react'
import MermaidDiagram from '../MermaidDiagram.jsx'
import { 
  Send, Terminal, Network, Shield, Cpu, Activity, X, Database, Cloud, 
  TrendingUp, Maximize2, ExternalLink, Calendar, Layers, Sliders,
  FileDown, Share2, FolderDown, Zap, CheckCircle, AlertCircle, Info, ChevronRight
} from 'lucide-react'
import { getTechIconUrl } from '../../utils/techIcons.js'
import InspectorPanel from '../layout/InspectorPanel.jsx'
import styles from './Workspace.module.css'
import { useArchitectureStore } from '../../store/useArchitectureStore.js'
import { useAuthContext } from '../../context/AuthContext.jsx'

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
  onSelectNode
}) {
  // Modal toggles
  const [modals, setModals] = useState({
    apis: false,
    database: false,
    deployment: false,
    scalability: false,
    archDiagram: false,
    userFlow: false,
  })

  const { getFreshToken, idToken } = useAuthContext()
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
  const [branchName, setBranchName] = useState('main')
  const [opsLoading, setOpsLoading] = useState(false)
  const [opsError, setOpsError] = useState('')
  const [opsSuccess, setOpsSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [fixPlan, setFixPlan] = useState(null)
  const [showFixModal, setShowFixModal] = useState(false)
  const [fixLoading, setFixLoading] = useState(false)

  useEffect(() => {
    if (idToken && currentProjectId) {
      fetchGithubStatus(idToken)
      fetchSecurityHistory(currentProjectId, idToken)
      fetchDriftHistory(currentProjectId, idToken)
    }
  }, [idToken, currentProjectId, fetchGithubStatus, fetchSecurityHistory, fetchDriftHistory])

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

  function handleRefinementSubmit(e) {
    e.preventDefault()
    const inputEl = e.target.elements.refinementInput
    const refinementText = inputEl.value
    if (!refinementText.trim()) return

    const combinedIdea = `${idea} (Refinement: ${refinementText.trim()})`
    onSubmit({ idea: combinedIdea, knownStack: [] })
    inputEl.value = ''
  }

  return (
    <div className={styles.controlDeckWrapper}>
      
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
              onClick={onExport} 
              disabled={exporting}
              title="Export full blueprint as PDF"
            >
              <FileDown size={14} />
              {exporting ? 'Exporting…' : 'Export PDF'}
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

      {/* 3. Flow Toggle Buttons — open as modals */}
      <div className={styles.flowTogglesRow}>
        <button
          type="button"
          className={styles.flowToggleBtn}
          onClick={() => openModal('archDiagram')}
        >
          <Cpu size={14} />
          <span>System Architecture Flow</span>
        </button>
        
        {data.userFlowDiagram && (
          <button
            type="button"
            className={styles.flowToggleBtn}
            onClick={() => openModal('userFlow')}
          >
            <Activity size={14} />
            <span>User Flow Sequence</span>
          </button>
        )}
      </div>

      {/* 5. Key Decisions (Other Stuffs Part A) */}
      {data.architectureExplanation?.keyDecisions?.length > 0 && (
        <div className={styles.decisionsCard}>
          <h4 className={styles.sectionHeaderTitle}>Key System Decisions</h4>
          <ul className={styles.decisionsList}>
            {data.architectureExplanation.keyDecisions.map((dec, idx) => (
              <li key={idx} className={styles.decisionListItem}>
                <span className={styles.decisionBullet}>✦</span>
                <span className={styles.decisionText}>{dec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Specifications Sub-Grid (Other Stuffs Part B) */}
      <div className={styles.specsContainer}>
        <h4 className={styles.sectionHeaderTitle}>System Specifications & Modules</h4>
        <div className={styles.specsSubGrid}>
          {/* Card 1: APIs */}
          <button type="button" className={styles.specDeckCard} onClick={() => openModal('apis')}>
            <div className={styles.specCardHeader}>
              <Network size={16} className={styles.specIconBlue} />
              <h4>API Interfaces</h4>
            </div>
            <p className={styles.specCardPreview}>
              {data.apis?.length || 0} HTTP endpoints generated. Rest APIs, route methods, and paths.
            </p>
            <span className={styles.specCardAction}>Inspect APIs →</span>
          </button>

          {/* Card 2: Database Schemas */}
          <button type="button" className={styles.specDeckCard} onClick={() => openModal('database')}>
            <div className={styles.specCardHeader}>
              <Database size={16} className={styles.specIconBlue} />
              <h4>Database Schemas</h4>
            </div>
            <p className={styles.specCardPreview}>
              {data.dbSchema?.length || 0} relational collections modeled. Column types, keys, and notes.
            </p>
            <span className={styles.specCardAction}>Inspect Schemas →</span>
          </button>

          {/* Card 3: Deployment Strategy */}
          <button type="button" className={styles.specDeckCard} onClick={() => openModal('deployment')}>
            <div className={styles.specCardHeader}>
              <Cloud size={16} className={styles.specIconBlue} />
              <h4>Deployment Environment</h4>
            </div>
            <p className={styles.specCardPreview}>
              Multi-stage hosting blueprints for Development, Staging, and Production targets.
            </p>
            <span className={styles.specCardAction}>Inspect Hosting →</span>
          </button>

          {/* Card 4: Scalability & Roadmaps */}
          <button type="button" className={styles.specDeckCard} onClick={() => openModal('scalability')}>
            <div className={styles.specCardHeader}>
              <TrendingUp size={16} className={styles.specIconBlue} />
              <h4>Scalability & MVP Roadmap</h4>
            </div>
            <p className={styles.specCardPreview}>
              Key scaling patterns, microservice metrics, and phase milestones for deployment.
            </p>
            <span className={styles.specCardAction}>Inspect Roadmap →</span>
          </button>
        </div>
      </div>

      {/* 7. Enterprise Operations Panel (Phase 9) */}
      <div className={styles.opsCard}>
        <div className={styles.opsHeaderTitle}>
          <Shield size={16} />
          <span>Enterprise Workspace Operations</span>
        </div>
        
        {/* Tabs Row */}
        <div className={styles.opsTabsRow}>
          <button 
            type="button" 
            className={`${styles.opsTabBtn} ${opsTab === 'security' ? styles.opsTabBtnActive : ''}`}
            onClick={() => { setOpsTab('security'); setOpsError(''); setOpsSuccess(''); }}
          >
            <Shield size={14} />
            <span>AI Security Auditor</span>
          </button>
          
          <button 
            type="button" 
            className={`${styles.opsTabBtn} ${opsTab === 'drift' ? styles.opsTabBtnActive : ''}`}
            onClick={() => { setOpsTab('drift'); setOpsError(''); setOpsSuccess(''); }}
          >
            <Activity size={14} />
            <span>Code Drift Monitor</span>
          </button>

          <button 
            type="button" 
            className={`${styles.opsTabBtn} ${opsTab === 'badge' ? styles.opsTabBtnActive : ''}`}
            onClick={() => { setOpsTab('badge'); setOpsError(''); setOpsSuccess(''); }}
          >
            <Share2 size={14} />
            <span>README Status Badge</span>
          </button>
        </div>

        {/* Feedback alerts */}
        {opsError && <div className={`${styles.alertBox} ${styles.alertBoxError}`}>{opsError}</div>}
        {opsSuccess && <div className={`${styles.alertBox} ${styles.alertBoxSuccess}`}>{opsSuccess}</div>}

        {/* Tab Content */}
        <div className={styles.opsContentSlot}>
          {opsTab === 'security' && (
            <>
              <div className={styles.opsSummaryRow}>
                <div className={styles.opsScoreBlock}>
                  <span className={styles.scoreLabel}>Security Posture:</span>
                  {latestSecurityReport ? (
                    <>
                      <span className={styles.scoreVal}>{latestSecurityReport.securityScore}%</span>
                      <span className={`${styles.scoreGrade} ${styles['grade' + latestSecurityReport.grade]}`}>
                        Grade {latestSecurityReport.grade}
                      </span>
                    </>
                  ) : (
                    <span className={styles.scoreVal}>No scans executed</span>
                  )}
                </div>
                
                <button 
                  type="button" 
                  className={styles.triggerScanBtn}
                  onClick={handleSecurityScan}
                  disabled={opsLoading}
                >
                  {opsLoading ? 'Running Scan...' : 'Run Security Scan'}
                </button>
              </div>

              {latestSecurityReport && (
                <div className={styles.opsReportContainer}>
                  <div className={styles.reportHeader}>Vulnerabilities Audit Log:</div>
                  <div className={styles.vulnList}>
                    {latestSecurityReport.alerts?.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>✓ Zero critical issues detected! Your design follows recommended security policies.</p>
                    ) : (
                      latestSecurityReport.alerts.map((alert) => (
                        <div key={alert.id} className={styles.vulnCard}>
                          <div className={styles.vulnHeaderRow}>
                            <span className={styles.vulnTitle}>{alert.title}</span>
                            <div className={styles.vulnBadgeRow}>
                              <span className={`${styles.severityTag} ${styles['sev' + alert.severity]}`}>
                                {alert.severity}
                              </span>
                              <span className={styles.codeTag}>{alert.cwe}</span>
                            </div>
                          </div>
                          <p className={styles.vulnDesc}>{alert.description}</p>
                          <div className={styles.remediationGroup}>
                            <div className={styles.remediationLabel}>Remediation Action (CWE):</div>
                            <p className={styles.remediationText}><strong>Target:</strong> <code>{alert.target}</code> — {alert.remediation}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* AI Fix Button — shown when score is risky (< 80) */}
                  {latestSecurityReport.securityScore < 80 && latestSecurityReport.alerts?.length > 0 && (
                    <div className={styles.securityFixBanner}>
                      <div className={styles.securityFixBannerText}>
                        <Zap size={15} className={styles.securityFixZapIcon} />
                        <span>
                          <strong>Security risk detected.</strong> AI can generate a targeted remediation plan to harden your architecture.
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.securityFixBtn}
                        onClick={handleSecurityFix}
                        disabled={fixLoading}
                        id="ai-security-fix-btn"
                      >
                        <Zap size={13} />
                        {fixLoading ? 'Generating Fix Plan...' : 'AI Fix Security Issues'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {opsTab === 'drift' && (
            <>
              {/* GitHub OAuth Connection Status */}
              <div className={styles.githubConnectBlock}>
                <div className={styles.githubStatusText}>
                  GitHub Integration Status: <strong>{githubLinked ? 'Linked' : 'Not Linked'}</strong>
                </div>
                {!githubLinked ? (
                  <button type="button" className={styles.githubOAuthBtn} onClick={handleLinkGithub} disabled={opsLoading}>
                    Link GitHub Account
                  </button>
                ) : (
                  <button type="button" className={styles.unlinkBtn} onClick={handleUnlinkGithub} disabled={opsLoading}>
                    Unlink GitHub Account
                  </button>
                )}
              </div>

              {githubLinked && (
                <>
                  {/* Repository association form */}
                  <form onSubmit={handleConnectRepo} className={styles.repoForm}>
                    <div className={styles.formField}>
                      <label htmlFor="repo-input">Repository Name</label>
                      <input 
                        id="repo-input"
                        type="text" 
                        placeholder="owner/repository" 
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor="branch-input">Branch</label>
                      <input 
                        id="branch-input"
                        type="text" 
                        placeholder="main" 
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                      />
                    </div>
                    <button type="submit" className={styles.saveRepoBtn} disabled={opsLoading}>
                      Save Connection
                    </button>
                  </form>

                  {/* Scan results & triggers */}
                  <div className={styles.opsSummaryRow} style={{ marginTop: '10px' }}>
                    <div className={styles.opsScoreBlock}>
                      <span className={styles.scoreLabel}>Drift Compliance:</span>
                      {latestDriftReport ? (
                        <span className={styles.scoreVal}>{latestDriftReport.complianceScore}% alignment</span>
                      ) : (
                        <span className={styles.scoreVal}>No alignment checks run</span>
                      )}
                    </div>
                    
                    <button 
                      type="button" 
                      className={styles.triggerScanBtn}
                      onClick={handleDriftScan}
                      disabled={opsLoading}
                    >
                      {opsLoading ? 'Scanning...' : 'Check Code Alignment'}
                    </button>
                  </div>

                  {latestDriftReport && (
                    <div className={styles.driftTableBlock}>
                      <div className={styles.reportHeader}>Scan Summary (Branch: <code>{latestDriftReport.scannedBranch}</code>):</div>
                      
                      {/* API Drift */}
                      <div>
                        <div className={styles.driftSectionTitle}>API ROUTE DRIFT</div>
                        {latestDriftReport.routes?.missing?.length === 0 && latestDriftReport.routes?.extra?.length === 0 ? (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>✓ Clean API contracts. Code routes match architecture specs perfectly.</p>
                        ) : (
                          <div className={styles.driftBadgeList}>
                            {latestDriftReport.routes?.missing?.map(r => (
                              <span key={r} className={`${styles.driftBadgeItem} ${styles.driftBadgeMissing}`}>
                                Missing: <code>{r}</code>
                              </span>
                            ))}
                            {latestDriftReport.routes?.extra?.map(r => (
                              <span key={r} className={`${styles.driftBadgeItem} ${styles.driftBadgeExtra}`}>
                                Undocumented: <code>{r}</code>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Schema Drift */}
                      <div>
                        <div className={styles.driftSectionTitle}>DATABASE COLLECTION DRIFT</div>
                        {latestDriftReport.collections?.missing?.length === 0 && latestDriftReport.collections?.extra?.length === 0 ? (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>✓ Clean database models. Firestore collections match schema specs perfectly.</p>
                        ) : (
                          <div className={styles.driftBadgeList}>
                            {latestDriftReport.collections?.missing?.map(c => (
                              <span key={c} className={`${styles.driftBadgeItem} ${styles.driftBadgeMissing}`}>
                                Missing: <code>{c}</code>
                              </span>
                            ))}
                            {latestDriftReport.collections?.extra?.map(c => (
                              <span key={c} className={`${styles.driftBadgeItem} ${styles.driftBadgeExtra}`}>
                                Undocumented: <code>{c}</code>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {opsTab === 'badge' && (
            <div className={styles.badgeCopyBlock}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Expose compliance rating status directly in your GitHub repository README. The badge updates dynamically based on continuous drift scanner checks.
              </p>
              
              {!data.shareId ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ⚠️ Sharing must be enabled to generate a status badge. Please enable public share links for this project first.
                </p>
              ) : (
                <>
                  <div className={styles.badgeFlexRow}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Badge Preview:</span>
                    <img 
                      src={badgeImgUrl} 
                      alt="InfraMind Compliance" 
                      className={styles.badgePreviewImage} 
                    />
                  </div>
                  <div className={styles.badgeCopyInputRow}>
                    <input 
                      type="text" 
                      className={styles.badgeCopyInput} 
                      value={badgeMarkdown} 
                      readOnly 
                      onClick={(e) => e.target.select()}
                    />
                    <button type="button" className={styles.copyCodeBtn} onClick={handleCopyBadge}>
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
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

      {/* Modal: System Architecture Diagram */}
      {modals.archDiagram && (
        <div className={styles.modalBackdrop} onClick={() => { onSelectNode && onSelectNode(null); closeModal('archDiagram'); }}>
          <div className={`${styles.modalContent} ${styles.modalDiagram}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitleGroup}>
                <Cpu size={18} className={styles.modalIcon} />
                <h3>System Architecture Topology</h3>
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => { onSelectNode && onSelectNode(null); closeModal('archDiagram'); }}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBodySplit}>
              <div className={styles.diagramModalEmbedSplit}>
                <MermaidDiagram
                  code={data.mermaidDiagram}
                  onSelectNode={(nodeLabel) => {
                    onSelectNode && onSelectNode(nodeLabel)
                  }}
                />
              </div>
              {selectedNode && (
                <div className={styles.modalInspectorPanelSlot}>
                  <InspectorPanel
                    state="result"
                    data={data}
                    exporting={exporting}
                    onExport={onExport}
                    selectedNode={selectedNode}
                    onSelectNode={onSelectNode}
                    onClose={() => onSelectNode(null)}
                    onSubmit={onSubmit}
                    lastIdea={idea}
                  />
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <span className={styles.modalFooterTip}>💡 Scroll to Zoom · Drag to Pan · Click a node to inspect it</span>
              <button type="button" className={styles.modalCloseFooterBtn} onClick={() => { onSelectNode && onSelectNode(null); closeModal('archDiagram'); }}>
                Close Diagram
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: User Flow Diagram */}
      {modals.userFlow && data.userFlowDiagram && (
        <div className={styles.modalBackdrop} onClick={() => closeModal('userFlow')}>
          <div className={`${styles.modalContent} ${styles.modalDiagram}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitleGroup}>
                <Activity size={18} className={styles.modalIcon} />
                <h3>User Flow Sequence</h3>
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => closeModal('userFlow')}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody} style={{ padding: 0 }}>
              <div className={styles.diagramModalEmbed}>
                <MermaidDiagram code={data.userFlowDiagram} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <span className={styles.modalFooterTip}>💡 Scroll to Zoom · Drag to Pan</span>
              <button type="button" className={styles.modalCloseFooterBtn} onClick={() => closeModal('userFlow')}>
                Close Diagram
              </button>
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
