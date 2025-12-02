import { useState, useEffect, useCallback } from 'react'
import {
  Conversation,
  Message,
  ConversationStatus,
  ConversationStage,
  ConversationListSummary,
  ConversationMessage,
  ConversationHeaderStatus
} from '@/lib/types/conversation'
import { createConversationService } from '@/lib/services/conversation-service'
import { logger } from '@/lib/utils/logger'

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

// ============================================
// Optimized Hook for Two-Collection Architecture
// ============================================

interface UseConversationsOptimizedOptions {
  tenantId: string;
  autoLoad?: boolean;
  limit?: number;
}

interface ConversationsOptimizedState {
  conversations: ConversationListSummary[];
  selectedConversation: ConversationListSummary | null;
  messages: ConversationMessage[];
  loading: boolean;
  loadingMessages: boolean;
  error: string | null;
  hasMore: boolean;
}

interface ConversationsOptimizedFilters {
  search: string;
  status: ConversationHeaderStatus | 'all';
  tags: string[];
  channel: 'all' | 'whatsapp' | 'facebook' | 'instagram';
}

export function useConversationsOptimized({
  tenantId,
  autoLoad = true,
  limit = 20
}: UseConversationsOptimizedOptions) {
  const [state, setState] = useState<ConversationsOptimizedState>({
    conversations: [],
    selectedConversation: null,
    messages: [],
    loading: false,
    loadingMessages: false,
    error: null,
    hasMore: true,
  });

  const [filters, setFilters] = useState<ConversationsOptimizedFilters>({
    search: '',
    status: 'all',
    tags: [],
    channel: 'all',
  });

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!tenantId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const service = createConversationService(tenantId);
      const summaries = await service.getConversationSummaries(undefined, limit);

      setState(prev => ({
        ...prev,
        conversations: summaries,
        loading: false,
        hasMore: summaries.length === limit,
      }));
    } catch (error) {
      logger.error('Error loading conversations', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar conversas',
      }));
    }
  }, [tenantId, limit]);

  // Load more conversations (infinite scroll)
  const loadMoreConversations = useCallback(async () => {
    if (!tenantId || !state.hasMore || state.loading) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const service = createConversationService(tenantId);
      const summaries = await service.getConversationSummaries(undefined, limit);

      setState(prev => ({
        ...prev,
        conversations: [...prev.conversations, ...summaries],
        loading: false,
        hasMore: summaries.length === limit,
      }));
    } catch (error) {
      logger.error('Error loading more conversations', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      setState(prev => ({ ...prev, loading: false }));
    }
  }, [tenantId, limit, state.hasMore, state.loading]);

  // Select conversation and load messages
  const selectConversation = useCallback(async (conversationId: string) => {
    if (!tenantId) return;

    const conversation = state.conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    setState(prev => ({
      ...prev,
      selectedConversation: conversation,
      loadingMessages: true,
      messages: [],
    }));

    try {
      const service = createConversationService(tenantId);
      const messages = await service.getConversationMessages(conversationId, 100, 'asc');

      setState(prev => ({
        ...prev,
        messages,
        loadingMessages: false,
      }));
    } catch (error) {
      logger.error('Error loading conversation messages', {
        tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      setState(prev => ({
        ...prev,
        loadingMessages: false,
        error: 'Erro ao carregar mensagens',
      }));
    }
  }, [tenantId, state.conversations]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedConversation: null,
      messages: [],
    }));
  }, []);

  // Refresh conversations
  const refresh = useCallback(() => {
    loadConversations();
  }, [loadConversations]);

  // Filter conversations (client-side)
  const filteredConversations = state.conversations.filter(conv => {
    if (filters.channel !== 'all') {
      const convChannel = conv.channel || 'whatsapp';
      if (convChannel !== filters.channel) return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = conv.clientName?.toLowerCase().includes(searchLower);
      const phoneMatch = conv.clientPhone.includes(searchLower);
      const messageMatch = conv.lastMessage?.toLowerCase().includes(searchLower);
      if (!nameMatch && !phoneMatch && !messageMatch) return false;
    }

    if (filters.status !== 'all' && conv.status !== filters.status) return false;

    if (filters.tags.length > 0) {
      const hasTag = filters.tags.some(tag => conv.tags.includes(tag));
      if (!hasTag) return false;
    }

    return true;
  });

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && tenantId) {
      loadConversations();
    }
  }, [autoLoad, tenantId, loadConversations]);

  // Realtime listener for conversations list
  useEffect(() => {
    if (!autoLoad || !tenantId) return;

    logger.info('🔥 [REALTIME] Setting up conversations list listener', {
      tenantId: tenantId.substring(0, 8) + '***'
    });

    const service = createConversationService(tenantId);

    const unsubscribe = service.subscribeToConversations((conversations) => {
      logger.info('🔥 [REALTIME] Conversations list updated', {
        count: conversations.length
      });

      const summaries = conversations.map((conv) => ({
        id: conv.id!,
        clientName: conv.clientName,
        clientPhone: conv.clientPhone,
        channel: conv.channel || 'whatsapp',
        lastMessage: conv.lastMessage || '',
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount || 0,
        unreadCount: conv.unreadCount || 0,
        status: conv.status || 'active',
        isRead: conv.isRead !== false,
        tags: conv.tags || [],
        outcome: conv.outcome
      })) as ConversationListSummary[];

      setState(prev => ({
        ...prev,
        conversations: summaries,
        loading: false,
        hasMore: summaries.length === limit,
      }));
    }, limit);

    return () => {
      logger.info('🔥 [REALTIME] Cleaning up conversations list listener');
      unsubscribe();
    };
  }, [autoLoad, tenantId, limit]);

  // Realtime listener for selected conversation messages
  useEffect(() => {
    if (!tenantId || !state.selectedConversation?.id) return;

    const conversationId = state.selectedConversation.id;
    logger.info('🔥 [REALTIME] Setting up message listener', {
      tenantId: tenantId.substring(0, 8) + '***',
      conversationId
    });

    const service = createConversationService(tenantId);

    const unsubscribe = service.subscribeToMessages(conversationId, (messages) => {
      logger.info('🔥 [REALTIME] Messages updated', {
        conversationId,
        messageCount: messages.length
      });

      setState(prev => ({
        ...prev,
        messages,
      }));
    });

    return () => {
      logger.info('🔥 [REALTIME] Cleaning up message listener', { conversationId });
      unsubscribe();
    };
  }, [tenantId, state.selectedConversation?.id]);

  // Statistics
  const stats = {
    total: state.conversations.length,
    active: state.conversations.filter(c => c.status === 'active').length,
    completed: state.conversations.filter(c => c.status === 'completed').length,
    abandoned: state.conversations.filter(c => c.status === 'abandoned').length,
    whatsapp: state.conversations.filter(c => (c.channel || 'whatsapp') === 'whatsapp').length,
    facebook: state.conversations.filter(c => c.channel === 'facebook').length,
    instagram: state.conversations.filter(c => c.channel === 'instagram').length,
  };

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!tenantId) return;

    try {
      const service = createConversationService(tenantId);
      await service.markAsRead(conversationId);

      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(c =>
          c.id === conversationId ? { ...c, isRead: true, unreadCount: 0 } : c
        ),
        selectedConversation: prev.selectedConversation?.id === conversationId
          ? { ...prev.selectedConversation, isRead: true, unreadCount: 0 }
          : prev.selectedConversation,
      }));
    } catch (error) {
      logger.error('Error marking conversation as read', {
        tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [tenantId]);

  // Mark conversation as unread
  const markAsUnread = useCallback(async (conversationId: string) => {
    if (!tenantId) return;

    try {
      const service = createConversationService(tenantId);
      await service.markAsUnread(conversationId);

      setState(prev => {
        const conversation = prev.conversations.find(c => c.id === conversationId);
        return {
          ...prev,
          conversations: prev.conversations.map(c =>
            c.id === conversationId ? { ...c, isRead: false, unreadCount: c.messageCount } : c
          ),
          selectedConversation: prev.selectedConversation?.id === conversationId && conversation
            ? { ...prev.selectedConversation, isRead: false, unreadCount: conversation.messageCount }
            : prev.selectedConversation,
        };
      });
    } catch (error) {
      logger.error('Error marking conversation as unread', {
        tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [tenantId]);

  // Update conversation status
  const updateStatus = useCallback(async (conversationId: string, status: ConversationHeaderStatus) => {
    if (!tenantId) return;

    try {
      const service = createConversationService(tenantId);
      await service.updateConversationStatus(conversationId, status);

      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(c =>
          c.id === conversationId ? { ...c, status } : c
        ),
        selectedConversation: prev.selectedConversation?.id === conversationId
          ? { ...prev.selectedConversation, status }
          : prev.selectedConversation,
      }));
    } catch (error) {
      logger.error('Error updating conversation status', {
        tenantId,
        conversationId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [tenantId]);

  // Rename conversation
  const renameConversation = useCallback(async (conversationId: string, newName: string) => {
    if (!tenantId) return;

    try {
      const service = createConversationService(tenantId);
      await service.renameConversation(conversationId, newName);

      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(c =>
          c.id === conversationId ? { ...c, clientName: newName } : c
        ),
        selectedConversation: prev.selectedConversation?.id === conversationId
          ? { ...prev.selectedConversation, clientName: newName }
          : prev.selectedConversation,
      }));

      logger.info('Conversation renamed successfully', {
        tenantId,
        conversationId,
        newName: newName?.substring(0, 20) + '***'
      });
    } catch (error) {
      logger.error('Error renaming conversation', {
        tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, [tenantId]);

  return {
    // State
    conversations: filteredConversations,
    allConversations: state.conversations,
    selectedConversation: state.selectedConversation,
    messages: state.messages,
    loading: state.loading,
    loadingMessages: state.loadingMessages,
    error: state.error,
    hasMore: state.hasMore,
    stats,

    // Filters
    filters,
    setFilters,

    // Actions
    selectConversation,
    clearSelection,
    refresh,
    loadMoreConversations,
    markAsRead,
    markAsUnread,
    updateStatus,
    renameConversation,
  };
}