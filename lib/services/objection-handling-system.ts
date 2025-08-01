// lib/services/objection-handling-system.ts
// OBJECTION HANDLING SYSTEM - STEP 3 IMPLEMENTATION
// Sistema dinâmico e inteligente para tratamento de objeções

import { 
  EnhancedConversationContext,
  extractCriticalData 
} from '@/lib/types/context-types-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface ObjectionAnalysis {
  objections: DetectedObjection[];
  overallSentiment: 'positive' | 'neutral' | 'negative' | 'hostile';
  objectionSeverity: 'low' | 'medium' | 'high' | 'critical';
  handlingStrategy: ObjectionHandlingStrategy;
  expectedResolutionTime: number; // minutes
  conversionImpact: number; // 0-1, how much this affects conversion probability
}

export interface DetectedObjection {
  type: ObjectionType;
  content: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  context: ObjectionContext;
  emotionalIntensity: 1 | 2 | 3 | 4 | 5;
  rootCause: string;
  previouslyRaised: boolean;
}

export type ObjectionType = 
  | 'price' 
  | 'location' 
  | 'timing' 
  | 'features' 
  | 'trust' 
  | 'authority' 
  | 'comparison'
  | 'availability'
  | 'quality'
  | 'policies';

export interface ObjectionContext {
  stage: string;
  propertyContext?: string;
  priceContext?: number;
  timeContext?: string;
  relatedRequirement?: string;
}

export interface ObjectionHandlingStrategy {
  primaryApproach: string;
  techniques: ObjectionTechnique[];
  responseTemplates: ResponseTemplate[];
  followUpActions: string[];
  escalationThreshold: number;
  successProbability: number;
}

export interface ObjectionTechnique {
  name: string;
  description: string;
  applicability: ObjectionType[];
  effectiveness: number; // 0-1
  implementation: string;
  psychologyPrinciple: string;
}

export interface ResponseTemplate {
  template: string;
  variables: string[];
  tone: 'empathetic' | 'logical' | 'authoritative' | 'reassuring';
  expectedImpact: 'low' | 'medium' | 'high';
  followUpSuggestion?: string;
}

export interface ObjectionResolution {
  resolved: boolean;
  resolution: ObjectionHandlingStrategy;
  response: string;
  confidence: number;
  nextSteps: string[];
  monitoring: {
    watchForSignals: string[];
    successIndicators: string[];
    failureIndicators: string[];
  };
}

// ===== OBJECTION HANDLING SYSTEM =====

export class ObjectionHandlingSystem {
  private readonly OBJECTION_HANDLERS: Map<ObjectionType, ObjectionTechnique[]> = new Map();
  private readonly objectionHistory: Map<string, DetectedObjection[]> = new Map();

  constructor() {
    this.initializeObjectionHandlers();
  }

  /**
   * Analisar e tratar objeções de forma inteligente
   */
  async handleObjections(
    userMessage: string,
    context: EnhancedConversationContext,
    propertyContext?: any
  ): Promise<ObjectionAnalysis> {
    logger.debug('🛡️ [ObjectionHandler] Analyzing message for objections', {
      messageLength: userMessage.length,
      currentStage: context.conversationState.stage
    });

    try {
      // 1. Detectar objeções na mensagem
      const detectedObjections = this.detectObjections(userMessage, context, propertyContext);
      
      // 2. Analisar sentimento geral
      const overallSentiment = this.analyzeSentiment(userMessage, detectedObjections);
      
      // 3. Calcular severidade das objeções
      const objectionSeverity = this.calculateObjectionSeverity(detectedObjections);
      
      // 4. Selecionar estratégia de tratamento
      const handlingStrategy = this.selectHandlingStrategy(detectedObjections, context);
      
      // 5. Calcular impacto na conversão
      const conversionImpact = this.calculateConversionImpact(detectedObjections, context);
      
      // 6. Estimar tempo de resolução
      const expectedResolutionTime = this.estimateResolutionTime(detectedObjections, handlingStrategy);

      // 7. Armazenar no histórico
      this.storeObjectionHistory(context.clientData.phone, detectedObjections);

      const analysis: ObjectionAnalysis = {
        objections: detectedObjections,
        overallSentiment,
        objectionSeverity,
        handlingStrategy,
        expectedResolutionTime,
        conversionImpact
      };

      logger.info('✅ [ObjectionHandler] Objection analysis completed', {
        objectionsCount: detectedObjections.length,
        severity: objectionSeverity,
        sentiment: overallSentiment,
        conversionImpact,
        mainObjectionTypes: detectedObjections.map(obj => obj.type)
      });

      return analysis;

    } catch (error) {
      logger.error('❌ [ObjectionHandler] Error in objection analysis', { error });
      return this.getDefaultObjectionAnalysis();
    }
  }

  /**
   * Gerar resposta específica para objeção
   */
  async generateObjectionResponse(
    objection: DetectedObjection,
    context: EnhancedConversationContext,
    strategy: ObjectionHandlingStrategy
  ): Promise<ObjectionResolution> {
    logger.debug('📝 [ObjectionHandler] Generating objection response', {
      objectionType: objection.type,
      severity: objection.severity,
      strategy: strategy.primaryApproach
    });

    try {
      // Selecionar técnica mais apropriada
      const selectedTechnique = this.selectBestTechnique(objection, strategy.techniques);
      
      // Selecionar template de resposta
      const responseTemplate = this.selectResponseTemplate(objection, strategy.responseTemplates);
      
      // Personalizar resposta
      const personalizedResponse = this.personalizeResponse(
        responseTemplate,
        objection,
        context
      );
      
      // Definir próximos passos
      const nextSteps = this.defineNextSteps(objection, selectedTechnique, context);
      
      // Configurar monitoramento
      const monitoring = this.setupMonitoring(objection, selectedTechnique);

      const resolution: ObjectionResolution = {
        resolved: false, // Will be determined by customer response
        resolution: strategy,
        response: personalizedResponse,
        confidence: selectedTechnique.effectiveness * responseTemplate.expectedImpact === 'high' ? 1.0 : 0.7,
        nextSteps,
        monitoring
      };

      logger.info('✅ [ObjectionHandler] Response generated', {
        technique: selectedTechnique.name,
        confidence: resolution.confidence,
        responseLength: personalizedResponse.length
      });

      return resolution;

    } catch (error) {
      logger.error('❌ [ObjectionHandler] Error generating response', { error });
      return this.getDefaultResolution(objection);
    }
  }

  /**
   * Detectar objeções na mensagem do usuário
   */
  private detectObjections(
    userMessage: string,
    context: EnhancedConversationContext,
    propertyContext?: any
  ): DetectedObjection[] {
    const objections: DetectedObjection[] = [];
    const lowerMessage = userMessage.toLowerCase();

    // Objeções de preço
    const priceObjections = this.detectPriceObjections(lowerMessage, context, propertyContext);
    objections.push(...priceObjections);

    // Objeções de localização
    const locationObjections = this.detectLocationObjections(lowerMessage, context);
    objections.push(...locationObjections);

    // Objeções de timing
    const timingObjections = this.detectTimingObjections(lowerMessage, context);
    objections.push(...timingObjections);

    // Objeções de recursos/características
    const featureObjections = this.detectFeatureObjections(lowerMessage, context);
    objections.push(...featureObjections);

    // Objeções de confiança
    const trustObjections = this.detectTrustObjections(lowerMessage, context);
    objections.push(...trustObjections);

    // Objeções de autoridade
    const authorityObjections = this.detectAuthorityObjections(lowerMessage, context);
    objections.push(...authorityObjections);

    // Objeções de comparação
    const comparisonObjections = this.detectComparisonObjections(lowerMessage, context);
    objections.push(...comparisonObjections);

    return objections;
  }

  /**
   * Detectar objeções de preço
   */
  private detectPriceObjections(
    message: string,
    context: EnhancedConversationContext,
    propertyContext?: any
  ): DetectedObjection[] {
    const objections: DetectedObjection[] = [];
    
    const priceIndicators = [
      { keywords: ['muito caro', 'caro demais', 'salgado'], severity: 'high' as const, intensity: 5 },
      { keywords: ['caro', 'preço alto'], severity: 'medium' as const, intensity: 3 },
      { keywords: ['não cabe no orçamento', 'acima do orçamento'], severity: 'high' as const, intensity: 4 },
      { keywords: ['muito dinheiro', 'custoso'], severity: 'medium' as const, intensity: 3 },
      { keywords: ['mais barato', 'desconto'], severity: 'low' as const, intensity: 2 }
    ];

    priceIndicators.forEach(indicator => {
      const hasKeyword = indicator.keywords.some(keyword => message.includes(keyword));
      if (hasKeyword) {
        const matchedKeyword = indicator.keywords.find(keyword => message.includes(keyword))!;
        
        objections.push({
          type: 'price',
          content: matchedKeyword,
          severity: indicator.severity,
          confidence: 0.9,
          context: {
            stage: context.conversationState.stage,
            priceContext: propertyContext?.price || context.salesContext?.lastPriceCalculation?.totalPrice
          },
          emotionalIntensity: indicator.intensity,
          rootCause: this.identifyPriceObjectionRootCause(message, context),
          previouslyRaised: this.wasPreviouslyRaised('price', context.clientData.phone)
        });
      }
    });

    return objections;
  }

  /**
   * Detectar objeções de localização
   */
  private detectLocationObjections(
    message: string,
    context: EnhancedConversationContext
  ): DetectedObjection[] {
    const objections: DetectedObjection[] = [];
    
    const locationIndicators = [
      { keywords: ['muito longe', 'longe demais'], severity: 'high' as const, intensity: 4 },
      { keywords: ['longe', 'distante'], severity: 'medium' as const, intensity: 3 },
      { keywords: ['não conheço', 'onde fica'], severity: 'low' as const, intensity: 2 },
      { keywords: ['localização ruim', 'região perigosa'], severity: 'high' as const, intensity: 5 },
      { keywords: ['preferiu outro local', 'outra região'], severity: 'medium' as const, intensity: 3 }
    ];

    locationIndicators.forEach(indicator => {
      const hasKeyword = indicator.keywords.some(keyword => message.includes(keyword));
      if (hasKeyword) {
        const matchedKeyword = indicator.keywords.find(keyword => message.includes(keyword))!;
        
        objections.push({
          type: 'location',
          content: matchedKeyword,
          severity: indicator.severity,
          confidence: 0.8,
          context: {
            stage: context.conversationState.stage,
            relatedRequirement: context.clientData.city
          },
          emotionalIntensity: indicator.intensity,
          rootCause: this.identifyLocationObjectionRootCause(message, context),
          previouslyRaised: this.wasPreviouslyRaised('location', context.clientData.phone)
        });
      }
    });

    return objections;
  }

  /**
   * Detectar objeções de timing
   */
  private detectTimingObjections(
    message: string,
    context: EnhancedConversationContext
  ): DetectedObjection[] {
    const objections: DetectedObjection[] = [];
    
    const timingIndicators = [
      { keywords: ['não tenho pressa', 'sem pressa'], severity: 'medium' as const, intensity: 2 },
      { keywords: ['vou pensar', 'preciso pensar'], severity: 'high' as const, intensity: 3 },
      { keywords: ['depois eu vejo', 'mais tarde'], severity: 'medium' as const, intensity: 2 },
      { keywords: ['outro dia', 'outra hora'], severity: 'low' as const, intensity: 2 },
      { keywords: ['não é urgente'], severity: 'medium' as const, intensity: 2 }
    ];

    timingIndicators.forEach(indicator => {
      const hasKeyword = indicator.keywords.some(keyword => message.includes(keyword));
      if (hasKeyword) {
        const matchedKeyword = indicator.keywords.find(keyword => message.includes(keyword))!;
        
        objections.push({
          type: 'timing',
          content: matchedKeyword,
          severity: indicator.severity,
          confidence: 0.7,
          context: {
            stage: context.conversationState.stage,
            timeContext: context.clientData.checkIn
          },
          emotionalIntensity: indicator.intensity,
          rootCause: this.identifyTimingObjectionRootCause(message, context),
          previouslyRaised: this.wasPreviouslyRaised('timing', context.clientData.phone)
        });
      }
    });

    return objections;
  }

  /**
   * Inicializar handlers de objeções
   */
  private initializeObjectionHandlers(): void {
    // Price objection handlers
    this.OBJECTION_HANDLERS.set('price', [
      {
        name: 'Value Demonstration',
        description: 'Demonstrar valor agregado vs custo',
        applicability: ['price'],
        effectiveness: 0.8,
        implementation: 'show_value_breakdown',
        psychologyPrinciple: 'anchoring_and_value_perception'
      },
      {
        name: 'Cost Per Person',
        description: 'Dividir custo por pessoa para reduzir impacto',
        applicability: ['price'],
        effectiveness: 0.7,
        implementation: 'cost_breakdown',
        psychologyPrinciple: 'cognitive_ease'
      },
      {
        name: 'Hotel Comparison',
        description: 'Comparar com alternativas mais caras',
        applicability: ['price'],
        effectiveness: 0.9,
        implementation: 'competitor_comparison',
        psychologyPrinciple: 'anchoring'
      }
    ]);

    // Location objection handlers
    this.OBJECTION_HANDLERS.set('location', [
      {
        name: 'Location Benefits',
        description: 'Destacar benefícios únicos da localização',
        applicability: ['location'],
        effectiveness: 0.8,
        implementation: 'highlight_location_advantages',
        psychologyPrinciple: 'reframing'
      },
      {
        name: 'Transportation Solutions',
        description: 'Oferecer soluções de transporte',
        applicability: ['location'],
        effectiveness: 0.6,
        implementation: 'transportation_options',
        psychologyPrinciple: 'problem_solving'
      }
    ]);

    // Timing objection handlers
    this.OBJECTION_HANDLERS.set('timing', [
      {
        name: 'Urgency Creation',
        description: 'Criar senso de urgência apropriado',
        applicability: ['timing'],
        effectiveness: 0.7,
        implementation: 'scarcity_and_urgency',
        psychologyPrinciple: 'loss_aversion'
      },
      {
        name: 'Hold Option',
        description: 'Oferecer reserva temporária sem compromisso',
        applicability: ['timing'],
        effectiveness: 0.8,
        implementation: 'temporary_hold',
        psychologyPrinciple: 'commitment_consistency'
      }
    ]);
  }

  // ===== HELPER METHODS =====

  private analyzeSentiment(message: string, objections: DetectedObjection[]): 'positive' | 'neutral' | 'negative' | 'hostile' {
    const lowerMessage = message.toLowerCase();
    
    // Hostile indicators
    const hostileIndicators = ['nunca', 'jamais', 'impossível', 'ridículo', 'absurdo'];
    if (hostileIndicators.some(indicator => lowerMessage.includes(indicator))) {
      return 'hostile';
    }

    // Calculate sentiment based on objections
    const highSeverityObjections = objections.filter(obj => obj.severity === 'high').length;
    const totalEmotionalIntensity = objections.reduce((sum, obj) => sum + obj.emotionalIntensity, 0);

    if (highSeverityObjections > 0 || totalEmotionalIntensity > 10) {
      return 'negative';
    } else if (objections.length > 0) {
      return 'neutral';
    } else {
      return 'positive';
    }
  }

  private calculateObjectionSeverity(objections: DetectedObjection[]): 'low' | 'medium' | 'high' | 'critical' {
    if (objections.length === 0) return 'low';

    const highSeverityCount = objections.filter(obj => obj.severity === 'high').length;
    const totalEmotionalIntensity = objections.reduce((sum, obj) => sum + obj.emotionalIntensity, 0);

    if (highSeverityCount >= 2 || totalEmotionalIntensity >= 15) {
      return 'critical';
    } else if (highSeverityCount >= 1 || totalEmotionalIntensity >= 10) {
      return 'high';
    } else if (objections.length >= 2 || totalEmotionalIntensity >= 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private selectHandlingStrategy(
    objections: DetectedObjection[],
    context: EnhancedConversationContext
  ): ObjectionHandlingStrategy {
    if (objections.length === 0) {
      return this.getDefaultStrategy();
    }

    // Select primary objection (highest severity + intensity)
    const primaryObjection = objections.reduce((prev, current) => {
      const prevScore = this.calculateObjectionScore(prev);
      const currentScore = this.calculateObjectionScore(current);
      return currentScore > prevScore ? current : prev;
    });

    const techniques = this.OBJECTION_HANDLERS.get(primaryObjection.type) || [];
    const responseTemplates = this.getResponseTemplates(primaryObjection.type);

    return {
      primaryApproach: techniques[0]?.name || 'empathetic_listening',
      techniques,
      responseTemplates,
      followUpActions: this.getFollowUpActions(primaryObjection),
      escalationThreshold: 3,
      successProbability: this.calculateSuccessProbability(primaryObjection, techniques)
    };
  }

  private calculateObjectionScore(objection: DetectedObjection): number {
    const severityWeight = { low: 1, medium: 2, high: 3 };
    return severityWeight[objection.severity] * objection.emotionalIntensity * objection.confidence;
  }

  private getDefaultObjectionAnalysis(): ObjectionAnalysis {
    return {
      objections: [],
      overallSentiment: 'neutral',
      objectionSeverity: 'low',
      handlingStrategy: this.getDefaultStrategy(),
      expectedResolutionTime: 2,
      conversionImpact: 0.1
    };
  }

  private getDefaultStrategy(): ObjectionHandlingStrategy {
    return {
      primaryApproach: 'empathetic_listening',
      techniques: [],
      responseTemplates: [],
      followUpActions: ['continue_conversation'],
      escalationThreshold: 3,
      successProbability: 0.7
    };
  }

  // Additional helper methods implementation...
  private detectFeatureObjections(message: string, context: EnhancedConversationContext): DetectedObjection[] { return []; }
  private detectTrustObjections(message: string, context: EnhancedConversationContext): DetectedObjection[] { return []; }
  private detectAuthorityObjections(message: string, context: EnhancedConversationContext): DetectedObjection[] { return []; }
  private detectComparisonObjections(message: string, context: EnhancedConversationContext): DetectedObjection[] { return []; }
  
  private identifyPriceObjectionRootCause(message: string, context: EnhancedConversationContext): string { return 'budget_constraint'; }
  private identifyLocationObjectionRootCause(message: string, context: EnhancedConversationContext): string { return 'unfamiliarity'; }
  private identifyTimingObjectionRootCause(message: string, context: EnhancedConversationContext): string { return 'decision_hesitation'; }
  
  private wasPreviouslyRaised(type: ObjectionType, clientPhone: string): boolean { return false; }
  private storeObjectionHistory(clientPhone: string, objections: DetectedObjection[]): void { }
  
  private calculateConversionImpact(objections: DetectedObjection[], context: EnhancedConversationContext): number {
    return Math.min(1.0, objections.length * 0.2);
  }
  
  private estimateResolutionTime(objections: DetectedObjection[], strategy: ObjectionHandlingStrategy): number {
    return objections.length * 2; // 2 minutes per objection
  }
  
  private selectBestTechnique(objection: DetectedObjection, techniques: ObjectionTechnique[]): ObjectionTechnique {
    return techniques.find(t => t.applicability.includes(objection.type)) || techniques[0];
  }
  
  private selectResponseTemplate(objection: DetectedObjection, templates: ResponseTemplate[]): ResponseTemplate {
    return templates[0] || { template: 'Entendo sua preocupação. Deixe-me esclarecer isso.', variables: [], tone: 'empathetic', expectedImpact: 'medium' };
  }
  
  private personalizeResponse(template: ResponseTemplate, objection: DetectedObjection, context: EnhancedConversationContext): string {
    return template.template; // Simplified implementation
  }
  
  private defineNextSteps(objection: DetectedObjection, technique: ObjectionTechnique, context: EnhancedConversationContext): string[] {
    return ['monitor_response', 'provide_additional_value'];
  }
  
  private setupMonitoring(objection: DetectedObjection, technique: ObjectionTechnique) {
    return {
      watchForSignals: ['price_acceptance', 'location_acceptance'],
      successIndicators: ['positive_response', 'follow_up_questions'],
      failureIndicators: ['repeated_objection', 'disengagement']
    };
  }
  
  private getResponseTemplates(type: ObjectionType): ResponseTemplate[] {
    return [{ template: 'Entendo sua preocupação sobre {objection}.', variables: ['objection'], tone: 'empathetic', expectedImpact: 'medium' }];
  }
  
  private getFollowUpActions(objection: DetectedObjection): string[] {
    return ['provide_alternatives', 'offer_compromise'];
  }
  
  private calculateSuccessProbability(objection: DetectedObjection, techniques: ObjectionTechnique[]): number {
    return techniques.length > 0 ? techniques[0].effectiveness : 0.5;
  }
  
  private getDefaultResolution(objection: DetectedObjection): ObjectionResolution {
    return {
      resolved: false,
      resolution: this.getDefaultStrategy(),
      response: 'Entendo sua preocupação. Vamos encontrar uma solução juntos.',
      confidence: 0.5,
      nextSteps: ['listen_actively', 'provide_alternatives'],
      monitoring: {
        watchForSignals: ['engagement_level'],
        successIndicators: ['continued_conversation'],
        failureIndicators: ['disengagement']
      }
    };
  }
}

// Export singleton instance
export const objectionHandlingSystem = new ObjectionHandlingSystem();