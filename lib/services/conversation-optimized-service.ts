import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import type {
  ConversationHeader,
  ConversationMessage,
  ConversationWithMessages,
  ConversationSummary,
  ConversationStatus
} from '@/lib/types/conversation-optimized';
import { logger } from '@/lib/utils/logger';

/**
 * Optimized Conversation Service
 * For the two-collection architecture (conversations + messages)
 */
export class ConversationOptimizedService {
  private tenantId: string;
  private services: TenantServiceFactory;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.services = new TenantServiceFactory(tenantId);
  }

  /**
   * Get conversations for a client
   */
  async getClientConversations(
    clientId: string,
    limit: number = 20
  ): Promise<ConversationHeader[]> {
    try {
      const conversations = await this.services.createService<ConversationHeader>('conversations')
        .getMany(
          [{ field: 'clientId', operator: '==', value: clientId }],
          {
            orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
            limit
          }
        );

      return conversations;
    } catch (error) {
      logger.error('Error fetching client conversations', {
        tenantId: this.tenantId,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get conversations by phone
   */
  async getConversationsByPhone(
    phone: string,
    limit: number = 20
  ): Promise<ConversationHeader[]> {
    try {
      const conversations = await this.services.createService<ConversationHeader>('conversations')
        .getMany(
          [{ field: 'clientPhone', operator: '==', value: phone }],
          {
            orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
            limit
          }
        );

      return conversations;
    } catch (error) {
      logger.error('Error fetching conversations by phone', {
        tenantId: this.tenantId,
        phone: phone?.substring(0, 8) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    order: 'asc' | 'desc' = 'asc'
  ): Promise<ConversationMessage[]> {
    try {
      // Validate conversationId
      if (!conversationId || conversationId === 'undefined') {
        logger.warn('Invalid conversationId provided', {
          tenantId: this.tenantId,
          conversationId
        });
        return [];
      }

      const messagesService = this.services.createService<ConversationMessage>('messages');

      if (!messagesService) {
        logger.error('Failed to create messages service', {
          tenantId: this.tenantId
        });
        return [];
      }

      const messages = await messagesService.getMany(
        [{ field: 'conversationId', operator: '==', value: conversationId }],
        {
          orderBy: [{ field: 'timestamp', direction: order }],
          limit
        }
      );

      return messages;
    } catch (error) {
      logger.error('Error fetching conversation messages', {
        tenantId: this.tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
  }

  /**
   * Get conversation with messages
   */
  async getConversationWithMessages(
    conversationId: string,
    messageLimit: number = 50
  ): Promise<ConversationWithMessages | null> {
    try {
      const conversation = await this.services.createService<ConversationHeader>('conversations')
        .get(conversationId);

      if (!conversation) {
        return null;
      }

      const messages = await this.getConversationMessages(conversationId, messageLimit);

      return {
        ...conversation,
        messages
      };
    } catch (error) {
      logger.error('Error fetching conversation with messages', {
        tenantId: this.tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get conversation summaries for display in lists with cursor pagination
   */
  async getConversationSummaries(
    clientId?: string,
    limit: number = 20,
    startAfter?: any
  ): Promise<ConversationSummary[]> {
    try {
      let conversations: ConversationHeader[];

      if (clientId) {
        conversations = await this.getClientConversations(clientId, limit);
      } else {
        // 🔧 FIX: Use getAll() instead of getMany([]) for fetching all conversations
        const conversationsService = this.services.createService<ConversationHeader>('conversations');

        // Check if service is properly initialized
        if (!conversationsService) {
          logger.error('Failed to create conversations service', {
            tenantId: this.tenantId
          });
          return [];
        }

        conversations = await conversationsService.getAll(limit);

        // Sort by lastMessageAt descending (getAll doesn't support orderBy)
        conversations = conversations.sort((a, b) => {
          const dateA = a.lastMessageAt?.toDate?.() || new Date(a.lastMessageAt || 0);
          const dateB = b.lastMessageAt?.toDate?.() || new Date(b.lastMessageAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
      }

      // Filter out conversations without ID (safety check)
      const validConversations = conversations.filter(conv => conv.id);

      if (validConversations.length === 0) {
        logger.info('No valid conversations found', {
          tenantId: this.tenantId,
          totalConversations: conversations.length
        });
        return [];
      }

      // Para cada conversa, buscar a última mensagem
      const summaries = await Promise.all(
        validConversations.map(async (conv) => {
          try {
            const lastMessages = await this.getConversationMessages(conv.id!, 1, 'desc');
            const lastMessage = lastMessages[0];

            return {
              id: conv.id!,
              clientName: conv.clientName,
              clientPhone: conv.clientPhone,
              lastMessage: lastMessage?.sofiaMessage || lastMessage?.clientMessage || '',
              lastMessageAt: conv.lastMessageAt,
              messageCount: conv.messageCount || 0,
              unreadCount: conv.unreadCount || 0,
              status: conv.status || 'active',
              isRead: conv.isRead !== false,  // Default true se não definido
              tags: conv.tags || [],
              outcome: conv.outcome
            } as ConversationSummary;
          } catch (messageError) {
            // If fetching messages fails, return conversation without last message
            logger.warn('Failed to fetch messages for conversation', {
              tenantId: this.tenantId,
              conversationId: conv.id,
              error: messageError instanceof Error ? messageError.message : 'Unknown error'
            });

            return {
              id: conv.id!,
              clientName: conv.clientName,
              clientPhone: conv.clientPhone,
              lastMessage: '',
              lastMessageAt: conv.lastMessageAt,
              messageCount: conv.messageCount || 0,
              unreadCount: conv.unreadCount || 0,
              status: conv.status || 'active',
              isRead: conv.isRead !== false,
              tags: conv.tags || [],
              outcome: conv.outcome
            } as ConversationSummary;
          }
        })
      );

      return summaries;
    } catch (error) {
      logger.error('Error fetching conversation summaries', {
        tenantId: this.tenantId,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(
    conversationId: string,
    status: ConversationStatus
  ): Promise<void> {
    try {
      await this.services.createService<ConversationHeader>('conversations')
        .update(conversationId, {
          status,
          updatedAt: new Date()
        });

      logger.info('Conversation status updated', {
        tenantId: this.tenantId,
        conversationId,
        status
      });
    } catch (error) {
      logger.error('Error updating conversation status', {
        tenantId: this.tenantId,
        conversationId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Link conversation to client
   */
  async linkConversationToClient(
    conversationId: string,
    clientId: string
  ): Promise<void> {
    try {
      await this.services.createService<ConversationHeader>('conversations')
        .update(conversationId, {
          clientId,
          updatedAt: new Date()
        });

      logger.info('Conversation linked to client', {
        tenantId: this.tenantId,
        conversationId,
        clientId
      });
    } catch (error) {
      logger.error('Error linking conversation to client', {
        tenantId: this.tenantId,
        conversationId,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    try {
      await this.services.createService<ConversationHeader>('conversations')
        .update(conversationId, {
          isRead: true,
          unreadCount: 0,
          lastReadAt: new Date(),
          updatedAt: new Date()
        });

      logger.info('Conversation marked as read', {
        tenantId: this.tenantId,
        conversationId
      });
    } catch (error) {
      logger.error('Error marking conversation as read', {
        tenantId: this.tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Mark conversation as unread
   */
  async markAsUnread(conversationId: string): Promise<void> {
    try {
      // Get current message count to set as unread count
      const conversation = await this.services.createService<ConversationHeader>('conversations')
        .get(conversationId);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      await this.services.createService<ConversationHeader>('conversations')
        .update(conversationId, {
          isRead: false,
          unreadCount: conversation.messageCount,
          updatedAt: new Date()
        });

      logger.info('Conversation marked as unread', {
        tenantId: this.tenantId,
        conversationId
      });
    } catch (error) {
      logger.error('Error marking conversation as unread', {
        tenantId: this.tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update conversation outcome (for success tracking)
   */
  async updateOutcome(
    conversationId: string,
    outcome: import('@/lib/types/conversation-optimized').ConversationOutcome
  ): Promise<void> {
    try {
      const updates: any = {
        outcome,
        updatedAt: new Date()
      };

      // If outcome is successful reservation, mark as success
      if (outcome.type === 'reservation' && outcome.reservationId) {
        updates.status = 'success';
      }

      await this.services.createService<ConversationHeader>('conversations')
        .update(conversationId, updates);

      logger.info('Conversation outcome updated', {
        tenantId: this.tenantId,
        conversationId,
        outcomeType: outcome.type
      });
    } catch (error) {
      logger.error('Error updating conversation outcome', {
        tenantId: this.tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get unread conversations count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const conversations = await this.services.createService<ConversationHeader>('conversations')
        .getMany(
          [{ field: 'isRead', operator: '==', value: false }],
          { limit: 1000 }
        );

      return conversations.length;
    } catch (error) {
      logger.error('Error getting unread count', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }
}

/**
 * Factory function
 */
export function createConversationOptimizedService(tenantId: string): ConversationOptimizedService {
  return new ConversationOptimizedService(tenantId);
}
