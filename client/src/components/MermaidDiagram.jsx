// src/components/MermaidDiagram.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import DOMPurify from 'dompurify'
import styles from './MermaidDiagram.module.css'

let mermaidReady = false
let mermaidInit = null
// Bump this version whenever themeVariables or config change,
// so the hot-reload clears the cached instance automatically.
const MERMAID_CONFIG_VERSION = 4

async function getMermaid() {
  if (mermaidReady && window.__mermaidVersion === MERMAID_CONFIG_VERSION) return window.__mermaid
  if (mermaidInit) return mermaidInit

  mermaidInit = import('mermaid').then(m => {
    const mermaid = m.default
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose', // Allow click event callbacks
      theme: 'base',
      themeVariables: {
        // Text colors — critical for visibility on dark backgrounds
        primaryTextColor: '#f8fafc',
        // Node colors
        primaryColor: '#0f172a',
        primaryBorderColor: '#2563eb',
        secondaryColor: '#1e293b',
        tertiaryColor: '#1e293b',
        // Edge / line colors
        lineColor: '#2563eb',
        edgeLabelBackground: 'transparent',
        // Typography
        fontSize: '13px',
        fontFamily: '"Inter", sans-serif',
        // Sequence diagram actors
        actorBkg: '#0f172a',
        actorBorder: '#2563eb',
        actorTextColor: '#f8fafc',
        actorLineColor: '#2563eb',
        signalColor: '#2563eb',
        signalTextColor: '#f8fafc',
        activationBkgColor: '#1e293b',
        activationBorderColor: '#2563eb',
        noteBkgColor: '#0f172a',
        noteTextColor: '#f8fafc',
        noteBorderColor: '#2563eb',
      },
      flowchart: {
        curve: 'basis',
        useMaxWidth: false, // Turn off so we can control pan/zoom dimensions
        // htmlLabels: true is required to render FontAwesome <i> tags inside nodes.
        htmlLabels: true,
        nodeSpacing: 50,
        rankSpacing: 60,
      },
      sequence: {
        diagramMarginX: 30,
        diagramMarginY: 20,
        actorMargin: 80,
        width: 160,
        height: 45,
        boxMargin: 10,
        useMaxWidth: false,
        showSequenceNumbers: false,
      }
    })
    window.__mermaid = mermaid
    window.__mermaidVersion = MERMAID_CONFIG_VERSION
    mermaidReady = true
    return mermaid
  })
  return mermaidInit
}

let diagramCounter = 0

export default function MermaidDiagram({ code, title, onSelectNode }) {
  const wrapperRef = useRef(null)
  const [error, setError] = useState('')
  const [svgContent, setSvgContent] = useState('')
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 })
  const idRef = useRef(`mermaid-${++diagramCounter}`)

  // Define a global callback for Mermaid node clicks
  useEffect(() => {
    window.onNodeClick = (nodeId) => {
      if (onSelectNode) {
        onSelectNode(nodeId)
      }
    }
    return () => {
      delete window.onNodeClick
    }
  }, [onSelectNode])

  // Reset viewport when code changes
  useEffect(() => {
    setSvgContent('')
    setDimensions({ width: 0, height: 0 })
  }, [code])

  // Observe wrapper dimensions to handle sizing and scale calculation dynamically
  useEffect(() => {
    if (!wrapperRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect
        setWrapperSize((prev) => {
          // Compare rounded values to prevent subpixel noise and infinite layout loops
          const prevW = Math.round(prev.width)
          const prevH = Math.round(prev.height)
          const newW = Math.round(width)
          const newH = Math.round(height)
          if (prevW === newW && prevH === newH) {
            return prev
          }
          return { width, height }
        })
      }
    })
    resizeObserver.observe(wrapperRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Mermaid Renderer
  useEffect(() => {
    if (!code) return
    let cancelled = false

    setError('')

    // Sanitize code to resolve common Mermaid syntax issues (e.g., SubGraph casing, unquoted spaces in subgraph titles)
    const sanitizedCode = code.split('\n').map(line => {
      const trimmed = line.trim();
      if (/^subgraph\b/i.test(trimmed)) {
        const content = trimmed.substring(8).trim();
        if (content) {
          if (!content.startsWith('"') && !content.endsWith('"') && content.includes(' ')) {
            return `${line.substring(0, line.indexOf(trimmed))}subgraph "${content.replace(/"/g, '')}"`;
          }
        }
        return `${line.substring(0, line.indexOf(trimmed))}subgraph ${content}`;
      }
      if (/^end\b/i.test(trimmed)) {
        return `${line.substring(0, line.indexOf(trimmed))}end`;
      }
      return line;
    }).join('\n');

    getMermaid().then(async mermaid => {
      if (cancelled) return;
      try {
        const svgId = `${idRef.current}-svg`;
        const { svg } = await mermaid.render(svgId, sanitizedCode);
        if (cancelled) return;

        let w = 800;
        let h = 600;
        let viewBox = null;

        const viewBoxMatch = svg.match(/viewBox="([^"]+)"/i);
        const widthMatch = svg.match(/width="([^"]+)"/i);
        const heightMatch = svg.match(/height="([^"]+)"/i);

        if (viewBoxMatch) viewBox = viewBoxMatch[1];
        if (!viewBox && widthMatch && heightMatch) {
          const parsedW = parseFloat(widthMatch[1]);
          const parsedH = parseFloat(heightMatch[1]);
          if (!isNaN(parsedW) && !isNaN(parsedH)) {
            viewBox = `0 0 ${parsedW} ${parsedH}`;
          }
        }

        if (viewBox) {
          const parts = viewBox.split(/[\s,]+/).filter(Boolean);
          if (parts.length === 4) {
            w = parseFloat(parts[2]);
            h = parseFloat(parts[3]);
          }
        }

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const textColor  = isDark ? '#f8fafc' : '#1e293b';
        const nodeBg     = isDark ? '#0f172a' : '#ffffff';
        const clusterBg  = isDark ? '#060d1e' : '#eef2ff';
        const edgeColor  = '#2563eb';

        const styleContent = `
          text, tspan { fill: ${textColor} !important; }
          .node rect, .node circle, .node polygon, .node path,
          rect.basic, rect.label-container, .label-container,
          path.label-container { fill: ${nodeBg} !important; stroke: ${edgeColor} !important; stroke-width: 1.5px !important; }
          .actor { fill: ${nodeBg} !important; stroke: ${edgeColor} !important; }
          .actor text, .actor tspan { fill: ${textColor} !important; }
          .cluster rect, .subgraph-bgcolor { fill: ${clusterBg} !important; stroke: ${edgeColor} !important; }
          .cluster text, .subgraph-title { fill: ${textColor} !important; }
          path.flowchart-link, .edgePath path, line { stroke: ${edgeColor} !important; fill: none !important; }
          .marker path, marker path, .arrowheadPath { fill: ${edgeColor} !important; stroke: none !important; }
          .edgeLabel rect { fill: ${nodeBg} !important; }
          .edgeLabel text, .edgeLabel tspan { fill: ${textColor} !important; }
          .edgeLabel, .edgeLabel div, .edgeLabel span { color: ${textColor} !important; background-color: transparent !important; }
          foreignObject div, foreignObject span, .nodeLabel, .label { color: ${textColor} !important; }
        `;

        // Safely inject style directly into the SVG string after the opening <svg> tag
        // This completely avoids XMLParser corruption and text/html tag lowercasing!
        let updatedSvg = svg.replace(/(<svg[^>]*>)/i, `$1<style>${styleContent}</style>`);

        // If viewBox was missing but we calculated it, inject it
        if (!viewBoxMatch && viewBox) {
           updatedSvg = updatedSvg.replace(/(<svg[^>]*)/i, `$1 viewBox="${viewBox}"`);
        }
        // Bypass DOMPurify because its SVG parser aggressively strips <foreignObject> 
        // contents even when explicitly whitelisted, causing all text to disappear.
        // Mermaid's native sanitizer provides baseline protection.
        const sanitizedSvg = updatedSvg;

        setDimensions({ width: w, height: h });
        setSvgContent(sanitizedSvg);
      } catch (err) {
        if (!cancelled) {
          setError(`Diagram render error: ${err.message}`);
          setSvgContent('');
          setDimensions({ width: 0, height: 0 });
        }
      }
    });

    return () => { cancelled = true }
  }, [code])

  // callback ref to handle listener attachment & fluid styling on element mount/remount
  const containerRef = useCallback((el) => {
    if (!el) return

    // Style SVG element inside container to make it fluid
    const svgEl = el.querySelector('svg')
    if (svgEl) {
      svgEl.style.width = '100%'
      svgEl.style.height = '100%'
      svgEl.style.maxWidth = 'none'
      svgEl.style.maxHeight = 'none'
      svgEl.style.display = 'block'
      svgEl.style.overflow = 'visible'
      
      // Remove inline attributes that restrict styling
      svgEl.removeAttribute('width')
      svgEl.removeAttribute('height')
    }

    // Attach click and hover listeners
    const nodeGroups = el.querySelectorAll('.node, .actor')
    nodeGroups.forEach((node) => {
      node.style.cursor = 'pointer'
      
      const rects = node.querySelectorAll('rect, polygon, circle, ellipse, path')
      
      const onEnter = () => {
        rects.forEach(r => {
          r.style.stroke = '#2563eb'
          r.style.strokeWidth = '2px'
        })
      }
      
      const onLeave = () => {
        rects.forEach(r => {
          r.style.stroke = ''
          r.style.strokeWidth = ''
        })
      }
      
      let startX = 0
      let startY = 0
      let startTime = 0

      const onPointerDown = (e) => {
        startX = e.clientX
        startY = e.clientY
        startTime = Date.now()
      }

      const onPointerUp = (e) => {
        const diffX = Math.abs(e.clientX - startX)
        const diffY = Math.abs(e.clientY - startY)
        const duration = Date.now() - startTime

        // If the pointer barely moved and was released quickly, it is a click/tap
        if (diffX < 5 && diffY < 5 && duration < 300) {
          e.stopPropagation()
          const textEl = node.querySelector('.label') || node
          const textContent = textEl.textContent?.trim() || ''
          if (onSelectNode) {
            const cleanLabel = textContent.split('\n')[0].replace(/[\(\[\{\}\]\)]/g, '').trim()
            onSelectNode(cleanLabel)
          }
        }
      }

      node.addEventListener('mouseenter', onEnter)
      node.addEventListener('mouseleave', onLeave)
      node.addEventListener('pointerdown', onPointerDown)
      node.addEventListener('pointerup', onPointerUp)
    })
  }, [svgContent, onSelectNode])


  // Dynamic Scale Calculations
  let initialScale = 1
  if (wrapperSize.width > 0 && wrapperSize.height > 0 && dimensions.width > 0 && dimensions.height > 0) {
    // Scale by height (excluding 40px vertical padding to clear borders/headers) to fit inside the modal box
    const scaleY = Math.max(10, wrapperSize.height - 40) / dimensions.height
    initialScale = scaleY
    // Ensure initialScale is not smaller than 0.25 (25%)
    initialScale = Math.max(0.25, initialScale)
  }
  // Clamp minScale to initialScale to allow zooming in, but not out beyond the initial fit size
  const minScale = initialScale
  const maxScale = Math.max(4.0, initialScale * 2)

  // Recalculate wrapper key when dimensions change (rounded to nearest 10px to avoid subpixel layout shifts)
  const roundedW = Math.round(wrapperSize.width / 10) * 10
  const roundedH = Math.round(wrapperSize.height / 10) * 10
  const wrapperKey = `${idRef.current}-${code.length}-${dimensions.width}-${dimensions.height}-${roundedW}-${roundedH}`

  return (
    <div className={styles.wrap}>
      {title && <div className={styles.title}>{title}</div>}
      
      <div ref={wrapperRef} className={styles.diagramBox}>
        {svgContent && dimensions.width > 0 ? (
          <TransformWrapper
            key={wrapperKey}
            initialScale={initialScale}
            minScale={minScale}
            maxScale={maxScale}
            centerOnInit={true}
            limitToBounds={false}
            alignmentAnimation={{ disabled: true }}
            doubleClick={{ disabled: true }}
            panning={{ velocityDisabled: true }}
            wheel={{ step: 0.05 }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Floating Canvas Zoom Controls */}
                <div className={styles.canvasControls} onMouseDown={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => zoomIn()} title="Zoom In"><ZoomIn size={14} /></button>
                  <button type="button" onClick={() => zoomOut()} title="Zoom Out"><ZoomOut size={14} /></button>
                  <button type="button" onClick={() => resetTransform()} title="Reset View"><Maximize2 size={12} /></button>
                </div>

                <TransformComponent
                  wrapperStyle={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                  }}
                  contentStyle={{
                    width: `${dimensions.width}px`,
                    height: `${dimensions.height}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div 
                    ref={containerRef} 
                    className={styles.mermaid}
                    style={{ width: '100%', height: '100%' }}
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        ) : !error ? (
          <div className={styles.placeholder}>
            <span className={styles.placeholderDot} />
            <span className={styles.placeholderDot} style={{ animationDelay: '0.2s' }} />
            <span className={styles.placeholderDot} style={{ animationDelay: '0.4s' }} />
          </div>
        ) : (
          <div className={styles.error}>
            <code>{error}</code>
            <pre className={styles.errorCode}>{code}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
