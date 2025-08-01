// lib/services/intelligent-qualification.ts
// INTELLIGENT QUALIFICATION SYSTEM - STEP 3 IMPLEMENTATION
// Sistema de qualificação inteligente sem perguntar orçamento diretamente

import { 
  EnhancedConversationContext,
  extractCriticalData 
} from '@/lib/types/context-types-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface LeadQualification {
  overallScore: number; // 0-100
  budget: BudgetInference;
  authority: AuthorityLevel;
  need: NeedLevel;
  timeline: TimelineAssessment;
  qualification: 'hot' | 'warm' | 'cold' | 'unqualified';
  confidence: number; // 0-1
  recommendations: QualificationRecommendation[];
}

export interface BudgetInference {
  estimatedRange: BudgetRange;
  confidence: number;
  inferenceMethod: string[];
  priceReactionAnalysis: PriceReaction[];
  budgetCategory: 'luxury' | 'premium' | 'standard' | 'budget' | 'economy';
}

export interface BudgetRange {
  min: number;
  max: number;
  confidence: number;
  dailyRate: boolean;
}

export interface PriceReaction {
  price: number;
  reaction: 'positive' | 'neutral' | 'negative' | 'objection';
  intensity: 1 | 2 | 3 | 4 | 5;
  context: string;
  timestamp: Date;
}

export interface AuthorityLevel {
  level: 'high' | 'medium' | 'low' | 'unknown';
  confidence: number;
  indicators: string[];
  decisionMakers: number; // estimated number of decision makers
  influenceFactors: string[];
}

export interface NeedLevel {
  urgency: 1 | 2 | 3 | 4 | 5;
  specificity: number; // 0-1, how specific are requirements
  motivation: 'leisure' | 'business' | 'family' | 'romantic' | 'adventure' | 'unknown';
  painPoints: string[];
  desiredOutcomes: string[];
}

export interface TimelineAssessment {
  urgency: 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'flexible';
  checkInProximity: number; // days until check-in
  bookingLikelihood: number; // 0-1
  decisionTimeframe: string;
  timelinePressures: string[];
}

export interface QualificationRecommendation {
  type: 'approach' | 'pricing' | 'property' | 'communication' | 'follow_up';
  action: string;
  priority: 1 | 2 | 3 | 4 | 5;
  reasoning: string;
  expectedOutcome: string;
}

// ===== INTELLIGENT QUALIFICATION SYSTEM =====

export class IntelligentQualificationSystem {
  
  /**
   * Qualificar lead implicitamente sem perguntas diretas sobre orçamento
   */
  async qualifyLeadImplicitly(
    context: EnhancedConversationContext,
    userMessage: string,
    messageHistory: Array<{ role: string; content: string }>
  ): Promise<LeadQualification> {
    logger.debug('🔍 [Qualification] Starting intelligent lead qualification', {
      messageCount: messageHistory.length,
      currentStage: context.conversationState.stage,
      hasClientData: !!context.clientData.name
    });

    try {
      // Análise paralela de todos os aspectos
      const [budget, authority, need, timeline] = await Promise.all([
        this.inferBudgetRange(context, userMessage, messageHistory),
        this.assessDecisionAuthority(userMessage, context),
        this.evaluateNeedLevel(context, userMessage, messageHistory),
        this.determineTimeline(context, userMessage)
      ]);

      // Calcular score geral
      const overallScore = this.calculateQualificationScore({
        budget,
        authority, 
        need,
        timeline
      });

      // Determinar qualificação
      const qualification = this.determineQualificationLevel(overallScore, budget, authority, need);

      // Gerar recomendações
      const recommendations = this.generateQualificationRecommendations(
        qualification,
        budget,
        authority,
        need,
        timeline,
        context
      );

      // Calcular confiança geral
      const confidence = this.calculateOverallConfidence(budget, authority, need, timeline);

      const result: LeadQualification = {
        overallScore,
        budget,
        authority,
        need,
        timeline,
        qualification,
        confidence,
        recommendations
      };

      logger.info('✅ [Qualification] Lead qualification completed', {
        overallScore,
        qualification,
        confidence,
        budgetCategory: budget.budgetCategory,
        authorityLevel: authority.level,
        needUrgency: need.urgency
      });

      return result;

    } catch (error) {
      logger.error('❌ [Qualification] Error in lead qualification', { error });
      return this.getDefaultQualification();
    }
  }

  /**
   * Inferir faixa de orçamento sem perguntar diretamente
   */
  private async inferBudgetRange(
    context: EnhancedConversationContext,
    userMessage: string,
    messageHistory: Array<{ role: string; content: string }>
  ): Promise<BudgetInference> {
    logger.debug('💰 [Qualification] Inferring budget range');

    const inferenceMethod: string[] = [];
    let estimatedRange: BudgetRange = { min: 200, max: 800, confidence: 0.3, dailyRate: true };

    // 1. Análise por linguagem usada
    const languageBudget = this.inferBudgetByLanguage(userMessage);
    if (languageBudget.confidence > 0.5) {
      estimatedRange = this.combineBudgetRanges(estimatedRange, languageBudget);
      inferenceMethod.push('language_analysis');
    }

    // 2. Análise por localização desejada
    const locationBudget = this.inferBudgetByLocation(context.clientData.city || '');
    if (locationBudget.confidence > 0.4) {
      estimatedRange = this.combineBudgetRanges(estimatedRange, locationBudget);
      inferenceMethod.push('location_analysis');
    }

    // 3. Análise por tamanho do grupo
    const groupSizeBudget = this.inferBudgetByGroupSize(context.clientData.guests || 2);
    estimatedRange = this.combineBudgetRanges(estimatedRange, groupSizeBudget);
    inferenceMethod.push('group_size_analysis');

    // 4. Análise por período/sazonalidade
    const seasonalBudget = this.inferBudgetBySeason(context.clientData.checkIn);
    if (seasonalBudget.confidence > 0.3) {
      estimatedRange = this.combineBudgetRanges(estimatedRange, seasonalBudget);
      inferenceMethod.push('seasonal_analysis');
    }

    // 5. Análise de reações a preços já mostrados
    const priceReactionAnalysis = this.analyzePriceReactions(context, messageHistory);
    if (priceReactionAnalysis.length > 0) {
      const reactionBudget = this.inferBudgetFromPriceReactions(priceReactionAnalysis);
      if (reactionBudget.confidence > 0.6) {
        estimatedRange = this.combineBudgetRanges(estimatedRange, reactionBudget);
        inferenceMethod.push('price_reaction_analysis');
      }
    }

    // 6. Análise por comportamento de busca
    const searchBehaviorBudget = this.inferBudgetBySearchBehavior(context, messageHistory);
    if (searchBehaviorBudget.confidence > 0.4) {
      estimatedRange = this.combineBudgetRanges(estimatedRange, searchBehaviorBudget);
      inferenceMethod.push('search_behavior_analysis');
    }

    // Determinar categoria de orçamento
    const budgetCategory = this.categorizeBudget(estimatedRange);

    return {
      estimatedRange,
      confidence: estimatedRange.confidence,
      inferenceMethod,
      priceReactionAnalysis,
      budgetCategory
    };
  }

  /**
   * Inferir orçamento pela linguagem utilizada
   */
  private inferBudgetByLanguage(message: string): BudgetRange {
    const lowerMessage = message.toLowerCase();
    
    const budgetIndicators = {
      LUXURY: {
        keywords: ['luxo', 'premium', 'exclusivo', 'sofisticado', 'requintado', 'não importa o preço', 'o melhor'],
        range: { min: 800, max: 2000, confidence: 0.8, dailyRate: true }
      },
      PREMIUM: {
        keywords: ['confortável', 'bem localizado', 'boa estrutura', 'completo', 'qualidade', 'comodidades'],
        range: { min: 400, max: 900, confidence: 0.7, dailyRate: true }
      },
      STANDARD: {
        keywords: ['bom custo-benefício', 'preço justo', 'razoável', 'dentro do padrão', 'normal'],
        range: { min: 250, max: 500, confidence: 0.6, dailyRate: true }
      },
      BUDGET: {
        keywords: ['econômico', 'mais barato', 'promoção', 'desconto', 'em conta'],
        range: { min: 150, max: 350, confidence: 0.7, dailyRate: true }
      },
      ECONOMY: {
        keywords: ['baratinho', 'simples', 'básico', 'sem frescura', 'o mais barato'],
        range: { min: 80, max: 200, confidence: 0.8, dailyRate: true }
      }
    };

    // Buscar indicadores na mensagem
    for (const [category, data] of Object.entries(budgetIndicators)) {
      const hasKeywords = data.keywords.some(keyword => lowerMessage.includes(keyword));
      if (hasKeywords) {
        logger.debug(`💡 [Qualification] Budget inferred from language: ${category}`, data.range);
        return data.range;
      }
    }

    return { min: 200, max: 600, confidence: 0.3, dailyRate: true };
  }

  /**
   * Inferir orçamento por localização mencionada
   */
  private inferBudgetByLocation(location: string): BudgetRange {
    if (!location) return { min: 200, max: 600, confidence: 0.2, dailyRate: true };

    const lowerLocation = location.toLowerCase();
    
    const locationBudgets = {
      LUXURY_LOCATIONS: {
        keywords: ['ipanema', 'leblon', 'copacabana', 'barra da tijuca', 'jurerê'],
        range: { min: 600, max: 1500, confidence: 0.7, dailyRate: true }
      },
      PREMIUM_LOCATIONS: {
        keywords: ['florianópolis', 'porto de galinhas', 'centro', 'orla'],
        range: { min: 350, max: 800, confidence: 0.6, dailyRate: true }
      },
      STANDARD_LOCATIONS: {
        keywords: ['praia', 'litoral', 'interior', 'montanha'],
        range: { min: 200, max: 500, confidence: 0.5, dailyRate: true }
      }
    };

    for (const [category, data] of Object.entries(locationBudgets)) {
      const hasLocation = data.keywords.some(keyword => lowerLocation.includes(keyword));
      if (hasLocation) {
        logger.debug(`📍 [Qualification] Budget inferred from location: ${category}`, data.range);
        return data.range;
      }
    }

    return { min: 200, max: 600, confidence: 0.3, dailyRate: true };
  }

  /**
   * Inferir orçamento por tamanho do grupo
   */
  private inferBudgetByGroupSize(guests: number): BudgetRange {
    // Grupos maiores geralmente têm orçamento maior (dividido)
    if (guests >= 6) {
      return { min: 400, max: 1200, confidence: 0.6, dailyRate: true };
    } else if (guests >= 4) {
      return { min: 300, max: 800, confidence: 0.5, dailyRate: true };
    } else if (guests === 2) {
      return { min: 200, max: 600, confidence: 0.4, dailyRate: true };
    } else {
      return { min: 150, max: 400, confidence: 0.4, dailyRate: true };
    }
  }

  /**
   * Analisar reações a preços já mostrados
   */
  private analyzePriceReactions(
    context: EnhancedConversationContext,
    messageHistory: Array<{ role: string; content: string }>
  ): PriceReaction[] {
    const reactions: PriceReaction[] = [];
    
    // Buscar mensagens onde preços foram mencionados
    for (let i = 0; i < messageHistory.length - 1; i++) {
      const assistantMessage = messageHistory[i];
      const userResponse = messageHistory[i + 1];
      
      if (assistantMessage.role === 'assistant' && userResponse.role === 'user') {
        // Buscar preços na mensagem do assistente
        const priceMatches = assistantMessage.content.match(/R\$\s*(\d+)/g);
        
        if (priceMatches) {
          priceMatches.forEach(match => {
            const price = parseInt(match.replace(/R\$\s*/, ''));
            const reaction = this.analyzeUserReactionToPrice(userResponse.content, price);
            
            if (reaction) {
              reactions.push({
                price,
                reaction: reaction.type,
                intensity: reaction.intensity,
                context: `price_${price}_reaction`,
                timestamp: new Date()
              });
            }
          });
        }
      }
    }

    return reactions;
  }

  /**
   * Analisar reação do usuário a um preço específico
   */
  private analyzeUserReactionToPrice(
    userMessage: string,
    price: number
  ): { type: 'positive' | 'neutral' | 'negative' | 'objection'; intensity: 1 | 2 | 3 | 4 | 5 } | null {
    const lowerMessage = userMessage.toLowerCase();

    // Reações positivas
    const positiveIndicators = ['ótimo', 'perfeito', 'bom preço', 'justo', 'aceito', 'ok', 'interessante'];
    if (positiveIndicators.some(indicator => lowerMessage.includes(indicator))) {
      return { type: 'positive', intensity: 4 };
    }

    // Reações negativas/objeções
    const negativeIndicators = ['caro', 'salgado', 'muito', 'não cabe', 'orçamento', 'não posso'];
    if (negativeIndicators.some(indicator => lowerMessage.includes(indicator))) {
      return { type: 'objection', intensity: 4 };
    }

    // Reações neutras
    const neutralIndicators = ['vou ver', 'talvez', 'pensar', 'considerar'];
    if (neutralIndicators.some(indicator => lowerMessage.includes(indicator))) {
      return { type: 'neutral', intensity: 2 };
    }

    return null;
  }

  /**
   * Avaliar autoridade de decisão
   */
  private assessDecisionAuthority(message: string, context: EnhancedConversationContext): AuthorityLevel {
    const lowerMessage = message.toLowerCase();
    
    const authorityIndicators = {
      HIGH: {
        phrases: ['eu decido', 'sou eu quem', 'vou fechar', 'pode reservar', 'tenho autonomia'],
        decisionMakers: 1,
        confidence: 0.9
      },
      MEDIUM: {
        phrases: ['vou conversar', 'preciso falar', 'vamos decidir', 'somos nós'],
        decisionMakers: 2,
        confidence: 0.7
      },
      LOW: {
        phrases: ['não posso decidir', 'preciso perguntar', 'depende de', 'chefe decide'],
        decisionMakers: 3,
        confidence: 0.8
      }
    };

    const indicators: string[] = [];
    
    for (const [level, data] of Object.entries(authorityIndicators)) {
      const hasIndicators = data.phrases.some(phrase => lowerMessage.includes(phrase));
      if (hasIndicators) {
        indicators.push(...data.phrases.filter(phrase => lowerMessage.includes(phrase)));
        
        return {
          level: level.toLowerCase() as 'high' | 'medium' | 'low',
          confidence: data.confidence,
          indicators,
          decisionMakers: data.decisionMakers,
          influenceFactors: this.identifyInfluenceFactors(message, level)
        };
      }
    }

    // Default assessment baseado no contexto
    const defaultLevel = context.clientData.guests && context.clientData.guests > 2 ? 'medium' : 'high';
    
    return {
      level: defaultLevel as 'high' | 'medium' | 'low',
      confidence: 0.5,
      indicators: [],
      decisionMakers: defaultLevel === 'medium' ? 2 : 1,
      influenceFactors: ['family_consultation', 'budget_approval']
    };
  }

  /**
   * Avaliar nível de necessidade
   */
  private evaluateNeedLevel(
    context: EnhancedConversationContext,
    userMessage: string,
    messageHistory: Array<{ role: string; content: string }>
  ): NeedLevel {
    const lowerMessage = userMessage.toLowerCase();
    
    // Avaliar urgência
    let urgency: 1 | 2 | 3 | 4 | 5 = 2;
    const urgencyIndicators = {
      5: ['urgente', 'agora', 'hoje', 'imediato', 'preciso já'],
      4: ['logo', 'rápido', 'breve', 'essa semana'],
      3: ['em breve', 'próximo mês', 'planejando'],
      1: ['futuramente', 'talvez', 'pensando']
    };

    for (const [level, indicators] of Object.entries(urgencyIndicators)) {
      if (indicators.some(indicator => lowerMessage.includes(indicator))) {
        urgency = parseInt(level) as 1 | 2 | 3 | 4 | 5;
        break;
      }
    }

    // Avaliar especificidade
    const criticalData = extractCriticalData(context);
    const specificityScore = Object.values(criticalData).filter(value => value !== undefined).length / 5;

    // Identificar motivação
    const motivation = this.identifyTravelMotivation(userMessage, context);

    // Identificar pain points
    const painPoints = this.identifyPainPoints(userMessage, messageHistory);

    // Identificar resultados desejados
    const desiredOutcomes = this.identifyDesiredOutcomes(userMessage, context);

    return {
      urgency,
      specificity: specificityScore,
      motivation,
      painPoints,
      desiredOutcomes
    };
  }

  // ===== HELPER METHODS =====

  private combineBudgetRanges(range1: BudgetRange, range2: BudgetRange): BudgetRange {
    const weight1 = range1.confidence;
    const weight2 = range2.confidence;
    const totalWeight = weight1 + weight2;

    return {
      min: Math.round((range1.min * weight1 + range2.min * weight2) / totalWeight),
      max: Math.round((range1.max * weight1 + range2.max * weight2) / totalWeight),
      confidence: Math.min(1.0, (weight1 + weight2) / 2),
      dailyRate: range1.dailyRate
    };
  }

  private categorizeBudget(range: BudgetRange): 'luxury' | 'premium' | 'standard' | 'budget' | 'economy' {
    const avgPrice = (range.min + range.max) / 2;
    
    if (avgPrice >= 800) return 'luxury';
    if (avgPrice >= 500) return 'premium';
    if (avgPrice >= 300) return 'standard';
    if (avgPrice >= 150) return 'budget';
    return 'economy';
  }

  private calculateQualificationScore(params: {
    budget: BudgetInference;
    authority: AuthorityLevel;
    need: NeedLevel;
    timeline: TimelineAssessment;
  }): number {
    let score = 0;

    // Budget score (25%)
    const budgetScore = params.budget.confidence * 0.7 + 
      (params.budget.budgetCategory === 'luxury' ? 1.0 : 
       params.budget.budgetCategory === 'premium' ? 0.8 :
       params.budget.budgetCategory === 'standard' ? 0.6 : 0.4) * 0.3;
    score += budgetScore * 25;

    // Authority score (20%)
    const authorityScore = params.authority.level === 'high' ? 1.0 :
                          params.authority.level === 'medium' ? 0.7 : 0.3;
    score += authorityScore * 20;

    // Need score (30%)
    const needScore = (params.need.urgency / 5) * 0.5 + params.need.specificity * 0.5;
    score += needScore * 30;

    // Timeline score (25%)
    const timelineScore = params.timeline.bookingLikelihood;
    score += timelineScore * 25;

    return Math.min(100, Math.max(0, score));
  }

  private determineQualificationLevel(
    score: number,
    budget: BudgetInference,
    authority: AuthorityLevel,
    need: NeedLevel
  ): 'hot' | 'warm' | 'cold' | 'unqualified' {
    if (score >= 80 && authority.level === 'high' && need.urgency >= 4) {
      return 'hot';
    } else if (score >= 60 && (authority.level === 'high' || need.urgency >= 3)) {
      return 'warm';
    } else if (score >= 40) {
      return 'cold';
    } else {
      return 'unqualified';
    }
  }

  private generateQualificationRecommendations(
    qualification: 'hot' | 'warm' | 'cold' | 'unqualified',
    budget: BudgetInference,
    authority: AuthorityLevel,
    need: NeedLevel,
    timeline: TimelineAssessment,
    context: EnhancedConversationContext
  ): QualificationRecommendation[] {
    const recommendations: QualificationRecommendation[] = [];

    switch (qualification) {
      case 'hot':
        recommendations.push({
          type: 'approach',
          action: 'Focar em fechamento imediato',
          priority: 5,
          reasoning: 'Lead altamente qualificado com urgência alta',
          expectedOutcome: 'Conversão em 1-2 interações'
        });
        break;

      case 'warm':
        recommendations.push({
          type: 'approach',
          action: 'Aplicar técnicas de urgência moderada',
          priority: 4,
          reasoning: 'Lead qualificado mas precisa de incentivo',
          expectedOutcome: 'Conversão em 3-5 interações'
        });
        break;

      case 'cold':
        recommendations.push({
          type: 'approach',
          action: 'Focar em educação e construção de valor',
          priority: 3,
          reasoning: 'Lead precisa ser nutrido antes da conversão',
          expectedOutcome: 'Follow-up necessário'
        });
        break;
    }

    return recommendations;
  }

  private calculateOverallConfidence(
    budget: BudgetInference,
    authority: AuthorityLevel,
    need: NeedLevel,
    timeline: TimelineAssessment
  ): number {
    return (budget.confidence + authority.confidence + need.specificity + timeline.bookingLikelihood) / 4;
  }

  private getDefaultQualification(): LeadQualification {
    return {
      overallScore: 50,
      budget: {
        estimatedRange: { min: 200, max: 600, confidence: 0.3, dailyRate: true },
        confidence: 0.3,
        inferenceMethod: ['default'],
        priceReactionAnalysis: [],
        budgetCategory: 'standard'
      },
      authority: {
        level: 'medium',
        confidence: 0.5,
        indicators: [],
        decisionMakers: 2,
        influenceFactors: []
      },
      need: {
        urgency: 2,
        specificity: 0.4,
        motivation: 'unknown',
        painPoints: [],
        desiredOutcomes: []
      },
      timeline: {
        urgency: 'medium_term',
        checkInProximity: 30,
        bookingLikelihood: 0.5,
        decisionTimeframe: 'unknown',
        timelinePressures: []
      },
      qualification: 'warm',
      confidence: 0.4,
      recommendations: []
    };
  }

  // Additional helper methods would be implemented here...
  private inferBudgetBySeason(checkIn?: string): BudgetRange {
    // Implementation for seasonal budget inference
    return { min: 200, max: 600, confidence: 0.3, dailyRate: true };
  }

  private inferBudgetFromPriceReactions(reactions: PriceReaction[]): BudgetRange {
    // Implementation for price reaction analysis
    return { min: 200, max: 600, confidence: 0.6, dailyRate: true };
  }

  private inferBudgetBySearchBehavior(context: EnhancedConversationContext, messageHistory: Array<{ role: string; content: string }>): BudgetRange {
    // Implementation for search behavior analysis
    return { min: 200, max: 600, confidence: 0.4, dailyRate: true };
  }

  private identifyInfluenceFactors(message: string, authorityLevel: string): string[] {
    // Implementation for influence factors identification
    return ['budget_approval', 'family_consultation'];
  }

  private determineTimeline(context: EnhancedConversationContext, userMessage: string): TimelineAssessment {
    // Implementation for timeline assessment
    return {
      urgency: 'medium_term',
      checkInProximity: 30,
      bookingLikelihood: 0.5,
      decisionTimeframe: 'unknown',
      timelinePressures: []
    };
  }

  private identifyTravelMotivation(userMessage: string, context: EnhancedConversationContext): 'leisure' | 'business' | 'family' | 'romantic' | 'adventure' | 'unknown' {
    // Implementation for travel motivation identification
    return 'leisure';
  }

  private identifyPainPoints(userMessage: string, messageHistory: Array<{ role: string; content: string }>): string[] {
    // Implementation for pain points identification
    return [];
  }

  private identifyDesiredOutcomes(userMessage: string, context: EnhancedConversationContext): string[] {
    // Implementation for desired outcomes identification
    return [];
  }
}

// Export singleton instance
export const intelligentQualificationSystem = new IntelligentQualificationSystem();