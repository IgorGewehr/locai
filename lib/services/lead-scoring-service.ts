// lib/services/lead-scoring-service.ts
import { Lead } from '@/lib/types/crm';
import { logger } from '@/lib/utils/logger';

/**
 * Fatores que influenciam o score do lead
 */
interface ScoringFactors {
  // Engajamento
  messagesExchanged: number;
  responseTime: number; // em segundos
  conversationDuration: number; // em minutos
  
  // Interesse
  propertiesViewed: number;
  priceCalculations: number;
  reservationAttempts: number;
  visitsScheduled: number;
  
  // Qualificação
  hasPhone: boolean;
  hasEmail: boolean;
  hasDocument: boolean;
  budgetDefined: boolean;
  checkInDateDefined: boolean;
  guestsCountDefined: boolean;
  
  // Comportamento
  returningClient: boolean;
  previousReservations: number;
  daysSinceFirstContact: number;
  abandonmentCount: number;
  
  // Fonte e contexto
  source: 'whatsapp_ai' | 'website' | 'referral' | 'social_media' | 'manual';
  timeOfDay: number; // hora do dia (0-23)
  dayOfWeek: number; // dia da semana (0-6)
  
  // Sentiment
  positiveMessages: number;
  negativeMessages: number;
  objections: number;
}

/**
 * Configuração de pesos para cada fator
 */
interface ScoringWeights {
  engagement: {
    messagesExchanged: number;
    responseTime: number;
    conversationDuration: number;
  };
  interest: {
    propertiesViewed: number;
    priceCalculations: number;
    reservationAttempts: number;
    visitsScheduled: number;
  };
  qualification: {
    hasPhone: number;
    hasEmail: number;
    hasDocument: number;
    budgetDefined: number;
    checkInDateDefined: number;
    guestsCountDefined: number;
  };
  behavior: {
    returningClient: number;
    previousReservations: number;
    daysSinceFirstContact: number;
    abandonmentCount: number;
  };
  source: {
    whatsapp_ai: number;
    website: number;
    referral: number;
    social_media: number;
    manual: number;
  };
  sentiment: {
    positiveRatio: number;
    objectionPenalty: number;
  };
}

/**
 * Serviço de Lead Scoring com Machine Learning-ready architecture
 */
export class LeadScoringService {
  private static instance: LeadScoringService;
  
  // Pesos otimizados baseados em análise de conversão histórica
  private readonly weights: ScoringWeights = {
    engagement: {
      messagesExchanged: 0.8,      // Mais mensagens = mais engajado
      responseTime: -0.5,          // Resposta rápida = mais interessado (negativo porque menor é melhor)
      conversationDuration: 0.6     // Conversas longas = interesse genuíno
    },
    interest: {
      propertiesViewed: 2.5,        // Ver propriedades = forte sinal de interesse
      priceCalculations: 3.5,       // Calcular preço = intenção séria
      reservationAttempts: 5.0,     // Tentar reservar = altíssima intenção
      visitsScheduled: 4.5          // Agendar visita = muito qualificado
    },
    qualification: {
      hasPhone: 2.0,                // Telefone validado
      hasEmail: 1.5,                // Email para follow-up
      hasDocument: 3.0,             // CPF = brasileiro, sério
      budgetDefined: 2.5,           // Orçamento claro
      checkInDateDefined: 2.0,      // Datas definidas
      guestsCountDefined: 1.0       // Número de pessoas
    },
    behavior: {
      returningClient: 5.0,         // Cliente retornando = alto valor
      previousReservations: 4.0,    // Histórico positivo
      daysSinceFirstContact: -0.3,  // Quanto mais tempo, menor urgência
      abandonmentCount: -2.0        // Abandonos = sinal negativo
    },
    source: {
      whatsapp_ai: 1.0,            // Base padrão
      website: 1.2,                // Website = mais qualificado
      referral: 1.5,               // Indicação = maior conversão
      social_media: 0.8,           // Social = menor conversão
      manual: 1.3                  // Entrada manual = pré-qualificado
    },
    sentiment: {
      positiveRatio: 2.0,          // Sentimento positivo
      objectionPenalty: -1.5       // Penalidade por objeções
    }
  };

  // Thresholds para temperatura do lead
  private readonly temperatureThresholds = {
    cold: 30,     // 0-30: Cold
    warm: 60,     // 31-60: Warm  
    hot: 101      // 61-100: Hot
  };

  private constructor() {
    logger.info('🎯 [LeadScoring] Service initialized');
  }

  static getInstance(): LeadScoringService {
    if (!LeadScoringService.instance) {
      LeadScoringService.instance = new LeadScoringService();
    }
    return LeadScoringService.instance;
  }

  /**
   * Calcula score dinâmico do lead baseado em múltiplos fatores
   */
  calculateScore(factors: Partial<ScoringFactors>): {
    score: number;
    temperature: 'cold' | 'warm' | 'hot';
    breakdown: Record<string, number>;
    insights: string[];
  } {
    const breakdown: Record<string, number> = {};
    const insights: string[] = [];
    let totalScore = 0;

    // 1. ENGAGEMENT SCORE (0-25 pontos)
    const engagementScore = this.calculateEngagementScore(factors, breakdown);
    totalScore += engagementScore;
    
    if (engagementScore > 20) {
      insights.push('Alto engajamento - lead muito ativo');
    } else if (engagementScore < 5) {
      insights.push('Baixo engajamento - necessita nurturing');
    }

    // 2. INTEREST SCORE (0-30 pontos)
    const interestScore = this.calculateInterestScore(factors, breakdown);
    totalScore += interestScore;
    
    if (factors.priceCalculations && factors.priceCalculations > 2) {
      insights.push('Múltiplos cálculos de preço - alta intenção');
    }
    if (factors.reservationAttempts && factors.reservationAttempts > 0) {
      insights.push('Tentou fazer reserva - pronto para conversão');
    }

    // 3. QUALIFICATION SCORE (0-20 pontos)
    const qualificationScore = this.calculateQualificationScore(factors, breakdown);
    totalScore += qualificationScore;
    
    if (qualificationScore > 15) {
      insights.push('Lead bem qualificado - dados completos');
    }

    // 4. BEHAVIOR SCORE (0-15 pontos)
    const behaviorScore = this.calculateBehaviorScore(factors, breakdown);
    totalScore += behaviorScore;
    
    if (factors.returningClient) {
      insights.push('Cliente retornando - alto valor');
    }
    if (factors.abandonmentCount && factors.abandonmentCount > 2) {
      insights.push('Múltiplos abandonos - possível objeção');
    }

    // 5. SOURCE MULTIPLIER (0.8x - 1.5x)
    const sourceMultiplier = this.getSourceMultiplier(factors.source);
    totalScore *= sourceMultiplier;
    breakdown.sourceMultiplier = sourceMultiplier;

    // 6. SENTIMENT ADJUSTMENT (-10 a +10 pontos)
    const sentimentAdjustment = this.calculateSentimentAdjustment(factors);
    totalScore += sentimentAdjustment;
    breakdown.sentimentAdjustment = sentimentAdjustment;

    // Normalizar score para 0-100
    totalScore = Math.max(0, Math.min(100, totalScore));

    // Determinar temperatura
    const temperature = this.getTemperature(totalScore);

    // Adicionar insights baseados na temperatura
    if (temperature === 'hot') {
      insights.push('🔥 Lead quente - priorizar atendimento');
    } else if (temperature === 'cold') {
      insights.push('❄️ Lead frio - implementar estratégia de nurturing');
    }

    logger.info('📊 [LeadScoring] Score calculated', {
      score: Math.round(totalScore),
      temperature,
      factors: Object.keys(factors).length
    });

    return {
      score: Math.round(totalScore),
      temperature,
      breakdown,
      insights
    };
  }

  /**
   * Calcula score de engajamento
   */
  private calculateEngagementScore(
    factors: Partial<ScoringFactors>,
    breakdown: Record<string, number>
  ): number {
    let score = 0;

    // Mensagens trocadas (0-10 pontos)
    if (factors.messagesExchanged) {
      const msgScore = Math.min(10, factors.messagesExchanged * this.weights.engagement.messagesExchanged);
      score += msgScore;
      breakdown.messagesScore = msgScore;
    }

    // Tempo de resposta (0-5 pontos)
    if (factors.responseTime) {
      // Quanto menor o tempo, melhor (inversão)
      const responseScore = Math.max(0, 5 + (factors.responseTime / 60) * this.weights.engagement.responseTime);
      score += responseScore;
      breakdown.responseTimeScore = responseScore;
    }

    // Duração da conversa (0-10 pontos)
    if (factors.conversationDuration) {
      const durationScore = Math.min(10, (factors.conversationDuration / 30) * this.weights.engagement.conversationDuration * 10);
      score += durationScore;
      breakdown.durationScore = durationScore;
    }

    breakdown.engagementTotal = score;
    return score;
  }

  /**
   * Calcula score de interesse
   */
  private calculateInterestScore(
    factors: Partial<ScoringFactors>,
    breakdown: Record<string, number>
  ): number {
    let score = 0;

    if (factors.propertiesViewed) {
      const viewScore = Math.min(7, factors.propertiesViewed * this.weights.interest.propertiesViewed);
      score += viewScore;
      breakdown.propertiesViewedScore = viewScore;
    }

    if (factors.priceCalculations) {
      const priceScore = Math.min(8, factors.priceCalculations * this.weights.interest.priceCalculations);
      score += priceScore;
      breakdown.priceCalculationsScore = priceScore;
    }

    if (factors.reservationAttempts) {
      const reservationScore = factors.reservationAttempts * this.weights.interest.reservationAttempts;
      score += reservationScore;
      breakdown.reservationAttemptsScore = reservationScore;
    }

    if (factors.visitsScheduled) {
      const visitScore = factors.visitsScheduled * this.weights.interest.visitsScheduled;
      score += visitScore;
      breakdown.visitsScheduledScore = visitScore;
    }

    breakdown.interestTotal = Math.min(30, score);
    return Math.min(30, score);
  }

  /**
   * Calcula score de qualificação
   */
  private calculateQualificationScore(
    factors: Partial<ScoringFactors>,
    breakdown: Record<string, number>
  ): number {
    let score = 0;

    const qualificationChecks = [
      { field: 'hasPhone', value: factors.hasPhone },
      { field: 'hasEmail', value: factors.hasEmail },
      { field: 'hasDocument', value: factors.hasDocument },
      { field: 'budgetDefined', value: factors.budgetDefined },
      { field: 'checkInDateDefined', value: factors.checkInDateDefined },
      { field: 'guestsCountDefined', value: factors.guestsCountDefined }
    ];

    qualificationChecks.forEach(check => {
      if (check.value) {
        const weight = this.weights.qualification[check.field as keyof typeof this.weights.qualification];
        score += weight;
        breakdown[`${check.field}Score`] = weight;
      }
    });

    breakdown.qualificationTotal = Math.min(20, score);
    return Math.min(20, score);
  }

  /**
   * Calcula score de comportamento
   */
  private calculateBehaviorScore(
    factors: Partial<ScoringFactors>,
    breakdown: Record<string, number>
  ): number {
    let score = 0;

    if (factors.returningClient) {
      score += this.weights.behavior.returningClient;
      breakdown.returningClientScore = this.weights.behavior.returningClient;
    }

    if (factors.previousReservations) {
      const prevScore = factors.previousReservations * this.weights.behavior.previousReservations;
      score += prevScore;
      breakdown.previousReservationsScore = prevScore;
    }

    if (factors.daysSinceFirstContact) {
      // Penalidade por muito tempo sem conversão
      const daysPenalty = Math.min(0, Math.max(-5, factors.daysSinceFirstContact * this.weights.behavior.daysSinceFirstContact));
      score += daysPenalty;
      breakdown.daysSinceFirstContactScore = daysPenalty;
    }

    if (factors.abandonmentCount) {
      const abandonPenalty = factors.abandonmentCount * this.weights.behavior.abandonmentCount;
      score += abandonPenalty;
      breakdown.abandonmentPenalty = abandonPenalty;
    }

    breakdown.behaviorTotal = Math.max(0, Math.min(15, score));
    return Math.max(0, Math.min(15, score));
  }

  /**
   * Obtém multiplicador baseado na fonte
   */
  private getSourceMultiplier(source?: ScoringFactors['source']): number {
    if (!source) return 1.0;
    return this.weights.source[source] || 1.0;
  }

  /**
   * Calcula ajuste de sentimento
   */
  private calculateSentimentAdjustment(factors: Partial<ScoringFactors>): number {
    let adjustment = 0;

    if (factors.positiveMessages && factors.negativeMessages) {
      const total = factors.positiveMessages + factors.negativeMessages;
      if (total > 0) {
        const positiveRatio = factors.positiveMessages / total;
        adjustment += positiveRatio * this.weights.sentiment.positiveRatio * 10;
      }
    }

    if (factors.objections) {
      adjustment += factors.objections * this.weights.sentiment.objectionPenalty;
    }

    return Math.max(-10, Math.min(10, adjustment));
  }

  /**
   * Determina temperatura do lead baseado no score
   */
  private getTemperature(score: number): 'cold' | 'warm' | 'hot' {
    if (score >= this.temperatureThresholds.warm) {
      return score >= this.temperatureThresholds.hot - 40 ? 'hot' : 'warm';
    }
    return 'cold';
  }

  /**
   * Recalcula score de um lead existente
   */
  async recalculateLeadScore(lead: Lead, additionalFactors?: Partial<ScoringFactors>): Promise<{
    score: number;
    temperature: 'cold' | 'warm' | 'hot';
    insights: string[];
  }> {
    // Extrair fatores do lead existente
    const factors: Partial<ScoringFactors> = {
      messagesExchanged: lead.interactions?.length || 0,
      hasPhone: !!lead.phone,
      hasEmail: !!lead.email,
      source: lead.source,
      ...additionalFactors
    };

    const result = this.calculateScore(factors);
    
    logger.info('📈 [LeadScoring] Lead score recalculated', {
      leadId: lead.id,
      oldScore: lead.score,
      newScore: result.score,
      temperature: result.temperature
    });

    return result;
  }
}

// Exportar instância singleton
export const leadScoringService = LeadScoringService.getInstance();