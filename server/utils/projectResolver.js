// server/utils/projectResolver.js

/**
 * Resolves the owner and collaborator information for a given projectId.
 * @param {string} projectId 
 * @param {string} currentUserId 
 * @param {object} db - Firestore DB reference
 * @returns {Promise<object|null>} - Returns { ownerId, collaborators: Array, collaboratorEmails: Array } or null if not found
 */
async function resolveProjectOwner(projectId, currentUserId, db) {
  if (!db || !projectId) return null;

  try {
    // 1. Check registry collection
    const registryRef = db.collection('projectOwners').doc(projectId);
    const registrySnap = await registryRef.get();

    if (registrySnap.exists) {
      const data = registrySnap.data();
      return {
        ownerId: data.ownerId,
        collaborators: data.collaborators || [],
        collaboratorEmails: data.collaboratorEmails || []
      };
    }

    // 2. Fallback: check if project exists under current user
    if (currentUserId) {
      const projectRef = db.collection('users').doc(currentUserId).collection('projects').doc(projectId);
      const projectSnap = await projectRef.get();
      if (projectSnap.exists) {
        // Automatically register legacy project mapping
        const regData = {
          ownerId: currentUserId,
          collaborators: [],
          collaboratorEmails: []
        };
        await registryRef.set(regData);
        return regData;
      }
    }

    // 3. Fallback: Try scanning public shares to find owner
    const shareSnap = await db.collection('shares').where('projectId', '==', projectId).limit(1).get();
    if (!shareSnap.empty) {
      const ownerId = shareSnap.docs[0].data().ownerId;
      if (ownerId) {
        const regData = {
          ownerId,
          collaborators: [],
          collaboratorEmails: []
        };
        await registryRef.set(regData);
        return regData;
      }
    }
  } catch (error) {
    console.error(`[projectResolver] Failed to resolve owner for project ${projectId}:`, error);
  }

  return null;
}

module.exports = { resolveProjectOwner };
