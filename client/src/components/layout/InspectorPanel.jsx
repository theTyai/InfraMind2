import { useMemo, useState } from 'react'
import { X, ChevronDown, ChevronUp, Box, Database, Network, Shield, AlertTriangle, Sparkles } from 'lucide-react'
import styles from './InspectorPanel.module.css'

export default function InspectorPanel({ 
  state, 
  data, 
  exporting, 
  onExport, 
  onClose, 
  selectedNode, 
  onSelectNode,
  lastIdea,
  onSubmit
}) {
  const [copied, setCopied] = useState('')
  const [refinementText, setRefinementText] = useState('')
  const [accordions, setAccordions] = useState({
    status: true,
    stack: true,
    complexity: true,
    tradeoffs: true,
    actions: true
  })

  const toggleAccordion = (section) => {
    setAccordions(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleContextualSubmit = (e) => {
    e.preventDefault()
    if (!refinementText.trim() || !onSubmit) return
    const combinedIdea = `${lastIdea || ''} (Refinement: Optimize component [${selectedNode}]: ${refinementText.trim()})`
    onSubmit({ idea: combinedIdea, knownStack: [] })
    setRefinementText('')
  }

  const complexity = useMemo(() => {
    if (!data) return 'Pending'
    const score = (data.stack?.length || 0) + (data.apis?.length || 0) / 3 + (data.dbSchema?.length || 0) * 2
    if (score >= 16) return 'Enterprise'
    if (score >= 10) return 'Medium'
    return 'Simple'
  }, [data])

  const complexityPercent = useMemo(() => {
    if (complexity === 'Enterprise') return 100
    if (complexity === 'Medium') return 66
    if (complexity === 'Simple') return 34
    return 12
  }, [complexity])

  const techBadges = useMemo(() => {
    if (!data?.stack) return []
    return data.stack.map((item) => item.recommendation.split(/[,\/\s]+/)[0])
  }, [data])

  // Map selected node label to project architecture schemas/stack
  const nodeDetails = useMemo(() => {
    if (!selectedNode || !data) return null

    const nodeLabel = selectedNode.toLowerCase().trim()

    // 1. Try finding in stack recommendations or layers
    const stackItem = data.stack?.find(
      (item) =>
        item.layer.toLowerCase().includes(nodeLabel) ||
        nodeLabel.includes(item.layer.toLowerCase()) ||
        item.recommendation.toLowerCase().includes(nodeLabel) ||
        nodeLabel.includes(item.recommendation.toLowerCase())
    )
    if (stackItem) {
      return { type: 'stack', item: stackItem }
    }

    // 2. Try finding in DB schemas
    const dbItem = data.dbSchema?.find(
      (model) =>
        model.collection.toLowerCase().includes(nodeLabel) ||
        nodeLabel.includes(model.collection.toLowerCase())
    )
    if (dbItem) {
      return { type: 'db', item: dbItem }
    }

    // 3. Try finding in API layers
    if (
      nodeLabel.includes('api') || 
      nodeLabel.includes('backend') || 
      nodeLabel.includes('server') || 
      nodeLabel.includes('gateway') ||
      nodeLabel.includes('route')
    ) {
      return { type: 'api', items: data.apis || [] }
    }

    return { type: 'general', label: selectedNode }
  }, [selectedNode, data])

  async function handleCopy() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.projectTitle)
      setCopied('title')
      window.setTimeout(() => setCopied(''), 1400)
    } catch {
      setCopied('')
    }
  }

  const nodeTypeLabel = useMemo(() => {
    if (!nodeDetails) return ''
    if (nodeDetails.type === 'stack') return 'Stack Layer'
    if (nodeDetails.type === 'db') return 'Database Schema'
    if (nodeDetails.type === 'api') return 'API Specifications'
    return 'System Component'
  }, [nodeDetails])

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{selectedNode ? selectedNode : 'Architecture Inspector'}</p>
          <p className={styles.subtitle}>
            {selectedNode ? nodeTypeLabel : (data ? data.projectTitle : 'Metadata & Node specs')}
          </p>
        </div>
        {selectedNode ? (
          <button 
            type="button" 
            className={styles.closePanelBtn} 
            onClick={() => onSelectNode(null)} 
            title="Clear Selection"
          >
            <X size={16} />
          </button>
        ) : (
          onClose && (
            <button 
              type="button" 
              className={styles.closePanelBtn} 
              onClick={onClose} 
              title="Collapse Inspector"
            >
              <X size={16} />
            </button>
          )
        )}
      </div>

      {/* Dynamic Selected Node Details */}
      {selectedNode && nodeDetails && (
        <div className={styles.nodeInspectorWrapper}>
          <div className={styles.nodeInspectorContent}>
            {nodeDetails.type === 'stack' && (
              <div className={styles.inspectCard}>
                <div className={styles.inspectLayerLabel}>{nodeDetails.item.layer}</div>
                <div className={styles.inspectTechVal}>{nodeDetails.item.recommendation}</div>
                
                <div className={styles.fitRow}>
                  <span>Recommendation Fit:</span>
                  <span className={`${styles.fitBadge} ${styles[nodeDetails.item.fit]}`}>
                    {nodeDetails.item.fit}
                  </span>
                </div>

                <div className={styles.inspectDescGroup}>
                  <div className={styles.inspectDescTitle}>RATIONALE:</div>
                  <p className={styles.inspectDescText}>{nodeDetails.item.reason}</p>
                </div>

                {nodeDetails.item.alternatives?.length > 0 && (
                  <div className={styles.inspectDescGroup}>
                    <div className={styles.inspectDescTitle}>ALTERNATIVES CONSIDERED:</div>
                    <div className={styles.inspectAltBadges}>
                      {nodeDetails.item.alternatives.map((alt) => (
                        <span key={alt} className={styles.altBadge}>{alt}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {nodeDetails.type === 'db' && (
              <div className={styles.inspectCard}>
                <div className={styles.inspectLayerLabel}>DATABASE LAYER</div>
                <div className={styles.inspectTechVal}>{nodeDetails.item.collection} Schema</div>
                <div className={styles.inspectDescGroup}>
                  <div className={styles.inspectDescTitle}>FIELDS DECLARATION:</div>
                  <div className={styles.schemaTableWrap}>
                    <table className={styles.schemaMiniTable}>
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nodeDetails.item.fields?.map((field) => (
                          <tr key={field.name}>
                            <td className={styles.fieldCol}><code>{field.name}</code></td>
                            <td className={styles.typeCol}>{field.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {nodeDetails.type === 'api' && (
              <div className={styles.inspectCard}>
                <div className={styles.inspectLayerLabel}>NETWORK INTERFACE</div>
                <div className={styles.inspectTechVal}>REST API specs</div>
                <div className={styles.inspectDescGroup}>
                  <div className={styles.inspectDescTitle}>CORE ROUTES (TOP 4):</div>
                  <div className={styles.apiMiniList}>
                    {nodeDetails.items.slice(0, 4).map((route, i) => (
                      <div key={i} className={styles.apiMiniItem}>
                        <span className={`${styles.methodBadge} ${styles[route.method]}`}>
                          {route.method}
                        </span>
                        <code className={styles.routeCode}>{route.route}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {nodeDetails.type === 'general' && (
              <div className={styles.inspectCard}>
                <div className={styles.inspectLayerLabel}>SYSTEM COMPONENT</div>
                <div className={styles.inspectTechVal}>{nodeDetails.label}</div>
                <div className={styles.inspectDescGroup}>
                  <p className={styles.inspectDescText}>
                    Representational node in your architecture map. Updates to this node will compile config details.
                  </p>
                </div>
              </div>
            )}

            {/* Contextual AI Optimizer */}
            {onSubmit && (
              <div className={styles.contextualAiBlock}>
                <div className={styles.contextualAiHeader}>
                  <Sparkles size={13} className={styles.sparklesIcon} />
                  <span>Contextual AI Optimizer</span>
                </div>
                <form onSubmit={handleContextualSubmit} className={styles.contextualAiForm}>
                  <input
                    type="text"
                    placeholder={`How should we optimize ${selectedNode}?`}
                    value={refinementText}
                    onChange={(e) => setRefinementText(e.target.value)}
                    className={styles.contextualInput}
                  />
                  <button 
                    type="submit" 
                    className={styles.contextualSubmitBtn}
                    disabled={!refinementText.trim() || state === 'loading'}
                  >
                    Optimize
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedNode && (
        <>
          {/* Accordion 1: Status */}
          <div className={styles.accordionSection}>
            <button type="button" className={styles.accordionHeader} onClick={() => toggleAccordion('status')}>
              <span className={styles.sectionTitle}>Status</span>
              {accordions.status ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {accordions.status && (
              <div className={styles.accordionContent}>
                <div className={`${styles.statusBadge} ${styles[state]}`}>
                  {state === 'result' ? '✓ Generated' : state === 'loading' ? '⏳ Generating' : '◦ Ready'}
                </div>
              </div>
            )}
          </div>

          {/* Accordion 2: Tech Stack Tags */}
          <div className={styles.accordionSection}>
            <button type="button" className={styles.accordionHeader} onClick={() => toggleAccordion('stack')}>
              <span className={styles.sectionTitle}>Tech Stack Tags</span>
              {accordions.stack ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {accordions.stack && (
              <div className={styles.accordionContent}>
                <div className={styles.badgeCloud}>
                  {techBadges.length > 0 ? (
                    techBadges.map((badge, idx) => (
                      <span key={idx} className={styles.techTagPill}>{badge}</span>
                    ))
                  ) : (
                    <p className={styles.text}>Stack tags will appear here after generation.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Accordion 3: Complexity Score */}
          <div className={styles.accordionSection}>
            <button type="button" className={styles.accordionHeader} onClick={() => toggleAccordion('complexity')}>
              <span className={styles.sectionTitle}>Complexity profile</span>
              {accordions.complexity ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {accordions.complexity && (
              <div className={styles.accordionContent}>
                <div className={styles.scoreCard}>
                  <div className={styles.scoreDetails}>
                    <strong>{complexity}</strong>
                    <span className={styles.scorePercentLabel}>{complexityPercent}%</span>
                  </div>
                  <div className={styles.meterTrack}>
                    <div 
                      className={`${styles.meterFill} ${styles[complexity.toLowerCase()]}`} 
                      style={{ width: `${complexityPercent}%` }} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Accordion 4: Tradeoffs */}
          {data?.architectureExplanation?.tradeoffs && (
            <div className={styles.accordionSection}>
              <button type="button" className={styles.accordionHeader} onClick={() => toggleAccordion('tradeoffs')}>
                <span className={styles.sectionTitle}>AI Tradeoffs</span>
                {accordions.tradeoffs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {accordions.tradeoffs && (
                <div className={styles.accordionContent}>
                  <div className={styles.tradeoffList}>
                    {data.architectureExplanation.tradeoffs.map((item, idx) => (
                      <div key={idx} className={styles.tradeoffItem}>
                        <AlertTriangle size={14} className={styles.tradeoffIcon} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accordion 5: Actions */}
          <div className={styles.accordionSection}>
            <button type="button" className={styles.accordionHeader} onClick={() => toggleAccordion('actions')}>
              <span className={styles.sectionTitle}>Quick Actions</span>
              {accordions.actions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {accordions.actions && (
              <div className={styles.accordionContent}>
                <div className={styles.actionsBox}>
                  <button 
                    className={styles.actionBtn} 
                    type="button" 
                    onClick={handleCopy} 
                    disabled={!data}
                  >
                    {copied === 'title' ? 'Copied' : 'Copy title'}
                  </button>
                  <button 
                    className={styles.actionBtn} 
                    type="button" 
                    onClick={onExport} 
                    disabled={!data || exporting}
                  >
                    {exporting ? 'Exporting…' : 'Export PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
