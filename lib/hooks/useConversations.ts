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

// ============================================
// Unified useConversations Hook
// Supports both legacy API mode and optimized Firestore mode
// ============================================

interface UseConversationsProps {
  tenantId: string
  autoLoad?: boolean
  limit?: number
}

interface ConversationsState {
  conversations: ConversationListSummary[]
  selectedConversation: ConversationListSummary | null
  messages: ConversationMessage[]
  loading: boolean
  loadingMessages: boolean
  error: string | null
  hasMore: boolean
}

interface ConversationsFilters {
  search: string
  status: ConversationHeaderStatus | 'all'
  tags: string[]
  channel: 'all' | 'whatsapp' | 'facebook' | 'instagram'
}

interface ConversationStats {
  total: number
  active: number
  completed: number
  abandoned: number
  whatsapp: number
  facebook: number
  instagram: number
}

export function useConversations({
  tenantId,
  autoLoad = true,
  limit = 20
}: UseConversationsProps) {
  const [state, setState] = useState<ConversationsState>({
    conversations: [],
    selectedConversation: null,
    messages: [],
    // Start in loading state when auto-loading: the realtime subscription is
    // the single source of truth and will flip this to false on first snapshot.
    loading: autoLoad && !!tenantId,
    loadingMessages: false,
    error: null,
    hasMore: true,
  });

  const [filters, setFilters] = useState<ConversationsFilters>({
    search: '',
    status: 'all',
    tags: [],
    channel: 'all',
  });

  // Current real-time window size. loadMore grows it by `limit`; the subscription
  // re-subscribes with the larger limit (live updates preserved, reads bounded).
  const [pageSize, setPageSize] = useState(limit);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!tenantId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const service = createConversationService(tenantId);
      const summaries = await service.getConversationSummaries(undefined, pageSize);

      setState(prev => ({
        ...prev,
        conversations: summaries,
        loading: false,
        hasMore: summaries.length === pageSize,
      }));
    } catch (error) {
      logger.error('Error loading conversations', error instanceof Error ? error : undefined);

      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar conversas',
      }));
    }
  }, [tenantId, pageSize]);

  // Infinite scroll: grow the real-time window. The subscription effect
  // re-subscribes with the larger limit and updates hasMore from the result.
  const loadMoreConversations = useCallback(async () => {
    if (!tenantId || !state.hasMore || state.loading) return;
    setState(prev => ({ ...prev, loading: true }));
    setPageSize(prev => prev + limit);
  }, [tenantId, state.hasMore, state.loading, limit]);

  // Select conversation - messages will be loaded by the realtime subscription
  const selectConversation = useCallback(async (conversationId: string) => {
    if (!tenantId) return;

    const conversation = state.conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    // Set selected conversation and loading state
    // The useEffect with subscribeToMessages will automatically load messages
    setState(prev => ({
      ...prev,
      selectedConversation: conversation,
      loadingMessages: true,
      messages: [], // Clear previous messages while loading
    }));
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

  // Realtime listener for conversations list (single source of truth)
  // Note: there is intentionally no separate one-shot mount fetch — the
  // subscription delivers the initial snapshot and sets loading=false.
  useEffect(() => {
    if (!autoLoad || !tenantId) return;

    // Ensure loading reflects that we're (re)subscribing for a tenant.
    setState(prev => (prev.loading ? prev : { ...prev, loading: true }));

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

      // Merge with existing conversations to preserve lastMessage from initial load
      setState(prev => {
        const existingMap = new Map(prev.conversations.map(c => [c.id, c]));

        const mergedSummaries = summaries.map(newConv => {
          const existing = existingMap.get(newConv.id);
          // Use existing lastMessage if new one is empty (for backwards compatibility)
          if (!newConv.lastMessage && existing?.lastMessage) {
            return { ...newConv, lastMessage: existing.lastMessage };
          }
          return newConv;
        });

        return {
          ...prev,
          conversations: mergedSummaries,
          loading: false,
          hasMore: summaries.length === pageSize,
        };
      });
    }, pageSize);

    return () => {
      logger.info('🔥 [REALTIME] Cleaning up conversations list listener');
      unsubscribe();
    };
  }, [autoLoad, tenantId, pageSize]);

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

      // Always update with the latest messages from the subscription
      // The subscription is filtered by conversationId so we always get the correct messages
      setState(prev => ({
        ...prev,
        messages,
        loadingMessages: false,
      }));
    });

    return () => {
      logger.info('🔥 [REALTIME] Cleaning up message listener', { conversationId });
      unsubscribe();
    };
  }, [tenantId, state.selectedConversation?.id]);

  // Statistics
  const stats: ConversationStats = {
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
        conversationId,
        newName: newName?.substring(0, 20) + '***'
      });
    } catch (error) {
      logger.error('Error renaming conversation', {
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
