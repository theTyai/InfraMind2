import { useMemo, useRef, useState } from 'react'
import MermaidDiagram from './MermaidDiagram.jsx'
import styles from './ResultView.module.css'

const FIT_META = {
  high: { label: 'Best fit', cls: 'fitHigh' },
  medium: { label: 'Good fit', cls: 'fitMed' },
  low: { label: 'Alternative', cls: 'fitLow' },
}

const METHOD_CLS = {
  GET: 'methodGet',
  POST: 'methodPost',
  PUT: 'methodPut',
  PATCH: 'methodPatch',
  DELETE: 'methodDelete',
}

const SCALE_ICON_LABELS = {
  Lightning: 'LT',
  Scale: 'SC',
  Database: 'DB',
  Queue: 'Q',
  Metrics: 'MT',
}

const WORKSPACE_TABS = [
  { id: 'stack', label: 'Stack' },
  { id: 'system', label: 'System Design' },
  { id: 'apis', label: 'APIs' },
  { id: 'database', label: 'Database' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'scaling', label: 'Scaling' },
  { id: 'roadmap', label: 'Roadmap' },
]

function Card({ children, className = '' }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>
}

export default function ResultView({ data, idea, onReset, onExport, exporting, history = [] }) {
  const [activeTab, setActiveTab] = useState('stack')
  const [copied, setCopied] = useState('')
  const resultRef = useRef(null)

  const complexity = useMemo(() => {
    const score = (data.stack?.length || 0) + (data.apis?.length || 0) / 3 + (data.dbSchema?.length || 0) * 2
    if (score >= 16) return 'High'
    if (score >= 10) return 'Medium'
    return 'Low'
  }, [data])

  const stackFingerprint = useMemo(
    () => (data.stack || []).map((item) => item.recommendation).slice(0, 4).join(' / '),
    [data],
  )

  async function handleCopy(label, value) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(''), 1400)
    } catch {
      setCopied('')
    }
  }

  return (
    <div className={styles.page} ref={resultRef} id="results">
      <div className={styles.workspaceShell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBlock}>
            <div className={styles.sidebarTitle}>Workspace</div>
            <button className={styles.resetButton} onClick={onReset}>New architecture</button>
          </div>

          <div className={styles.sidebarBlock}>
            <div className={styles.sidebarTitle}>Views</div>
            <div className={styles.navList}>
              {WORKSPACE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sidebarBlock}>
            <div className={styles.sidebarTitle}>Recent generations</div>
            <div className={styles.historyList}>
              {history.length === 0 ? (
                <div className={styles.emptyHistory}>Generated architectures will show up here.</div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className={styles.historyItem}>
                    <div className={styles.historyName}>{item.title}</div>
                    <div className={styles.historyMeta}>{item.metrics.layers} layers / {item.metrics.apis} APIs</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className={styles.mainPane}>
          <div className={styles.hero}>
            <div className={styles.heroTop}>
              <div className={styles.projectMeta}>
                <span className={styles.kicker}>Architecture workspace</span>
                <h1 className={styles.projectTitle}>{data.projectTitle}</h1>
                <p className={styles.projectIdea}>{idea}</p>
              </div>

              <div className={styles.heroActions}>
                <button className={styles.secondaryButton} onClick={() => handleCopy('summary', data.projectSummary)}>
                  {copied === 'summary' ? 'Summary copied' : 'Copy summary'}
                </button>
                <button className={styles.primaryButton} onClick={onExport} disabled={exporting} id="pdf-export">
                  {exporting ? 'Exporting PDF...' : 'Export PDF'}
                </button>
              </div>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.statCard}><strong>{data.stack?.length || 0}</strong><span>Layers</span></div>
              <div className={styles.statCard}><strong>{data.apis?.length || 0}</strong><span>API routes</span></div>
              <div className={styles.statCard}><strong>{data.dbSchema?.length || 0}</strong><span>Data models</span></div>
              <div className={styles.statCard}><strong>{data.mvpRoadmap?.length || 0}</strong><span>MVP phases</span></div>
            </div>
          </div>

          <div className={styles.tabBar}>
            {WORKSPACE_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.sectionStack}>
            {activeTab === 'stack' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Recommended stack</h2>
                    <p className={styles.sectionCopy}>Core implementation layers with fit and fallback options.</p>
                  </div>
                </div>
                <div className={styles.stackGrid}>
                  {(data.stack || []).map((item, index) => {
                    const fit = FIT_META[item.fit] || FIT_META.medium
                    return (
                      <Card key={index} className={styles.stackCard}>
                        <div className={styles.stackTop}>
                          <span className={styles.stackLayer}>{item.layer}</span>
                          <span className={`${styles.fitBadge} ${styles[fit.cls]}`}>{fit.label}</span>
                        </div>
                        <div className={styles.stackTech}>{item.recommendation}</div>
                        <div className={styles.stackReason}>{item.reason}</div>
                        {item.alternatives?.length > 0 && (
                          <div className={styles.stackAlts}>
                            {item.alternatives.map((alt) => (
                              <span key={alt} className={styles.altChip}>{alt}</span>
                            ))}
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </section>
            )}

            {activeTab === 'system' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>System design</h2>
                    <p className={styles.sectionCopy}>Switch between infrastructure topology and user interaction flow.</p>
                  </div>
                  <div className={styles.diagramToggle}>
                    <button
                      className={`${styles.segmentButton} ${styles.segmentButtonActive}`}
                      onClick={() => handleCopy('diagram', data.mermaidDiagram)}
                    >
                      {copied === 'diagram' ? 'Diagram copied' : 'Copy diagram code'}
                    </button>
                  </div>
                </div>
                <div className={styles.diagramGrid}>
                  <MermaidDiagram code={data.mermaidDiagram} title="System architecture" />
                  <MermaidDiagram code={data.userFlowDiagram} title="User flow" />
                </div>
              </section>
            )}

            {activeTab === 'apis' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>API surface</h2>
                    <p className={styles.sectionCopy}>A first-pass route inventory for the product boundary.</p>
                  </div>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => handleCopy('api', JSON.stringify(data.apis, null, 2))}
                  >
                    {copied === 'api' ? 'API JSON copied' : 'Copy API JSON'}
                  </button>
                </div>
                <Card>
                  <div className={styles.tableWrap}>
                    <table className={styles.apiTable}>
                      <thead>
                        <tr>
                          <th>Method</th>
                          <th>Route</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.apis || []).map((api, index) => (
                          <tr key={index}>
                            <td><span className={`${styles.method} ${styles[METHOD_CLS[api.method] || 'methodGet']}`}>{api.method}</span></td>
                            <td><code className={styles.route}>{api.route}</code></td>
                            <td className={styles.apiDesc}>{api.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            )}

            {activeTab === 'database' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Database schema</h2>
                    <p className={styles.sectionCopy}>Primary models and the fields likely needed for a first production cut.</p>
                  </div>
                </div>
                <div className={styles.schemaGrid}>
                  {(data.dbSchema || []).map((collection, index) => (
                    <Card key={index} className={styles.schemaCard}>
                      <div className={styles.collHeader}>
                        <span className={styles.collName}>{collection.collection}</span>
                      </div>
                      <table className={styles.schemaTable}>
                        <thead>
                          <tr>
                            <th>Field</th>
                            <th>Type</th>
                            <th>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(collection.fields || []).map((field, fieldIndex) => (
                            <tr key={fieldIndex}>
                              <td><code className={styles.fieldName}>{field.name}</code></td>
                              <td><span className={styles.fieldType}>{field.type}</span></td>
                              <td className={styles.fieldNote}>{field.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'deployment' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Deployment strategy</h2>
                    <p className={styles.sectionCopy}>Environment-by-environment rollout path from local setup to production.</p>
                  </div>
                </div>
                <Card>
                  {Object.entries(data.deploymentStrategy || {}).map(([env, detail]) => (
                    <div key={env} className={styles.deployRow}>
                      <span className={`${styles.envBadge} ${styles[`env_${env}`]}`}>{env}</span>
                      <span className={styles.deployDetail}>{detail}</span>
                    </div>
                  ))}
                </Card>
              </section>
            )}

            {activeTab === 'scaling' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Scaling notes</h2>
                    <p className={styles.sectionCopy}>Risk-aware guidance for caching, queues, observability, and horizontal growth.</p>
                  </div>
                </div>
                <div className={styles.scaleGrid}>
                  {(data.scalability || []).map((item, index) => (
                    <Card key={index} className={styles.scaleCard}>
                      <span className={styles.scaleIcon}>{SCALE_ICON_LABELS[item.icon] || item.area.slice(0, 2).toUpperCase()}</span>
                      <div className={styles.scaleArea}>{item.area}</div>
                      <div className={styles.scaleDetail}>{item.detail}</div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'roadmap' && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Roadmap and reasoning</h2>
                    <p className={styles.sectionCopy}>Build order, key decisions, and tradeoffs in one planning surface.</p>
                  </div>
                </div>
                <div className={styles.archGrid}>
                  <Card className={styles.archCard}>
                    <div className={styles.archLabel}>Why this stack</div>
                    <p className={styles.archText}>{data.architectureExplanation?.whyThisStack}</p>
                  </Card>
                  <Card className={styles.archCard}>
                    <div className={styles.archLabel}>Key decisions</div>
                    <ul className={styles.archList}>
                      {(data.architectureExplanation?.keyDecisions || []).map((decision, index) => (
                        <li key={index} className={styles.archItem}>{decision}</li>
                      ))}
                    </ul>
                  </Card>
                  <Card className={styles.archCard}>
                    <div className={styles.archLabel}>Tradeoffs</div>
                    <ul className={styles.archList}>
                      {(data.architectureExplanation?.tradeoffs || []).map((tradeoff, index) => (
                        <li key={index} className={styles.archItem}>{tradeoff}</li>
                      ))}
                    </ul>
                  </Card>
                </div>
                <div className={styles.roadmap}>
                  {(data.mvpRoadmap || []).map((phase, index) => (
                    <div key={index} className={styles.phase}>
                      <div className={styles.phaseHead}>
                        <span className={styles.phaseNum}>{index + 1}</span>
                        <div>
                          <div className={styles.phaseTitle}>{phase.phase}</div>
                          <div className={styles.phaseDuration}>{phase.duration}</div>
                        </div>
                      </div>
                      <ul className={styles.phaseTasks}>
                        {(phase.tasks || []).map((task, taskIndex) => (
                          <li key={taskIndex} className={styles.phaseTask}>{task}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>

        <aside className={styles.inspector}>
          <div className={styles.inspectorBlock}>
            <div className={styles.inspectorTitle}>Project summary</div>
            <p className={styles.inspectorText}>{data.projectSummary}</p>
          </div>

          <div className={styles.inspectorBlock}>
            <div className={styles.inspectorTitle}>AI reasoning</div>
            <ul className={styles.inspectorList}>
              {(data.architectureExplanation?.keyDecisions || []).slice(0, 3).map((decision, index) => (
                <li key={index}>{decision}</li>
              ))}
            </ul>
          </div>

          <div className={styles.inspectorBlock}>
            <div className={styles.inspectorTitle}>Engineering signals</div>
            <div className={styles.inspectorMetrics}>
              <div><span>Complexity</span><strong>{complexity}</strong></div>
              <div><span>Primary stack</span><strong>{stackFingerprint || 'Pending'}</strong></div>
              <div><span>Scalability areas</span><strong>{data.scalability?.length || 0}</strong></div>
            </div>
          </div>

          <div className={styles.inspectorBlock}>
            <div className={styles.inspectorTitle}>Quick actions</div>
            <div className={styles.actionList}>
              <button className={styles.secondaryButton} onClick={() => handleCopy('project', `${data.projectTitle}\n\n${idea}`)}>
                {copied === 'project' ? 'Project copied' : 'Copy project brief'}
              </button>
              <button className={styles.secondaryButton} onClick={() => handleCopy('roadmap', JSON.stringify(data.mvpRoadmap, null, 2))}>
                {copied === 'roadmap' ? 'Roadmap copied' : 'Copy roadmap JSON'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
