import { 
  Conversation, 
  Message, 
  ConversationStatus, 
  ConversationStage, 
  ConversationIntent,
  ConversationPriority,
  MessageStatus 
} from '@/lib/types/conversation'
import { FirestoreService } from '@/lib/firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { clientServiceWrapper } from './client-service'

class ConversationService extends FirestoreService<Conversation> {
  constructor() {
    super('conversations')
  }

  async findByPhone(phoneNumber: string, tenantId?: string): Promise<Conversation | null> {
    try {
      // Primeiro, tenta encontrar uma conversa ativa
      let query = this.collection
        .where('whatsappPhone', '==', phoneNumber)
        .where('status', 'in', [ConversationStatus.ACTIVE, ConversationStatus.WAITING_CLIENT])

      if (tenantId) {
        query = query.where('tenantId', '==', tenantId)
      }

      let conversations = await this.query(query.limit(1))
      
      // Se não encontrar ativa, busca a mais recente para esse número
      if (conversations.length === 0) {
        query = this.collection
          .where('whatsappPhone', '==', phoneNumber)
          .orderBy('lastMessageAt', 'desc')
        
        if (tenantId) {
          query = query.where('tenantId', '==', tenantId)
        }
        
        conversations = await this.query(query.limit(1))
        
        // Reativa a conversa mais recente
        if (conversations.length > 0) {
          const conversation = conversations[0]
          await this.update(conversation.id, { status: ConversationStatus.ACTIVE })
          return { ...conversation, status: ConversationStatus.ACTIVE }
        }
      }
      
      return conversations[0] || null
    } catch (error) {
      return null
    }
  }

  async findActiveByPhone(phoneNumber: string, tenantId: string): Promise<Conversation | null> {
    try {
      const conversations = await this.query(
        this.collection
          .where('whatsappPhone', '==', phoneNumber)
          .where('tenantId', '==', tenantId)
          .where('status', '==', ConversationStatus.ACTIVE)
          .limit(1)
      )

      return conversations[0] || null
    } catch (error) {
      return null
    }
  }

  async createNew(phoneNumber: string, clientName?: string, tenantId: string = 'default'): Promise<Conversation> {
    try {
      // Find or create client
      let client = await clientServiceWrapper.findByPhone(phoneNumber, tenantId)

      if (!client) {
        client = await clientServiceWrapper.create({
          name: clientName || '',
          phone: phoneNumber,
          tenantId,
          source: 'whatsapp',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      const conversation: Omit<Conversation, 'id'> = {
        clientId: client.id,
        agentId: 'ai-agent-default',
        tenantId,
        whatsappPhone: phoneNumber,
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
        clientPhone: phoneNumber,
        lastMessage: 'Conversa iniciada',
        assignedAgent: 'AI Sofia',
        unreadCount: 0,
        isStarred: false,
        tags: []
      }

      return await this.create(conversation)
    } catch (error) {
      throw error
    }
  }

  async addMessage(conversationId: string, messageData: Partial<Message>): Promise<Message> {
    try {
      const conversation = await this.getById(conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

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

      // Add message to conversation
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

      await this.update(conversationId, filteredUpdateData)

      return message
    } catch (error) {
      throw error
    }
  }

  async updateMessageStatus(messageId: string, status: string, timestamp: Date): Promise<void> {
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
        await this.update(conversation.id, filteredUpdateData)
      }
    } catch (error) {
      }
  }

  async updateConversationFromAI(conversationId: string, aiResponse: any): Promise<void> {
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
        await this.update(conversationId, filteredUpdates)
      }
    } catch (error) {
      }
  }

  async escalateToHuman(conversationId: string, reason: string, urgency: string = 'medium'): Promise<void> {
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
      })

      } catch (error) {
      throw error
    }
  }

  async getActiveConversations(tenantId: string, limit: number = 50): Promise<Conversation[]> {
    try {
      return await this.query(
        this.collection
          .where('tenantId', '==', tenantId)
          .where('status', 'in', [ConversationStatus.ACTIVE, ConversationStatus.WAITING_CLIENT])
          .orderBy('lastMessageAt', 'desc')
          .limit(limit)
      )
    } catch (error) {
      return []
    }
  }

  async getConversationStats(tenantId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const conversations = await this.query(
        this.collection
          .where('tenantId', '==', tenantId)
          .where('startedAt', '>=', startDate)
      )

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

  async searchConversations(tenantId: string, filters: any): Promise<Conversation[]> {
    try {
      let query = this.collection.where('tenantId', '==', tenantId)

      if (filters.status) {
        query = query.where('status', '==', filters.status)
      }

      if (filters.stage) {
        query = query.where('stage', '==', filters.stage)
      }

      if (filters.startDate) {
        query = query.where('startedAt', '>=', filters.startDate)
      }

      if (filters.endDate) {
        query = query.where('startedAt', '<=', filters.endDate)
      }

      query = query.orderBy('startedAt', 'desc')

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      return await this.query(query)
    } catch (error) {
      return []
    }
  }

  async getConversationsByClient(clientId: string): Promise<Conversation[]> {
    try {
      return await this.query(
        this.collection
          .where('clientId', '==', clientId)
          .orderBy('startedAt', 'desc')
      )
    } catch (error) {
      return []
    }
  }

  async updateContext(conversationId: string, context: any): Promise<void> {
    try {
      await this.update(conversationId, { context })
    } catch (error) {
      throw error
    }
  }

  async completeConversation(conversationId: string, outcome: any): Promise<void> {
    try {
      await this.update(conversationId, {
        status: ConversationStatus.COMPLETED,
        endedAt: new Date(),
        outcome
      })
    } catch (error) {
      throw error
    }
  }

  async getRecentMessages(conversationId: string, limit: number = 10): Promise<Message[]> {
    try {
      const conversation = await this.getById(conversationId)
      if (!conversation) return []

      return (conversation.messages || [])
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
    } catch (error) {
      return []
    }
  }

  // Override the toFirestore method to handle Date objects
  protected override toFirestore(data: any): any {
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

  // Override the fromFirestore method to handle Timestamps
  protected override fromFirestore(data: any): any {
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
}

export const conversationService = new ConversationService()
export { ConversationService }