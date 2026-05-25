// server/utils/dbNormalizer.js

/**
 * Parses a Mermaid.js flowchart (graph TD) into structured nodes and edges.
 * @param {string} mermaidCode 
 * @returns {object} { nodes: Array, edges: Array }
 */
function parseMermaidDiagram(mermaidCode) {
  const nodesMap = new Map();
  const edges = [];

  if (!mermaidCode) return { nodes: [], edges: [] };

  const lines = mermaidCode.split('\n');

  // Regex to capture node declarations: ID[Label], ID((Label)), ID[(Label)], etc.
  // Example: Client[User Client] or Database[(Firestore)]
  const nodeRegex = /(\w+)(?:\[([^\]]+)\]|\(\(([^)]+)\)\)|\[\(([^)]+)\)\]|\["([^"]+)"\]|\(([^)]+)\)|\{\{([^}]+)\}\})/g;
  
  // Regex to capture connections: ID1 --> ID2 or ID1 -. text .-> ID2
  const edgeRegex = /(\w+)\s*(?:-->|==>|-.->|--[^>]*-->)\s*(\w+)/;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('graph') || trimmed.startsWith('click')) return;

    // 1. Match node definitions on this line
    let match;
    while ((match = nodeRegex.exec(trimmed)) !== null) {
      const id = match[1];
      // The label is captured in one of the nested groups based on shape delimiters
      const label = match[2] || match[3] || match[4] || match[5] || match[6] || match[7] || id;
      
      // Determine node shape type based on delimiters
      let shape = 'rect';
      if (trimmed.includes(`${id}((`)) shape = 'circle';
      else if (trimmed.includes(`${id}[(`)) shape = 'database';
      else if (trimmed.includes(`${id}{`)) shape = 'decision';

      nodesMap.set(id, { id, label: label.trim(), shape });
    }

    // 2. Match connections
    const edgeMatch = trimmed.match(edgeRegex);
    if (edgeMatch) {
      const source = edgeMatch[1];
      const target = edgeMatch[2];
      
      // Ensure source and target are created as nodes if they weren't explicitly defined
      if (!nodesMap.has(source)) {
        nodesMap.set(source, { id: source, label: source, shape: 'rect' });
      }
      if (!nodesMap.has(target)) {
        nodesMap.set(target, { id: target, label: target, shape: 'rect' });
      }

      edges.push({
        id: `${source}-${target}`,
        source,
        target
      });
    }
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges
  };
}

/**
 * Normalizes and saves monolithic Gemini architecture payloads into Firestore subcollections.
 */
async function normalizeAndSaveProject(userId, projectId, geminiResponse, db, admin) {
  const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);

  // 1. Parse Mermaid diagram into nodes and edges
  const { nodes, edges } = parseMermaidDiagram(geminiResponse.mermaidDiagram);

  // 2. Extract schemas and routes
  const schemas = Array.isArray(geminiResponse.dbSchema) ? geminiResponse.dbSchema : [];
  const routes = Array.isArray(geminiResponse.apis) ? geminiResponse.apis : [];

  // Use individual batch tasks or sequential sets
  const batch = db.batch();

  // Save Nodes
  const nodesRef = projectRef.collection('nodes');
  nodes.forEach(node => {
    const docRef = nodesRef.doc(node.id);
    batch.set(docRef, { ...node, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });

  // Save Edges
  const edgesRef = projectRef.collection('edges');
  edges.forEach(edge => {
    const docRef = edgesRef.doc(edge.id);
    batch.set(docRef, { ...edge, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });

  // Save Schemas
  const schemasRef = projectRef.collection('schemas');
  schemas.forEach(schema => {
    // Escape invalid characters in collection name if any
    const docId = schema.collection.replace(/[^a-zA-Z0-9_]/g, '_');
    const docRef = schemasRef.doc(docId);
    batch.set(docRef, { ...schema, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });

  // Save Routes
  const routesRef = projectRef.collection('routes');
  routes.forEach((route, index) => {
    // Generate route ID: e.g. GET_api_users
    const methodClean = route.method.toUpperCase();
    const pathClean = route.route.replace(/[^a-zA-Z0-9_]/g, '_');
    const docId = `${methodClean}_${pathClean}_${index}`;
    const docRef = routesRef.doc(docId);
    batch.set(docRef, { ...route, index, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });

  // Mark project as normalized
  batch.set(projectRef, { isNormalized: true }, { merge: true });

  await batch.commit();
  console.log(`[Database] Normalized and saved project ${projectId} into subcollections.`);
}

/**
 * Lazy migration wrapper for old, monolithic Firestore projects.
 */
async function lazyMigrateProject(userId, projectId, db, admin) {
  const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  
  if (!projectSnap.exists) return null;
  const projectData = projectSnap.data();

  // If already migrated, return
  if (projectData.isNormalized) return projectData;

  console.log(`[Database] Initiating on-the-fly migration for legacy project ${projectId}...`);

  // Fetch the latest chatHistory entry
  const historySnap = await projectRef.collection('chatHistory')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  if (historySnap.empty) {
    // Mark as normalized anyway since there's no data to migrate
    await projectRef.set({ isNormalized: true }, { merge: true });
    return { ...projectData, isNormalized: true };
  }

  const latestEntry = historySnap.docs[0].data();
  const geminiResponse = latestEntry.geminiResponse;

  if (geminiResponse) {
    try {
      await normalizeAndSaveProject(userId, projectId, geminiResponse, db, admin);
    } catch (err) {
      console.error(`[Database] Migration failed for project ${projectId}:`, err);
    }
  }

  return { ...projectData, isNormalized: true };
}

module.exports = {
  parseMermaidDiagram,
  normalizeAndSaveProject,
  lazyMigrateProject
};
