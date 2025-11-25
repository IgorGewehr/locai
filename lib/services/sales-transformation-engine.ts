// lib/services/sales-transformation-engine.ts
// SALES TRANSFORMATION ENGINE - STEP 3 IMPLEMENTATION
// Transformar Sofia em vendedor profissional de alto nível com técnicas avançadas

import { 
  EnhancedConversationContext,
  extractCriticalData 
} from '@/lib/types/context-types';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface SalesStageAdvancement {
  currentStage: SalesStage;
  nextStage: SalesStage;
  advancementProbability: number;
  buyingSignals: string[];
  objections: Objection[];
  recommendedActions: SalesAction[];
  urgencyLevel: 1 | 2 | 3 | 4 | 5;
  conversionProbability: number;
}

export interface SalesStage {
  stage: 'awareness' | 'interest' | 'consideration' | 'intent' | 'purchase';
  objective: string;
  techniques: string[];
  nextStage: string;
  averageMessages: string;
  keyMetrics: {
    conversionRate: number;
    dropOffRate: number;
    averageTimeInStage: number;
  };
}

export interface Objection {
  type: 'price' | 'location' | 'timing' | 'features' | 'trust' | 'authority';
  severity: 'low' | 'medium' | 'high';
  content: string;
  resolved: boolean;
  handlingStrategy: string;
}

export interface SalesAction {
  type: 'response' | 'function_call' | 'urgency_creation' | 'social_proof';
  priority: 1 | 2 | 3 | 4 | 5;
  content: string;
  expectedImpact: 'low' | 'medium' | 'high';
  executionTime: number;
}

export interface BuyingSignal {
  signal: string;
  strength: 'weak' | 'medium' | 'strong';
  category: 'interest' | 'urgency' | 'decision' | 'budget' | 'authority';
  confidence: number;
}

// ===== SALES TRANSFORMATION ENGINE =====

export class SalesTransformationEngine {
  private readonly SALES_STAGES: Map<string, SalesStage> = new Map([
    ['awareness', {
      stage: 'awareness',
      objective: 'Identificar necessidade e criar interesse',
      techniques: ['questioning', 'benefit_highlighting', 'rapport_building'],
      nextStage: 'interest',
      averageMessages: '2-3',
      keyMetrics: {
        conversionRate: 0.85,
        dropOffRate: 0.15,
        averageTimeInStage: 2.5
      }
    }],
    ['interest', {
      stage: 'interest',
      objective: 'Despertar desejo pelas propriedades',
      techniques: ['storytelling', 'social_proof', 'visual_engagement'],
      nextStage: 'consideration',
      averageMessages: '3-5',
      keyMetrics: {
        conversionRate: 0.70,
        dropOffRate: 0.30,
        averageTimeInStage: 4.2
      }
    }],
    ['consideration', {
      stage: 'consideration',
      objective: 'Demonstrar valor e remover objeções',
      techniques: ['value_demonstration', 'objection_handling', 'urgency'],
      nextStage: 'intent',
      averageMessages: '4-6',
      keyMetrics: {
        conversionRate: 0.55,
        dropOffRate: 0.45,
        averageTimeInStage: 5.8
      }
    }],
    ['intent', {
      stage: 'intent',
      objective: 'Gerar intenção de compra forte',
      techniques: ['scarcity', 'loss_aversion', 'assumptive_close'],
      nextStage: 'purchase',
      averageMessages: '2-4',
      keyMetrics: {
        conversionRate: 0.75,
        dropOffRate: 0.25,
        averageTimeInStage: 3.1
      }
    }],
    ['purchase', {
      stage: 'purchase',
      objective: 'Fechar venda (visita ou reserva)',
      techniques: ['choice_close', 'urgency_close', 'benefit_close'],
      nextStage: 'retention',
      averageMessages: '1-3',
      keyMetrics: {
        conversionRate: 0.90,
        dropOffRate: 0.10,
        averageTimeInStage: 2.0
      }
    }]
  ]);

  /**
   * Analisar e avançar estágio de vendas baseado na conversa
   */
  async advanceSalesStage(
    context: EnhancedConversationContext,
    userMessage: string,
    messageHistory: Array<{ role: string; content: string }>
  ): Promise<SalesStageAdvancement> {
    logger.debug('🎯 [SalesEngine] Analyzing sales stage advancement', {
      currentStage: context.conversationState.stage,
      messageCount: messageHistory.length,
      leadScore: context.salesContext?.leadScore
    });

    try {
      const currentStage = this.identifyCurrentStage(context);
      const buyingSignals = this.detectBuyingSignals(userMessage, context);
      const objections = this.detectObjections(userMessage, context);
      
      // Calcular probabilidade de avanço
      const advancementProbability = this.calculateAdvancementProbability(
        currentStage,
        buyingSignals,
        context.salesContext?.leadScore || 50,
        messageHistory
      );

      // Determinar próximas ações
      let nextStage = currentStage;
      let recommendedActions: SalesAction[] = [];

      if (advancementProbability > 0.7) {
        // Avançar para próximo estágio
        nextStage = this.getNextStage(currentStage);
        recommendedActions = this.generateAdvancementActions(nextStage, buyingSignals);
      } else if (objections.length > 0) {
        // Tratar objeções
        recommendedActions = this.generateObjectionHandlingActions(objections, currentStage);
      } else {
        // Reforçar estágio atual
        recommendedActions = this.generateStageReinforcementActions(currentStage, context);
      }

      const conversionProbability = this.calculateConversionProbability(
        nextStage,
        buyingSignals,
        objections,
        context
      );

      const advancement: SalesStageAdvancement = {
        currentStage: this.SALES_STAGES.get(currentStage.stage)!,
        nextStage: this.SALES_STAGES.get(nextStage.stage)!,
        advancementProbability,
        buyingSignals: buyingSignals.map(bs => bs.signal),
        objections,
        recommendedActions,
        urgencyLevel: this.calculateUrgencyLevel(buyingSignals, objections, context),
        conversionProbability
      };

      logger.info('📈 [SalesEngine] Sales stage analysis completed', {
        currentStage: currentStage.stage,
        nextStage: nextStage.stage,
        advancementProbability,
        buyingSignalsCount: buyingSignals.length,
        objectionsCount: objections.length,
        conversionProbability
      });

      return advancement;

    } catch (error) {
      logger.error('❌ [SalesEngine] Error in sales stage advancement', { error });
      
      // Return default advancement
      return this.getDefaultAdvancement(context);
    }
  }

  /**
   * Detectar sinais de compra na mensagem do usuário
   */
  private detectBuyingSignals(message: string, context: EnhancedConversationContext): BuyingSignal[] {
    const signals: BuyingSignal[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Sinais de alta intenção
    const highIntentSignals = [
      { phrases: ['quero reservar', 'vou fechar', 'aceito', 'quando posso'], category: 'decision' as const },
      { phrases: ['qual o próximo passo', 'como faço', 'vou pegar'], category: 'decision' as const },
      { phrases: ['me interessa muito', 'gostei muito', 'perfeito'], category: 'interest' as const },
      { phrases: ['é urgente', 'preciso logo', 'é para já'], category: 'urgency' as const },
      { phrases: ['tenho orçamento', 'posso pagar', 'cabe no bolso'], category: 'budget' as const }
    ];

    // Sinais de média intenção
    const mediumIntentSignals = [
      { phrases: ['interessante', 'gostei', 'boa opção'], category: 'interest' as const },
      { phrases: ['vou pensar', 'me manda mais', 'quero ver'], category: 'interest' as const },
      { phrases: ['pode mostrar', 'tem disponível', 'posso visitar'], category: 'interest' as const }
    ];

    // Sinais de baixa intenção (mas ainda positivos)
    const lowIntentSignals = [
      { phrases: ['talvez', 'não sei', 'vou ver'], category: 'interest' as const },
      { phrases: ['depois', 'mais tarde', 'outro dia'], category: 'interest' as const }
    ];

    // Detectar sinais altos
    highIntentSignals.forEach(signalGroup => {
      signalGroup.phrases.forEach(phrase => {
        if (lowerMessage.includes(phrase)) {
          signals.push({
            signal: phrase,
            strength: 'strong',
            category: signalGroup.category,
            confidence: 0.9
          });
        }
      });
    });

    // Detectar sinais médios
    mediumIntentSignals.forEach(signalGroup => {
      signalGroup.phrases.forEach(phrase => {
        if (lowerMessage.includes(phrase)) {
          signals.push({
            signal: phrase,
            strength: 'medium',
            category: signalGroup.category,
            confidence: 0.7
          });
        }
      });
    });

    // Detectar sinais baixos
    lowIntentSignals.forEach(signalGroup => {
      signalGroup.phrases.forEach(phrase => {
        if (lowerMessage.includes(phrase)) {
          signals.push({
            signal: phrase,
            strength: 'weak',
            category: signalGroup.category,
            confidence: 0.4
          });
        }
      });
    });

    // Detectar sinais contextuais
    if (context.conversationState.propertiesShown?.length > 0) {
      // Cliente já viu propriedades
      if (lowerMessage.includes('esta') || lowerMessage.includes('essa')) {
        signals.push({
          signal: 'reference_to_shown_property',
          strength: 'medium',
          category: 'interest',
          confidence: 0.6
        });
      }
    }

    return signals;
  }

  /**
   * Detectar objeções na mensagem do usuário
   */
  private detectObjections(message: string, context: EnhancedConversationContext): Objection[] {
    const objections: Objection[] = [];
    const lowerMessage = message.toLowerCase();

    // Objeções de preço
    const priceObjections = ['caro', 'preço alto', 'não cabe no orçamento', 'muito dinheiro', 'salgado'];
    priceObjections.forEach(phrase => {
      if (lowerMessage.includes(phrase)) {
        objections.push({
          type: 'price',
          severity: this.calculateObjectionSeverity(phrase, message),
          content: phrase,
          resolved: false,
          handlingStrategy: 'value_demonstration'
        });
      }
    });

    // Objeções de localização
    const locationObjections = ['longe', 'localização', 'não conheço', 'onde fica', 'região ruim'];
    locationObjections.forEach(phrase => {
      if (lowerMessage.includes(phrase)) {
        objections.push({
          type: 'location',
          severity: this.calculateObjectionSeverity(phrase, message),
          content: phrase,
          resolved: false,
          handlingStrategy: 'location_benefits'
        });
      }
    });

    // Objeções de timing
    const timingObjections = ['não tenho pressa', 'vou pensar', 'depois eu vejo', 'mais tarde', 'outro dia'];
    timingObjections.forEach(phrase => {
      if (lowerMessage.includes(phrase)) {
        objections.push({
          type: 'timing',
          severity: this.calculateObjectionSeverity(phrase, message),
          content: phrase,
          resolved: false,
          handlingStrategy: 'urgency_creation'
        });
      }
    });

    // Objeções de autoridade
    const authorityObjections = ['preciso falar', 'vou conversar', 'não posso decidir', 'depende de'];
    authorityObjections.forEach(phrase => {
      if (lowerMessage.includes(phrase)) {
        objections.push({
          type: 'authority',
          severity: this.calculateObjectionSeverity(phrase, message),
          content: phrase,
          resolved: false,
          handlingStrategy: 'decision_facilitation'
        });
      }
    });

    return objections;
  }

  /**
   * Calcular probabilidade de avanço de estágio
   */
  private calculateAdvancementProbability(
    currentStage: SalesStage,
    buyingSignals: BuyingSignal[],
    leadScore: number,
    messageHistory: Array<{ role: string; content: string }>
  ): number {
    let probability = 0.3; // Base probability

    // Boost por buying signals
    const strongSignals = buyingSignals.filter(bs => bs.strength === 'strong').length;
    const mediumSignals = buyingSignals.filter(bs => bs.strength === 'medium').length;
    
    probability += strongSignals * 0.25;
    probability += mediumSignals * 0.15;

    // Boost por lead score
    probability += (leadScore / 100) * 0.3;

    // Boost por engajamento (número de mensagens)
    const engagementBoost = Math.min(0.2, messageHistory.length * 0.02);
    probability += engagementBoost;

    // Penalidade por tempo excessivo no estágio
    const messagesInStage = this.getMessagesInCurrentStage(messageHistory, currentStage);
    if (messagesInStage > 8) {
      probability -= 0.15; // Penalidade por estagnação
    }

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Calcular probabilidade de conversão final
   */
  private calculateConversionProbability(
    stage: SalesStage,
    buyingSignals: BuyingSignal[],
    objections: Objection[],
    context: EnhancedConversationContext
  ): number {
    let probability = stage.keyMetrics.conversionRate;

    // Boost por buying signals
    const signalBoost = buyingSignals.reduce((boost, signal) => {
      switch (signal.strength) {
        case 'strong': return boost + 0.15;
        case 'medium': return boost + 0.08;
        case 'weak': return boost + 0.03;
        default: return boost;
      }
    }, 0);

    probability += signalBoost;

    // Penalidade por objeções não resolvidas
    const unresolvedObjections = objections.filter(obj => !obj.resolved);
    const objectionPenalty = unresolvedObjections.reduce((penalty, obj) => {
      switch (obj.severity) {
        case 'high': return penalty - 0.2;
        case 'medium': return penalty - 0.1;
        case 'low': return penalty - 0.05;
        default: return penalty;
      }
    }, 0);

    probability += objectionPenalty;

    // Boost por dados completos do cliente
    const criticalData = extractCriticalData(context);
    const completenessBoost = this.calculateDataCompleteness(criticalData) * 0.1;
    probability += completenessBoost;

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Gerar ações recomendadas para avanço de estágio
   */
  private generateAdvancementActions(
    nextStage: SalesStage,
    buyingSignals: BuyingSignal[]
  ): SalesAction[] {
    const actions: SalesAction[] = [];

    switch (nextStage.stage) {
      case 'interest':
        actions.push({
          type: 'response',
          priority: 4,
          content: 'Perfeito! Vou mostrar algumas opções incríveis que combinam exatamente com o que você busca!',
          expectedImpact: 'high',
          executionTime: 1000
        });
        break;

      case 'consideration':
        actions.push({
          type: 'function_call',
          priority: 5,
          content: 'send_property_media',
          expectedImpact: 'high',
          executionTime: 2000
        });
        actions.push({
          type: 'social_proof',
          priority: 3,
          content: '⭐ Esta propriedade tem avaliação 4.9/5 - "Lugar perfeito!" - Marina, SP',
          expectedImpact: 'medium',
          executionTime: 500
        });
        break;

      case 'intent':
        actions.push({
          type: 'urgency_creation',
          priority: 5,
          content: '🔥 Últimas 3 datas disponíveis este mês! Outros clientes também interessados hoje.',
          expectedImpact: 'high',
          executionTime: 800
        });
        break;

      case 'purchase':
        actions.push({
          type: 'response',
          priority: 5,
          content: 'Para esta propriedade incrível, você prefere:\n🏠 Visita presencial\n✅ Reserva direta (últimas vagas!)',
          expectedImpact: 'high',
          executionTime: 1200
        });
        break;
    }

    return actions;
  }

  /**
   * Gerar ações para tratar objeções
   */
  private generateObjectionHandlingActions(
    objections: Objection[],
    currentStage: SalesStage
  ): SalesAction[] {
    const actions: SalesAction[] = [];

    objections.forEach(objection => {
      switch (objection.type) {
        case 'price':
          actions.push({
            type: 'response',
            priority: 4,
            content: 'Entendo sua preocupação com investimento. Vamos pensar no valor: dividindo por pessoa, fica apenas R$X/dia. Compare com hotel similar que custaria R$Y!',
            expectedImpact: 'high',
            executionTime: 1500
          });
          break;

        case 'location':
          actions.push({
            type: 'response',
            priority: 4,
            content: 'A localização é estratégica! Fica apenas Xkm do centro. Muitos hóspedes escolhem exatamente por isso - mais tranquilo mas com fácil acesso!',
            expectedImpact: 'medium',
            executionTime: 1200
          });
          break;

        case 'timing':
          actions.push({
            type: 'urgency_creation',
            priority: 5,
            content: 'Entendo que quer avaliar bem! Só para você saber: estas datas específicas tendem a esgotar rápido. Que tal eu reservar por 24h sem compromisso?',
            expectedImpact: 'high',
            executionTime: 1800
          });
          break;
      }
    });

    return actions;
  }

  // ===== HELPER METHODS =====

  private identifyCurrentStage(context: EnhancedConversationContext): SalesStage {
    const stageStr = context.conversationState.stage;
    return this.SALES_STAGES.get(stageStr) || this.SALES_STAGES.get('awareness')!;
  }

  private getNextStage(currentStage: SalesStage): SalesStage {
    return this.SALES_STAGES.get(currentStage.nextStage) || currentStage;
  }

  private calculateObjectionSeverity(phrase: string, fullMessage: string): 'low' | 'medium' | 'high' {
    const highSeverityIndicators = ['nunca', 'jamais', 'impossível', 'muito caro'];
    const lowSeverityIndicators = ['talvez', 'um pouco', 'meio'];

    const lowerMessage = fullMessage.toLowerCase();
    
    if (highSeverityIndicators.some(indicator => lowerMessage.includes(indicator))) {
      return 'high';
    } else if (lowSeverityIndicators.some(indicator => lowerMessage.includes(indicator))) {
      return 'low';
    }
    
    return 'medium';
  }

  private calculateUrgencyLevel(
    buyingSignals: BuyingSignal[],
    objections: Objection[],
    context: EnhancedConversationContext
  ): 1 | 2 | 3 | 4 | 5 {
    let urgency = 2; // Base urgency

    // Increase urgency for strong buying signals
    const strongSignals = buyingSignals.filter(bs => bs.strength === 'strong').length;
    urgency += Math.min(2, strongSignals);

    // Decrease urgency for unresolved objections
    const unresolvedObjections = objections.filter(obj => !obj.resolved).length;
    urgency -= Math.min(1, unresolvedObjections);

    // Context-based urgency
    const messageCount = context.metadata?.messageCount || 0;
    if (messageCount > 10) urgency += 1; // Long conversation = higher urgency

    return Math.max(1, Math.min(5, urgency)) as 1 | 2 | 3 | 4 | 5;
  }

  private getMessagesInCurrentStage(
    messageHistory: Array<{ role: string; content: string }>,
    currentStage: SalesStage
  ): number {
    // Simplified: assume all messages are in current stage
    // In real implementation, would track stage changes
    return messageHistory.length;
  }

  private calculateDataCompleteness(criticalData: any): number {
    const fields = ['guests', 'checkIn', 'checkOut', 'city', 'name'];
    const completedFields = fields.filter(field => criticalData[field] !== undefined).length;
    return completedFields / fields.length;
  }

  private generateStageReinforcementActions(
    currentStage: SalesStage,
    context: EnhancedConversationContext
  ): SalesAction[] {
    const actions: SalesAction[] = [];

    switch (currentStage.stage) {
      case 'awareness':
        actions.push({
          type: 'response',
          priority: 3,
          content: 'Para encontrar a propriedade perfeita, me conta: quantas pessoas e para quais datas?',
          expectedImpact: 'medium',
          executionTime: 800
        });
        break;

      case 'interest':
        actions.push({
          type: 'function_call',
          priority: 4,
          content: 'search_properties',
          expectedImpact: 'high',
          executionTime: 1500
        });
        break;

      case 'consideration':
        actions.push({
          type: 'social_proof',
          priority: 3,
          content: '👥 +50 famílias já se hospedaram aqui este ano com avaliações excelentes!',
          expectedImpact: 'medium',
          executionTime: 600
        });
        break;
    }

    return actions;
  }

  private getDefaultAdvancement(context: EnhancedConversationContext): SalesStageAdvancement {
    const currentStage = this.identifyCurrentStage(context);
    
    return {
      currentStage,
      nextStage: currentStage,
      advancementProbability: 0.3,
      buyingSignals: [],
      objections: [],
      recommendedActions: [],
      urgencyLevel: 2,
      conversionProbability: 0.3
    };
  }

  /**
   * Obter métricas de performance de vendas
   */
  getSalesMetrics(): {
    averageConversionRate: number;
    stagePerformance: Map<string, number>;
    commonObjections: string[];
    topBuyingSignals: string[];
  } {
    return {
      averageConversionRate: 0.35, // 35% target
      stagePerformance: new Map([
        ['awareness', 0.85],
        ['interest', 0.70],
        ['consideration', 0.55],
        ['intent', 0.75],
        ['purchase', 0.90]
      ]),
      commonObjections: ['price', 'location', 'timing'],
      topBuyingSignals: ['quero reservar', 'gostei muito', 'quando posso']
    };
  }
}

// Export singleton instance
export const salesTransformationEngine = new SalesTransformationEngine();