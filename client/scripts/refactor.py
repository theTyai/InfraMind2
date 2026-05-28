import os

filepath = r'd:\WorkSpace\InfraMind\client\src\components\workspace\ArchitectureTabs.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'return ('
end_marker = '{/* Modal: System Topology Diagram */}'

# find the exact start marker after useEffect
# It happens after '  }, [workspaceView])\n\n  return (\n    <div className={styles.controlDeckWrapper}>\n'
start_idx = content.find('  return (\n    <div className={styles.controlDeckWrapper}>\n      {/* 1. Project Ideation Header */}')
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Failed to find markers')
    print('start_idx:', start_idx, 'end_idx:', end_idx)
else:
    new_ui = '''  return (
    <div className={styles.controlDeckWrapper}>
      {/* 1. Project Ideation Header */}
      <div className={styles.ideationHeader}>
        <div className={styles.ideationTitleRow}>
          <div>
            <div className={styles.ideationEyebrow}>AI ARCHITECT CONTROL DECK</div>
            <h1 className={styles.ideationTitle}>{data.projectTitle}</h1>
          </div>
          {headerActions}
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

      {/* DASHBOARD GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '24px', paddingBottom: '40px' }}>
        
        {/* CENTER COLUMN: System Topology */}
        <div id="section-overview" style={{ gridColumn: '1 / -1', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>System Topology</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>💡 Scroll to zoom · Drag to pan</p>
            </div>
            <button onClick={() => focusRefinement('System Topology')} className={styles.deckActionBtn} style={{ padding: '6px 12px', fontSize: '0.7rem' }}>Refine</button>
          </div>
          <div style={{ height: '400px', background: 'var(--bg-base)', borderRadius: '8px' }}>
            <MermaidDiagram code={patchedData.mermaidDiagram} onSelectNode={handleSelectNodePerspective} />
          </div>
        </div>

        {/* PROACTIVE AI SUGGESTIONS SIDEBAR */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={16} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>AI Efficiency Scorecard</h3>
          </div>
          {data.efficiencyScorecard?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              {data.efficiencyScorecard.map((score, idx) => (
                <div key={idx} style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{score.suggestion}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{score.reason}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '6px', textAlign: 'center' }}>
              No proactive suggestions generated for this architecture.
            </div>
          )}
        </div>

        {/* LIVE CARDS */}

        {/* API Specs */}
        <div id="section-apis" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>API Specifications</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interface Endpoints</p>
            </div>
            <button onClick={() => focusRefinement('API Specs')} className={styles.deckActionBtn} style={{ padding: '6px 12px', fontSize: '0.7rem' }}>Refine</button>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: '6px', padding: '12px', overflowY: 'auto', maxHeight: '200px' }}>
            {routesToDisplay?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {routesToDisplay.map((api, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                    <span className={`${styles.methodPillBadge} ${styles[api.method]}`} style={{ fontSize: '0.6rem', padding: '2px 4px' }}>{api.method}</span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{api.route}</span>
                  </div>
                ))}
              </div>
            ) : (
               <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No API routes defined. Click refine to add.</div>
            )}
          </div>
        </div>

        {/* Database Schema */}
        <div id="section-database" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Database Schema</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Data Models</p>
            </div>
            <button onClick={() => focusRefinement('Database Schema')} className={styles.deckActionBtn} style={{ padding: '6px 12px', fontSize: '0.7rem' }}>Refine</button>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: '6px', padding: '12px', overflowY: 'auto', maxHeight: '200px' }}>
            {schemasToDisplay?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {schemasToDisplay.map((model, idx) => (
                  <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                    <strong>{model.collection}</strong>
                    <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>{model.fields?.length || 0} fields</div>
                  </div>
                ))}
              </div>
            ) : (
               <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No schemas defined. Click refine to add.</div>
            )}
          </div>
        </div>

        {/* Cost Estimator */}
        <div id="section-architecture" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Stack Architecture & Cost Planner</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configure options for each backend, database, and caching layer to calculate monthly charges.</p>
            </div>
            <button onClick={() => focusRefinement('Stack Architecture')} className={styles.deckActionBtn} style={{ padding: '6px 12px', fontSize: '0.7rem' }}>Refine</button>
          </div>
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

        {/* Data Flows */}
        <div id="section-dataflows" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>User Flow Diagram</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trace the user interaction lifecycle as it traverses your cloud architecture topology.</p>
            </div>
            <button onClick={() => focusRefinement('User Flow')} className={styles.deckActionBtn} style={{ padding: '6px 12px', fontSize: '0.7rem' }}>Refine</button>
          </div>
          <AnimatedDataflow 
            data={patchedData}
            detectedStack={detectedStack}
            customCosts={customCosts}
            enabledServices={enabledServices}
            viabilityMetrics={viabilityMetrics}
          />
        </div>

        {/* Components */}
        <div id="section-components" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Component Explorer</h3>
            <button onClick={() => focusRefinement('Components')} className={styles.deckActionBtn} style={{ padding: '6px 12px', fontSize: '0.7rem' }}>Refine</button>
          </div>
          <ComponentsView data={patchedData} onSelectNode={onSelectNode} />
        </div>
        
        {/* Collaborators */}
        <div id="section-collaborators" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Team & Collaboration</h3>
          </div>
          <CollaboratorsInvite />
        </div>

      </div>

      '''

    new_content = content[:start_idx] + new_ui + content[end_idx:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully updated ArchitectureTabs.jsx')
