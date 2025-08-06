// Real Insights Service - Production Implementation
// Integrates with actual Firestore data to generate insights

import { Timestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import { Conversation, Message } from '@/lib/types/conversation';
import { Reservation } from '@/lib/types/reservation';
import { Client } from '@/lib/types/client';
import { Property } from '@/lib/types/property';
import { 
  AIGeneratedInsight,
  PredictiveAnalysis,
  SmartRecommendations,
  RealTimeAlerts
} from './advanced-ai-insights';
import { subDays, startOfDay, format, differenceInMinutes } from 'date-fns';

export class RealInsightsService {
  // Core data fetching methods
  private async getConversationsData(tenantId: string, days: number = 30) {
    const startDate = subDays(new Date(), days);
    
    const conversationsRef = collection(db, `tenants/${tenantId}/conversations`);
    const q = query(
      conversationsRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Conversation[];
  }

  private async getReservationsData(tenantId: string, days: number = 90) {
    const startDate = subDays(new Date(), days);
    
    const reservationsRef = collection(db, `tenants/${tenantId}/reservations`);
    const q = query(
      reservationsRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Reservation[];
  }

  private async getClientsData(tenantId: string) {
    const clientsRef = collection(db, `tenants/${tenantId}/clients`);
    const q = query(clientsRef, orderBy('createdAt', 'desc'), limit(500));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Client[];
  }

  private async getPropertiesData(tenantId: string) {
    const propertiesRef = collection(db, `tenants/${tenantId}/properties`);
    const q = query(propertiesRef, where('isActive', '==', true));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Property[];
  }

  // Analysis methods
  private analyzeConversationPatterns(conversations: Conversation[]): {
    totalConversations: number;
    avgMessagesPerConversation: number;
    avgDurationMinutes: number;
    abandonmentRate: number;
    conversionRate: number;
    topFailurePoints: string[];
    highValueKeywords: string[];
    timeDistribution: { [hour: number]: number };
  } {
    const total = conversations.length;
    let totalMessages = 0;
    let totalDuration = 0;
    let conversions = 0;
    let abandonments = 0;
    const failurePoints: string[] = [];
    const keywords = new Map<string, number>();
    const timeDistribution: { [hour: number]: number } = {};

    // Keywords to track
    const valueKeywords = ['reservar', 'confirmar', 'alugar', 'disponível', 'preço'];
    const painKeywords = ['caro', 'longe', 'pequeno', 'sujo', 'ruim'];

    conversations.forEach(conv => {
      const messages = conv.messages || [];
      totalMessages += messages.length;

      // Calculate duration
      if (messages.length > 1) {
        const start = messages[0]?.timestamp;
        const end = messages[messages.length - 1]?.timestamp;
        if (start && end) {
          const startTime = start instanceof Date ? start : (start as any).toDate();
          const endTime = end instanceof Date ? end : (end as any).toDate();
          const duration = differenceInMinutes(endTime, startTime);
          totalDuration += duration;
        }
      }

      // Time distribution
      const firstMessage = messages[0];
      if (firstMessage?.timestamp) {
        const time = firstMessage.timestamp instanceof Date ? 
          firstMessage.timestamp : (firstMessage.timestamp as any).toDate();
        const hour = time.getHours();
        timeDistribution[hour] = (timeDistribution[hour] || 0) + 1;
      }

      // Analyze conversation outcome
      const userMessages = messages.filter(m => m.from === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1]?.text?.toLowerCase() || '';
      
      if (lastUserMessage.includes('reservar') || lastUserMessage.includes('confirmar')) {
        conversions++;
      } else if (messages.length < 3 || 
                 lastUserMessage.includes('caro') || 
                 lastUserMessage.includes('pensar')) {
        abandonments++;
        failurePoints.push(lastUserMessage.substring(0, 50));
      }

      // Track keywords
      messages.forEach(msg => {
        if (msg.text) {
          const text = msg.text.toLowerCase();
          [...valueKeywords, ...painKeywords].forEach(keyword => {
            if (text.includes(keyword)) {
              keywords.set(keyword, (keywords.get(keyword) || 0) + 1);
            }
          });
        }
      });
    });

    return {
      totalConversations: total,
      avgMessagesPerConversation: total > 0 ? totalMessages / total : 0,
      avgDurationMinutes: total > 0 ? totalDuration / total : 0,
      abandonmentRate: total > 0 ? abandonments / total : 0,
      conversionRate: total > 0 ? conversions / total : 0,
      topFailurePoints: failurePoints.slice(0, 5),
      highValueKeywords: Array.from(keywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word),
      timeDistribution
    };
  }

  private identifyPriceAbandonmentPattern(conversations: Conversation[]): {
    priceAbandonmentRate: number;
    avgAbandonmentTime: number;
    commonPriceRanges: { min: number; max: number; abandonments: number }[];
    suggestedActions: string[];
  } {
    let priceConversations = 0;
    let priceAbandonments = 0;
    let totalAbandonmentTime = 0;
    const priceRanges: { price: number; abandoned: boolean }[] = [];

    conversations.forEach(conv => {
      const messages = conv.messages || [];
      let hasPriceRequest = false;
      let priceProvided = false;
      let abandonedAfterPrice = false;
      let priceValue = 0;

      messages.forEach((msg, index) => {
        if (msg.text) {
          const text = msg.text.toLowerCase();
          
          // Detect price request
          if (text.includes('preço') || text.includes('valor') || text.includes('quanto')) {
            hasPriceRequest = true;
            priceConversations++;
          }

          // Detect price provided by assistant
          if (msg.from === 'assistant' && hasPriceRequest) {
            const priceMatch = text.match(/r\$\s*(\d+(?:\.\d{3})*(?:,\d{2})?)/i);
            if (priceMatch) {
              priceProvided = true;
              priceValue = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
              
              // Check if conversation ended soon after price
              const remainingMessages = messages.slice(index + 1);
              const userResponses = remainingMessages.filter(m => m.from === 'user');
              
              if (userResponses.length === 0 || 
                  (userResponses.length === 1 && 
                   !userResponses[0].text?.toLowerCase().includes('reservar'))) {
                abandonedAfterPrice = true;
                priceAbandonments++;
                
                // Calculate abandonment time
                const priceTime = msg.timestamp instanceof Date ? 
                  msg.timestamp : (msg.timestamp as any).toDate();
                const lastTime = messages[messages.length - 1].timestamp instanceof Date ?
                  messages[messages.length - 1].timestamp : 
                  (messages[messages.length - 1].timestamp as any).toDate();
                
                totalAbandonmentTime += differenceInMinutes(lastTime, priceTime);
              }
            }
          }
        }
      });

      if (priceProvided) {
        priceRanges.push({ price: priceValue, abandoned: abandonedAfterPrice });
      }
    });

    // Analyze price ranges
    const ranges = [
      { min: 0, max: 1000, abandonments: 0 },
      { min: 1000, max: 2000, abandonments: 0 },
      { min: 2000, max: 3000, abandonments: 0 },
      { min: 3000, max: 5000, abandonments: 0 },
      { min: 5000, max: Infinity, abandonments: 0 },
    ];

    priceRanges.forEach(({ price, abandoned }) => {
      if (abandoned) {
        const range = ranges.find(r => price >= r.min && price < r.max);
        if (range) range.abandonments++;
      }
    });

    return {
      priceAbandonmentRate: priceConversations > 0 ? priceAbandonments / priceConversations : 0,
      avgAbandonmentTime: priceAbandonments > 0 ? totalAbandonmentTime / priceAbandonments : 0,
      commonPriceRanges: ranges.filter(r => r.abandonments > 0),
      suggestedActions: [
        'Adicionar justificativa de valor após apresentar preço',
        'Oferecer opções de parcelamento imediatamente',
        'Implementar desconto por decisão rápida',
        'Comparar com propriedades similares da concorrência'
      ]
    };
  }

  private calculateConversionFunnel(conversations: Conversation[], reservations: Reservation[]) {
    const totalContacts = conversations.length;
    const meaningfulConversations = conversations.filter(c => 
      (c.messages?.length || 0) >= 3
    ).length;
    
    const propertyInquiries = conversations.filter(c =>
      c.messages?.some(m => 
        m.text?.toLowerCase().includes('propriedade') || 
        m.text?.toLowerCase().includes('casa') ||
        m.text?.toLowerCase().includes('apartamento')
      )
    ).length;

    const priceRequests = conversations.filter(c =>
      c.messages?.some(m =>
        m.text?.toLowerCase().includes('preço') ||
        m.text?.toLowerCase().includes('valor')
      )
    ).length;

    const reservationRequests = conversations.filter(c =>
      c.messages?.some(m =>
        m.text?.toLowerCase().includes('reservar') ||
        m.text?.toLowerCase().includes('alugar')
      )
    ).length;

    const confirmedBookings = reservations.filter(r => 
      r.status === 'confirmed' || r.status === 'pending'
    ).length;

    return {
      totalContacts,
      meaningfulConversations,
      propertyInquiries,
      priceRequests,
      reservationRequests,
      confirmedBookings,
      conversionRates: {
        contactToMeaningful: meaningfulConversations / Math.max(1, totalContacts) * 100,
        meaningfulToInquiry: propertyInquiries / Math.max(1, meaningfulConversations) * 100,
        inquiryToPrice: priceRequests / Math.max(1, propertyInquiries) * 100,
        priceToReservation: reservationRequests / Math.max(1, priceRequests) * 100,
        reservationToConfirmed: confirmedBookings / Math.max(1, reservationRequests) * 100,
        overallConversion: confirmedBookings / Math.max(1, totalContacts) * 100
      }
    };
  }

  private generatePredictions(conversations: Conversation[], reservations: Reservation[]): PredictiveAnalysis {
    // Analyze historical trends
    const monthlyConversions = new Map<string, number>();
    const monthlyConversations = new Map<string, number>();

    conversations.forEach(conv => {
      const date = conv.createdAt instanceof Date ? 
        conv.createdAt : (conv.createdAt as any).toDate();
      const monthKey = format(date, 'yyyy-MM');
      monthlyConversations.set(monthKey, (monthlyConversations.get(monthKey) || 0) + 1);
    });

    reservations.forEach(res => {
      const date = res.createdAt instanceof Date ? 
        res.createdAt : (res.createdAt as any).toDate();
      const monthKey = format(date, 'yyyy-MM');
      monthlyConversions.set(monthKey, (monthlyConversions.get(monthKey) || 0) + 1);
    });

    // Calculate growth trends
    const months = Array.from(monthlyConversions.keys()).sort();
    const recentMonths = months.slice(-3);
    const avgConversions = recentMonths.reduce((sum, month) => 
      sum + (monthlyConversions.get(month) || 0), 0) / recentMonths.length;

    // Seasonal analysis
    const currentMonth = new Date().getMonth();
    const seasonalMultipliers: { [key: number]: number } = {
      11: 1.4, // December
      0: 1.3,  // January
      1: 1.6,  // February (Carnaval)
      2: 1.2,  // March
      5: 0.8,  // June
      6: 0.7,  // July
      7: 0.8,  // August
    };

    const seasonalMultiplier = seasonalMultipliers[currentMonth] || 1.0;
    const predicted = Math.round(avgConversions * seasonalMultiplier);

    return {
      conversionPrediction: {
        nextMonth: {
          expected: predicted,
          range: { 
            min: Math.round(predicted * 0.8), 
            max: Math.round(predicted * 1.2) 
          },
          confidence: Math.min(0.9, Math.max(0.6, recentMonths.length / 6))
        },
        factors: [
          {
            factor: 'Sazonalidade',
            influence: (seasonalMultiplier - 1) * 0.8,
            description: `${format(new Date(), 'MMMM')} histórico: ${seasonalMultiplier > 1 ? 'alta' : 'baixa'} temporada`
          },
          {
            factor: 'Tendência Recente',
            influence: 0.1,
            description: 'Baseado nos últimos 3 meses de performance'
          }
        ]
      },
      customerBehaviorTrends: [
        {
          trend: 'Horário de Maior Engajamento',
          direction: 'stable',
          strength: 0.7,
          prediction: 'Clientes mais ativos entre 19h-22h'
        }
      ],
      seasonalityInsights: [
        {
          period: 'Verão (Dez-Fev)',
          expectedDemandChange: 45,
          priceOptimization: 'Aumentar preços em 20-25%',
          marketingTiming: 'Intensificar em novembro'
        }
      ]
    };
  }

  // Main public methods
  async generateRealInsights(tenantId: string, days: number = 30): Promise<AIGeneratedInsight[]> {
    try {
      logger.info('🔍 [RealInsights] Generating insights from real data', { tenantId, days });

      const [conversations, reservations] = await Promise.all([
        this.getConversationsData(tenantId, days),
        this.getReservationsData(tenantId, days)
      ]);

      const insights: AIGeneratedInsight[] = [];

      if (conversations.length === 0) {
        return [{
          id: 'no_data',
          title: 'Dados Insuficientes',
          description: 'Não há conversas suficientes para gerar insights. Aguarde mais interações.',
          confidence: 1,
          impact: 'efficiency',
          priority: 'low',
          category: 'operational',
          actionableSteps: ['Aguardar mais conversas', 'Verificar integração WhatsApp'],
          timeToImplement: 'Imediato',
          metrics: { affectedConversations: 0, potentialRevenue: 0 },
          evidence: { conversationExamples: [], patterns: [], frequency: 0 },
          generatedAt: new Date()
        }];
      }

      // Analyze conversation patterns
      const analysis = this.analyzeConversationPatterns(conversations);
      
      // Price abandonment analysis
      if (analysis.totalConversations > 5) {
        const priceAnalysis = this.identifyPriceAbandonmentPattern(conversations);
        
        if (priceAnalysis.priceAbandonmentRate > 0.4) { // > 40% abandonment
          insights.push({
            id: 'price_abandonment',
            title: 'Alta Taxa de Abandono Após Preços',
            description: `${(priceAnalysis.priceAbandonmentRate * 100).toFixed(1)}% dos clientes abandonam após receber cotação. Tempo médio de abandono: ${priceAnalysis.avgAbandonmentTime.toFixed(0)} minutos.`,
            confidence: Math.min(0.95, analysis.totalConversations / 20),
            impact: 'revenue',
            priority: 'critical',
            category: 'conversion',
            actionableSteps: priceAnalysis.suggestedActions,
            estimatedROI: Math.round(analysis.totalConversations * priceAnalysis.priceAbandonmentRate * 1500),
            timeToImplement: '1-2 semanas',
            metrics: {
              affectedConversations: Math.round(analysis.totalConversations * priceAnalysis.priceAbandonmentRate),
              potentialRevenue: Math.round(analysis.totalConversations * priceAnalysis.priceAbandonmentRate * 2000),
              currentLoss: Math.round(analysis.totalConversations * priceAnalysis.priceAbandonmentRate * 1500)
            },
            evidence: {
              conversationExamples: [
                'Cliente perguntou preço → não respondeu após cotação',
                'Abandono médio em ' + priceAnalysis.avgAbandonmentTime.toFixed(0) + ' minutos',
                'Maior abandono em faixas de preço específicas'
              ],
              patterns: [
                `Taxa de abandono: ${(priceAnalysis.priceAbandonmentRate * 100).toFixed(1)}%`,
                `Tempo médio: ${priceAnalysis.avgAbandonmentTime.toFixed(0)} minutos`,
                'Padrão consistente em múltiplas conversas'
              ],
              frequency: Math.round(analysis.totalConversations * priceAnalysis.priceAbandonmentRate)
            },
            generatedAt: new Date()
          });
        }
      }

      // Low conversion rate insight
      if (analysis.conversionRate < 0.15 && analysis.totalConversations > 10) {
        insights.push({
          id: 'low_conversion',
          title: 'Taxa de Conversão Abaixo do Esperado',
          description: `Apenas ${(analysis.conversionRate * 100).toFixed(1)}% das conversas resultam em reservas. Meta esperada: 15-20%.`,
          confidence: 0.85,
          impact: 'revenue',
          priority: 'high',
          category: 'conversion',
          actionableSteps: [
            'Melhorar qualificação de leads',
            'Otimizar respostas do AI agent',
            'Implementar técnicas de urgência',
            'Oferecer incentivos para decisão rápida'
          ],
          estimatedROI: Math.round((0.15 - analysis.conversionRate) * analysis.totalConversations * 1800),
          timeToImplement: '2-3 semanas',
          metrics: {
            affectedConversations: analysis.totalConversations,
            potentialRevenue: Math.round((0.15 - analysis.conversionRate) * analysis.totalConversations * 2200),
          },
          evidence: {
            conversationExamples: [
              'Conversas longas sem fechamento',
              'Interesse demonstrado mas sem reserva',
              'Muitas perguntas sem tomada de decisão'
            ],
            patterns: [
              `Taxa atual: ${(analysis.conversionRate * 100).toFixed(1)}%`,
              `Benchmark de mercado: 15-20%`,
              `Gap de ${((0.15 - analysis.conversionRate) * 100).toFixed(1)} pontos percentuais`
            ],
            frequency: Math.round(analysis.totalConversations * (1 - analysis.conversionRate))
          },
          generatedAt: new Date()
        });
      }

      // Peak hours optimization
      const peakHours = Object.entries(analysis.timeDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (peakHours.length > 0 && analysis.totalConversations > 15) {
        const topHour = peakHours[0];
        insights.push({
          id: 'peak_hours',
          title: 'Horário de Pico Identificado',
          description: `${topHour[1]} conversas iniciadas às ${topHour[0]}h. Otimizar atendimento nos horários de maior demanda.`,
          confidence: 0.75,
          impact: 'efficiency',
          priority: 'medium',
          category: 'operational',
          actionableSteps: [
            'Priorizar respostas rápidas no horário de pico',
            'Configurar alertas automáticos para equipe',
            'Ajustar disponibilidade de agentes humanos',
            'Programar campanhas para horários estratégicos'
          ],
          timeToImplement: '1 semana',
          metrics: {
            affectedConversations: parseInt(topHour[1]),
            potentialRevenue: parseInt(topHour[1]) * 800,
          },
          evidence: {
            conversationExamples: [
              `Pico às ${topHour[0]}h com ${topHour[1]} conversas`,
              'Padrão consistente de horários',
              'Oportunidade de otimização operacional'
            ],
            patterns: [
              'Concentração em horários específicos',
              'Demanda previsível por período',
              'Potencial para automação inteligente'
            ],
            frequency: parseInt(topHour[1])
          },
          generatedAt: new Date()
        });
      }

      logger.info('✅ [RealInsights] Generated insights from real data', {
        tenantId,
        insightsCount: insights.length,
        conversationsAnalyzed: conversations.length,
        reservationsAnalyzed: reservations.length
      });

      return insights;

    } catch (error) {
      logger.error('❌ [RealInsights] Error generating insights', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return [{
        id: 'error',
        title: 'Erro na Análise',
        description: 'Não foi possível analisar os dados. Tente novamente em alguns minutos.',
        confidence: 1,
        impact: 'efficiency',
        priority: 'low',
        category: 'operational',
        actionableSteps: ['Verificar conectividade', 'Tentar novamente'],
        timeToImplement: 'Imediato',
        metrics: { affectedConversations: 0, potentialRevenue: 0 },
        evidence: { conversationExamples: [], patterns: [], frequency: 0 },
        generatedAt: new Date()
      }];
    }
  }

  async generateRealPredictions(tenantId: string): Promise<PredictiveAnalysis> {
    try {
      const [conversations, reservations] = await Promise.all([
        this.getConversationsData(tenantId, 90), // 3 months of data
        this.getReservationsData(tenantId, 90)
      ]);

      return this.generatePredictions(conversations, reservations);
    } catch (error) {
      logger.error('❌ [RealInsights] Error generating predictions', { tenantId, error });
      // Return default predictions on error
      return {
        conversionPrediction: {
          nextMonth: { expected: 0, range: { min: 0, max: 0 }, confidence: 0 },
          factors: []
        },
        customerBehaviorTrends: [],
        seasonalityInsights: []
      };
    }
  }

  async generateRealRecommendations(tenantId: string): Promise<SmartRecommendations> {
    try {
      const conversations = await this.getConversationsData(tenantId, 30);
      const analysis = this.analyzeConversationPatterns(conversations);

      const recommendations: SmartRecommendations = {
        aiPromptOptimizations: [],
        automationOpportunities: [],
        contentGaps: []
      };

      // AI optimizations based on real patterns
      if (analysis.conversionRate < 0.12) {
        recommendations.aiPromptOptimizations.push({
          currentIssue: 'Taxa de conversão baixa detectada',
          suggestedChange: 'Treinar IA para ser mais persuasiva e criar urgência',
          expectedImprovement: `Potencial aumento para 15-18% (atual: ${(analysis.conversionRate * 100).toFixed(1)}%)`,
          priority: 9
        });
      }

      if (analysis.avgDurationMinutes > 30) {
        recommendations.aiPromptOptimizations.push({
          currentIssue: 'Conversas muito longas sem decisão',
          suggestedChange: 'Implementar técnicas de fechamento mais diretas',
          expectedImprovement: 'Redução do tempo médio em 40%',
          priority: 7
        });
      }

      // Automation opportunities
      if (analysis.totalConversations > 10) {
        const photoRequests = conversations.filter(c =>
          c.messages?.some(m => m.text?.toLowerCase().includes('foto'))
        ).length;

        if (photoRequests > 5) {
          recommendations.automationOpportunities.push({
            task: 'Envio Automático de Fotos',
            frequency: photoRequests,
            timeWasted: photoRequests * 3, // 3 minutes per manual photo send
            automationComplexity: 'low',
            potentialSavings: Math.round(photoRequests * 3 * 30 * 0.5), // Monthly savings
            implementation: 'Detectar palavra "foto" e enviar galeria automaticamente'
          });
        }
      }

      return recommendations;
    } catch (error) {
      logger.error('❌ [RealInsights] Error generating recommendations', { tenantId, error });
      return { aiPromptOptimizations: [], automationOpportunities: [], contentGaps: [] };
    }
  }

  async generateRealAlerts(tenantId: string): Promise<RealTimeAlerts[]> {
    try {
      const recentConversations = await this.getConversationsData(tenantId, 1); // Last 24h
      const analysis = this.analyzeConversationPatterns(recentConversations);
      
      const alerts: RealTimeAlerts[] = [];

      // Performance alerts
      if (analysis.conversionRate < 0.05 && analysis.totalConversations > 5) {
        alerts.push({
          id: `low_conversion_${Date.now()}`,
          type: 'performance_drop',
          severity: 'high',
          title: 'Taxa de Conversão Muito Baixa',
          message: `Apenas ${(analysis.conversionRate * 100).toFixed(1)}% das conversas de hoje resultaram em interesse`,
          suggestedAction: 'Revisar qualidade das respostas da IA e otimizar prompts',
          timestamp: new Date(),
          dismissed: false,
          data: { conversionRate: analysis.conversionRate }
        });
      }

      // Opportunity alerts
      if (analysis.totalConversations > 10) {
        alerts.push({
          id: `high_activity_${Date.now()}`,
          type: 'opportunity',
          severity: 'medium',
          title: 'Alto Volume de Conversas',
          message: `${analysis.totalConversations} conversas iniciadas hoje - ${analysis.totalConversations > 15 ? 'acima' : 'dentro'} do esperado`,
          suggestedAction: 'Aproveitar o momento para campanhas direcionadas',
          timestamp: new Date(),
          dismissed: false,
          data: { totalConversations: analysis.totalConversations }
        });
      }

      return alerts;
    } catch (error) {
      logger.error('❌ [RealInsights] Error generating alerts', { tenantId, error });
      return [];
    }
  }
}

export const realInsightsService = new RealInsightsService();