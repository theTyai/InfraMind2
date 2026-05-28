import os

filepath = r'd:\WorkSpace\InfraMind\client\src\components\workspace\ArchitectureTabs.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Add `workspaceView === 'services'` before `workspaceView === 'dataflows'`
for i, line in enumerate(lines):
    if "if (workspaceView === 'dataflows') {" in line:
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
        lines.insert(i, services_view)
        break

# 2. Extract Operations block
ops_start_idx = -1
ops_end_idx = -1
for i, line in enumerate(lines):
    if "{/* Operations & Audits Dashboard inside Deployment */}" in line:
        ops_start_idx = i
    # We look for the closing of opsTab === 'badge'
    if ops_start_idx != -1 and i > ops_start_idx and "{opsTab === 'badge' && (" in line:
        # The badge section ends about 18 lines down
        # We'll just look for the `</div>` that aligns with the start
        pass

# Actually, let's find it explicitly:
for i in range(len(lines)):
    if "{/* Operations & Audits Dashboard inside Deployment */}" in lines[i]:
        ops_start_idx = i
        break

if ops_start_idx != -1:
    for i in range(ops_start_idx, len(lines)):
        if "{opsTab === 'badge' && (" in lines[i]:
            # Now find the ending of badge
            for j in range(i, len(lines)):
                if ")}`" in lines[j] or ")} " in lines[j] or (")}" in lines[j] and "</div>" in lines[j-1]):
                    # Check next line for the closing div of the ops block
                    if "</div>" in lines[j+1]:
                        ops_end_idx = j + 1
                        break
            if ops_end_idx != -1:
                break

if ops_start_idx != -1 and ops_end_idx != -1:
    ops_block = "".join(lines[ops_start_idx:ops_end_idx+1])
    
    # Remove from original location
    del lines[ops_start_idx:ops_end_idx+1]
    
    # 3. Find the topology canvas and replace it
    topo_start_idx = -1
    topo_end_idx = -1
    for i, line in enumerate(lines):
        if "{/* 3. Interactive Topology Canvas */}" in line:
            topo_start_idx = i
            break
            
    if topo_start_idx != -1:
        for i in range(topo_start_idx, len(lines)):
            if "      </div>" in lines[i] and "</div>" in lines[i+1] and "{/* 4. Specifications Card Grid & Expanded View */}" in lines[i+3]:
                topo_end_idx = i+1
                break
                
        if topo_end_idx == -1:
            for i in range(topo_start_idx, len(lines)):
                if "{/* 4. Specifications Card Grid & Expanded View */}" in lines[i]:
                    topo_end_idx = i - 1
                    # adjust backwards to ignore empty lines
                    while lines[topo_end_idx].strip() == "":
                        topo_end_idx -= 1
                    break

        if topo_end_idx != -1:
            # Replace topology canvas with ops block
            ops_card = """      {/* 3. Executive Dashboard: Operations & Audits */}
      <div className={styles.canvasCard} style={{ marginBottom: '24px', padding: '20px' }}>
        <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>System Integrity & Operations</h4>
""" + ops_block + """      </div>
"""
            del lines[topo_start_idx:topo_end_idx+1]
            lines.insert(topo_start_idx, ops_card)
            print("Successfully extracted ops block and replaced topology canvas.")
        else:
            print("Failed to find topology canvas end.")
    else:
        print("Failed to find topology canvas start.")
else:
    print(f"Failed to find ops block start or end. Start: {ops_start_idx}, End: {ops_end_idx}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
