import {
  Conversation,
  Message,
  ConversationStatus,
  ConversationStage,
  ConversationIntent,
  ConversationPriority,
  MessageStatus
} from '@/lib/types/conversation'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { Timestamp } from 'firebase/firestore'
import { clientServiceWrapper } from './client-service'

class ConversationService {
  private getTenantService(tenantId: string) {
    return new TenantServiceFactory(tenantId)
  }

  async findByPhone(phoneNumber: string, tenantId: string): Promise<Conversation | null> {
    try {
      if (!tenantId) {
        throw new Error('TenantId is required for conversation lookup')
      }

      const services = this.getTenantService(tenantId)

      // Primeiro, tenta encontrar uma conversa ativa
      const activeConversations = await services.conversations.getMany([
        { field: 'whatsappPhone', operator: '==', value: phoneNumber },
        { field: 'status', operator: 'in', value: [ConversationStatus.ACTIVE, ConversationStatus.WAITING_CLIENT] }
      ])

      if (activeConversations.length > 0) {
        return activeConversations[0] as Conversation
      }

      // Se não encontrar ativa, busca a mais recente para esse número
      const allConversations = await services.conversations.getMany([
        { field: 'whatsappPhone', operator: '==', value: phoneNumber }
      ])

      if (allConversations.length > 0) {
        // Ordenar por lastMessageAt e pegar a mais recente
        const sortedConversations = allConversations.sort((a: any, b: any) => {
          const aTime = a.lastMessageAt?.toDate?.() || new Date(a.lastMessageAt || 0)
          const bTime = b.lastMessageAt?.toDate?.() || new Date(b.lastMessageAt || 0)
          return bTime.getTime() - aTime.getTime()
        })

        const conversation = sortedConversations[0] as Conversation

        // Reativa a conversa mais recente
        await services.conversations.update(conversation.id!, { status: ConversationStatus.ACTIVE })

        return { ...conversation, status: ConversationStatus.ACTIVE }
      }

      return null
    } catch (error) {
      console.error('Error finding conversation by phone:', error)
      return null
    }
  }

  async findActiveByPhone(phoneNumber: string, tenantId: string): Promise<Conversation | null> {
    try {
      const services = this.getTenantService(tenantId)

      const conversations = await services.conversations.getMany([
        { field: 'whatsappPhone', operator: '==', value: phoneNumber },
        { field: 'status', operator: '==', value: ConversationStatus.ACTIVE }
      ])

      return conversations[0] || null
    } catch (error) {
      return null
    }
  }

  async findBySocialId(socialId: string, channel: 'facebook' | 'instagram', tenantId: string): Promise<Conversation | null> {
    try {
      if (!tenantId) {
        throw new Error('TenantId is required for conversation lookup')
      }

      const services = this.getTenantService(tenantId)

      // Try to find active conversation first
      const activeConversations = await services.conversations.getMany([
        { field: 'socialId', operator: '==', value: socialId },
        { field: 'channel', operator: '==', value: channel },
        { field: 'status', operator: 'in', value: [ConversationStatus.ACTIVE, ConversationStatus.WAITING_CLIENT] }
      ])

      if (activeConversations.length > 0) {
        return activeConversations[0] as Conversation
      }

      // Find most recent
      const allConversations = await services.conversations.getMany([
        { field: 'socialId', operator: '==', value: socialId },
        { field: 'channel', operator: '==', value: channel }
      ])

      if (allConversations.length > 0) {
        const sortedConversations = allConversations.sort((a: any, b: any) => {
          const aTime = a.lastMessageAt?.toDate?.() || new Date(a.lastMessageAt || 0)
          const bTime = b.lastMessageAt?.toDate?.() || new Date(b.lastMessageAt || 0)
          return bTime.getTime() - aTime.getTime()
        })

        const conversation = sortedConversations[0] as Conversation
        await services.conversations.update(conversation.id!, { status: ConversationStatus.ACTIVE })
        return { ...conversation, status: ConversationStatus.ACTIVE }
      }

      return null
    } catch (error) {
      console.error('Error finding conversation by social ID:', error)
      return null
    }
  }

  async createNew(phoneNumber: string, tenantId: string, clientName?: string): Promise<Conversation> {
    return this.createConversation({
      identifier: phoneNumber,
      channel: 'whatsapp',
      clientName,
      tenantId
    })
  }

  async createNewSocial(socialId: string, channel: 'facebook' | 'instagram', clientName: string, tenantId: string): Promise<Conversation> {
    return this.createConversation({
      identifier: socialId,
      channel,
      clientName,
      tenantId
    })
  }

  private async createConversation(params: {
    identifier: string,
    channel: 'whatsapp' | 'facebook' | 'instagram',
    clientName?: string,
    tenantId: string
  }): Promise<Conversation> {
    try {
      const { identifier, channel, clientName, tenantId } = params

      if (!tenantId) {
        throw new Error('TenantId is required for conversation creation')
      }

      const services = this.getTenantService(tenantId)

      // Find or create client
      // For social, we might need a different lookup if we don't have phone
      // For now, we'll try to find by phone if it's whatsapp, or create a new client for social

      let client
      if (channel === 'whatsapp') {
        client = await clientServiceWrapper.findByPhone(identifier, tenantId)
        if (!client) {
          client = await clientServiceWrapper.createOrUpdate({
            name: clientName || '',
            phone: identifier,
            tenantId,
            source: channel
          })
        }
      } else {
        // For social, we might not have phone. We need to handle client creation without phone or with a placeholder
        // Assuming clientService can handle this or we generate a dummy phone
        // TODO: Update ClientService to support social ID lookup
        // For now, using a placeholder phone
        const placeholderPhone = `social_${channel}_${identifier}`
        client = await clientServiceWrapper.createOrUpdate({
          name: clientName || 'Social User',
          phone: placeholderPhone,
          tenantId,
          source: channel
        })
      }

      const conversation: Omit<Conversation, 'id'> = {
        clientId: client.id,
        agentId: 'ai-agent-default',
        tenantId,
        whatsappPhone: channel === 'whatsapp' ? identifier : undefined,
        socialId: channel !== 'whatsapp' ? identifier : undefined,
        channel,
        status: ConversationStatus.ACTIVE,
        stage: ConversationStage.GREETING,
        intent: ConversationIntent.INFORMATION,
        priority: ConversationPriority.MEDIUM,
        messages: [],
        summary: {
          mainTopic: 'Nova conversa iniciada',
          keyPoints: [],
          sentimentOverall: { score: 0, label: 'neutral', confidence: 0.5 },
          stage: ConversationStage.GREETING,
          nextSteps: ['Identificar necessidades do cliente']
        },
        context: {
          clientPreferences: {
            amenities: [],
            communicationStyle: 'formal'
          },
          previousConversations: [],
          clientScore: 0,
          viewedProperties: [],
          favoriteProperties: [],
          searchCriteria: {},
          flexibleDates: false,
          specialRequests: [],
          pendingQuestions: [],
          nextAction: 'greeting'
        },
        sentiment: { score: 0, label: 'neutral', confidence: 0.5 },
        confidence: 0.8,
        extractedInfo: {},
        startedAt: new Date(),
        lastMessageAt: new Date(),
        outcome: {
          type: 'information',
          leadScore: 0,
          followUpRequired: false,
          notes: ''
        },
        // Campos necessários para a página de conversas
        clientName: clientName || client.name || 'Cliente',
        clientPhone: channel === 'whatsapp' ? identifier : 'Social User',
        lastMessage: 'Conversa iniciada',
        assignedAgent: 'AI Sofia',
        unreadCount: 0,
        isStarred: false,
        tags: []
      } as Conversation

      const conversationId = await services.conversations.create(conversation)
      return { id: conversationId, ...conversation } as Conversation
    } catch (error) {
      throw error
    }
  }

  // Métodos essenciais para compatibilidade com APIs existentes
  async getActiveConversations(tenantId: string, limit: number = 50): Promise<Conversation[]> {
    try {
      const services = this.getTenantService(tenantId)
      return await services.conversations.getMany([
        { field: 'status', operator: '==', value: ConversationStatus.ACTIVE }
      ]) as Conversation[]
    } catch (error) {
      return []
    }
  }

  async searchConversations(tenantId: string, filters: any): Promise<Conversation[]> {
    try {
      const services = this.getTenantService(tenantId)
      const conditions: any[] = []

      if (filters.status) {
        conditions.push({ field: 'status', operator: '==', value: filters.status })
      }

      if (filters.stage) {
        conditions.push({ field: 'stage', operator: '==', value: filters.stage })
      }

      return await services.conversations.getMany(conditions) as Conversation[]
    } catch (error) {
      return []
    }
  }

  async getConversationsByClient(clientId: string, tenantId: string): Promise<Conversation[]> {
    try {
      const services = this.getTenantService(tenantId)
      return await services.conversations.getMany([
        { field: 'clientId', operator: '==', value: clientId }
      ]) as Conversation[]
    } catch (error) {
      return []
    }
  }

  async addMessage(conversationId: string, messageData: Partial<Message>, tenantId: string): Promise<Message> {
    try {
      const conversation = await this.getById(conversationId, tenantId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Import messageService to save in the separate collection
      const { messageService } = await import('@/lib/firebase/firestore')

      // Filter out undefined values from messageData
      const filteredMessageData = Object.fromEntries(
        Object.entries(messageData).filter(([_, value]) => value !== undefined)
      )

      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        content: messageData.content || '',
        type: messageData.type || 'text',
        direction: messageData.direction || 'inbound',
        isFromAI: messageData.isFromAI || false,
        timestamp: messageData.timestamp || new Date(),
        status: messageData.status || MessageStatus.RECEIVED,
        ...filteredMessageData
      }

      // Save message to the separate messages collection
      const { id, ...messageWithoutId } = message
      await messageService.create(messageWithoutId)

      // Add message to conversation's internal array
      const updatedMessages = [...(conversation.messages || []), message]

      // Filter out undefined values before updating
      const updateData = {
        messages: updatedMessages,
        lastMessageAt: message.timestamp,
        lastMessage: message.content.substring(0, 100) // Update lastMessage field
      }

      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => {
          return value !== undefined &&
            value !== null &&
            !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
        })
      )

      await this.update(conversationId, filteredUpdateData, tenantId)

      return message
    } catch (error) {
      throw error
    }
  }

  async updateMessageStatus(messageId: string, status: string, timestamp: Date, tenantId: string): Promise<void> {
    try {
      // Find conversation containing this message
      const conversations = await this.query(
        this.collection.where('messages', 'array-contains-any', [{ whatsappMessageId: messageId }])
      )

      if (conversations.length === 0) {
        return
      }

      const conversation = conversations[0]
      const updatedMessages = conversation.messages.map(msg => {
        if (msg.whatsappMessageId === messageId) {
          return {
            ...msg,
            status: status as MessageStatus,
            deliveredAt: status === 'delivered' ? timestamp : msg.deliveredAt,
            readAt: status === 'read' ? timestamp : msg.readAt
          }
        }
        return msg
      })

      // Filter out undefined values before updating
      const updateData = { messages: updatedMessages }
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => {
          return value !== undefined &&
            value !== null &&
            !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
        })
      )

      if (Object.keys(filteredUpdateData).length > 0) {
        await this.update(conversation.id, filteredUpdateData, tenantId)
      }
    } catch (error) {
    }
  }

  async updateConversationFromAI(conversationId: string, aiResponse: any, tenantId: string): Promise<void> {
    try {
      const updates: Partial<Conversation> = {
        lastMessageAt: new Date()
      }

      // Only add fields that are not undefined
      if (aiResponse.confidence !== undefined) {
        updates.confidence = aiResponse.confidence
      }

      if (aiResponse.sentiment !== undefined) {
        updates.sentiment = aiResponse.sentiment
      }

      // Update stage based on AI response
      if (aiResponse.functionCall) {
        const functionName = aiResponse.functionCall.name

        switch (functionName) {
          case 'search_properties':
            updates.stage = ConversationStage.PROPERTY_SHOWING
            break
          case 'calculate_total_price':
            updates.stage = ConversationStage.NEGOTIATION
            break
          case 'create_reservation':
            updates.stage = ConversationStage.CONFIRMATION
            updates.status = ConversationStatus.COMPLETED
            break
        }
      }

      // Filter out undefined values before updating
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => {
          return value !== undefined &&
            value !== null &&
            !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
        })
      )

      if (Object.keys(filteredUpdates).length > 0) {
        await this.update(conversationId, filteredUpdates, tenantId)
      }
    } catch (error) {
    }
  }

  async escalateToHuman(conversationId: string, reason: string, tenantId: string, urgency: string = 'medium'): Promise<void> {
    try {
      await this.update(conversationId, {
        status: ConversationStatus.ESCALATED,
        priority: urgency as ConversationPriority,
        outcome: {
          type: 'information',
          leadScore: 50,
          followUpRequired: true,
          notes: `Escalated to human: ${reason}`
        }
      }, tenantId)

    } catch (error) {
      throw error
    }
  }

  async getConversationStats(tenantId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const services = this.getTenantService(tenantId)
      const conversations = await services.conversations.getMany([
        { field: 'startedAt', operator: '>=', value: startDate }
      ]) as Conversation[]

      const stats = {
        total: conversations.length,
        active: conversations.filter(c => c.status === ConversationStatus.ACTIVE).length,
        completed: conversations.filter(c => c.status === ConversationStatus.COMPLETED).length,
        escalated: conversations.filter(c => c.status === ConversationStatus.ESCALATED).length,
        averageConfidence: conversations.reduce((sum, c) => sum + (c.confidence || 0), 0) / conversations.length || 0,
        averageMessages: conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0) / conversations.length || 0,
        conversions: conversations.filter(c => c.outcome?.type === 'reservation').length
      }

      return stats
    } catch (error) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        escalated: 0,
        averageConfidence: 0,
        averageMessages: 0,
        conversions: 0
      }
    }
  }

  async updateContext(conversationId: string, context: any, tenantId: string): Promise<void> {
    try {
      await this.update(conversationId, { context }, tenantId)
    } catch (error) {
      throw error
    }
  }

  async completeConversation(conversationId: string, outcome: any, tenantId: string): Promise<void> {
    try {
      await this.update(conversationId, {
        status: ConversationStatus.COMPLETED,
        endedAt: new Date(),
        outcome
      }, tenantId)
    } catch (error) {
      throw error
    }
  }

  async getRecentMessages(conversationId: string, tenantId: string, limit: number = 10): Promise<Message[]> {
    try {
      const conversation = await this.getById(conversationId, tenantId)
      if (!conversation) return []

      return (conversation.messages || [])
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
    } catch (error) {
      return []
    }
  }

  // Method to handle Date objects for Firestore
  protected toFirestore(data: any): any {
    const result = { ...data }

    // Convert Date objects to Firestore Timestamps
    if (result.startedAt instanceof Date) {
      result.startedAt = Timestamp.fromDate(result.startedAt)
    }
    if (result.lastMessageAt instanceof Date) {
      result.lastMessageAt = Timestamp.fromDate(result.lastMessageAt)
    }
    if (result.endedAt instanceof Date) {
      result.endedAt = Timestamp.fromDate(result.endedAt)
    }
    if (result.followUpScheduled instanceof Date) {
      result.followUpScheduled = Timestamp.fromDate(result.followUpScheduled)
    }

    // Convert message timestamps
    if (result.messages && Array.isArray(result.messages)) {
      result.messages = result.messages.map((msg: Message) => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? Timestamp.fromDate(msg.timestamp) : msg.timestamp,
        deliveredAt: msg.deliveredAt instanceof Date ? Timestamp.fromDate(msg.deliveredAt) : msg.deliveredAt,
        readAt: msg.readAt instanceof Date ? Timestamp.fromDate(msg.readAt) : msg.readAt
      }))
    }

    return result
  }

  // Method to handle Timestamps from Firestore
  protected fromFirestore(data: any): any {
    const result = { ...data }

    // Convert Firestore Timestamps to Date objects
    if (result.startedAt?.toDate) {
      result.startedAt = result.startedAt.toDate()
    }
    if (result.lastMessageAt?.toDate) {
      result.lastMessageAt = result.lastMessageAt.toDate()
    }
    if (result.endedAt?.toDate) {
      result.endedAt = result.endedAt.toDate()
    }
    if (result.followUpScheduled?.toDate) {
      result.followUpScheduled = result.followUpScheduled.toDate()
    }

    // Convert message timestamps
    if (result.messages && Array.isArray(result.messages)) {
      result.messages = result.messages.map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : msg.timestamp,
        deliveredAt: msg.deliveredAt?.toDate ? msg.deliveredAt.toDate() : msg.deliveredAt,
        readAt: msg.readAt?.toDate ? msg.readAt.toDate() : msg.readAt
      }))
    }

    return result
  }

  // Basic CRUD methods that are being called but were missing
  async getById(conversationId: string, tenantId: string): Promise<Conversation | null> {
    try {
      if (!tenantId) {
        throw new Error('TenantId is required for conversation lookup')
      }

      const services = this.getTenantService(tenantId)
      const doc = await services.conversations.getById(conversationId)
      return doc ? this.fromFirestore(doc) : null
    } catch (error) {
      console.error('Error getting conversation by ID:', error)
      return null
    }
  }

  async update(conversationId: string, updates: Partial<Conversation>, tenantId: string): Promise<void> {
    try {
      if (!tenantId) {
        throw new Error('TenantId is required for conversation update')
      }

      const services = this.getTenantService(tenantId)
      const firestoreData = this.toFirestore(updates)
      await services.conversations.update(conversationId, firestoreData)
    } catch (error) {
      console.error('Error updating conversation:', error)
      throw error
    }
  }

  async delete(conversationId: string, tenantId: string): Promise<void> {
    try {
      if (!tenantId) {
        throw new Error('TenantId is required for conversation deletion')
      }

      const services = this.getTenantService(tenantId)
      await services.conversations.delete(conversationId)
    } catch (error) {
      console.error('Error deleting conversation:', error)
      throw error
    }
  }
}

export const conversationService = new ConversationService()
export { ConversationService }

// ============================================
// Optimized Conversation Service
// Two-collection architecture (conversations + messages)
// ============================================

import type {
  ConversationHeader,
  ConversationMessage,
  ConversationWithMessages,
  ConversationListSummary,
  ConversationHeaderStatus,
  ConversationHeaderOutcome
} from '@/lib/types/conversation';
import { logger } from '@/lib/utils/logger';

/**
 * Optimized Conversation Service
 * For the two-collection architecture (conversations + messages)
 */
export class ConversationServiceOptimized {
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
            orderBy: 'lastMessageAt',
            orderDirection: 'desc',
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
            orderBy: 'lastMessageAt',
            orderDirection: 'desc',
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
          orderBy: 'createdAt',
          orderDirection: order,
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
   * Get conversation summaries for display in lists
   */
  async getConversationSummaries(
    clientId?: string,
    limit: number = 20
  ): Promise<ConversationListSummary[]> {
    try {
      let conversations: ConversationHeader[];

      if (clientId) {
        conversations = await this.getClientConversations(clientId, limit);
      } else {
        const conversationsService = this.services.createService<ConversationHeader>('conversations');

        if (!conversationsService) {
          logger.error('Failed to create conversations service', {
            tenantId: this.tenantId
          });
          return [];
        }

        conversations = await conversationsService.getAll(limit);

        conversations = conversations.sort((a, b) => {
          const dateA = (a.lastMessageAt as any)?.toDate?.() || new Date(a.lastMessageAt || 0);
          const dateB = (b.lastMessageAt as any)?.toDate?.() || new Date(b.lastMessageAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
      }

      const validConversations = conversations.filter(conv => conv.id);

      if (validConversations.length === 0) {
        return [];
      }

      const summaries = await Promise.all(
        validConversations.map(async (conv) => {
          try {
            const lastMessages = await this.getConversationMessages(conv.id!, 1, 'desc');
            const lastMessage = lastMessages[0];

            return {
              id: conv.id!,
              clientName: conv.clientName,
              clientPhone: conv.clientPhone,
              channel: conv.channel || 'whatsapp',
              lastMessage: lastMessage?.sofiaMessage || lastMessage?.clientMessage || conv.lastMessage || '',
              lastMessageAt: conv.lastMessageAt,
              messageCount: conv.messageCount || 0,
              unreadCount: conv.unreadCount || 0,
              status: conv.status || 'active',
              isRead: conv.isRead !== false,
              tags: conv.tags || [],
              outcome: conv.outcome
            } as ConversationListSummary;
          } catch {
            return {
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
            } as ConversationListSummary;
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
      return [];
    }
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(
    conversationId: string,
    status: ConversationHeaderStatus
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
   * Update conversation outcome
   */
  async updateOutcome(
    conversationId: string,
    outcome: ConversationHeaderOutcome
  ): Promise<void> {
    try {
      const updates: any = {
        outcome,
        updatedAt: new Date()
      };

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

  /**
   * Subscribe to realtime message updates for a conversation
   */
  subscribeToMessages(
    conversationId: string,
    callback: (messages: ConversationMessage[]) => void,
    limit: number = 100
  ): () => void {
    try {
      logger.info('🔥 [REALTIME] Setting up Firestore listener for messages', {
        tenantId: this.tenantId.substring(0, 8) + '***',
        conversationId,
        limit
      });

      const messagesService = this.services.createService<ConversationMessage>('messages');

      const unsubscribe = messagesService.onSnapshot((allMessages) => {
        const conversationMessages = allMessages
          .filter(msg => msg.conversationId === conversationId)
          .sort((a, b) => {
            const timeA = a.clientMessageTimestamp || a.createdAt;
            const timeB = b.clientMessageTimestamp || b.createdAt;
            if (!timeA || !timeB) return 0;

            const dateA = typeof timeA === 'string' ? new Date(timeA) : timeA;
            const dateB = typeof timeB === 'string' ? new Date(timeB) : timeB;

            return dateA.getTime() - dateB.getTime();
          })
          .slice(-limit);

        logger.info('🔥 [REALTIME] Messages snapshot received', {
          tenantId: this.tenantId.substring(0, 8) + '***',
          conversationId,
          totalMessages: allMessages.length,
          conversationMessages: conversationMessages.length
        });

        callback(conversationMessages);
      });

      return unsubscribe;
    } catch (error) {
      logger.error('Error setting up message subscription', {
        tenantId: this.tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return () => {};
    }
  }

  /**
   * Subscribe to realtime conversation list updates
   */
  subscribeToConversations(
    callback: (conversations: ConversationHeader[]) => void,
    limit: number = 50
  ): () => void {
    try {
      logger.info('🔥 [REALTIME] Setting up Firestore listener for conversations list', {
        tenantId: this.tenantId.substring(0, 8) + '***',
        limit
      });

      const conversationsService = this.services.createService<ConversationHeader>('conversations');

      const unsubscribe = conversationsService.onSnapshot((conversations) => {
        const sortedConversations = conversations
          .filter(conv => conv.id)
          .sort((a, b) => {
            const dateA = (a.lastMessageAt as any)?.toDate?.() || new Date(a.lastMessageAt || 0);
            const dateB = (b.lastMessageAt as any)?.toDate?.() || new Date(b.lastMessageAt || 0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, limit);

        logger.info('🔥 [REALTIME] Conversations snapshot received', {
          tenantId: this.tenantId.substring(0, 8) + '***',
          totalConversations: sortedConversations.length
        });

        callback(sortedConversations);
      });

      return unsubscribe;
    } catch (error) {
      logger.error('Error setting up conversations subscription', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return () => {};
    }
  }

  /**
   * Rename conversation
   */
  async renameConversation(
    conversationId: string,
    newName: string
  ): Promise<void> {
    try {
      await this.services.createService<ConversationHeader>('conversations')
        .update(conversationId, {
          clientName: newName,
          updatedAt: new Date()
        });

      logger.info('Conversation renamed', {
        tenantId: this.tenantId,
        conversationId,
        newName: newName?.substring(0, 20) + '***'
      });
    } catch (error) {
      logger.error('Error renaming conversation', {
        tenantId: this.tenantId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

/**
 * Factory function for optimized service
 */
export function createConversationService(tenantId: string): ConversationServiceOptimized {
  return new ConversationServiceOptimized(tenantId);
}

// Alias for backward compatibility
export const createConversationOptimizedService = createConversationService;
export { ConversationServiceOptimized as ConversationOptimizedService };