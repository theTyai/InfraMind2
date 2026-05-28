import os

filepath = r'd:\WorkSpace\InfraMind\client\src\components\workspace\ArchitectureTabs.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Add services view
services_view = """
  if (workspaceView === 'services') {
    return (
      <div className={styles.controlDeckWrapper}>
        <div className={styles.ideationHeader} style={{ marginBottom: '24px' }}>
          <div className={styles.ideationTitleRow}>
            <div>
              <div className={styles.ideationEyebrow}>SYSTEM TOPOLOGY CANVAS</div>
              <h1 className={styles.ideationTitle}>Services Architecture</h1>
            </div>
            {headerActions}
          </div>
          <p className={styles.ideationSummary}>Explore internal service boundaries and microservice data flow.</p>
        </div>
        <div className={styles.canvasEmbed} style={{ height: '600px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
          <MermaidDiagram
            code={patchedData.mermaidDiagram}
            onSelectNode={handleSelectNodePerspective}
          />
        </div>
      </div>
    )
  }

"""
for i, line in enumerate(lines):
    if "if (workspaceView === 'dataflows') {" in line:
        lines.insert(i, services_view)
        break

# Extract ops block by exact lines
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "{/* Operations & Audits Dashboard inside Deployment */}" in line:
        start_idx = i
    if start_idx != -1 and i > start_idx:
        # Looking for the `</div>` that closes the ops block
        # The line before it is `)}` from opsTab === 'badge'
        if "{opsTab === 'badge' && (" in line:
            # wait 18 lines down roughly for the end of badge
            for j in range(i, len(lines)):
                if "Share links must be enabled" in lines[j]:
                    # j+2 should be } )
                    # j+3 should be </div>
                    # j+4 should be } )
                    # j+5 should be </div> -> This is the closing of ops block
                    if "</div>" in lines[j+5] and "</div>" in lines[j+6]:
                        end_idx = j+5
                        break
            if end_idx != -1:
                break

if start_idx != -1 and end_idx != -1:
    ops_block_lines = lines[start_idx:end_idx+1]
    
    # Remove from original location
    del lines[start_idx:end_idx+1]
    
    # Replace Topology Canvas
    topo_start = -1
    topo_end = -1
    for i, line in enumerate(lines):
        if "{/* 3. Interactive Topology Canvas */}" in line:
            topo_start = i
        if topo_start != -1 and i > topo_start:
            if "{/* 4. Specifications Card Grid & Expanded View */}" in line:
                # the topology block ends before this line. We retreat past empty lines.
                topo_end = i - 1
                while lines[topo_end].strip() == "":
                    topo_end -= 1
                break
    
    if topo_start != -1 and topo_end != -1:
        executive_dashboard = ["      {/* 3. Executive Dashboard: Operations & Audits */}\n",
                               "      <div className={styles.canvasCard} style={{ marginBottom: '24px', padding: '24px', background: 'var(--bg-surface)' }}>\n",
                               "        <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>System Integrity & Operations</h4>\n"]
        executive_dashboard.extend(ops_block_lines)
        executive_dashboard.append("      </div>\n\n")
        
        del lines[topo_start:topo_end+1]
        
        for k, l in enumerate(executive_dashboard):
            lines.insert(topo_start + k, l)
        
        print("Successfully extracted and moved blocks safely.")
    else:
        print("Topology block not found.")
else:
    print(f"Ops block not found. start={start_idx} end={end_idx}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
