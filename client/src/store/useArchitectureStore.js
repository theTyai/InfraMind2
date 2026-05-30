import { create } from 'zustand';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const useArchitectureStore = create((set, get) => ({
  projects: [], // Array of projects: { id, title, summary, timestamp }
  chatHistories: {}, // Cache of histories: { [projectId]: [ { id, prompt, geminiResponse, timestamp } ] }
  currentProjectId: null,
  currentArchitecture: null, // The active architecture parsed JSON
  currentNodes: [],
  currentEdges: [],
  currentSchemas: [],
  currentRoutes: [],
  loading: false,
  error: null,
  notifications: [],
  githubLinked: false,
  securityHistory: [],
  driftHistory: [],
  
  activeModel: 'gemini-3.5-flash',
  isRouting: false,
  
  infrastructureMode: 'AUTO_FREE',
  serviceOverrides: {}, // Map of serviceId: selectedPlanId
  projectScalingStage: 2, // 1: Lean MVP, 2: Early Startup, 3: High Growth, 4: Planet Scale

  setServiceOverride: (serviceId, planId) => set((state) => ({
    infrastructureMode: 'MANUAL_OVERRIDE',
    serviceOverrides: { ...state.serviceOverrides, [serviceId]: planId }
  })),

  setProjectScalingStage: (stage) => set({ projectScalingStage: stage }),
  
  resetToAuto: () => set({ infrastructureMode: 'AUTO_FREE', serviceOverrides: {} }),

  setCurrentProjectId: (projectId) => {
    const history = get().chatHistories[projectId] || [];
    const latestMessage = history[history.length - 1];
    set({ 
      currentProjectId: projectId,
      currentArchitecture: latestMessage ? latestMessage.geminiResponse : null,
      currentNodes: [],
      currentEdges: [],
      currentSchemas: [],
      currentRoutes: [],
      securityHistory: [],
      driftHistory: []
    });
  },

  setArchitecture: (architecture) => {
    set({ 
      currentArchitecture: architecture,
      currentNodes: [],
      currentEdges: [],
      currentSchemas: [],
      currentRoutes: [],
      securityHistory: [],
      driftHistory: []
    });
  },

  fetchProjects: async (idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') {
      console.warn('[Store] fetchProjects aborted: invalid token');
      return;
    }
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      set({ projects: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchChatHistory: async (projectId, idToken) => {
    // If already cached, don't fetch from Firestore to save reads
    if (get().chatHistories[projectId]) {
      const history = get().chatHistories[projectId];
      const latestMessage = history[history.length - 1];
      set({ 
        currentProjectId: projectId,
        currentArchitecture: latestMessage ? latestMessage.geminiResponse : null,
        currentNodes: [],
        currentEdges: [],
        currentSchemas: [],
        currentRoutes: [],
        securityHistory: [],
        driftHistory: []
      });
      return;
    }

    if (!idToken || idToken === 'null' || idToken === 'undefined') {
      console.warn('[Store] fetchChatHistory aborted: invalid token');
      return;
    }

    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/history`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch project history');
      const data = await res.json(); // Array of { id, prompt, geminiResponse, timestamp }
      
      set((state) => ({
        chatHistories: {
          ...state.chatHistories,
          [projectId]: data
        },
        currentProjectId: projectId,
        currentArchitecture: data[data.length - 1]?.geminiResponse || null,
        currentNodes: [],
        currentEdges: [],
        currentSchemas: [],
        currentRoutes: [],
        securityHistory: [],
        driftHistory: [],
        loading: false
      }));
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  generateArchitecture: async (projectId, idea, knownStack, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') {
      throw new Error('Authentication token is missing. Please sign in again.');
    }

    const cacheKey = `arch_${btoa(idea + (projectId || ''))}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      const newMessage = {
        id: data.messageId,
        prompt: data.prompt,
        geminiResponse: data.geminiResponse,
        timestamp: data.timestamp
      };
      set((state) => {
        const existingHistory = state.chatHistories[data.projectId] || [];
        const updatedHistory = [...existingHistory, newMessage];
        const projectExists = state.projects.some(p => p.id === data.projectId);
        let updatedProjects = [...state.projects];
        const title = data.geminiResponse.projectTitle;
        const summary = data.geminiResponse.projectSummary;

        if (!projectExists) {
          updatedProjects = [{ id: data.projectId, title, summary, timestamp: data.timestamp }, ...updatedProjects];
        } else {
          updatedProjects = [
            { id: data.projectId, title, summary, timestamp: data.timestamp },
            ...updatedProjects.filter(p => p.id !== data.projectId)
          ];
        }

        return {
          chatHistories: { ...state.chatHistories, [data.projectId]: updatedHistory },
          projects: updatedProjects,
          currentProjectId: data.projectId,
          currentArchitecture: data.geminiResponse,
          securityHistory: [],
          driftHistory: [],
          activeModel: data.modelUsed || state.activeModel,
          loading: false,
          isRouting: false
        };
      });
      return data.projectId;
    }

    set({ loading: true, error: null, isRouting: true });
    try {
      const customKey = localStorage.getItem('inframind_api_key') || '';
      const customModel = localStorage.getItem('inframind_model') || '';

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };
      if (customKey) {
        headers['x-byok-api-key'] = customKey;
      }
      if (customModel) {
        headers['x-byok-model'] = customModel;
      }

      const isStartupMode = localStorage.getItem('inframind_startup_mode') === 'true';
      const res = await fetch(`${API_BASE_URL}/ai/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId,
          idea,
          knownStack,
          startupMode: isStartupMode,
          infrastructureMode: get().infrastructureMode,
          serviceOverrides: get().serviceOverrides,
          projectScalingStage: get().projectScalingStage
        })
      });

      if (!res.ok) {
        const errDetails = await res.json().catch(() => ({}));
        throw new Error(errDetails.error || 'Failed to generate architecture');
      }

      const data = await res.json(); // Returns { messageId, projectId, prompt, geminiResponse, timestamp }
      
      const newMessage = {
        id: data.messageId,
        prompt: data.prompt,
        geminiResponse: data.geminiResponse,
        timestamp: data.timestamp
      };

      set((state) => {
        const existingHistory = state.chatHistories[data.projectId] || [];
        const updatedHistory = [...existingHistory, newMessage];

        const projectExists = state.projects.some(p => p.id === data.projectId);
        let updatedProjects = [...state.projects];
        const title = data.geminiResponse.projectTitle;
        const summary = data.geminiResponse.projectSummary;

        if (!projectExists) {
          updatedProjects = [{
            id: data.projectId,
            title,
            summary,
            timestamp: data.timestamp
          }, ...updatedProjects];
        } else {
          updatedProjects = [
            {
              id: data.projectId,
              title,
              summary,
              timestamp: data.timestamp
            },
            ...updatedProjects.filter(p => p.id !== data.projectId)
          ];
        }

        return {
          chatHistories: {
            ...state.chatHistories,
            [data.projectId]: updatedHistory
          },
          projects: updatedProjects,
          currentProjectId: data.projectId,
          currentArchitecture: data.geminiResponse,
          securityHistory: [],
          driftHistory: [],
          activeModel: data.modelUsed || state.activeModel,
          loading: false,
          isRouting: false
        };
      });

      localStorage.setItem(cacheKey, JSON.stringify(data));

      return data.projectId;
    } catch (err) {
      set({ error: err.message, loading: false, isRouting: false });
      throw err;
    }
  },

  saveGeneration: async (projectId, projectTitle, projectSummary, prompt, geminiResponse, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') {
      throw new Error('Authentication token is missing. Cannot save project.');
    }
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/projects/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          projectId,
          projectTitle,
          projectSummary,
          prompt,
          geminiResponse
        })
      });

      if (!res.ok) throw new Error('Failed to save chat history');
      const data = await res.json(); // Returns { messageId, projectId, prompt, geminiResponse, timestamp }
      
      const newMessage = {
        id: data.messageId,
        prompt: data.prompt,
        geminiResponse: data.geminiResponse,
        timestamp: data.timestamp
      };

      set((state) => {
        const existingHistory = state.chatHistories[data.projectId] || [];
        const updatedHistory = [...existingHistory, newMessage];

        // Also update projects list if it's a new project or title changed
        const projectExists = state.projects.some(p => p.id === data.projectId);
        let updatedProjects = [...state.projects];
        if (!projectExists) {
          updatedProjects = [{
            id: data.projectId,
            title: projectTitle,
            summary: projectSummary,
            timestamp: data.timestamp
          }, ...updatedProjects];
        } else {
          // Move to top and update title/summary just in case
          updatedProjects = [
            {
              id: data.projectId,
              title: projectTitle,
              summary: projectSummary,
              timestamp: data.timestamp
            },
            ...updatedProjects.filter(p => p.id !== data.projectId)
          ];
        }

        return {
          chatHistories: {
            ...state.chatHistories,
            [data.projectId]: updatedHistory
          },
          projects: updatedProjects,
          currentProjectId: data.projectId,
          currentArchitecture: data.geminiResponse,
          securityHistory: [],
          driftHistory: [],
          loading: false
        };
      });

      return data.projectId;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  clearStore: () => {
    set({
      projects: [],
      chatHistories: {},
      currentProjectId: null,
      currentArchitecture: null,
      currentNodes: [],
      currentEdges: [],
      currentSchemas: [],
      currentRoutes: [],
      loading: false,
      error: null,
      notifications: [],
      githubLinked: false,
      securityHistory: [],
      driftHistory: []
    });
  },

  fetchNodes: async (projectId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return [];
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/nodes`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch nodes');
      const data = await res.json();
      set({ currentNodes: data });
      return data;
    } catch (err) {
      console.error('Error fetching nodes:', err);
    }
  },

  fetchEdges: async (projectId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return [];
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/edges`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch edges');
      const data = await res.json();
      set({ currentEdges: data });
      return data;
    } catch (err) {
      console.error('Error fetching edges:', err);
    }
  },

  fetchSchemas: async (projectId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return [];
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/schemas`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch schemas');
      const data = await res.json();
      set({ currentSchemas: data });
      return data;
    } catch (err) {
      console.error('Error fetching schemas:', err);
    }
  },

  fetchRoutes: async (projectId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return [];
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/routes`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch routes');
      const data = await res.json();
      set({ currentRoutes: data });
      return data;
    } catch (err) {
      console.error('Error fetching routes:', err);
    }
  },

  fetchNotifications: async (idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      set({ notifications: data });
      return data;
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  },

  markNotificationRead: async (notificationId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Failed to mark notification as read');
      set((state) => ({
        notifications: state.notifications.map(n => n.id === notificationId ? { ...n, read: true } : n)
      }));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  },

  fetchGithubStatus: async (idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/github/status`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch GitHub status');
      const data = await res.json();
      set({ githubLinked: !!data.linked });
      return data;
    } catch (err) {
      console.error('Error fetching github status:', err);
    }
  },

  unlinkGithubAccount: async (idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/github/unlink`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Failed to unlink GitHub');
      set({ githubLinked: false });
    } catch (err) {
      console.error('Error unlinking GitHub:', err);
    }
  },

  linkGithubRepo: async (projectId, repo, branch, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ githubRepo: repo, githubBranch: branch })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to link repository');
      return await res.json();
    } catch (err) {
      console.error('Error linking Github repo:', err);
      throw err;
    }
  },

  runSecurityScan: async (projectId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/security/scan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Security scan failed');
      const data = await res.json();
      set((state) => ({
        securityHistory: [data, ...state.securityHistory]
      }));
      return data;
    } catch (err) {
      console.error('Error running security scan:', err);
      throw err;
    }
  },

  fetchSecurityHistory: async (projectId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return [];
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/security/history`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch security history');
      const data = await res.json();
      set({ securityHistory: data });
      return data;
    } catch (err) {
      console.error('Error fetching security history:', err);
    }
  },

  runSecurityFix: async (projectId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/security/fix`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Security fix generation failed');
      return await res.json();
    } catch (err) {
      console.error('Error running security fix:', err);
      throw err;
    }
  },

  runDriftScan: async (projectId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/drift/scan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Drift scan failed');
      const data = await res.json();
      set((state) => ({
        driftHistory: [data, ...state.driftHistory]
      }));
      return data;
    } catch (err) {
      console.error('Error running drift scan:', err);
      throw err;
    }
  },

  runDriftFix: async (projectId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/drift/fix`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Drift fix generation failed');
      return await res.json();
    } catch (err) {
      console.error('Error running drift fix:', err);
      throw err;
    }
  },

  fetchDriftHistory: async (projectId, idToken) => {
    if (!idToken || idToken === 'null' || idToken === 'undefined') return [];
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/drift/history`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch drift history');
      const data = await res.json();
      set({ driftHistory: data });
      return data;
    } catch (err) {
      console.error('Error fetching drift history:', err);
    }
  }
}));
