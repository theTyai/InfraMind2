import os

filepath = r'd:\WorkSpace\InfraMind\client\src\components\workspace\ArchitectureTabs.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'return ('
end_marker = '{/* Modal: System Topology Diagram */}'

# find the exact start marker after useEffect
# It happens after '  }, [workspaceView])\n\n  return (\n    <div className={styles.controlDeckWrapper}>\n'
start_idx = content.find('  return (\n    <div className={styles.controlDeckWrapper}>\n      {/* 1. Project Ideation Header */}')
if start_idx == -1:
    # try another start index if the previous script modified it slightly
    start_idx = content.find('  return (\n    <div className={styles.controlDeckWrapper}>\n      {/* 1. Project Ideation Header */}')

end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Failed to find markers')
    print('start_idx:', start_idx, 'end_idx:', end_idx)
else:
    new_ui = '''  return (
    <div className={styles.controlDeckWrapper} style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      
      {/* 1. Project Ideation Header (Hidden/Condensed for Cockpit) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{data.projectTitle}</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{data.projectSummary}</p>
        </div>
        {headerActions}
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0 }}>
        
        {/* MAIN CONTENT PORTION */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '4px' }}>
          
          {/* TOP KPI ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Health */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <svg width="44" height="44" viewBox="0 0 44 44" style={{ overflow: 'visible' }}>
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border-subtle)" strokeWidth="3.5" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--success)" strokeWidth="3.5" strokeDasharray="113.1" strokeDashoffset={113.1 - (92 / 100) * 113.1} strokeLinecap="round" transform="rotate(-90 22 22)" />
              </svg>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Health Score</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>92 / 100</div>
              </div>
            </div>

            {/* Cost */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Monthly Cost</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>${totalCost.toLocaleString()}/mo</div>
            </div>

            {/* Reliability */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)' }}>
                <CheckCircle size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reliability SLA</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>99.95%</div>
              </div>
            </div>

            {/* Deploy */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deploy Frequency</div>
               <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>24 / week</div>
            </div>
          </div>

          {/* HERO CANVAS: Topology */}
          <div id="section-overview" style={{ 
            flex: 1, 
            minHeight: '400px', 
            borderRadius: '12px', 
            position: 'relative',
            backgroundColor: '#0a0a0a',
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}>
            <MermaidDiagram code={patchedData.mermaidDiagram} onSelectNode={handleSelectNodePerspective} />
            
            {/* Pro-Tool Toolbar Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              display: 'flex',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(4px)',
              padding: '6px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <button className={styles.deckActionBtn} style={{ padding: '4px', background: 'transparent' }} title="Zoom In"><Maximize2 size={16} /></button>
              <button className={styles.deckActionBtn} style={{ padding: '4px', background: 'transparent' }} title="Zoom Out"><Sliders size={16} /></button>
              <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />
              <button className={styles.deckActionBtn} style={{ padding: '4px', background: 'transparent' }} title="Fullscreen"><ExternalLink size={16} /></button>
            </div>
          </div>

          {/* MODULAR BOTTOM CARDS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* API Specs */}
            <div id="section-apis" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>API Specifications</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{routesToDisplay?.length || 0} Routes</p>
                </div>
                <button onClick={() => focusRefinement('API Specs')} className={styles.deckActionBtn} style={{ padding: '4px 8px', fontSize: '0.65rem' }}>Refine</button>
              </div>
              <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: '4px', padding: '8px', overflowY: 'auto', maxHeight: '150px' }}>
                {routesToDisplay?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {routesToDisplay.map((api, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                        <span className={`${styles.methodPillBadge} ${styles[api.method]}`} style={{ fontSize: '0.55rem', padding: '2px 4px' }}>{api.method}</span>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{api.route}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>No API routes.</div>
                )}
              </div>
            </div>

            {/* Database Schema */}
            <div id="section-database" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Database Schema</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{schemasToDisplay?.length || 0} Models</p>
                </div>
                <button onClick={() => focusRefinement('Database Schema')} className={styles.deckActionBtn} style={{ padding: '4px 8px', fontSize: '0.65rem' }}>Refine</button>
              </div>
              <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: '4px', padding: '8px', overflowY: 'auto', maxHeight: '150px' }}>
                {schemasToDisplay?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {schemasToDisplay.map((model, idx) => (
                      <div key={idx} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                        <strong>{model.collection}</strong> <span style={{ color: 'var(--text-muted)' }}>({model.fields?.length || 0})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>No schemas.</div>
                )}
              </div>
            </div>

            {/* Architecture Details */}
            <div id="section-components" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Architecture & Stack</h3>
                </div>
                <button onClick={() => focusRefinement('Stack Overview')} className={styles.deckActionBtn} style={{ padding: '4px 8px', fontSize: '0.65rem' }}>Refine</button>
              </div>
              <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: '4px', padding: '8px', overflowY: 'auto', maxHeight: '150px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                 Review cloud environment settings, component definitions, and stack alignment below.
                 <div style={{ marginTop: '8px' }}>
                   {data.stack?.slice(0, 3).map((s, idx) => <span key={idx} style={{ marginRight: '6px', padding: '2px 6px', background: 'var(--bg-surface)', borderRadius: '4px' }}>{s.layer}</span>)}
                 </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* PERSISTENT AI ASSISTANT RIGHT SIDEBAR */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', borderLeft: '1px solid rgba(255, 255, 255, 0.05)', paddingLeft: '20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>AI Assistant</h3>
            </div>
            {/* Collapsible Trigger (Mocked for now as we want to keep it persistent unless toggled via parent) */}
            <button className={styles.deckActionBtn} style={{ padding: '4px', background: 'transparent', border: 'none' }} title="Collapse AI Sidebar">
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Hi {user?.name?.split(' ')[0] || 'there'}, I analyzed your architecture and have some optimization suggestions.
            </div>

            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Suggestions</div>

            {data.efficiencyScorecard?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.efficiencyScorecard.map((score, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{score.suggestion}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{score.reason}</div>
                    <button 
                      onClick={() => {
                        const inputEl = document.querySelector('input[name="refinementInput"]');
                        if (inputEl) {
                          inputEl.value = `Apply this suggestion: ${score.suggestion} - ${score.reason}`;
                          inputEl.focus();
                        }
                      }}
                      style={{ 
                        alignSelf: 'flex-start', 
                        padding: '4px 12px', 
                        fontSize: '0.7rem', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        color: 'var(--text-primary)', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                      Apply Fix
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
                No proactive suggestions generated.
              </div>
            )}
          </div>
        </div>

      </div>

      {showExportModal && (
        <ExportStudioModal 
          data={data} 
          onClose={() => setShowExportModal(false)}
          onExportPdf={onExport}
        />
      )}
      '''

    new_content = content[:start_idx] + new_ui + content[end_idx:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully updated ArchitectureTabs.jsx')
