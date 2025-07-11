import { useState, useEffect, useCallback } from 'react'
import { Conversation, Message, ConversationStatus, ConversationStage } from '@/lib/types/conversation'

interface UseConversationsProps {
  tenantId?: string
  clientId?: string
  status?: ConversationStatus
  stage?: ConversationStage
  limit?: number
  realtime?: boolean
}

interface UseConversationsReturn {
  // State
  conversations: Conversation[]
  currentConversation: Conversation | null
  loading: boolean
  error: string | null
  stats: ConversationStats | null

  // Actions
  loadConversations: () => Promise<void>
  loadConversation: (conversationId: string) => Promise<void>
  createConversation: (phoneNumber: string, clientName?: string) => Promise<Conversation>
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>
  addMessage: (conversationId: string, message: Partial<Message>) => Promise<void>
  escalateToHuman: (conversationId: string, reason: string) => Promise<void>
  completeConversation: (conversationId: string, outcome: any) => Promise<void>

  // Filters
  setFilters: (filters: ConversationFilters) => void
  clearFilters: () => void

  // Utils
  refreshConversations: () => Promise<void>
  refreshConversation: (conversationId: string) => Promise<void>
  clearError: () => void
}

interface ConversationStats {
  total: number
  active: number
  completed: number
  escalated: number
  averageConfidence: number
  averageMessages: number
  conversions: number
}

interface ConversationFilters {
  status?: ConversationStatus
  stage?: ConversationStage
  clientId?: string
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

export function useConversations({
  tenantId = 'default',
  clientId,
  status,
  stage,
  limit = 50,
  realtime = false
}: UseConversationsProps = {}): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ConversationStats | null>(null)
  const [filters, setFiltersState] = useState<ConversationFilters>({
    status,
    stage,
    clientId
  })

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((error: any, context: string) => {
    setError(error instanceof Error ? error.message : `Error in ${context}`)
  }, [])

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()

    params.append('tenantId', tenantId)
    params.append('limit', limit.toString())

    if (filters.status) params.append('status', filters.status)
    if (filters.stage) params.append('stage', filters.stage)
    if (filters.clientId) params.append('clientId', filters.clientId)
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString())
    if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString())
    if (filters.search) params.append('search', filters.search)

    return params.toString()
  }, [tenantId, limit, filters])

  const loadConversations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = buildQueryParams()
      const response = await fetch(`/api/conversations?${queryParams}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load conversations')
      }

      setConversations(data.conversations || [])

      // Load stats if no specific filters are applied
      if (!filters.clientId && !filters.search) {
        await loadStats()
      }
    } catch (error) {
      handleError(error, 'loadConversations')
    } finally {
      setLoading(false)
    }
  }, [buildQueryParams, filters.clientId, filters.search, handleError])

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/stats?tenantId=${tenantId}`)
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      }
  }, [tenantId])

  const loadConversation = useCallback(async (conversationId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/conversations/${conversationId}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load conversation')
      }

      setCurrentConversation(data.conversation)
    } catch (error) {
      handleError(error, 'loadConversation')
    } finally {
      setLoading(false)
    }
  }, [handleError])

  const createConversation = useCallback(async (phoneNumber: string, clientName?: string): Promise<Conversation> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          clientName,
          tenantId
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create conversation')
      }

      const newConversation = data.conversation

      // Update local state
      setConversations(prev => [newConversation, ...prev])

      return newConversation
    } catch (error) {
      handleError(error, 'createConversation')
      throw error
    } finally {
      setLoading(false)
    }
  }, [tenantId, handleError])

  const updateConversation = useCallback(async (conversationId: string, updates: Partial<Conversation>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to update conversation')
      }

      // Update local state
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, ...updates } : conv
      ))

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, ...updates } : null)
      }
    } catch (error) {
      handleError(error, 'updateConversation')
    } finally {
      setLoading(false)
    }
  }, [currentConversation, handleError])

  const deleteConversation = useCallback(async (conversationId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete conversation')
      }

      // Update local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null)
      }
    } catch (error) {
      handleError(error, 'deleteConversation')
    } finally {
      setLoading(false)
    }
  }, [currentConversation, handleError])

  const addMessage = useCallback(async (conversationId: string, message: Partial<Message>) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to add message')
      }

      // Refresh conversation to get updated messages
      await refreshConversation(conversationId)
    } catch (error) {
      handleError(error, 'addMessage')
    }
  }, [handleError])

  const escalateToHuman = useCallback(async (conversationId: string, reason: string) => {
    await updateConversation(conversationId, {
      status: ConversationStatus.ESCALATED,
      outcome: {
        type: 'information',
        leadScore: 50,
        followUpRequired: true,
        notes: `Escalated to human: ${reason}`
      }
    })
  }, [updateConversation])

  const completeConversation = useCallback(async (conversationId: string, outcome: any) => {
    await updateConversation(conversationId, {
      status: ConversationStatus.COMPLETED,
      endedAt: new Date(),
      outcome
    })
  }, [updateConversation])

  const setFilters = useCallback((newFilters: ConversationFilters) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState({})
  }, [])

  const refreshConversations = useCallback(async () => {
    await loadConversations()
  }, [loadConversations])

  const refreshConversation = useCallback(async (conversationId: string) => {
    await loadConversation(conversationId)
  }, [loadConversation])

  // Load initial data
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Realtime updates (simplified - would use WebSocket in production)
  useEffect(() => {
    if (!realtime) return

    const interval = setInterval(() => {
      loadConversations()
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [realtime, loadConversations])

  return {
    // State
    conversations,
    currentConversation,
    loading,
    error,
    stats,

    // Actions
    loadConversations,
    loadConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    escalateToHuman,
    completeConversation,

    // Filters
    setFilters,
    clearFilters,

    // Utils
    refreshConversations,
    refreshConversation,
    clearError
  }
}