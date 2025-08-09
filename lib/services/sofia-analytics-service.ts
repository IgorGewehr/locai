// lib/services/sofia-analytics-service.ts
import { logger } from '@/lib/utils/logger'
import { db } from '@/lib/firebase/config'
import { collection, doc, setDoc, updateDoc, increment, serverTimestamp, getDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { AgentContext } from '@/lib/types/ai'

/**
 * Métricas de conversa do agente Sofia
 */
export interface ConversationMetrics {
  conversationId: string
  tenantId: string
  clientPhone: string
  startTime: Date
  endTime?: Date
  duration?: number // em segundos
  messageCount: number
  
  // Métricas de interação
  messagesFromClient: number
  messagesFromAgent: number
  functionsExecuted: string[]
  functionCallCount: number
  
  // Métricas de negócio
  intentsDetected: string[]
  propertiesViewed: string[]
  propertiesInterested: string[]
  priceCalculations: number
  reservationCreated: boolean
  reservationId?: string
  clientRegistered: boolean
  clientId?: string
  
  // Métricas de qualidade
  responseTimeAvg: number // ms
  errorCount: number
  fallbackCount: number
  conversationStatus: 'active' | 'completed' | 'abandoned'
  sentimentScore?: number // -1 a 1
  satisfactionScore?: number // 1 a 5
  
  // Contexto
  searchFilters?: any
  priceRange?: { min: number; max: number }
  checkInDate?: Date
  checkOutDate?: Date
  guestCount?: number
  
  // Timestamps
  createdAt: any
  updatedAt: any
}

/**
 * Métricas agregadas por período
 */
export interface AggregatedMetrics {
  period: 'daily' | 'weekly' | 'monthly'
  date: Date
  tenantId: string
  
  // Volume
  totalConversations: number
  uniqueClients: number
  totalMessages: number
  avgMessagesPerConversation: number
  
  // Engajamento
  avgConversationDuration: number // segundos
  conversationCompletionRate: number // %
  responseRate: number // %
  
  // Conversão
  viewToInterestRate: number // %
  interestToCalculationRate: number // %
  calculationToReservationRate: number // %
  overallConversionRate: number // %
  
  // Performance
  avgResponseTime: number // ms
  errorRate: number // %
  fallbackRate: number // %
  
  // Satisfação
  avgSentimentScore: number
  avgSatisfactionScore: number
  
  // Top insights
  topIntents: { intent: string; count: number }[]
  topProperties: { propertyId: string; views: number }[]
  topSearchFilters: { filter: string; count: number }[]
  peakHours: { hour: number; count: number }[]
  
  // Timestamps
  createdAt: any
  updatedAt: any
}

/**
 * Insights de negócio derivados das conversas
 */
export interface BusinessInsights {
  tenantId: string
  period: Date
  
  // Demanda
  mostRequestedLocations: { location: string; count: number }[]
  mostRequestedDates: { date: string; count: number }[]
  avgGuestCount: number
  avgStayDuration: number // dias
  
  // Pricing
  avgBudget: number
  priceElasticity: number // sensibilidade a preço
  discountRequests: number
  
  // Comportamento
  browsingPatterns: {
    avgPropertiesViewed: number
    avgTimeToDecision: number // minutos
    abandonmentPoints: string[]
  }
  
  // Oportunidades
  missedOpportunities: {
    reason: string
    count: number
    potentialRevenue: number
  }[]
  
  // Recomendações
  recommendations: {
    type: 'pricing' | 'availability' | 'property' | 'service'
    suggestion: string
    impact: 'high' | 'medium' | 'low'
    estimatedRevenue?: number
  }[]
}

class SofiaAnalyticsService {
  private metricsCollection = 'conversation_metrics'
  private aggregatedCollection = 'aggregated_metrics'
  private insightsCollection = 'business_insights'

  /**
   * Inicia o tracking de uma nova conversa
   */
  async startConversation(
    tenantId: string, 
    conversationId: string, 
    clientPhone: string
  ): Promise<void> {
    try {
      const metrics: Partial<ConversationMetrics> = {
        conversationId,
        tenantId,
        clientPhone,
        startTime: new Date(),
        messageCount: 0,
        messagesFromClient: 0,
        messagesFromAgent: 0,
        functionsExecuted: [],
        functionCallCount: 0,
        intentsDetected: [],
        propertiesViewed: [],
        propertiesInterested: [],
        priceCalculations: 0,
        reservationCreated: false,
        clientRegistered: false,
        responseTimeAvg: 0,
        errorCount: 0,
        fallbackCount: 0,
        conversationStatus: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = doc(db, `tenants/${tenantId}/${this.metricsCollection}`, conversationId)
      await setDoc(docRef, metrics)
      
      logger.info('📊 [Sofia Analytics] Conversation tracking started', { 
        conversationId, 
        clientPhone 
      })
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error starting conversation tracking', { error })
    }
  }

  /**
   * Atualiza métricas após cada mensagem
   */
  async trackMessage(
    tenantId: string,
    conversationId: string,
    isFromClient: boolean,
    responseTime?: number
  ): Promise<void> {
    try {
      const docRef = doc(db, `tenants/${tenantId}/${this.metricsCollection}`, conversationId)
      
      const updates: any = {
        messageCount: increment(1),
        updatedAt: serverTimestamp()
      }

      if (isFromClient) {
        updates.messagesFromClient = increment(1)
      } else {
        updates.messagesFromAgent = increment(1)
        
        if (responseTime) {
          // Atualizar média de tempo de resposta
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            const data = docSnap.data() as ConversationMetrics
            const currentAvg = data.responseTimeAvg || 0
            const msgCount = data.messagesFromAgent || 1
            const newAvg = ((currentAvg * (msgCount - 1)) + responseTime) / msgCount
            updates.responseTimeAvg = Math.round(newAvg)
          }
        }
      }

      await updateDoc(docRef, updates)
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error tracking message', { error })
    }
  }

  /**
   * Rastreia execução de função
   */
  async trackFunctionCall(
    tenantId: string,
    conversationId: string,
    functionName: string,
    result?: any
  ): Promise<void> {
    try {
      const docRef = doc(db, `tenants/${tenantId}/${this.metricsCollection}`, conversationId)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        logger.warn('⚠️ [Sofia Analytics] Conversation not found for function tracking', { 
          conversationId 
        })
        return
      }

      const data = docSnap.data() as ConversationMetrics
      const functionsExecuted = [...(data.functionsExecuted || []), functionName]
      
      const updates: any = {
        functionsExecuted,
        functionCallCount: increment(1),
        updatedAt: serverTimestamp()
      }

      // Atualizar métricas específicas baseadas na função
      switch (functionName) {
        case 'search_properties':
          if (result?.properties) {
            const propertyIds = result.properties.map((p: any) => p.id)
            updates.propertiesViewed = [...new Set([...(data.propertiesViewed || []), ...propertyIds])]
          }
          if (result?.filters) {
            updates.searchFilters = result.filters
          }
          break
          
        case 'calculate_price':
          updates.priceCalculations = increment(1)
          if (result?.property) {
            const interested = data.propertiesInterested || []
            if (!interested.includes(result.property)) {
              updates.propertiesInterested = [...interested, result.property]
            }
          }
          break
          
        case 'create_reservation':
          updates.reservationCreated = true
          if (result?.reservationId) {
            updates.reservationId = result.reservationId
          }
          break
          
        case 'register_client':
          updates.clientRegistered = true
          if (result?.clientId) {
            updates.clientId = result.clientId
          }
          break
      }

      await updateDoc(docRef, updates)
      
      logger.info('📊 [Sofia Analytics] Function call tracked', { 
        conversationId, 
        functionName 
      })
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error tracking function call', { error })
    }
  }

  /**
   * Detecta e rastreia intenções do cliente
   */
  async trackIntent(
    tenantId: string,
    conversationId: string,
    intent: string
  ): Promise<void> {
    try {
      const docRef = doc(db, `tenants/${tenantId}/${this.metricsCollection}`, conversationId)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) return

      const data = docSnap.data() as ConversationMetrics
      const intents = data.intentsDetected || []
      
      if (!intents.includes(intent)) {
        await updateDoc(docRef, {
          intentsDetected: [...intents, intent],
          updatedAt: serverTimestamp()
        })
      }
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error tracking intent', { error })
    }
  }

  /**
   * Atualiza contexto da conversa
   */
  async updateContext(
    tenantId: string,
    conversationId: string,
    context: Partial<AgentContext>
  ): Promise<void> {
    try {
      const docRef = doc(db, `tenants/${tenantId}/${this.metricsCollection}`, conversationId)
      
      const updates: any = {
        updatedAt: serverTimestamp()
      }

      if (context.searchFilters) {
        updates.searchFilters = context.searchFilters
        
        // Extrair informações de filtros
        if (context.searchFilters.priceMin || context.searchFilters.priceMax) {
          updates.priceRange = {
            min: context.searchFilters.priceMin || 0,
            max: context.searchFilters.priceMax || 999999
          }
        }
        
        if (context.searchFilters.checkIn) {
          updates.checkInDate = context.searchFilters.checkIn
        }
        
        if (context.searchFilters.checkOut) {
          updates.checkOutDate = context.searchFilters.checkOut
        }
        
        if (context.searchFilters.guests) {
          updates.guestCount = context.searchFilters.guests
        }
      }

      if (context.interestedProperties?.length) {
        updates.propertiesInterested = context.interestedProperties
      }

      if (context.sentiment) {
        updates.sentimentScore = context.sentiment
      }

      await updateDoc(docRef, updates)
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error updating context', { error })
    }
  }

  /**
   * Finaliza tracking de conversa
   */
  async endConversation(
    tenantId: string,
    conversationId: string,
    status: 'completed' | 'abandoned' = 'completed'
  ): Promise<void> {
    try {
      const docRef = doc(db, `tenants/${tenantId}/${this.metricsCollection}`, conversationId)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) return

      const data = docSnap.data() as ConversationMetrics
      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - data.startTime.getTime()) / 1000)

      await updateDoc(docRef, {
        endTime,
        duration,
        conversationStatus: status,
        updatedAt: serverTimestamp()
      })
      
      // Agregar métricas
      await this.aggregateMetrics(tenantId)
      
      logger.info('📊 [Sofia Analytics] Conversation ended', { 
        conversationId, 
        duration, 
        status 
      })
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error ending conversation', { error })
    }
  }

  /**
   * Agrega métricas diárias
   */
  private async aggregateMetrics(tenantId: string): Promise<void> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Buscar todas as conversas do dia
      const metricsQuery = query(
        collection(db, `tenants/${tenantId}/${this.metricsCollection}`),
        where('startTime', '>=', Timestamp.fromDate(today))
      )
      
      const snapshot = await getDocs(metricsQuery)
      
      if (snapshot.empty) return

      const conversations = snapshot.docs.map(doc => doc.data() as ConversationMetrics)
      
      // Calcular métricas agregadas
      const totalConversations = conversations.length
      const uniqueClients = new Set(conversations.map(c => c.clientPhone)).size
      const totalMessages = conversations.reduce((sum, c) => sum + c.messageCount, 0)
      const avgMessagesPerConversation = totalMessages / totalConversations
      
      const completedConversations = conversations.filter(c => c.conversationStatus === 'completed')
      const conversationCompletionRate = (completedConversations.length / totalConversations) * 100
      
      const conversationsWithReservation = conversations.filter(c => c.reservationCreated).length
      const overallConversionRate = (conversationsWithReservation / totalConversations) * 100
      
      const avgDuration = conversations
        .filter(c => c.duration)
        .reduce((sum, c) => sum + (c.duration || 0), 0) / completedConversations.length
      
      const avgResponseTime = conversations
        .filter(c => c.responseTimeAvg > 0)
        .reduce((sum, c) => sum + c.responseTimeAvg, 0) / conversations.filter(c => c.responseTimeAvg > 0).length
      
      const totalErrors = conversations.reduce((sum, c) => sum + c.errorCount, 0)
      const totalFunctionCalls = conversations.reduce((sum, c) => sum + c.functionCallCount, 0)
      const errorRate = totalFunctionCalls > 0 ? (totalErrors / totalFunctionCalls) * 100 : 0
      
      // Calcular top insights
      const intentCounts = new Map<string, number>()
      conversations.forEach(c => {
        c.intentsDetected?.forEach(intent => {
          intentCounts.set(intent, (intentCounts.get(intent) || 0) + 1)
        })
      })
      const topIntents = Array.from(intentCounts.entries())
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
      
      const propertyViews = new Map<string, number>()
      conversations.forEach(c => {
        c.propertiesViewed?.forEach(propId => {
          propertyViews.set(propId, (propertyViews.get(propId) || 0) + 1)
        })
      })
      const topProperties = Array.from(propertyViews.entries())
        .map(([propertyId, views]) => ({ propertyId, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
      
      // Calcular horários de pico
      const hourCounts = new Map<number, number>()
      conversations.forEach(c => {
        const hour = new Date(c.startTime).getHours()
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
      })
      const peakHours = Array.from(hourCounts.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
      
      const aggregated: AggregatedMetrics = {
        period: 'daily',
        date: today,
        tenantId,
        totalConversations,
        uniqueClients,
        totalMessages,
        avgMessagesPerConversation: Math.round(avgMessagesPerConversation * 10) / 10,
        avgConversationDuration: Math.round(avgDuration || 0),
        conversationCompletionRate: Math.round(conversationCompletionRate * 10) / 10,
        responseRate: 100, // Assumindo que sempre respondemos
        viewToInterestRate: this.calculateConversionRate(conversations, 'viewed', 'interested'),
        interestToCalculationRate: this.calculateConversionRate(conversations, 'interested', 'calculated'),
        calculationToReservationRate: this.calculateConversionRate(conversations, 'calculated', 'reserved'),
        overallConversionRate: Math.round(overallConversionRate * 10) / 10,
        avgResponseTime: Math.round(avgResponseTime || 0),
        errorRate: Math.round(errorRate * 10) / 10,
        fallbackRate: 0, // TODO: implementar tracking de fallbacks
        avgSentimentScore: this.calculateAvgSentiment(conversations),
        avgSatisfactionScore: 0, // TODO: implementar pesquisa de satisfação
        topIntents,
        topProperties,
        topSearchFilters: [], // TODO: implementar agregação de filtros
        peakHours,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      // Salvar métricas agregadas
      const aggregatedDocId = `${tenantId}_${today.toISOString().split('T')[0]}`
      await setDoc(
        doc(db, `tenants/${tenantId}/${this.aggregatedCollection}`, aggregatedDocId),
        aggregated
      )
      
      logger.info('📊 [Sofia Analytics] Metrics aggregated', { 
        tenantId, 
        date: today.toISOString(),
        conversations: totalConversations 
      })
      
      // Gerar insights de negócio
      await this.generateBusinessInsights(tenantId, conversations, today)
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error aggregating metrics', { error })
    }
  }

  /**
   * Calcula taxa de conversão entre etapas
   */
  private calculateConversionRate(
    conversations: ConversationMetrics[],
    from: 'viewed' | 'interested' | 'calculated',
    to: 'interested' | 'calculated' | 'reserved'
  ): number {
    let fromCount = 0
    let toCount = 0

    conversations.forEach(c => {
      if (from === 'viewed' && c.propertiesViewed?.length) fromCount++
      if (from === 'interested' && c.propertiesInterested?.length) fromCount++
      if (from === 'calculated' && c.priceCalculations > 0) fromCount++

      if (to === 'interested' && c.propertiesInterested?.length) toCount++
      if (to === 'calculated' && c.priceCalculations > 0) toCount++
      if (to === 'reserved' && c.reservationCreated) toCount++
    })

    return fromCount > 0 ? Math.round((toCount / fromCount) * 1000) / 10 : 0
  }

  /**
   * Calcula sentimento médio
   */
  private calculateAvgSentiment(conversations: ConversationMetrics[]): number {
    const withSentiment = conversations.filter(c => c.sentimentScore !== undefined)
    if (withSentiment.length === 0) return 0
    
    const sum = withSentiment.reduce((total, c) => total + (c.sentimentScore || 0), 0)
    return Math.round((sum / withSentiment.length) * 100) / 100
  }

  /**
   * Gera insights de negócio
   */
  private async generateBusinessInsights(
    tenantId: string,
    conversations: ConversationMetrics[],
    date: Date
  ): Promise<void> {
    try {
      // Analisar localizações mais requisitadas
      const locationCounts = new Map<string, number>()
      conversations.forEach(c => {
        if (c.searchFilters?.location) {
          locationCounts.set(
            c.searchFilters.location,
            (locationCounts.get(c.searchFilters.location) || 0) + 1
          )
        }
      })
      const mostRequestedLocations = Array.from(locationCounts.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Analisar padrões de navegação
      const avgPropertiesViewed = conversations
        .filter(c => c.propertiesViewed?.length)
        .reduce((sum, c) => sum + (c.propertiesViewed?.length || 0), 0) / 
        conversations.filter(c => c.propertiesViewed?.length).length || 0

      // Identificar oportunidades perdidas
      const missedOpportunities: any[] = []
      
      const abandonedWithInterest = conversations.filter(
        c => c.conversationStatus === 'abandoned' && c.propertiesInterested?.length
      ).length
      
      if (abandonedWithInterest > 0) {
        missedOpportunities.push({
          reason: 'Abandoned after showing interest',
          count: abandonedWithInterest,
          potentialRevenue: abandonedWithInterest * 500 // Estimativa
        })
      }

      // Gerar recomendações
      const recommendations: any[] = []
      
      if (conversations.filter(c => c.priceCalculations > 3).length > conversations.length * 0.3) {
        recommendations.push({
          type: 'pricing',
          suggestion: 'Consider offering automatic discounts for longer stays',
          impact: 'high',
          estimatedRevenue: 5000
        })
      }

      if (avgPropertiesViewed > 5) {
        recommendations.push({
          type: 'service',
          suggestion: 'Improve property filtering to help clients find ideal properties faster',
          impact: 'medium'
        })
      }

      const insights: BusinessInsights = {
        tenantId,
        period: date,
        mostRequestedLocations,
        mostRequestedDates: [], // TODO: implementar análise de datas
        avgGuestCount: conversations
          .filter(c => c.guestCount)
          .reduce((sum, c) => sum + (c.guestCount || 0), 0) / 
          conversations.filter(c => c.guestCount).length || 2,
        avgStayDuration: 3, // TODO: calcular a partir das reservas
        avgBudget: conversations
          .filter(c => c.priceRange)
          .reduce((sum, c) => sum + ((c.priceRange?.max || 0) + (c.priceRange?.min || 0)) / 2, 0) /
          conversations.filter(c => c.priceRange).length || 0,
        priceElasticity: 0.7, // TODO: calcular elasticidade real
        discountRequests: 0, // TODO: rastrear pedidos de desconto
        browsingPatterns: {
          avgPropertiesViewed: Math.round(avgPropertiesViewed * 10) / 10,
          avgTimeToDecision: 15, // TODO: calcular tempo real
          abandonmentPoints: ['price_calculation', 'availability_check']
        },
        missedOpportunities,
        recommendations
      }

      // Salvar insights
      const insightsDocId = `${tenantId}_${date.toISOString().split('T')[0]}`
      await setDoc(
        doc(db, `tenants/${tenantId}/${this.insightsCollection}`, insightsDocId),
        insights
      )
      
      logger.info('💡 [Sofia Analytics] Business insights generated', { 
        tenantId,
        recommendations: recommendations.length 
      })
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error generating insights', { error })
    }
  }

  /**
   * Obtém métricas agregadas
   */
  async getAggregatedMetrics(
    tenantId: string,
    period: 'daily' | 'weekly' | 'monthly',
    limit: number = 30
  ): Promise<AggregatedMetrics[]> {
    try {
      const metricsQuery = query(
        collection(db, `tenants/${tenantId}/${this.aggregatedCollection}`),
        where('period', '==', period),
        orderBy('date', 'desc'),
        limit(limit)
      )
      
      const snapshot = await getDocs(metricsQuery)
      return snapshot.docs.map(doc => doc.data() as AggregatedMetrics)
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error fetching aggregated metrics', { error })
      return []
    }
  }

  /**
   * Obtém insights de negócio
   */
  async getBusinessInsights(
    tenantId: string,
    limit: number = 7
  ): Promise<BusinessInsights[]> {
    try {
      const insightsQuery = query(
        collection(db, `tenants/${tenantId}/${this.insightsCollection}`),
        orderBy('period', 'desc'),
        limit(limit)
      )
      
      const snapshot = await getDocs(insightsQuery)
      return snapshot.docs.map(doc => doc.data() as BusinessInsights)
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error fetching business insights', { error })
      return []
    }
  }

  /**
   * Obtém métricas em tempo real
   */
  async getRealTimeMetrics(tenantId: string): Promise<{
    activeConversations: number
    todayConversations: number
    todayMessages: number
    todayConversions: number
    avgResponseTime: number
  }> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const metricsQuery = query(
        collection(db, `tenants/${tenantId}/${this.metricsCollection}`),
        where('startTime', '>=', Timestamp.fromDate(today))
      )
      
      const snapshot = await getDocs(metricsQuery)
      const conversations = snapshot.docs.map(doc => doc.data() as ConversationMetrics)
      
      const activeConversations = conversations.filter(c => c.conversationStatus === 'active').length
      const todayMessages = conversations.reduce((sum, c) => sum + c.messageCount, 0)
      const todayConversions = conversations.filter(c => c.reservationCreated).length
      const avgResponseTime = conversations
        .filter(c => c.responseTimeAvg > 0)
        .reduce((sum, c) => sum + c.responseTimeAvg, 0) / conversations.filter(c => c.responseTimeAvg > 0).length || 0
      
      return {
        activeConversations,
        todayConversations: conversations.length,
        todayMessages,
        todayConversions,
        avgResponseTime: Math.round(avgResponseTime)
      }
    } catch (error) {
      logger.error('❌ [Sofia Analytics] Error fetching real-time metrics', { error })
      return {
        activeConversations: 0,
        todayConversations: 0,
        todayMessages: 0,
        todayConversions: 0,
        avgResponseTime: 0
      }
    }
  }
}

// Exportar instância única
export const sofiaAnalytics = new SofiaAnalyticsService()