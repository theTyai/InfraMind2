// server/utils/notifications.js

/**
 * Creates an inside-app notification in Firestore and simulates sending a premium HTML email alert.
 */
async function sendNotification(userId, title, body, emailHtml, db) {
  if (!db) {
    console.warn('[Notifications] Database not initialized. Skipping save.');
    return;
  }

  try {
    // 1. Write to user's notifications subcollection in Firestore
    const notificationRef = db.collection('users').doc(userId).collection('notifications').doc();
    await notificationRef.set({
      id: notificationRef.id,
      title,
      body,
      read: false,
      timestamp: new Date().toISOString()
    });

    // 2. Simulate sending a styled email by printing to logs
    console.log(`
========================================= SIMULATED EMAIL DISPATCH =========================================
To User ID: ${userId}
Subject: ${title}
HTML Template Preview:
${emailHtml}
============================================================================================================
`);

  } catch (err) {
    console.error('[Notifications] Failed to send notification:', err);
  }
}

/**
 * Triggers alert for architecture drift.
 */
async function triggerDriftAlert(userId, projectId, projectName, complianceScore, driftReport, db) {
  const title = `🚨 Warning: Architecture Drift Detected in ${projectName}`;
  const body = `Compliance dropped to ${complianceScore}%! Scanned branch: ${driftReport.scannedBranch || 'main'}.`;
  
  const emailHtml = `
<div style="background-color:#0d0e12; color:#e2e8f0; font-family:sans-serif; padding:24px; border-radius:12px; max-width:600px; border:1px solid #ef4444;">
  <h2 style="color:#ef4444; margin-top:0;">⚠️ Architecture Drift Mismatch</h2>
  <p>Hello Developer,</p>
  <p>We detected that the codebase implementation for <strong>${projectName}</strong> has drifted from your planned system architecture blueprint.</p>
  
  <div style="background:#1a1d24; padding:16px; border-radius:8px; margin:20px 0;">
    <p style="margin:0; font-size:18px;"><strong>Compliance Score:</strong> <span style="color:#f59e0b; font-weight:bold;">${complianceScore}%</span></p>
    <p style="margin:8px 0 0 0; font-size:14px; color:#94a3b8;">Missing routes or collections detected on branch: <code>${driftReport.scannedBranch}</code>.</p>
  </div>
  
  <h3 style="color:#60a5fa;">Summary of Discrepancies</h3>
  <ul>
    <li><strong>Missing API Routes:</strong> ${driftReport.routes?.missing?.length || 0}</li>
    <li><strong>Extra Routes in Code:</strong> ${driftReport.routes?.extra?.length || 0}</li>
    <li><strong>Missing Database Collections:</strong> ${driftReport.collections?.missing?.length || 0}</li>
  </ul>
  
  <p style="margin-top:24px;">Please review the details in your <a href="http://localhost:3000/workspace/${projectId}" style="color:#3b82f6; text-decoration:none; font-weight:bold;">InfraMind Workspace</a> to sync the specs or update code.</p>
  <hr style="border-color:#1e293b; margin:20px 0;" />
  <p style="font-size:12px; color:#64748b; margin:0;">Sent automatically by InfraMind · AI-Native System Architecture Workspace</p>
</div>
`;

  await sendNotification(userId, title, body, emailHtml, db);
}

/**
 * Triggers alert for security audit vulnerabilities.
 */
async function triggerSecurityAlert(userId, projectId, projectName, securityScore, alerts, db) {
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;
  if (criticalCount === 0) return; // Only notify for Critical/High alerts to avoid alert fatigue

  const title = `🔒 Security Alert: Critical Vulnerabilities Found in ${projectName}`;
  const body = `Security scan detected ${criticalCount} Critical/High vulnerabilities! Overall Score: ${securityScore}%.`;
  
  const emailHtml = `
<div style="background-color:#0d0e12; color:#e2e8f0; font-family:sans-serif; padding:24px; border-radius:12px; max-width:600px; border:1px solid #ef4444;">
  <h2 style="color:#ef4444; margin-top:0;">🔒 Security Vulnerability Report</h2>
  <p>Hello Developer,</p>
  <p>A scheduled or manual AI security posture scan for <strong>${projectName}</strong> identified security alerts that require immediate attention.</p>
  
  <div style="background:#1a1d24; padding:16px; border-radius:8px; margin:20px 0;">
    <p style="margin:0; font-size:18px;"><strong>Security Score:</strong> <span style="color:#ef4444; font-weight:bold;">${securityScore}%</span></p>
    <p style="margin:8px 0 0 0; font-size:14px; color:#94a3b8;">Detected ${criticalCount} High or Critical severity OWASP threat vectors.</p>
  </div>
  
  <h3 style="color:#f87171;">Threat Summary</h3>
  <table style="width:100%; border-collapse:collapse; text-align:left; font-size:14px;">
    <thead>
      <tr style="border-bottom:1px solid #1e293b;">
        <th style="padding:6px;">Vulnerability</th>
        <th style="padding:6px;">Severity</th>
        <th style="padding:6px;">OWASP Category</th>
      </tr>
    </thead>
    <tbody>
      ${alerts.slice(0, 4).map(a => `
        <tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:6px;"><code>${a.title}</code></td>
          <td style="padding:6px; color:#f87171;"><strong>${a.severity}</strong></td>
          <td style="padding:6px; color:#94a3b8;">${a.owasp}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <p style="margin-top:24px;">Please review the recommended remediations in your <a href="http://localhost:3000/workspace/${projectId}" style="color:#3b82f6; text-decoration:none; font-weight:bold;">InfraMind Security Panel</a>.</p>
  <hr style="border-color:#1e293b; margin:20px 0;" />
  <p style="font-size:12px; color:#64748b; margin:0;">Sent automatically by InfraMind Security Scanner</p>
</div>
`;

  await sendNotification(userId, title, body, emailHtml, db);
}

/**
 * Triggers alert for team review comment.
 */
async function triggerCommentAlert(userId, projectId, projectName, author, commentText, db) {
  const title = `💬 New Review Comment on ${projectName} by ${author}`;
  const body = `"${commentText.slice(0, 60)}${commentText.length > 60 ? '...' : ''}"`;
  
  const emailHtml = `
<div style="background-color:#0d0e12; color:#e2e8f0; font-family:sans-serif; padding:24px; border-radius:12px; max-width:600px; border:1px solid #3b82f6;">
  <h2 style="color:#3b82f6; margin-top:0;">💬 New Review Comment</h2>
  <p>Hello Developer,</p>
  <p>A new design review comment has been posted on the architecture diagram for <strong>${projectName}</strong>.</p>
  
  <div style="background:#1a1d24; padding:16px; border-radius:8px; border-left:4px solid #3b82f6; margin:20px 0; font-style:italic;">
    <p style="margin:0; font-weight:bold; color:#fff; font-style:normal; margin-bottom:4px;">${author}:</p>
    "${commentText}"
  </div>
  
  <p style="margin-top:24px;">Reply directly in the <a href="http://localhost:3000/workspace/${projectId}" style="color:#3b82f6; text-decoration:none; font-weight:bold;">InfraMind Collaboration Room</a>.</p>
  <hr style="border-color:#1e293b; margin:20px 0;" />
  <p style="font-size:12px; color:#64748b; margin:0;">Sent automatically by InfraMind Collaboration Room</p>
</div>
`;

  await sendNotification(userId, title, body, emailHtml, db);
}

module.exports = {
  triggerDriftAlert,
  triggerSecurityAlert,
  triggerCommentAlert
};
