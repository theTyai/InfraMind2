import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'base',
  themeVariables: {
    primaryTextColor: '#f8fafc',
    primaryColor: '#0f172a',
    primaryBorderColor: '#2563eb',
    secondaryColor: '#1e293b',
    tertiaryColor: '#1e293b',
    lineColor: '#2563eb',
    edgeLabelBackground: 'transparent',
    fontSize: '13px',
    fontFamily: '"Inter", sans-serif',
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
    useMaxWidth: false,
    htmlLabels: false,
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
});

self.onmessage = async (event) => {
  const { id, code } = event.data;
  if (!code) return;
  
  try {
    // Mermaid render may fail in worker if it heavily relies on document for text metrics.
    // In newer versions, they have experimental support or it might throw.
    const { svg } = await mermaid.render(`mermaid-${id}-svg`, code);
    self.postMessage({ id, svg, success: true });
  } catch (error) {
    self.postMessage({ id, error: error.message, success: false });
  }
};

self.addEventListener('error', (event) => {
  console.error('[Mermaid Worker Error]', event.message, event.filename, event.lineno);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Mermaid Worker Unhandled Rejection]', event.reason);
});
