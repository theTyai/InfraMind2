// server/routes/githubAction.js
// Generates a ready-to-use GitHub Actions YAML workflow file for drift detection.
// Users paste this into their .github/workflows/ directory.
// On every PR, the action calls InfraMind's drift API and posts a PR comment.

module.exports = function (app, db, admin, authMiddleware) {

  // GET /api/projects/:projectId/github-action
  // Returns a downloadable GitHub Actions YAML file for drift detection
  app.get('/api/projects/:projectId/github-action', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const userId = req.user.uid;
    const { projectId } = req.params;

    try {
      const { resolveProjectOwner } = require('../utils/projectResolver');
      const ownerData = await resolveProjectOwner(projectId, userId, db);
      if (!ownerData || (ownerData.ownerId !== userId && !ownerData.collaborators.includes(userId))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const ownerId = ownerData.ownerId;
      const projectRef = db.collection('users').doc(ownerId).collection('projects').doc(projectId);
      const projectSnap = await projectRef.get();
      if (!projectSnap.exists) return res.status(404).json({ error: 'Project not found' });

      const projectTitle = projectSnap.data().title || 'InfraMind Project';

      // Determine API base URL — use environment variable or infer from host
      const apiBaseUrl = process.env.INFRAMIND_PUBLIC_API_URL ||
        `${req.protocol}://${req.get('host')}/api`;

      const yaml = generateWorkflowYaml(projectId, projectTitle, apiBaseUrl);

      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Content-Disposition', `attachment; filename="inframind-drift.yml"`);
      res.send(yaml);

    } catch (err) {
      console.error('[GitHub Action] Generation failed:', err);
      res.status(500).json({ error: 'Failed to generate GitHub Action workflow.' });
    }
  });

  // GET /api/projects/:projectId/github-action/preview
  // Returns the YAML as JSON (for in-app preview without download)
  app.get('/api/projects/:projectId/github-action/preview', authMiddleware, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const userId = req.user.uid;
    const { projectId } = req.params;

    try {
      const { resolveProjectOwner } = require('../utils/projectResolver');
      const ownerData = await resolveProjectOwner(projectId, userId, db);
      if (!ownerData || (ownerData.ownerId !== userId && !ownerData.collaborators.includes(userId))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const apiBaseUrl = process.env.INFRAMIND_PUBLIC_API_URL ||
        `${req.protocol}://${req.get('host')}/api`;

      const yaml = generateWorkflowYaml(projectId, 'Your Project', apiBaseUrl);

      res.json({ yaml, projectId });
    } catch (err) {
      console.error('[GitHub Action Preview] Failed:', err);
      res.status(500).json({ error: 'Failed to generate preview.' });
    }
  });
};

/**
 * Generates the GitHub Actions YAML content.
 */
function generateWorkflowYaml(projectId, projectTitle, apiBaseUrl) {
  return `# InfraMind Architecture Drift Detection
# Auto-generated for: ${projectTitle}
# 
# Setup Instructions:
# 1. Copy this file to .github/workflows/inframind-drift.yml in your repository
# 2. Add the following secrets to your GitHub repository:
#    - INFRAMIND_API_TOKEN: Your InfraMind user API token (from Settings → API Token)
# 3. Push a PR — InfraMind will comment with a drift report automatically!
#
# Project ID: ${projectId}
# Generated: ${new Date().toISOString()}

name: InfraMind Architecture Drift Check

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main
      - master
      - develop

permissions:
  pull-requests: write
  contents: read

jobs:
  architecture-drift-check:
    name: Check Architecture Drift
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get Changed Files
        id: changed-files
        uses: tj-actions/changed-files@v44
        with:
          files: |
            **/*.js
            **/*.ts
            **/*.py
            **/*.go
            **/*.rb
            **/*.php
            **/*.rs
            **/*.prisma

      - name: Run InfraMind Drift Scan
        id: drift-scan
        if: steps.changed-files.outputs.any_changed == 'true'
        env:
          INFRAMIND_API_TOKEN: \${{ secrets.INFRAMIND_API_TOKEN }}
          INFRAMIND_PROJECT_ID: ${projectId}
          INFRAMIND_API_URL: ${apiBaseUrl}
          PR_NUMBER: \${{ github.event.pull_request.number }}
          REPO_OWNER: \${{ github.repository_owner }}
          REPO_NAME: \${{ github.event.repository.name }}
          BRANCH: \${{ github.head_ref }}
        run: |
          echo "Triggering InfraMind drift scan..."
          
          RESPONSE=$(curl -s -w "\\n%{http_code}" -X POST \\
            "\${INFRAMIND_API_URL}/projects/\${INFRAMIND_PROJECT_ID}/drift/scan" \\
            -H "Authorization: Bearer \${INFRAMIND_API_TOKEN}" \\
            -H "Content-Type: application/json" \\
            -d "{
              \\"githubRepo\\": \\"\${REPO_OWNER}/\${REPO_NAME}\\",
              \\"githubBranch\\": \\"\${BRANCH}\\",
              \\"triggeredBy\\": \\"github_action\\",
              \\"prNumber\\": \${PR_NUMBER}
            }")
          
          HTTP_STATUS=$(echo "\$RESPONSE" | tail -n1)
          BODY=$(echo "\$RESPONSE" | head -n-1)
          
          echo "HTTP Status: \$HTTP_STATUS"
          echo "drift_response=\$BODY" >> \$GITHUB_OUTPUT
          echo "http_status=\$HTTP_STATUS" >> \$GITHUB_OUTPUT
          
          if [ "\$HTTP_STATUS" != "200" ] && [ "\$HTTP_STATUS" != "201" ]; then
            echo "Drift scan request failed with status \$HTTP_STATUS"
            echo "drift_failed=true" >> \$GITHUB_OUTPUT
          fi

      - name: Post Drift Report as PR Comment
        if: steps.changed-files.outputs.any_changed == 'true'
        uses: actions/github-script@v7
        env:
          DRIFT_RESPONSE: \${{ steps.drift-scan.outputs.drift_response }}
          DRIFT_FAILED: \${{ steps.drift-scan.outputs.drift_failed }}
          INFRAMIND_PROJECT_ID: ${projectId}
          INFRAMIND_API_URL: ${apiBaseUrl}
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          script: |
            const projectId = process.env.INFRAMIND_PROJECT_ID;
            const apiUrl = process.env.INFRAMIND_API_URL;
            const failed = process.env.DRIFT_FAILED === 'true';
            
            let comment = '';
            
            if (failed) {
              comment = [
                '## ⚠️ InfraMind Architecture Drift Check',
                '',
                'Could not complete the drift scan. This may be due to:',
                '- Missing \`INFRAMIND_API_TOKEN\` secret',
                '- The InfraMind API being temporarily unavailable',
                '',
                'Please check your repository secrets and try again.',
              ].join('\\n');
            } else {
              try {
                const report = JSON.parse(process.env.DRIFT_RESPONSE || '{}');
                const score = report.complianceScore ?? 'N/A';
                const driftScore = report.driftScore ?? 'N/A';
                const missingRoutes = report.routes?.missing ?? [];
                const extraRoutes = report.routes?.extra ?? [];
                const missingCols = report.collections?.missing ?? [];
                const extraCols = report.collections?.extra ?? [];
                
                const statusEmoji = score >= 90 ? '✅' : score >= 70 ? '⚠️' : '🚨';
                const statusText = score >= 90 ? 'Excellent' : score >= 70 ? 'Drift Detected' : 'Critical Drift';
                
                const viewLink = \`\${apiUrl.replace('/api', '')}/dashboard\`;
                
                comment = [
                  \`## \${statusEmoji} InfraMind Architecture Drift Report\`,
                  '',
                  \`| Metric | Value |\`,
                  \`|--------|-------|\`,
                  \`| Compliance Score | **\${score}%** (\${statusText}) |\`,
                  \`| Drift Score | \${driftScore}% |\`,
                  \`| Branch Scanned | \`\${report.scannedBranch || 'N/A'}\` |\`,
                  \`| Files Analyzed | \${report.scannedFilesCount ?? 'N/A'} |\`,
                  '',
                ].join('\\n');
                
                if (missingRoutes.length > 0) {
                  comment += '### ❌ Missing API Routes (in architecture, not in code)\\n';
                  missingRoutes.slice(0, 8).forEach(r => {
                    comment += \`- \\\`[\${r.method}] \${r.route}\\\`\\n\`;
                  });
                  comment += '\\n';
                }
                
                if (extraRoutes.length > 0) {
                  comment += '### ⚠️ Undocumented Routes (in code, not in architecture)\\n';
                  extraRoutes.slice(0, 8).forEach(r => {
                    comment += \`- \\\`[\${r.method}] \${r.route}\\\`\\n\`;
                  });
                  comment += '\\n';
                }
                
                if (missingCols.length > 0) {
                  comment += '### ❌ Missing Database Collections\\n';
                  missingCols.forEach(c => { comment += \`- \\\`\${c}\\\`\\n\`; });
                  comment += '\\n';
                }
                
                comment += \`---\\n*[View full report on InfraMind](\${viewLink}) · Project ID: \\\`\${projectId}\\\`*\`;
                
              } catch (e) {
                comment = '## InfraMind Drift Check\\n\\nCould not parse drift report. Please view it directly on the InfraMind dashboard.';
              }
            }
            
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

      - name: Fail if Critical Drift
        if: steps.changed-files.outputs.any_changed == 'true'
        env:
          DRIFT_RESPONSE: \${{ steps.drift-scan.outputs.drift_response }}
        run: |
          SCORE=$(echo "\$DRIFT_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('complianceScore', 100))" 2>/dev/null || echo "100")
          echo "Compliance Score: \$SCORE"
          if [ "\$SCORE" -lt "50" ]; then
            echo "❌ Critical architecture drift detected (score: \$SCORE%). PR blocked."
            exit 1
          fi
          echo "✅ Architecture drift check passed."
`;
}
