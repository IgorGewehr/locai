import { useState, useEffect, useCallback } from 'react';
import { createConversationOptimizedService } from '@/lib/services/conversation-optimized-service';
import type { ConversationSummary, ConversationMessage, ConversationStatus } from '@/lib/types/conversation-optimized';
import { logger } from '@/lib/utils/logger';

interface UseConversationsOptimizedOptions {
  tenantId: string;
  autoLoad?: boolean;
  limit?: number;
}

interface ConversationsState {
  conversations: ConversationSummary[];
  selectedConversation: ConversationSummary | null;
  messages: ConversationMessage[];
  loading: boolean;
  loadingMessages: boolean;
  error: string | null;
  hasMore: boolean;
}

interface ConversationsFilters {
  search: string;
  status: ConversationStatus | 'all';
  tags: string[];
}

export function useConversationsOptimized({
  tenantId,
  autoLoad = true,
  limit = 20
}: UseConversationsOptimizedOptions) {
  const [state, setState] = useState<ConversationsState>({
    conversations: [],
    selectedConversation: null,
    messages: [],
    loading: false,
    loadingMessages: false,
    error: null,
    hasMore: true,
  });

  const [filters, setFilters] = useState<ConversationsFilters>({
    search: '',
    status: 'all',
    tags: [],
  });

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!tenantId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const service = createConversationOptimizedService(tenantId);
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
      const service = createConversationOptimizedService(tenantId);
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
      const service = createConversationOptimizedService(tenantId);
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

  // Filter conversations (client-side for better UX)
  const filteredConversations = state.conversations.filter(conv => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = conv.clientName?.toLowerCase().includes(searchLower);
      const phoneMatch = conv.clientPhone.includes(searchLower);
      const messageMatch = conv.lastMessage?.toLowerCase().includes(searchLower);

      if (!nameMatch && !phoneMatch && !messageMatch) {
        return false;
      }
    }

    // Status filter
    if (filters.status !== 'all' && conv.status !== filters.status) {
      return false;
    }

    // Tags filter
    if (filters.tags.length > 0) {
      const hasTag = filters.tags.some(tag => conv.tags.includes(tag));
      if (!hasTag) {
        return false;
      }
    }

    return true;
  });

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && tenantId) {
      loadConversations();
    }
  }, [autoLoad, tenantId, loadConversations]);

  // Statistics
  const stats = {
    total: state.conversations.length,
    active: state.conversations.filter(c => c.status === 'active').length,
    completed: state.conversations.filter(c => c.status === 'completed').length,
    abandoned: state.conversations.filter(c => c.status === 'abandoned').length,
  };

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!tenantId) return;

    try {
      const service = createConversationOptimizedService(tenantId);
      await service.markAsRead(conversationId);

      // Update local state
      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(c =>
          c.id === conversationId
            ? { ...c, isRead: true, unreadCount: 0 }
            : c
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
      const service = createConversationOptimizedService(tenantId);
      await service.markAsUnread(conversationId);

      // Update local state
      setState(prev => {
        const conversation = prev.conversations.find(c => c.id === conversationId);
        return {
          ...prev,
          conversations: prev.conversations.map(c =>
            c.id === conversationId
              ? { ...c, isRead: false, unreadCount: c.messageCount }
              : c
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
  const updateStatus = useCallback(async (conversationId: string, status: ConversationStatus) => {
    if (!tenantId) return;

    try {
      const service = createConversationOptimizedService(tenantId);
      await service.updateConversationStatus(conversationId, status);

      // Update local state
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
  };
}
