// server/routes/badge.js
module.exports = function (app, db, admin) {
  
  // GET /api/public/:shareId/badge — Generates shields.io-style SVG status badge
  app.get('/api/public/:shareId/badge', async (req, res) => {
    if (!db) {
      return res.status(500).send('Database not initialized');
    }
    const { shareId } = req.params;

    try {
      const shareSnap = await db.collection('shares').doc(shareId).get();
      if (!shareSnap.exists) {
        return res.status(404).send('Share not found');
      }

      const data = shareSnap.data();
      const projectId = data.projectId;
      const ownerId = data.ownerId;

      let complianceScore = null;

      // Fetch the project document to get the latest compliance score
      if (ownerId && projectId) {
        const projectSnap = await db.collection('users').doc(ownerId)
          .collection('projects').doc(projectId)
          .get();
        if (projectSnap.exists) {
          const projectData = projectSnap.data();
          complianceScore = typeof projectData.complianceScore === 'number' 
            ? projectData.complianceScore 
            : null;
        }
      }

      // Determine label and color
      let label = 'architecture';
      let color = '#8b5cf6'; // Violet default

      if (complianceScore !== null) {
        label = `${complianceScore}% compliance`;
        if (complianceScore >= 90) {
          color = '#10b981'; // Green
        } else if (complianceScore >= 75) {
          color = '#3b82f6'; // Blue
        } else if (complianceScore >= 50) {
          color = '#f59e0b'; // Amber/Orange
        } else {
          color = '#ef4444'; // Red
        }
      }

      // Render shields-style SVG badge
      const width = 160;
      const labelSplit = 70;
      const valSplit = width - labelSplit;

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" viewBox="0 0 ${width} 20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${width}" height="20" rx="4" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <rect width="${labelSplit}" height="20" fill="#2d3748"/>
    <rect x="${labelSplit}" width="${valSplit}" height="20" fill="${color}"/>
    <rect width="${width}" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="bold" font-size="11">
    <text x="${labelSplit / 2}" y="15" fill="#010101" fill-opacity=".3">InfraMind</text>
    <text x="${labelSplit / 2}" y="14">InfraMind</text>
    <text x="${labelSplit + valSplit / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelSplit + valSplit / 2}" y="14">${label}</text>
  </g>
</svg>`;

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(svg);

    } catch (err) {
      console.error('[Badge API] Generation failed:', err);
      res.status(500).send('Failed to generate badge');
    }
  });
};
