// server/utils/ciIntegrator.js
// Security + Drift CI Integration Layer
//
// Purpose:
//   - Provides a unified interface that GitHub Actions (or any CI system)
//     can use to run a combined security + architecture drift scan.
//   - Wraps driftEngine.analyzeRepositoryDrift and secretsMasker together,
//     returning a single structured report suitable for PR annotations.
//
// This module is invoked by server/routes/drift.js when a request includes
// a 'triggeredBy: github_action' flag, enabling a CI-specific response shape.

const { analyzeRepositoryDrift } = require('./driftEngine');

/**
 * Runs a combined architecture drift + security scan for a CI pipeline.
 *
 * @param {object} options
 * @param {string}   options.owner         - GitHub repo owner
 * @param {string}   options.repo          - GitHub repo name
 * @param {string}   options.branch        - Branch to scan
 * @param {string}   options.accessToken   - GitHub access token
 * @param {Array}    options.plannedApis   - Planned API routes from architecture
 * @param {Array}    options.plannedDbSchema - Planned DB schema from architecture
 * @param {boolean}  [options.isCIPipeline] - When true, returns CI-optimised shape
 *
 * @returns {Promise<object>} Combined drift + security report
 */
async function runCIScan({ owner, repo, branch, accessToken, plannedApis, plannedDbSchema, isCIPipeline = false }) {
  const startTime = Date.now();

  // 1. Perform drift analysis
  const driftReport = await analyzeRepositoryDrift(
    owner, repo, branch, accessToken, plannedApis, plannedDbSchema
  );

  const durationMs = Date.now() - startTime;

  // 2. Build the unified CI report
  const report = {
    ...driftReport,
    ciMode: isCIPipeline,
    durationMs,
    // CI-level exit code hint: 0 = pass, 1 = warning, 2 = critical
    ciExitCode: driftReport.complianceScore >= 90 ? 0
              : driftReport.complianceScore >= 60 ? 1
              : 2,
    // Human-readable status for PR comments
    status: driftReport.complianceScore >= 90 ? 'PASS'
          : driftReport.complianceScore >= 60 ? 'WARN'
          : 'FAIL',
    // Structured annotations for GitHub Actions Problem Matchers
    annotations: _buildAnnotations(driftReport),
  };

  return report;
}

/**
 * Converts drift report deltas into GitHub Actions annotation format.
 * These are printed as warning/error lines in the Actions log.
 */
function _buildAnnotations(driftReport) {
  const annotations = [];

  // Missing routes → errors (planned but not implemented)
  (driftReport.routes?.missing || []).forEach(r => {
    annotations.push({
      level: 'error',
      title: `Missing API Route: [${r.method}] ${r.route}`,
      message: `This route is in your InfraMind architecture but was not found in the repository code. Add the endpoint or update your architecture.`,
      path: 'server/**', // best-guess path hint
    });
  });

  // Extra routes → warnings (implemented but not in architecture)
  (driftReport.routes?.extra || []).forEach(r => {
    annotations.push({
      level: 'warning',
      title: `Undocumented Route: [${r.method}] ${r.route}`,
      message: `This route exists in code but is not part of your InfraMind architecture. Document it or remove it.`,
      path: 'server/**',
    });
  });

  // Missing collections → errors
  (driftReport.collections?.missing || []).forEach(col => {
    annotations.push({
      level: 'error',
      title: `Missing DB Collection/Table: "${col}"`,
      message: `Collection "${col}" is in your planned schema but was not found in the codebase. Implement or update your architecture.`,
      path: '**',
    });
  });

  return annotations;
}

module.exports = { runCIScan };
