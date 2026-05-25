import { useState } from 'react'
import MermaidDiagram from '../MermaidDiagram.jsx'
import { 
  Send, Terminal, Network, Shield, Cpu, Activity, X, Database, Cloud, 
  TrendingUp, Maximize2, ExternalLink, Calendar, Layers, Sliders,
  FileDown, Share2, FolderDown
} from 'lucide-react'
import { getTechIconUrl } from '../../utils/techIcons.js'
import InspectorPanel from '../layout/InspectorPanel.jsx'
import styles from './Workspace.module.css'

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

  const openModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }))
    if (modalName === 'archDiagram') {
      localStorage.setItem('inframind_checklist_diagram', 'true')
    }
  }

  const closeModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }))
  }

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
                      {data.apis?.map((api, idx) => (
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
                  {data.dbSchema?.map((model, idx) => (
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

    </div>
  )
}
