import { useState, useCallback } from 'react'
import { generateArchitecture } from '../utils/gemini.js'
import { useArchitectureStore } from '../store/useArchitectureStore.js'

export function useArchitecture() {
  const [state, setState] = useState('idle')   // idle | loading | result | error
  const [error, setError] = useState('')
  
  const currentArchitecture = useArchitectureStore(state => state.currentArchitecture);
  const currentProjectId = useArchitectureStore(state => state.currentProjectId);
  const generateArchitectureStore = useArchitectureStore(state => state.generateArchitecture);
  const fetchChatHistory = useArchitectureStore(state => state.fetchChatHistory);

  const generate = useCallback(async ({ idea, knownStack, idToken }) => {
    setState('loading')
    setError('')
    try {
      await generateArchitectureStore(currentProjectId, idea, knownStack, idToken)
      setState('result')
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setState('error')
    }
  }, [currentProjectId, generateArchitectureStore])

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
