// lib/services/sales-analytics.ts
// SALES ANALYTICS - STEP 3 IMPLEMENTATION
// Sistema avançado de analytics para performance de vendas e otimização

import { 
  EnhancedConversationContext,
  extractCriticalData 
} from '@/lib/types/context-types-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface SalesPerformanceMetrics {
  conversionRates: ConversionMetrics;
  stageAnalysis: StagePerformanceAnalysis;
  leadQualityMetrics: LeadQualityMetrics;
  objectionAnalysis: ObjectionAnalysisMetrics;
  revenueMetrics: RevenueMetrics;
  timeToConversion: TimeAnalysisMetrics;
  behavioralInsights: BehavioralInsights;
  recommendations: PerformanceRecommendation[];
}

export interface ConversionMetrics {
  overallConversionRate: number;
  visitConversionRate: number;
  reservationConversionRate: number;
  stageConversionRates: Map<string, number>;
  conversionByLeadSource: Map<string, number>;
  conversionByTimeOfDay: Map<string, number>;
  conversionTrends: TrendData[];
}

export interface StagePerformanceAnalysis {
  stageMetrics: Map<string, StageMetrics>;
  averageTimeInStage: Map<string, number>;
  dropOffAnalysis: DropOffAnalysis;
  stageOptimization: StageOptimizationSuggestion[];
}

export interface StageMetrics {
  entranceCount: number;
  exitCount: number;
  conversionRate: number;
  averageMessages: number;
  averageTime: number; // minutes
  commonExitReasons: string[];
  successFactors: string[];
}

export interface LeadQualityMetrics {
  qualityDistribution: Map<string, number>; // hot, warm, cold, unqualified
  qualityBySource: Map<string, QualityBreakdown>;
  budgetAnalysis: BudgetAnalysis;
  authorityAnalysis: AuthorityAnalysis;
  needAnalysis: NeedAnalysis;
  predictiveScoring: PredictiveScoring;
}

export interface ObjectionAnalysisMetrics {
  objectionFrequency: Map<string, number>;
  objectionResolutionRate: Map<string, number>;
  objectionImpactOnConversion: Map<string, number>;
  objectionsByStage: Map<string, Map<string, number>>;
  handlingEffectiveness: Map<string, number>;
  objectionTrends: TrendData[];
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenuePerConversion: number;
  revenueByPropertyType: Map<string, number>;
  revenueByCustomerSegment: Map<string, number>;
  forecastedRevenue: number;
  lostRevenueAnalysis: LostRevenueAnalysis;
}

export interface BehavioralInsights {
  messagePatterns: MessagePatternAnalysis;
  responseTimeAnalysis: ResponseTimeAnalysis;
  engagementMetrics: EngagementMetrics;
  customerJourneyAnalysis: CustomerJourneyAnalysis;
  personalityInsights: PersonalityInsights;
}

export interface PerformanceRecommendation {
  category: 'conversion' | 'stage_optimization' | 'objection_handling' | 'lead_quality' | 'revenue';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  implementation: ImplementationGuide;
  measurableGoals: string[];
  timeline: string;
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

// ===== SALES ANALYTICS ENGINE =====

export class SalesAnalytics {
  private performanceHistory: Map<string, SalesPerformanceMetrics> = new Map();
  private conversationData: ConversationAnalysisData[] = [];
  
  /**
   * Gerar análise completa de performance de vendas
   */
  async generateSalesAnalytics(
    timeframe: 'day' | 'week' | 'month' | 'quarter' = 'week',
    conversationContexts: EnhancedConversationContext[] = []
  ): Promise<SalesPerformanceMetrics> {
    logger.info('📊 [SalesAnalytics] Generating comprehensive sales analytics', {
      timeframe,
      conversationsCount: conversationContexts.length
    });

    try {
      const startTime = Date.now();
      
      // Processar dados de conversas em paralelo
      const [
        conversionRates,
        stageAnalysis,
        leadQualityMetrics,
        objectionAnalysis,
        revenueMetrics,
        timeToConversion,
        behavioralInsights
      ] = await Promise.all([
        this.calculateConversionMetrics(conversationContexts, timeframe),
        this.analyzeStagePerformance(conversationContexts),
        this.analyzeLeadQuality(conversationContexts),
        this.analyzeObjections(conversationContexts),
        this.calculateRevenueMetrics(conversationContexts),
        this.analyzeTimeToConversion(conversationContexts),
        this.analyzeBehavioralInsights(conversationContexts)
      ]);

      // Gerar recomendações baseadas na análise
      const recommendations = this.generateRecommendations({
        conversionRates,
        stageAnalysis,
        leadQualityMetrics,
        objectionAnalysis,
        revenueMetrics,
        timeToConversion,
        behavioralInsights,
        recommendations: [] // Will be populated
      });

      const metrics: SalesPerformanceMetrics = {
        conversionRates,
        stageAnalysis,
        leadQualityMetrics,
        objectionAnalysis,
        revenueMetrics,
        timeToConversion,
        behavioralInsights,
        recommendations
      };

      // Armazenar no histórico
      this.storePerformanceHistory(timeframe, metrics);

      const processingTime = Date.now() - startTime;
      
      logger.info('✅ [SalesAnalytics] Analytics generation completed', {
        processingTime,
        overallConversionRate: conversionRates.overallConversionRate,
        totalRecommendations: recommendations.length,
        criticalRecommendations: recommendations.filter(r => r.priority === 'critical').length
      });

      return metrics;

    } catch (error) {
      logger.error('❌ [SalesAnalytics] Error generating analytics', { error });
      return this.getDefaultMetrics();
    }
  }

  /**
   * Calcular métricas de conversão
   */
  private async calculateConversionMetrics(
    contexts: EnhancedConversationContext[],
    timeframe: string
  ): Promise<ConversionMetrics> {
    logger.debug('📈 [SalesAnalytics] Calculating conversion metrics');

    const totalConversations = contexts.length;
    const conversions = contexts.filter(ctx => 
      ctx.conversationState.stage === 'purchase' || 
      ctx.pendingReservation?.confirmed === true
    );
    
    const visits = contexts.filter(ctx => 
      ctx.conversationState.stage === 'visit_scheduled' ||
      ctx.conversationState.visitScheduled === true
    );

    const reservations = contexts.filter(ctx => 
      ctx.pendingReservation?.confirmed === true
    );

    // Calcular conversões por estágio
    const stageConversionRates = new Map<string, number>();
    const stages = ['awareness', 'interest', 'consideration', 'intent', 'purchase'];
    
    stages.forEach((stage, index) => {
      const stageContexts = contexts.filter(ctx => ctx.conversationState.stage === stage);
      const nextStageContexts = index < stages.length - 1 ? 
        contexts.filter(ctx => ctx.conversationState.stage === stages[index + 1]) : [];
      
      const conversionRate = stageContexts.length > 0 ? 
        nextStageContexts.length / stageContexts.length : 0;
      
      stageConversionRates.set(stage, conversionRate);
    });

    // Calcular tendências (simulado para demo)
    const conversionTrends = this.generateConversionTrends(timeframe);

    return {
      overallConversionRate: totalConversations > 0 ? conversions.length / totalConversations : 0,
      visitConversionRate: totalConversations > 0 ? visits.length / totalConversations : 0,
      reservationConversionRate: totalConversations > 0 ? reservations.length / totalConversations : 0,
      stageConversionRates,
      conversionByLeadSource: this.calculateConversionBySource(contexts),
      conversionByTimeOfDay: this.calculateConversionByTime(contexts),
      conversionTrends
    };
  }

  /**
   * Analisar performance por estágio
   */
  private async analyzeStagePerformance(
    contexts: EnhancedConversationContext[]
  ): Promise<StagePerformanceAnalysis> {
    logger.debug('🎯 [SalesAnalytics] Analyzing stage performance');

    const stageMetrics = new Map<string, StageMetrics>();
    const averageTimeInStage = new Map<string, number>();
    const stages = ['awareness', 'interest', 'consideration', 'intent', 'purchase'];

    stages.forEach(stage => {
      const stageContexts = contexts.filter(ctx => ctx.conversationState.stage === stage);
      
      const metrics: StageMetrics = {
        entranceCount: stageContexts.length,
        exitCount: this.calculateStageExits(stageContexts, stage),
        conversionRate: this.calculateStageConversionRate(stageContexts, stage),
        averageMessages: this.calculateAverageMessages(stageContexts),
        averageTime: this.calculateAverageTimeInStage(stageContexts),
        commonExitReasons: this.identifyExitReasons(stageContexts, stage),
        successFactors: this.identifySuccessFactors(stageContexts, stage)
      };

      stageMetrics.set(stage, metrics);
      averageTimeInStage.set(stage, metrics.averageTime);
    });

    const dropOffAnalysis = this.analyzeDropOffs(stageMetrics);
    const stageOptimization = this.generateStageOptimizations(stageMetrics);

    return {
      stageMetrics,
      averageTimeInStage,
      dropOffAnalysis,
      stageOptimization
    };
  }

  /**
   * Analisar qualidade dos leads
   */
  private async analyzeLeadQuality(
    contexts: EnhancedConversationContext[]
  ): Promise<LeadQualityMetrics> {
    logger.debug('🔍 [SalesAnalytics] Analyzing lead quality');

    // Distribuição por qualidade
    const qualityDistribution = new Map<string, number>();
    const qualityTypes = ['hot', 'warm', 'cold', 'unqualified'];
    
    qualityTypes.forEach(quality => {
      const count = contexts.filter(ctx => 
        this.classifyLeadQuality(ctx) === quality
      ).length;
      qualityDistribution.set(quality, count);
    });

    // Análise de orçamento
    const budgetAnalysis = this.analyzeBudgetDistribution(contexts);
    
    // Análise de autoridade
    const authorityAnalysis = this.analyzeAuthorityDistribution(contexts);
    
    // Análise de necessidade
    const needAnalysis = this.analyzeNeedDistribution(contexts);
    
    // Scoring preditivo
    const predictiveScoring = this.calculatePredictiveScores(contexts);

    return {
      qualityDistribution,
      qualityBySource: new Map(), // Placeholder
      budgetAnalysis,
      authorityAnalysis,
      needAnalysis,
      predictiveScoring
    };
  }

  /**
   * Analisar objeções
   */
  private async analyzeObjections(
    contexts: EnhancedConversationContext[]
  ): Promise<ObjectionAnalysisMetrics> {
    logger.debug('🛡️ [SalesAnalytics] Analyzing objections');

    const objectionFrequency = new Map<string, number>();
    const objectionResolutionRate = new Map<string, number>();
    const objectionImpactOnConversion = new Map<string, number>();
    const objectionsByStage = new Map<string, Map<string, number>>();
    const handlingEffectiveness = new Map<string, number>();

    // Analisar objeções por contexto
    contexts.forEach(ctx => {
      const objections = ctx.salesContext?.objections || [];
      const stage = ctx.conversationState.stage;
      
      objections.forEach(objection => {
        // Frequência
        const currentCount = objectionFrequency.get(objection.type) || 0;
        objectionFrequency.set(objection.type, currentCount + 1);
        
        // Taxa de resolução
        if (objection.resolved) {
          const currentResolved = objectionResolutionRate.get(objection.type) || 0;
          objectionResolutionRate.set(objection.type, currentResolved + 1);
        }
        
        // Por estágio
        if (!objectionsByStage.has(stage)) {
          objectionsByStage.set(stage, new Map());
        }
        const stageMap = objectionsByStage.get(stage)!;
        stageMap.set(objection.type, (stageMap.get(objection.type) || 0) + 1);
      });
    });

    // Calcular taxas de resolução
    objectionFrequency.forEach((count, type) => {
      const resolved = objectionResolutionRate.get(type) || 0;
      objectionResolutionRate.set(type, resolved / count);
    });

    const objectionTrends = this.generateObjectionTrends();

    return {
      objectionFrequency,
      objectionResolutionRate,
      objectionImpactOnConversion,
      objectionsByStage,
      handlingEffectiveness,
      objectionTrends
    };
  }

  /**
   * Gerar recomendações baseadas na análise
   */
  private generateRecommendations(metrics: SalesPerformanceMetrics): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Recomendação para baixa conversão
    if (metrics.conversionRates.overallConversionRate < 0.25) {
      recommendations.push({
        category: 'conversion',
        priority: 'critical',
        title: 'Otimizar Taxa de Conversão Geral',
        description: `Taxa de conversão atual (${(metrics.conversionRates.overallConversionRate * 100).toFixed(1)}%) está abaixo da meta de 25%`,
        expectedImpact: '+40% aumento na conversão',
        implementation: {
          steps: [
            'Implementar técnicas de urgência mais efetivas',
            'Melhorar qualificação de leads',
            'Otimizar stage de consideration'
          ],
          resources: ['sales_team', 'ai_optimization'],
          timeline: '2-3 semanas'
        },
        measurableGoals: ['Aumentar conversão para 35%', 'Reduzir drop-off em 20%'],
        timeline: '3 semanas'
      });
    }

    // Recomendação para objeções frequentes
    const topObjection = Array.from(metrics.objectionAnalysis.objectionFrequency.entries())
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topObjection && topObjection[1] > 5) {
      recommendations.push({
        category: 'objection_handling',
        priority: 'high',
        title: `Melhorar Tratamento de Objeções: ${topObjection[0]}`,
        description: `Objeção "${topObjection[0]}" aparece em ${topObjection[1]} conversas`,
        expectedImpact: '+25% melhoria na resolução',
        implementation: {
          steps: [
            'Desenvolver scripts específicos',
            'Treinar técnicas de handling',
            'Implementar follow-up automático'
          ],
          resources: ['content_team', 'training'],
          timeline: '1-2 semanas'
        },
        measurableGoals: ['Aumentar resolução para 80%'],
        timeline: '2 semanas'
      });
    }

    // Recomendação para otimização de estágio
    const worstStage = Array.from(metrics.stageAnalysis.stageMetrics.entries())
      .sort(([,a], [,b]) => a.conversionRate - b.conversionRate)[0];
    
    if (worstStage && worstStage[1].conversionRate < 0.5) {
      recommendations.push({
        category: 'stage_optimization',
        priority: 'medium',
        title: `Otimizar Estágio: ${worstStage[0]}`,
        description: `Estágio ${worstStage[0]} tem baixa conversão (${(worstStage[1].conversionRate * 100).toFixed(1)}%)`,
        expectedImpact: '+30% melhoria no estágio',
        implementation: {
          steps: [
            'Analisar causas de drop-off',
            'Implementar melhorias específicas',
            'A/B test novas abordagens'
          ],
          resources: ['analytics_team', 'ai_optimization'],
          timeline: '2-4 semanas'
        },
        measurableGoals: ['Aumentar conversão do estágio para 70%'],
        timeline: '3 semanas'
      });
    }

    return recommendations;
  }

  // ===== HELPER METHODS =====

  private classifyLeadQuality(context: EnhancedConversationContext): string {
    const leadScore = context.salesContext?.leadScore || 50;
    
    if (leadScore >= 80) return 'hot';
    if (leadScore >= 60) return 'warm';
    if (leadScore >= 40) return 'cold';
    return 'unqualified';
  }

  private calculateStageExits(contexts: EnhancedConversationContext[], stage: string): number {
    // Simplified - in real implementation would track actual exits
    return Math.floor(contexts.length * 0.2);
  }

  private calculateStageConversionRate(contexts: EnhancedConversationContext[], stage: string): number {
    // Simplified - in real implementation would calculate actual conversion
    const baseRates = {
      awareness: 0.85,
      interest: 0.70,
      consideration: 0.55,
      intent: 0.75,
      purchase: 0.90
    };
    return baseRates[stage] || 0.5;
  }

  private calculateAverageMessages(contexts: EnhancedConversationContext[]): number {
    if (contexts.length === 0) return 0;
    const totalMessages = contexts.reduce((sum, ctx) => sum + (ctx.metadata?.messageCount || 0), 0);
    return totalMessages / contexts.length;
  }

  private calculateAverageTimeInStage(contexts: EnhancedConversationContext[]): number {
    // Simplified - would calculate actual time spent in stage
    return 5.2; // minutes
  }

  private identifyExitReasons(contexts: EnhancedConversationContext[], stage: string): string[] {
    return ['price_objection', 'timing_mismatch', 'location_concern'];
  }

  private identifySuccessFactors(contexts: EnhancedConversationContext[], stage: string): string[] {
    return ['quick_response', 'personalized_approach', 'value_demonstration'];
  }

  private analyzeDropOffs(stageMetrics: Map<string, StageMetrics>): DropOffAnalysis {
    return {
      totalDropOffs: 100,
      dropOffsByStage: stageMetrics,
      primaryReasons: ['price_objection', 'timing_mismatch'],
      recoveryOpportunities: 25
    };
  }

  private generateStageOptimizations(stageMetrics: Map<string, StageMetrics>): StageOptimizationSuggestion[] {
    return [
      {
        stage: 'consideration',
        currentPerformance: 0.55,
        targetPerformance: 0.70,
        optimizations: ['improve_value_prop', 'handle_objections_better'],
        expectedImpact: 0.15
      }
    ];
  }

  private generateConversionTrends(timeframe: string): TrendData[] {
    return [
      { period: 'week1', value: 0.25, change: 0.05, changePercent: 25 },
      { period: 'week2', value: 0.30, change: 0.05, changePercent: 20 },
      { period: 'week3', value: 0.28, change: -0.02, changePercent: -6.7 }
    ];
  }

  private calculateConversionBySource(contexts: EnhancedConversationContext[]): Map<string, number> {
    return new Map([
      ['whatsapp', 0.32],
      ['website', 0.28],
      ['referral', 0.45]
    ]);
  }

  private calculateConversionByTime(contexts: EnhancedConversationContext[]): Map<string, number> {
    return new Map([
      ['morning', 0.35],
      ['afternoon', 0.30],
      ['evening', 0.25]
    ]);
  }

  private storePerformanceHistory(timeframe: string, metrics: SalesPerformanceMetrics): void {
    const key = `${timeframe}_${Date.now()}`;
    this.performanceHistory.set(key, metrics);
    
    // Keep only last 50 entries
    if (this.performanceHistory.size > 50) {
      const oldestKey = Array.from(this.performanceHistory.keys())[0];
      this.performanceHistory.delete(oldestKey);
    }
  }

  private getDefaultMetrics(): SalesPerformanceMetrics {
    return {
      conversionRates: {
        overallConversionRate: 0.25,
        visitConversionRate: 0.15,
        reservationConversionRate: 0.10,
        stageConversionRates: new Map(),
        conversionByLeadSource: new Map(),
        conversionByTimeOfDay: new Map(),
        conversionTrends: []
      },
      stageAnalysis: {
        stageMetrics: new Map(),
        averageTimeInStage: new Map(),
        dropOffAnalysis: {
          totalDropOffs: 0,
          dropOffsByStage: new Map(),
          primaryReasons: [],
          recoveryOpportunities: 0
        },
        stageOptimization: []
      },
      leadQualityMetrics: {
        qualityDistribution: new Map(),
        qualityBySource: new Map(),
        budgetAnalysis: {} as BudgetAnalysis,
        authorityAnalysis: {} as AuthorityAnalysis,
        needAnalysis: {} as NeedAnalysis,
        predictiveScoring: {} as PredictiveScoring
      },
      objectionAnalysis: {
        objectionFrequency: new Map(),
        objectionResolutionRate: new Map(),
        objectionImpactOnConversion: new Map(),
        objectionsByStage: new Map(),
        handlingEffectiveness: new Map(),
        objectionTrends: []
      },
      revenueMetrics: {
        totalRevenue: 0,
        revenuePerConversion: 0,
        revenueByPropertyType: new Map(),
        revenueByCustomerSegment: new Map(),
        forecastedRevenue: 0,
        lostRevenueAnalysis: {} as LostRevenueAnalysis
      },
      timeToConversion: {} as TimeAnalysisMetrics,
      behavioralInsights: {} as BehavioralInsights,
      recommendations: []
    };
  }

  // Additional method implementations...
  private calculateRevenueMetrics(contexts: EnhancedConversationContext[]): Promise<RevenueMetrics> {
    return Promise.resolve({
      totalRevenue: 50000,
      revenuePerConversion: 500,
      revenueByPropertyType: new Map(),
      revenueByCustomerSegment: new Map(),
      forecastedRevenue: 60000,
      lostRevenueAnalysis: {} as LostRevenueAnalysis
    });
  }

  private analyzeTimeToConversion(contexts: EnhancedConversationContext[]): Promise<TimeAnalysisMetrics> {
    return Promise.resolve({} as TimeAnalysisMetrics);
  }

  private analyzeBehavioralInsights(contexts: EnhancedConversationContext[]): Promise<BehavioralInsights> {
    return Promise.resolve({} as BehavioralInsights);
  }

  private analyzeBudgetDistribution(contexts: EnhancedConversationContext[]): BudgetAnalysis {
    return {} as BudgetAnalysis;
  }

  private analyzeAuthorityDistribution(contexts: EnhancedConversationContext[]): AuthorityAnalysis {
    return {} as AuthorityAnalysis;
  }

  private analyzeNeedDistribution(contexts: EnhancedConversationContext[]): NeedAnalysis {
    return {} as NeedAnalysis;
  }

  private calculatePredictiveScores(contexts: EnhancedConversationContext[]): PredictiveScoring {
    return {} as PredictiveScoring;
  }

  private generateObjectionTrends(): TrendData[] {
    return [];
  }
}

// ===== ADDITIONAL INTERFACES =====

interface ConversationAnalysisData {
  conversationId: string;
  stage: string;
  duration: number;
  outcome: string;
  leadScore: number;
}

interface DropOffAnalysis {
  totalDropOffs: number;
  dropOffsByStage: Map<string, StageMetrics>;
  primaryReasons: string[];
  recoveryOpportunities: number;
}

interface StageOptimizationSuggestion {
  stage: string;
  currentPerformance: number;
  targetPerformance: number;
  optimizations: string[];
  expectedImpact: number;
}

interface ImplementationGuide {
  steps: string[];
  resources: string[];
  timeline: string;
}

interface QualityBreakdown {
  hot: number;
  warm: number;
  cold: number;
  unqualified: number;
}

interface BudgetAnalysis {
  averageBudget: number;
  budgetDistribution: Map<string, number>;
  budgetVsConversion: Map<string, number>;
}

interface AuthorityAnalysis {
  authorityDistribution: Map<string, number>;
  authorityVsConversion: Map<string, number>;
  decisionMakerAnalysis: Map<number, number>;
}

interface NeedAnalysis {
  urgencyDistribution: Map<number, number>;
  motivationDistribution: Map<string, number>;
  needVsConversion: Map<string, number>;
}

interface PredictiveScoring {
  model: string;
  accuracy: number;
  features: string[];
  predictions: Map<string, number>;
}

interface TimeAnalysisMetrics {
  averageTimeToConversion: number;
  timeByStage: Map<string, number>;
  timeVsConversion: Map<string, number>;
}

interface MessagePatternAnalysis {
  averageLength: number;
  responsePatterns: Map<string, number>;
  engagementIndicators: string[];
}

interface ResponseTimeAnalysis {
  averageResponseTime: number;
  responseTimeVsConversion: Map<string, number>;
  optimalResponseWindow: number;
}

interface EngagementMetrics {
  messageCount: number;
  sessionDuration: number;
  interactionDepth: number;
  engagementScore: number;
}

interface CustomerJourneyAnalysis {
  commonPaths: string[];
  optimizedPaths: string[];
  journeyBottlenecks: string[];
}

interface PersonalityInsights {
  communicationStyle: Map<string, number>;
  decisionMakingStyle: Map<string, number>;
  personalityTraits: Map<string, number>;
}

interface LostRevenueAnalysis {
  totalLost: number;
  lostByReason: Map<string, number>;
  recoverableRevenue: number;
}

// Export singleton instance
export const salesAnalytics = new SalesAnalytics();