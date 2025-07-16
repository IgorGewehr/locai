import { OpenAI } from 'openai'
import { AIAgent, AIPersonality, AIConfiguration, BusinessContext, AIResponse } from '@/lib/types/ai'
import { Conversation, Message } from '@/lib/types/conversation'
import { AIResponseGenerator } from '@/lib/ai/response-generator'
import { ConversationContextManager } from '@/lib/ai/conversation-context'

export class AIService {
  private openai: OpenAI
  private agents: Map<string, AIAgent> = new Map()
  private generators: Map<string, AIResponseGenerator> = new Map()
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
    
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment variables!')
    } else {
      console.log('✅ OpenAI API key loaded successfully')
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey
    })

    // Load default agent
    this.loadDefaultAgent()
  }

  private loadDefaultAgent(): void {
    const defaultAgent: AIAgent = {
      id: 'ai-agent-default',
      name: 'Sofia',
      personality: {
        name: 'Sofia',
        tone: 'friendly',
        style: 'consultative',
        responseLength: 'adaptive',
        greetingMessage: '🏠 Olá! Sou a Sofia, sua assistente especializada em locações por temporada. Como posso ajudá-lo(a) hoje?',
        closingStyle: 'warm',
        specialityFocus: ['locação por temporada', 'propriedades premium', 'atendimento personalizado'],
        proactiveFollowUp: true,
        urgencyDetection: true,
        priceNegotiation: true,
        crossSelling: false
      },
      configuration: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        enabledFunctions: [],
        autoApproval: {
          maxReservationValue: 5000,
          maxDiscountPercentage: 15,
          trustedClientReservations: true,
          recurringClientDiscount: 5
        },
        businessRules: [],
        maxConversationsPerHour: 100,
        responseTimeLimit: 30,
        escalationTriggers: [
          {
            type: 'high_value',
            threshold: 10000,
            action: 'notify_human'
          },
          {
            type: 'complaint',
            threshold: 1,
            action: 'escalate_to_human'
          }
        ]
      },
      performance: {
        totalConversations: 0,
        conversionsToReservation: 0,
        conversionRate: 0,
        averageResponseTime: 2.5,
        customerSatisfaction: 0.85,
        revenueGenerated: 0,
        dailyStats: [],
        weeklyTrends: []
      },
      tenantId: this.tenantId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const businessContext: BusinessContext = {
      companyName: 'LocaI Temporada',
      location: 'Brasil',
      specialty: 'Locações por temporada premium',
      totalProperties: 150,
      maxDiscountPercentage: 20
    }

    this.agents.set(defaultAgent.id, defaultAgent)
    this.generators.set(defaultAgent.id, new AIResponseGenerator(
      this.openai,
      defaultAgent.personality,
      businessContext,
      this.tenantId
    ))
  }

  async processMessage(conversation: Conversation, message: Message): Promise<AIResponse> {
    try {
      const agentId = conversation.agentId || 'ai-agent-default'
      const generator = this.generators.get(agentId)

      if (!generator) {
        throw new Error(`AI generator not found for agent ${agentId}`)
      }

      // Update conversation context
      const contextManager = new ConversationContextManager(conversation.context)
      contextManager.updateFromMessage(message)

      const updatedContext = contextManager.getContext()

      // Generate AI response
      const aiResponse = await generator.generateResponse(
        conversation,
        message,
        updatedContext
      )

      // Update agent performance
      await this.updateAgentPerformance(agentId, aiResponse)

      return aiResponse

    } catch (error) {
      // Return fallback response
      return {
        content: 'Desculpe, estou com dificuldades técnicas no momento. Um de nossos especialistas entrará em contato em breve.',
        confidence: 0.1,
        sentiment: { score: 0, label: 'neutral', confidence: 0.5 },
        suggestedActions: ['escalate_to_human']
      }
    }
  }

  async updateAgentConfiguration(agentId: string, config: Partial<AIConfiguration>): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }

    agent.configuration = { ...agent.configuration, ...config }
    agent.updatedAt = new Date()

    // Recreate generator with new configuration
    const businessContext: BusinessContext = {
      companyName: 'LocaI Temporada',
      location: 'Brasil',
      specialty: 'Locações por temporada premium',
      totalProperties: 150,
      maxDiscountPercentage: config.autoApproval?.maxDiscountPercentage || 20
    }

    this.generators.set(agentId, new AIResponseGenerator(
      this.openai,
      agent.personality,
      businessContext,
      this.tenantId
    ))
  }

  async updateAgentPersonality(agentId: string, personality: Partial<AIPersonality>): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }

    agent.personality = { ...agent.personality, ...personality }
    agent.updatedAt = new Date()

    // Recreate generator with new personality
    const businessContext: BusinessContext = {
      companyName: 'LocaI Temporada',
      location: 'Brasil',
      specialty: 'Locações por temporada premium',
      totalProperties: 150,
      maxDiscountPercentage: 20
    }

    this.generators.set(agentId, new AIResponseGenerator(
      this.openai,
      agent.personality,
      businessContext,
      this.tenantId
    ))
  }

  private async updateAgentPerformance(agentId: string, response: AIResponse): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) return

    agent.performance.totalConversations++

    // Update average response time (simplified calculation)
    const responseTime = 2.5 // This would be calculated from actual timing
    agent.performance.averageResponseTime = (
      (agent.performance.averageResponseTime * (agent.performance.totalConversations - 1)) + responseTime
    ) / agent.performance.totalConversations

    // Update conversion rate if reservation was made
    if (response.functionCall?.name === 'create_reservation' && response.functionCall.result?.success) {
      agent.performance.conversionsToReservation++
      agent.performance.conversionRate = agent.performance.conversionsToReservation / agent.performance.totalConversations
    }

    // Update daily stats
    const today = new Date().toISOString().split('T')[0]
    let dailyStat = agent.performance.dailyStats.find(stat => 
      stat.date.toISOString().split('T')[0] === today
    )

    if (!dailyStat) {
      dailyStat = {
        date: new Date(),
        conversations: 0,
        conversions: 0,
        revenue: 0,
        averageResponseTime: 0
      }
      agent.performance.dailyStats.push(dailyStat)
    }

    dailyStat.conversations++
    dailyStat.averageResponseTime = (dailyStat.averageResponseTime + responseTime) / 2

    if (response.functionCall?.name === 'create_reservation' && response.functionCall.result?.success) {
      dailyStat.conversions++
      dailyStat.revenue += response.functionCall.result.reservation?.totalAmount || 0
    }

    // Keep only last 30 days of stats
    agent.performance.dailyStats = agent.performance.dailyStats
      .filter(stat => {
        const statDate = new Date(stat.date)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return statDate >= thirtyDaysAgo
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  async getAgent(agentId: string): Promise<AIAgent | null> {
    return this.agents.get(agentId) || null
  }

  async getAllAgents(): Promise<AIAgent[]> {
    return Array.from(this.agents.values())
  }

  async createAgent(agentData: Omit<AIAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIAgent> {
    const newAgent: AIAgent = {
      ...agentData,
      id: `ai-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.agents.set(newAgent.id, newAgent)

    // Create generator for new agent
    const businessContext: BusinessContext = {
      companyName: 'LocaI Temporada',
      location: 'Brasil',
      specialty: 'Locações por temporada premium',
      totalProperties: 150,
      maxDiscountPercentage: newAgent.configuration.autoApproval?.maxDiscountPercentage || 20
    }

    this.generators.set(newAgent.id, new AIResponseGenerator(
      this.openai,
      newAgent.personality,
      businessContext,
      this.tenantId
    ))

    return newAgent
  }

  async deleteAgent(agentId: string): Promise<void> {
    this.agents.delete(agentId)
    this.generators.delete(agentId)
  }

  async testAgent(agentId: string, testMessage: string): Promise<AIResponse> {
    const generator = this.generators.get(agentId)
    if (!generator) {
      throw new Error(`Agent ${agentId} not found`)
    }

    // Create a test conversation and message
    const testConversation: Conversation = {
      id: 'test-conversation',
      clientId: 'test-client',
      agentId: agentId,
      tenantId: this.tenantId,
      whatsappPhone: '',
      status: 'active' as any,
      stage: 'greeting' as any,
      intent: 'information' as any,
      priority: 'medium' as any,
      messages: [],
      summary: {
        mainTopic: 'Test conversation',
        keyPoints: [],
        sentimentOverall: { score: 0, label: 'neutral', confidence: 0.5 },
        stage: 'greeting' as any,
        nextSteps: []
      },
      context: {
        clientPreferences: { amenities: [], communicationStyle: 'formal' },
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
      }
    }

    const testMsg: Message = {
      id: 'test-message',
      conversationId: 'test-conversation',
      content: testMessage,
      type: 'text' as any,
      direction: 'inbound',
      isFromAI: false,
      timestamp: new Date(),
      status: 'received' as any
    }

    return await generator.generateResponse(testConversation, testMsg, testConversation.context)
  }

  async getAgentPerformance(agentId: string, days: number = 30): Promise<any> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }

    const performance = agent.performance
    const recentStats = performance.dailyStats.filter(stat => {
      const statDate = new Date(stat.date)
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - days)
      return statDate >= daysAgo
    })

    return {
      agentId,
      agentName: agent.name,
      period: `${days} days`,
      totalConversations: performance.totalConversations,
      conversionRate: performance.conversionRate,
      averageResponseTime: performance.averageResponseTime,
      customerSatisfaction: performance.customerSatisfaction,
      revenueGenerated: performance.revenueGenerated,
      dailyStats: recentStats,
      trends: {
        conversationsGrowth: this.calculateGrowth(recentStats, 'conversations'),
        conversionsGrowth: this.calculateGrowth(recentStats, 'conversions'),
        revenueGrowth: this.calculateGrowth(recentStats, 'revenue')
      }
    }
  }

  private calculateGrowth(stats: any[], field: string): number {
    if (stats.length < 2) return 0

    const recent = stats.slice(-7) // Last 7 days
    const previous = stats.slice(-14, -7) // Previous 7 days

    const recentSum = recent.reduce((sum, stat) => sum + (stat[field] || 0), 0)
    const previousSum = previous.reduce((sum, stat) => sum + (stat[field] || 0), 0)

    if (previousSum === 0) return recentSum > 0 ? 100 : 0

    return ((recentSum - previousSum) / previousSum) * 100
  }

  async exportConversationData(conversationId: string): Promise<any> {
    // This would export conversation data for training or analysis
    return {
      conversationId,
      exported: true,
      timestamp: new Date()
    }
  }

  async importTrainingData(data: any): Promise<void> {
    // This would import training data to improve the AI
    }

  // Health check for the AI service
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Test OpenAI connection
      await this.openai.models.list()

      return {
        status: 'healthy',
        details: {
          openaiConnected: true,
          activeAgents: this.agents.size,
          tenantId: this.tenantId,
          timestamp: new Date()
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          openaiConnected: false,
          activeAgents: this.agents.size,
          tenantId: this.tenantId,
          timestamp: new Date()
        }
      }
    }
  }
}