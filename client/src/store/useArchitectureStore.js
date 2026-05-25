import { create } from 'zustand';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const useArchitectureStore = create((set, get) => ({
  projects: [], // Array of projects: { id, title, summary, timestamp }
  chatHistories: {}, // Cache of histories: { [projectId]: [ { id, prompt, geminiResponse, timestamp } ] }
  currentProjectId: null,
  currentArchitecture: null, // The active architecture parsed JSON
  loading: false,
  error: null,

  setCurrentProjectId: (projectId) => {
    const history = get().chatHistories[projectId] || [];
    const latestMessage = history[history.length - 1];
    set({ 
      currentProjectId: projectId,
      currentArchitecture: latestMessage ? latestMessage.geminiResponse : null
    });
  },

  setArchitecture: (architecture) => {
    set({ currentArchitecture: architecture });
  },

  fetchProjects: async (idToken) => {
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
        currentArchitecture: latestMessage ? latestMessage.geminiResponse : null
      });
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
        loading: false
      }));
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  saveGeneration: async (projectId, projectTitle, projectSummary, prompt, geminiResponse, idToken) => {
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
      loading: false,
      error: null
    });
  }
}));
