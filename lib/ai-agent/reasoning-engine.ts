// lib/ai-agent/reasoning-engine.ts
// Sistema de Raciocínio Chain-of-Thought - Padrão da Indústria para Agentes Avançados

import { logger } from '@/lib/utils/logger';
import { ConversationState } from './conversation-state';
import { DetectedIntent } from './intent-detector';

export interface ReasoningStep {
  step: number;
  category: 'analysis' | 'decision' | 'action' | 'validation';
  description: string;
  reasoning: string;
  confidence: number;
  evidence: string[];
  alternatives?: string[];
}

export interface ReasoningChain {
  query: string;
  context: any;
  steps: ReasoningStep[];
  finalDecision: {
    action: string;
    confidence: number;
    reasoning: string;
  };
  reasoning_time_ms: number;
  metadata: {
    complexity: 'simple' | 'moderate' | 'complex';
    requires_clarification: boolean;
    risk_factors: string[];
  };
}

export class ReasoningEngine {
  private static instance: ReasoningEngine;

  static getInstance(): ReasoningEngine {
    if (!this.instance) {
      this.instance = new ReasoningEngine();
    }
    return this.instance;
  }

  /**
   * Executar cadeia de raciocínio completa
   */
  async executeReasoningChain(
    userMessage: string,
    conversationState: ConversationState,
    intentDetected?: DetectedIntent | null
  ): Promise<ReasoningChain> {
    const startTime = Date.now();
    
    logger.info('🧠 [ReasoningEngine] Iniciando cadeia de raciocínio', {
      message: userMessage.substring(0, 50) + '...',
      hasIntent: !!intentDetected,
      conversationPhase: conversationState.conversationPhase
    });

    const steps: ReasoningStep[] = [];
    
    // STEP 1: Análise da Situação
    steps.push(await this.analyzeCurrentSituation(userMessage, conversationState));
    
    // STEP 2: Interpretação da Intenção
    steps.push(await this.interpretUserIntent(userMessage, intentDetected));
    
    // STEP 3: Avaliação do Contexto
    steps.push(await this.evaluateContext(conversationState));
    
    // STEP 4: Determinação da Ação
    const actionStep = await this.determineAction(userMessage, conversationState, intentDetected);
    steps.push(actionStep);
    
    // STEP 5: Validação e Riscos
    steps.push(await this.validateDecision(actionStep, conversationState));

    const finalDecision = {
      action: actionStep.description,
      confidence: actionStep.confidence,
      reasoning: actionStep.reasoning
    };

    const reasoningTime = Date.now() - startTime;

    const chain: ReasoningChain = {
      query: userMessage,
      context: this.summarizeContext(conversationState),
      steps,
      finalDecision,
      reasoning_time_ms: reasoningTime,
      metadata: {
        complexity: this.assessComplexity(steps),
        requires_clarification: this.requiresClarification(steps),
        risk_factors: this.identifyRiskFactors(steps)
      }
    };

    logger.info('✅ [ReasoningEngine] Cadeia de raciocínio concluída', {
      steps: steps.length,
      finalAction: finalDecision.action,
      confidence: Math.round(finalDecision.confidence * 100),
      reasoningTime: `${reasoningTime}ms`,
      complexity: chain.metadata.complexity
    });

    return chain;
  }

  /**
   * STEP 1: Analisar situação atual
   */
  private async analyzeCurrentSituation(
    message: string, 
    state: ConversationState
  ): Promise<ReasoningStep> {
    const evidence = [];
    let reasoning = "Analisando a situação atual da conversa:\n";

    // Analisar fase da conversa
    evidence.push(`Fase atual: ${state.conversationPhase}`);
    reasoning += `- Cliente está na fase de ${state.conversationPhase}\n`;

    // Analisar histórico de propriedades
    if (state.lastPropertyIds.length > 0) {
      evidence.push(`${state.lastPropertyIds.length} propriedades já mostradas`);
      reasoning += `- Já foram apresentadas ${state.lastPropertyIds.length} propriedades\n`;
    } else {
      evidence.push('Nenhuma propriedade mostrada ainda');
      reasoning += `- Ainda não foram mostradas propriedades\n`;
    }

    // Analisar informações do cliente
    if (state.clientInfo?.name) {
      evidence.push('Cliente identificado');
      reasoning += `- Cliente já se identificou como ${state.clientInfo.name}\n`;
    } else {
      evidence.push('Cliente não identificado');
      reasoning += `- Cliente ainda não se identificou\n`;
    }

    // Analisar cálculos de preço
    if (state.lastPriceCalculation) {
      evidence.push('Já foi calculado preço');
      reasoning += `- Já foi calculado preço de R$ ${state.lastPriceCalculation.totalPrice}\n`;
    }

    const confidence = this.calculateAnalysisConfidence(state);

    return {
      step: 1,
      category: 'analysis',
      description: 'Análise da situação atual',
      reasoning: reasoning.trim(),
      confidence,
      evidence
    };
  }

  /**
   * STEP 2: Interpretar intenção do usuário
   */
  private async interpretUserIntent(
    message: string, 
    intentDetected?: DetectedIntent | null
  ): Promise<ReasoningStep> {
    let reasoning = "Interpretando a intenção do usuário:\n";
    const evidence = [];

    if (intentDetected) {
      evidence.push(`Intent detector: ${intentDetected.function} (${Math.round(intentDetected.confidence * 100)}%)`);
      reasoning += `- Sistema detectou intenção: ${intentDetected.function}\n`;
      reasoning += `- Confiança da detecção: ${Math.round(intentDetected.confidence * 100)}%\n`;
      reasoning += `- Razão: ${intentDetected.reason}\n`;
    } else {
      evidence.push('Nenhuma intenção específica detectada');
      reasoning += `- Nenhuma intenção específica foi detectada automaticamente\n`;
    }

    // Análise manual de palavras-chave
    const keywordAnalysis = this.analyzeKeywords(message);
    evidence.push(...keywordAnalysis.evidence);
    reasoning += keywordAnalysis.reasoning;

    const confidence = intentDetected ? intentDetected.confidence : 0.5;

    return {
      step: 2,
      category: 'analysis',
      description: 'Interpretação da intenção',
      reasoning: reasoning.trim(),
      confidence,
      evidence
    };
  }

  /**
   * STEP 3: Avaliar contexto disponível
   */
  private async evaluateContext(state: ConversationState): Promise<ReasoningStep> {
    let reasoning = "Avaliando contexto disponível:\n";
    const evidence = [];

    // Avaliar completude das informações
    const contextScore = this.calculateContextCompleteness(state);
    evidence.push(`Contexto ${contextScore.percentage}% completo`);
    reasoning += `- Contexto está ${contextScore.percentage}% completo\n`;

    // Listar informações faltantes
    if (contextScore.missing.length > 0) {
      evidence.push(`Faltam: ${contextScore.missing.join(', ')}`);
      reasoning += `- Informações faltantes: ${contextScore.missing.join(', ')}\n`;
    }

    // Avaliar qualidade dos dados
    const dataQuality = this.assessDataQuality(state);
    evidence.push(`Qualidade dos dados: ${dataQuality.level}`);
    reasoning += `- Qualidade dos dados: ${dataQuality.level}\n`;
    reasoning += `- ${dataQuality.details}\n`;

    return {
      step: 3,
      category: 'analysis',
      description: 'Avaliação do contexto',
      reasoning: reasoning.trim(),
      confidence: contextScore.percentage / 100,
      evidence
    };
  }

  /**
   * STEP 4: Determinar ação a ser tomada
   */
  private async determineAction(
    message: string,
    state: ConversationState,
    intentDetected?: DetectedIntent | null
  ): Promise<ReasoningStep> {
    let reasoning = "Determinando a melhor ação:\n";
    const evidence = [];
    const alternatives = [];

    let recommendedAction = 'ask_clarification';
    let confidence = 0.5;

    // Se tem intenção detectada com alta confiança
    if (intentDetected && intentDetected.confidence > 0.8) {
      recommendedAction = intentDetected.function;
      confidence = intentDetected.confidence;
      evidence.push(`Intenção clara detectada: ${intentDetected.function}`);
      reasoning += `- Intenção clara detectada: ${intentDetected.function}\n`;
      reasoning += `- Confiança alta (${Math.round(confidence * 100)}%), executar diretamente\n`;
    }
    // Se não tem propriedades e mensagem indica busca
    else if (state.lastPropertyIds.length === 0 && this.isSearchRelated(message)) {
      recommendedAction = 'search_properties';
      confidence = 0.85;
      evidence.push('Cliente precisa de propriedades');
      reasoning += `- Cliente não tem propriedades mostradas\n`;
      reasoning += `- Mensagem indica interesse em busca\n`;
      reasoning += `- Recomendação: iniciar busca\n`;
      
      alternatives.push('ask_preferences', 'suggest_popular_areas');
    }
    // Se tem propriedades e mensagem indica interesse específico
    else if (state.lastPropertyIds.length > 0 && this.isPropertySpecific(message)) {
      recommendedAction = 'get_property_details';
      confidence = 0.8;
      evidence.push('Cliente demonstra interesse em propriedade específica');
      reasoning += `- Cliente tem ${state.lastPropertyIds.length} propriedades mostradas\n`;
      reasoning += `- Mensagem indica interesse específico\n`;
      reasoning += `- Recomendação: mostrar detalhes\n`;
      
      alternatives.push('send_property_media', 'calculate_price');
    }
    // Casos especiais
    else {
      const specialCase = this.identifySpecialCase(message, state);
      recommendedAction = specialCase.action;
      confidence = specialCase.confidence;
      evidence.push(specialCase.reason);
      reasoning += `- Caso especial identificado: ${specialCase.reason}\n`;
      reasoning += `- Ação recomendada: ${specialCase.action}\n`;
      
      alternatives.push(...specialCase.alternatives);
    }

    return {
      step: 4,
      category: 'decision',
      description: recommendedAction,
      reasoning: reasoning.trim(),
      confidence,
      evidence,
      alternatives
    };
  }

  /**
   * STEP 5: Validar decisão e identificar riscos
   */
  private async validateDecision(
    actionStep: ReasoningStep,
    state: ConversationState
  ): Promise<ReasoningStep> {
    let reasoning = "Validando decisão tomada:\n";
    const evidence = [];
    const risks = [];

    const action = actionStep.description;

    // Validar se ação é apropriada para o contexto
    const validation = this.validateActionForContext(action, state);
    evidence.push(`Validação: ${validation.valid ? 'Aprovada' : 'Rejeitada'}`);
    reasoning += `- Validação da ação: ${validation.valid ? 'Aprovada' : 'Rejeitada'}\n`;
    reasoning += `- Razão: ${validation.reason}\n`;

    // Identificar riscos potenciais
    const riskAssessment = this.assessActionRisks(action, state);
    risks.push(...riskAssessment.risks);
    evidence.push(`Riscos identificados: ${riskAssessment.risks.length}`);
    reasoning += `- Riscos identificados: ${riskAssessment.risks.length}\n`;

    if (riskAssessment.risks.length > 0) {
      reasoning += `- Principais riscos: ${riskAssessment.risks.slice(0, 2).join(', ')}\n`;
    }

    // Sugerir mitigações
    const mitigations = this.suggestMitigations(riskAssessment.risks);
    if (mitigations.length > 0) {
      evidence.push(`Mitigações sugeridas: ${mitigations.length}`);
      reasoning += `- Mitigações recomendadas: ${mitigations.join(', ')}\n`;
    }

    const confidence = validation.valid ? 0.9 : 0.3;

    return {
      step: 5,
      category: 'validation',
      description: 'Validação da decisão',
      reasoning: reasoning.trim(),
      confidence,
      evidence
    };
  }

  // ===== MÉTODOS AUXILIARES =====

  private calculateAnalysisConfidence(state: ConversationState): number {
    let score = 0.5; // Base
    
    if (state.lastPropertyIds.length > 0) score += 0.2;
    if (state.clientInfo?.name) score += 0.1;
    if (state.lastPriceCalculation) score += 0.1;
    if (state.conversationPhase !== 'searching') score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private analyzeKeywords(message: string): { evidence: string[]; reasoning: string } {
    const evidence = [];
    let reasoning = "";
    
    const lowerMessage = message.toLowerCase();
    
    // Palavras de busca
    const searchWords = ['quero', 'procuro', 'busco', 'preciso', 'apartamento', 'casa'];
    const foundSearchWords = searchWords.filter(word => lowerMessage.includes(word));
    if (foundSearchWords.length > 0) {
      evidence.push(`Palavras de busca: ${foundSearchWords.join(', ')}`);
      reasoning += `- Detectadas palavras de busca: ${foundSearchWords.join(', ')}\n`;
    }

    // Palavras de preço
    const priceWords = ['preço', 'valor', 'custo', 'quanto', 'caro', 'barato'];
    const foundPriceWords = priceWords.filter(word => lowerMessage.includes(word));
    if (foundPriceWords.length > 0) {
      evidence.push(`Palavras de preço: ${foundPriceWords.join(', ')}`);
      reasoning += `- Detectadas palavras sobre preço: ${foundPriceWords.join(', ')}\n`;
    }

    return { evidence, reasoning };
  }

  private calculateContextCompleteness(state: ConversationState): {
    percentage: number;
    missing: string[];
  } {
    const required = ['properties', 'client_info', 'preferences', 'dates'];
    const missing = [];
    
    if (state.lastPropertyIds.length === 0) missing.push('properties');
    if (!state.clientInfo?.name) missing.push('client_info');
    // Adicionar outras verificações...
    
    const percentage = Math.round(((required.length - missing.length) / required.length) * 100);
    
    return { percentage, missing };
  }

  private assessDataQuality(state: ConversationState): { level: string; details: string } {
    let score = 0;
    let details = "";
    
    if (state.lastPropertyIds.length > 0) {
      score += 25;
      details += "Propriedades disponíveis. ";
    }
    
    if (state.clientInfo?.name) {
      score += 25;
      details += "Cliente identificado. ";
    }
    
    // Continuar avaliação...
    
    const level = score >= 75 ? 'Alta' : score >= 50 ? 'Média' : 'Baixa';
    
    return { level, details: details.trim() };
  }

  private isSearchRelated(message: string): boolean {
    const searchKeywords = ['quero', 'procuro', 'busco', 'apartamento', 'casa', 'alugar'];
    return searchKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  private isPropertySpecific(message: string): boolean {
    const specificKeywords = ['primeira', 'segunda', 'terceira', 'essa', 'esta', 'aquela'];
    return specificKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  private identifySpecialCase(message: string, state: ConversationState): {
    action: string;
    confidence: number;
    reason: string;
    alternatives: string[];
  } {
    // Implementar lógica para casos especiais
    return {
      action: 'ask_clarification',
      confidence: 0.6,
      reason: 'Mensagem ambígua, necessário esclarecer intenção',
      alternatives: ['provide_help_menu', 'suggest_common_actions']
    };
  }

  private validateActionForContext(action: string, state: ConversationState): {
    valid: boolean;
    reason: string;
  } {
    // Validações específicas por ação
    switch (action) {
      case 'get_property_details':
        return {
          valid: state.lastPropertyIds.length > 0,
          reason: state.lastPropertyIds.length > 0 
            ? 'Cliente tem propriedades para ver detalhes'
            : 'Cliente não tem propriedades mostradas'
        };
      
      case 'calculate_price':
        return {
          valid: state.lastPropertyIds.length > 0,
          reason: state.lastPropertyIds.length > 0
            ? 'Cliente tem propriedades para calcular preço'
            : 'Necessário mostrar propriedades primeiro'
        };
      
      default:
        return { valid: true, reason: 'Ação válida para qualquer contexto' };
    }
  }

  private assessActionRisks(action: string, state: ConversationState): { risks: string[] } {
    const risks = [];
    
    // Riscos por ação
    switch (action) {
      case 'search_properties':
        if (state.lastPropertyIds.length > 0) {
          risks.push('Cliente já tem propriedades, pode confundir');
        }
        break;
      
      case 'create_reservation':
        if (!state.clientInfo?.name) {
          risks.push('Cliente não identificado para reserva');
        }
        if (!state.lastPriceCalculation) {
          risks.push('Preço não calculado ainda');
        }
        break;
    }
    
    return { risks };
  }

  private suggestMitigations(risks: string[]): string[] {
    const mitigations = [];
    
    risks.forEach(risk => {
      if (risk.includes('não identificado')) {
        mitigations.push('Solicitar identificação do cliente');
      }
      if (risk.includes('preço não calculado')) {
        mitigations.push('Calcular preço antes de prosseguir');
      }
    });
    
    return mitigations;
  }

  private assessComplexity(steps: ReasoningStep[]): 'simple' | 'moderate' | 'complex' {
    const avgConfidence = steps.reduce((sum, step) => sum + step.confidence, 0) / steps.length;
    const totalAlternatives = steps.reduce((sum, step) => sum + (step.alternatives?.length || 0), 0);
    
    if (avgConfidence > 0.8 && totalAlternatives < 3) return 'simple';
    if (avgConfidence > 0.6 && totalAlternatives < 6) return 'moderate';
    return 'complex';
  }

  private requiresClarification(steps: ReasoningStep[]): boolean {
    return steps.some(step => step.confidence < 0.7);
  }

  private identifyRiskFactors(steps: ReasoningStep[]): string[] {
    const risks = [];
    
    const validationStep = steps.find(s => s.category === 'validation');
    if (validationStep && validationStep.confidence < 0.7) {
      risks.push('Validação com baixa confiança');
    }
    
    const avgConfidence = steps.reduce((sum, step) => sum + step.confidence, 0) / steps.length;
    if (avgConfidence < 0.6) {
      risks.push('Confiança geral baixa');
    }
    
    return risks;
  }

  private summarizeContext(state: ConversationState): any {
    return {
      phase: state.conversationPhase,
      propertiesCount: state.lastPropertyIds.length,
      hasClient: !!state.clientInfo?.name,
      hasPrice: !!state.lastPriceCalculation,
      lastFunction: state.lastFunction
    };
  }
}

export const reasoningEngine = ReasoningEngine.getInstance();