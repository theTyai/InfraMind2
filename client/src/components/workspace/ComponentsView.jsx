// ComponentsView.jsx — Functional Components page with detail drawer
import { useState, useMemo } from 'react'
import { X, ChevronRight } from 'lucide-react'
import styles from './Workspace.module.css'

// Removed hardcoded COMPONENTS_DATA

// DetailDrawer with Interactive Mock Configuration
function DetailDrawer({ component, onClose }) {
  const [config, setConfig] = useState({
    instanceSize: 't3.medium',
    region: 'us-east-1',
    autoScaling: true,
    multiAz: false
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 800);
  };

  if (!component) return null

  const SelectableCard = ({ selected, onClick, title, subtitle }) => (
    <div 
      onClick={onClick}
      style={{
        padding: '12px',
        borderRadius: '8px',
        border: `1px solid ${selected ? 'var(--primary)' : 'var(--border-subtle)'}`,
        background: selected ? 'var(--primary-soft)' : 'var(--bg-canvas)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}
    >
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: selected ? 'var(--primary)' : 'var(--text-primary)' }}>
        {title}
      </div>
      {subtitle && <div style={{ fontSize: '0.7rem', color: selected ? 'var(--primary)' : 'var(--text-muted)', opacity: 0.8 }}>{subtitle}</div>}
    </div>
  )

  const ToggleSwitch = ({ checked, onChange, color = 'var(--primary)' }) => (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: '36px',
        height: '20px',
        background: checked ? color : 'var(--bg-canvas)',
        border: `1px solid ${checked ? color : 'var(--border-subtle)'}`,
        borderRadius: '20px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{
        width: '14px',
        height: '14px',
        background: '#fff',
        borderRadius: '50%',
        position: 'absolute',
        top: '2px',
        left: checked ? '18px' : '2px',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  )

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9000,
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'flex-end'
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      />
      {/* Drawer panel */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: 'min(400px, 100%)',
        background: 'var(--bg-surface)',
        borderLeft: `3px solid ${component.borderLeft}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
      }}>
        {/* Drawer Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: component.categoryColor, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '4px' }}>{component.category}</div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{component.detail.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.target.style.color = 'var(--text-primary)'; e.target.style.borderColor = '#4f8ef7' }}
            onMouseLeave={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.borderColor = 'var(--border-subtle)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Drawer Content - Interactive Forms */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1: Overview */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Overview</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {component.description}
            </div>
          </div>

          {/* Section 2: Infrastructure Configuration */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Deployment Configuration</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Region Select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>Primary Region</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <SelectableCard 
                    title="US East" subtitle="N. Virginia" 
                    selected={config.region === 'us-east-1'} 
                    onClick={() => setConfig({...config, region: 'us-east-1'})} 
                  />
                  <SelectableCard 
                    title="US West" subtitle="Oregon" 
                    selected={config.region === 'us-west-2'} 
                    onClick={() => setConfig({...config, region: 'us-west-2'})} 
                  />
                  <SelectableCard 
                    title="EU Central" subtitle="Frankfurt" 
                    selected={config.region === 'eu-central-1'} 
                    onClick={() => setConfig({...config, region: 'eu-central-1'})} 
                  />
                  <SelectableCard 
                    title="Global" subtitle="Edge Network" 
                    selected={config.region === 'global'} 
                    onClick={() => setConfig({...config, region: 'global'})} 
                  />
                </div>
              </div>

              {/* Instance Size */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>Compute Size</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  <SelectableCard 
                    title="Shared Core / Micro" subtitle="Free Tier • Perfect for MVPs" 
                    selected={config.instanceSize === 't3.micro'} 
                    onClick={() => setConfig({...config, instanceSize: 't3.micro'})} 
                  />
                  <SelectableCard 
                    title="Standard Compute / Medium" subtitle="Balanced performance for early startups" 
                    selected={config.instanceSize === 't3.medium'} 
                    onClick={() => setConfig({...config, instanceSize: 't3.medium'})} 
                  />
                  <SelectableCard 
                    title="Serverless" subtitle="Pay-per-request • Auto-scaling" 
                    selected={config.instanceSize === 'serverless'} 
                    onClick={() => setConfig({...config, instanceSize: 'serverless'})} 
                  />
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>Auto-scaling</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Dynamically scale resources under load</div>
                </div>
                <ToggleSwitch 
                  checked={config.autoScaling} 
                  onChange={v => setConfig({...config, autoScaling: v})}
                  color={component.categoryColor}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>High Availability</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Multi-AZ replication across zones</div>
                </div>
                <ToggleSwitch 
                  checked={config.multiAz} 
                  onChange={v => setConfig({...config, multiAz: v})}
                  color={component.categoryColor}
                />
              </div>

            </div>
          </div>

        </div>

        {/* Drawer Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-canvas)', display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              flex: 2,
              padding: '12px',
              background: component.borderLeft,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: isSaving ? 0.7 : 0.9,
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={e => { if (!isSaving) e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { if (!isSaving) e.currentTarget.style.opacity = '0.9' }}
            disabled={isSaving}
          >
            {isSaving ? 'Applying Config...' : 'Apply Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ComponentsView({ data, onSelectNode }) {
  const [activeDrawer, setActiveDrawer] = useState(null)
  const [flushing, setFlushing] = useState(false)

  const components = useMemo(() => {
    if (!data?.stack) return [];
    
    const colors = ['#4f8ef7', '#34d399', '#fbbf24', '#818cf8', '#22d3ee', '#f43f5e'];
    
    return data.stack.map((item, index) => {
      const color = colors[index % colors.length];
      return {
        id: `comp-${index}`,
        category: item.layer || 'Service',
        categoryColor: color,
        borderLeft: color,
        statusLabel: 'Active',
        statusColor: '#34d399',
        title: item.recommendation || 'Component',
        description: item.reasoning || 'Core architecture service',
        specs: [
          { label: 'Layer', value: item.layer },
          { label: 'Type', value: 'Managed Service' },
          { label: 'Status', value: 'Provisioned' },
        ],
        btnLabel: `Configure ${item.recommendation}`,
        detail: {
          title: `${item.recommendation} Configuration`,
          sections: [
            { heading: 'Overview', items: [`Layer: ${item.layer}`, `Reasoning: ${item.reasoning}`] },
            { heading: 'Deployment Specs', items: ['Environment: Production', 'Scale: Auto-scaling enabled', 'Region: Global Edge / Primary'] },
            { heading: 'Integration', items: ['Status: Connected', 'Health checks: Passing', 'Network: VPC Peered'] },
          ]
        }
      };
    });
  }, [data]);

  const handleBtn = (comp) => {
    if (comp.id === 'redis') {
      setFlushing(true)
      setTimeout(() => setFlushing(false), 1800)
      return
    }
    if (onSelectNode && (comp.id === 'auth' || comp.id === 'gateway')) {
      // Also open the inspector panel for these nodes
    }
    setActiveDrawer(comp)
  }

  return (
    <>
      {/* Wrapper with mobile safety */}
      <div style={{ width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>PROJECT COMPONENTS</div>
        <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(1.1rem, 5vw, 1.4rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Core Architecture Services</h1>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Live status and configuration for each deployed service in this architecture.</p>
      </div>

      {/* Status summary bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '10px', 
        marginBottom: '24px' 
      }}>
        {[
          { label: 'Active Services', value: components.length, color: 'var(--status-active)' },
          { label: 'Idle', value: 0, color: 'var(--status-idle)' },
          { label: 'Total Components', value: components.length, color: 'var(--text-secondary)' },
          { label: 'Health Score', value: '98%', color: 'var(--info)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
        gap: '14px',
        marginBottom: '32px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {components.map(comp => (
          <div
            key={comp.id}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderLeft: `3px solid ${comp.borderLeft}`,
              borderRadius: '10px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              cursor: 'default'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = comp.borderLeft; e.currentTarget.style.boxShadow = `var(--shadow-md)` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.borderLeftColor = comp.borderLeft; e.currentTarget.style.boxShadow = 'none' }}
          >
            {/* Card Top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: comp.categoryColor,
                background: comp.categoryColor + '18',
                padding: '3px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.07em'
              }}>{comp.category}</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: comp.statusColor,
                background: comp.statusColor + '18',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>{comp.statusLabel}</span>
            </div>

            {/* Title + Desc */}
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{comp.title}</h3>
              <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{comp.description}</p>
            </div>

            {/* Specs */}
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '7px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              overflow: 'hidden'
            }}>
              {comp.specs.map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', gap: '8px', minWidth: 0 }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{s.label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, maxWidth: '60%' }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={() => handleBtn(comp)}
              style={{
                width: '100%',
                padding: '9px 14px',
                background: comp.id === 'redis' && flushing ? 'var(--bg-elevated)' : 'transparent',
                border: `1px solid ${comp.borderLeft}`,
                borderRadius: '7px',
                color: comp.id === 'redis' && flushing ? 'var(--text-muted)' : comp.borderLeft,
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: comp.id === 'redis' && flushing ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                letterSpacing: '0.01em'
              }}
              onMouseEnter={e => {
                if (!(comp.id === 'redis' && flushing)) {
                  e.currentTarget.style.background = comp.borderLeft + '20'
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${comp.borderLeft}40`
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {comp.id === 'redis' && flushing ? '⟳ Flushing...' : comp.btnLabel}
            </button>
          </div>
        ))}
      </div>

      {/* Detail Drawer */}
      {activeDrawer && (
        <DetailDrawer component={activeDrawer} onClose={() => setActiveDrawer(null)} />
      )}
      </div>{/* end mobile safety wrapper */}
    </>
  )
}
