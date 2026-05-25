import { useState, useCallback } from 'react'
import { generateArchitecture } from '../utils/gemini.js'
import { useArchitectureStore } from '../store/useArchitectureStore.js'

export function useArchitecture() {
  const [state, setState] = useState('idle')   // idle | loading | result | error
  const [error, setError] = useState('')
  
  const currentArchitecture = useArchitectureStore(state => state.currentArchitecture);
  const currentProjectId = useArchitectureStore(state => state.currentProjectId);
  const saveGeneration = useArchitectureStore(state => state.saveGeneration);
  const fetchChatHistory = useArchitectureStore(state => state.fetchChatHistory);

  const generate = useCallback(async ({ idea, knownStack, idToken }) => {
    setState('loading')
    setError('')
    try {
      // 1. Generate via Gemini API
      const result = await generateArchitecture({ idea, knownStack })
      
      // 2. Save via Backend (persists in Firestore)
      await saveGeneration(
        currentProjectId, // passes active project ID if refining, else null for new project
        result.projectTitle,
        result.projectSummary,
        idea,
        result,
        idToken
      )
      
      setState('result')
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setState('error')
    }
  }, [currentProjectId, saveGeneration])

  const load = useCallback(async ({ projectId, idToken }) => {
    setState('loading')
    setError('')
    try {
      await fetchChatHistory(projectId, idToken)
      setState('result')
    } catch (e) {
      setError(e.message || 'Failed to load project history')
      setState('error')
    }
  }, [fetchChatHistory])

  const reset = useCallback(() => {
    setState('idle')
    setError('')
  }, [])

  return { 
    state, 
    data: currentArchitecture, 
    error, 
    generate, 
    reset, 
    load 
  }
}
