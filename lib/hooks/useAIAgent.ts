import { useState, useEffect, useCallback } from 'react'
import { AIAgent, AIPersonality, AIConfiguration, AIResponse } from '@/lib/types/ai'

interface UseAIAgentProps {
  tenantId?: string
  agentId?: string
}

interface UseAIAgentReturn {
  // State
  agents: AIAgent[]
  currentAgent: AIAgent | null
  loading: boolean
  error: string | null
  testing: boolean
  
  // Actions
  loadAgents: () => Promise<void>
  loadAgent: (agentId: string) => Promise<void>
  createAgent: (agentData: Omit<AIAgent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateAgent: (agentId: string, updates: Partial<AIAgent>) => Promise<void>
  deleteAgent: (agentId: string) => Promise<void>
  toggleAgent: (agentId: string, isActive: boolean) => Promise<void>
  testAgent: (agentId: string, message?: string) => Promise<AIResponse>
  updatePersonality: (agentId: string, personality: Partial<AIPersonality>) => Promise<void>
  updateConfiguration: (agentId: string, configuration: Partial<AIConfiguration>) => Promise<void>
  
  // Utils
  refreshAgent: (agentId: string) => Promise<void>
  clearError: () => void
}

export function useAIAgent({ 
  tenantId = 'default', 
  agentId 
}: UseAIAgentProps = {}): UseAIAgentReturn {
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [currentAgent, setCurrentAgent] = useState<AIAgent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error in ${context}:`, error)
    setError(error instanceof Error ? error.message : `Error in ${context}`)
  }, [])

  const loadAgents = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/ai/agent?tenantId=${tenantId}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load agents')
      }
      
      setAgents(data.agents || [])
    } catch (error) {
      handleError(error, 'loadAgents')
    } finally {
      setLoading(false)
    }
  }, [tenantId, handleError])

  const loadAgent = useCallback(async (agentId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/ai/agent?tenantId=${tenantId}&agentId=${agentId}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load agent')
      }
      
      setCurrentAgent(data.agent)
    } catch (error) {
      handleError(error, 'loadAgent')
    } finally {
      setLoading(false)
    }
  }, [tenantId, handleError])

  const createAgent = useCallback(async (agentData: Omit<AIAgent, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...agentData,
          tenantId
        }),
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create agent')
      }
      
      // Refresh agents list
      await loadAgents()
    } catch (error) {
      handleError(error, 'createAgent')
    } finally {
      setLoading(false)
    }
  }, [tenantId, loadAgents, handleError])

  const updateAgent = useCallback(async (agentId: string, updates: Partial<AIAgent>) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/agent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          tenantId,
          ...updates
        }),
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update agent')
      }
      
      // Update local state
      setAgents(prev => prev.map(agent => 
        agent.id === agentId ? { ...agent, ...updates } : agent
      ))
      
      if (currentAgent?.id === agentId) {
        setCurrentAgent(prev => prev ? { ...prev, ...updates } : null)
      }
    } catch (error) {
      handleError(error, 'updateAgent')
    } finally {
      setLoading(false)
    }
  }, [tenantId, currentAgent, handleError])

  const deleteAgent = useCallback(async (agentId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/ai/agent?agentId=${agentId}&tenantId=${tenantId}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete agent')
      }
      
      // Update local state
      setAgents(prev => prev.filter(agent => agent.id !== agentId))
      
      if (currentAgent?.id === agentId) {
        setCurrentAgent(null)
      }
    } catch (error) {
      handleError(error, 'deleteAgent')
    } finally {
      setLoading(false)
    }
  }, [tenantId, currentAgent, handleError])

  const toggleAgent = useCallback(async (agentId: string, isActive: boolean) => {
    await updateAgent(agentId, { isActive })
  }, [updateAgent])

  const testAgent = useCallback(async (agentId: string, message: string = 'Olá, estou interessado em alugar uma propriedade para o final de semana.'): Promise<AIResponse> => {
    setTesting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          message,
          tenantId
        }),
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to test agent')
      }
      
      return data.testResult
    } catch (error) {
      handleError(error, 'testAgent')
      throw error
    } finally {
      setTesting(false)
    }
  }, [tenantId, handleError])

  const updatePersonality = useCallback(async (agentId: string, personality: Partial<AIPersonality>) => {
    await updateAgent(agentId, { personality })
  }, [updateAgent])

  const updateConfiguration = useCallback(async (agentId: string, configuration: Partial<AIConfiguration>) => {
    await updateAgent(agentId, { configuration })
  }, [updateAgent])

  const refreshAgent = useCallback(async (agentId: string) => {
    await loadAgent(agentId)
  }, [loadAgent])

  // Load initial data
  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  // Load specific agent if agentId is provided
  useEffect(() => {
    if (agentId) {
      loadAgent(agentId)
    }
  }, [agentId, loadAgent])

  return {
    // State
    agents,
    currentAgent,
    loading,
    error,
    testing,
    
    // Actions
    loadAgents,
    loadAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgent,
    testAgent,
    updatePersonality,
    updateConfiguration,
    
    // Utils
    refreshAgent,
    clearError
  }
}