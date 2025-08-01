// lib/ai-agent/sofia-sales-agent-v4.ts
// SOFIA SALES AGENT V4 - STEP 3 COMPLETE IMPLEMENTATION
// Sistema profissional de vendas com técnicas avançadas integradas

import { OpenAI } from 'openai';
import { conversationContextServiceV2 } from '@/lib/services/conversation-context-service-v2';
import { salesTransformationEngine } from '@/lib/services/sales-transformation-engine';
import { persuasionTechniques } from '@/lib/services/persuasion-techniques';
import { intelligentQualificationSystem } from '@/lib/services/intelligent-qualification';
import { objectionHandlingSystem } from '@/lib/services/objection-handling-system';
import { parallelExecutionEngine } from '@/lib/services/parallel-execution-engine';
import { UltraOptimizedPrompts } from '@/lib/services/ultra-optimized-prompts';
import { getCorrectedOpenAIFunctions, CorrectedAgentFunctions } from '@/lib/ai/agent-functions-enhanced';
import { 
  EnhancedConversationContext,
  extractCriticalData,
  createEmptyEnhancedContext
} from '@/lib/types/context-types-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface SofiaSalesInput {
  message: string;
  clientPhone: string;
  tenantId: string;
  messageHistory?: Array<{ role: string; content: string }>;
}

export interface SofiaSalesResponse {
  reply: string;
  actions?: any[];
  tokensUsed: number;
  processingTime: number;
  salesAnalysis: {
    currentStage: string;
    nextStage: string;
    conversionProbability: number;
    leadQualification: string;
    buyingSignals: string[];
    objections: string[];
    recommendedActions: string[];
    urgencyLevel: number;
  };
  contextUpdates: Partial<EnhancedConversationContext>;
  persuasionTechniques: string[];
  performanceMetrics: {
    analysisTime: number;
    contextRetrievalTime: number;
    openaiTime: number;
    functionExecutionTime: number;
  };
}

interface ComprehensiveSalesAnalysis {
  stageAdvancement: any;
  leadQualification: any;
  objectionAnalysis: any;
  persuasionStrategy: any;
  contextUpdates: Partial<EnhancedConversationContext>;
  performanceMetrics: any;
}

// ===== SOFIA SALES AGENT V4 =====

export class SofiaSalesAgentV4 {
  private openai: OpenAI;
  private instanceId: string;
  private activeConnections: number = 0;
  private maxConnections: number = 15;
  private performanceMetrics: Map<string, number> = new Map();

  constructor(instanceId: string = 'sofia-sales-v4') {
    this.instanceId = instanceId;
    
    // Initialize OpenAI
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for SofiaSalesAgentV4');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('🎯 [SofiaSalesV4] Professional sales agent initialized', {
      instanceId: this.instanceId,
      maxConnections: this.maxConnections,
      features: ['sales_transformation', 'persuasion_techniques', 'objection_handling', 'intelligent_qualification']
    });
  }

  /**
   * Processar mensagem com sistema completo de vendas profissionais
   */
  async processMessage(input: SofiaSalesInput): Promise<SofiaSalesResponse> {
    const startTime = Date.now();
    
    logger.info('🚀 [SofiaSalesV4] Processing message with advanced sales system', {
      clientPhone: this.maskPhone(input.clientPhone),
      messageLength: input.message.length,
      instanceId: this.instanceId,
      activeConnections: this.activeConnections
    });

    try {
      // Verificar limite de conexões
      if (this.activeConnections >= this.maxConnections) {
        throw new Error(`Max connections (${this.maxConnections}) reached`);
      }
      
      this.activeConnections++;

      // 1. RECUPERAR CONTEXTO AVANÇADO
      const contextStartTime = Date.now();
      const context = await conversationContextServiceV2.getOrCreateContext(
        input.clientPhone,
        input.tenantId
      );
      const contextRetrievalTime = Date.now() - contextStartTime;

      // 2. ANÁLISE COMPLETA DE VENDAS EM PARALELO
      const analysisStartTime = Date.now();
      const salesAnalysis = await this.performComprehensiveSalesAnalysis(
        input.message,
        context,
        input.messageHistory || []
      );
      const analysisTime = Date.now() - analysisStartTime;

      // 3. GERAR PROMPT ULTRA-OTIMIZADO
      const promptData = UltraOptimizedPrompts.generateOptimizedPrompt(
        context,
        input.messageHistory || []
      );

      // 4. PREPARAR MENSAGENS COM CONTEXTO DE VENDAS
      const messages = this.prepareAdvancedSalesMessages(
        promptData,
        input,
        context,
        salesAnalysis
      );

      // 5. EXECUTAR OPENAI COM FUNCTION CALLING OTIMIZADO
      const openaiStartTime = Date.now();
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        functions: getCorrectedOpenAIFunctions(),
        function_call: 'auto',
        temperature: 0.8, // Ligeiramente mais criativo para vendas
        max_tokens: 450, // Otimizado para respostas de vendas
        top_p: 0.9
      });
      const openaiTime = Date.now() - openaiStartTime;

      const tokensUsed = completion.usage?.total_tokens || 0;

      // 6. PROCESSAR RESPOSTA COM TÉCNICAS DE VENDAS
      const functionStartTime = Date.now();
      const response = await this.processAdvancedSalesResponse(
        completion,
        context,
        salesAnalysis,
        input.tenantId
      );
      const functionExecutionTime = Date.now() - functionStartTime;

      // 7. SALVAR DADOS DA CONVERSA
      await this.saveAdvancedConversationData(input, response, context, tokensUsed);

      const totalProcessingTime = Date.now() - startTime;

      // 8. ATUALIZAR MÉTRICAS DE PERFORMANCE
      this.updatePerformanceMetrics(totalProcessingTime, tokensUsed, salesAnalysis);

      logger.info('✅ [SofiaSalesV4] Message processed with advanced sales system', {
        clientPhone: this.maskPhone(input.clientPhone),
        totalProcessingTime,
        tokensUsed,
        currentStage: salesAnalysis.stageAdvancement.currentStage.stage,
        nextStage: salesAnalysis.stageAdvancement.nextStage.stage,
        conversionProbability: Math.round(salesAnalysis.stageAdvancement.conversionProbability * 100),
        leadQualification: salesAnalysis.leadQualification.qualification,
        persuasionTechniques: response.persuasionTechniques.length,
        objectionsDetected: salesAnalysis.objectionAnalysis.objections.length
      });

      return {
        ...response,
        processingTime: totalProcessingTime,
        tokensUsed,
        performanceMetrics: {
          analysisTime,
          contextRetrievalTime,
          openaiTime,
          functionExecutionTime
        }
      };

    } catch (error) {
      logger.error('❌ [SofiaSalesV4] Error processing message', {
        error: error.message,
        clientPhone: this.maskPhone(input.clientPhone),
        instanceId: this.instanceId
      });

      return this.generateAdvancedErrorResponse(error, Date.now() - startTime);
    } finally {
      this.activeConnections--;
    }
  }

  /**
   * Análise completa e integrada de vendas
   */
  private async performComprehensiveSalesAnalysis(
    userMessage: string,
    context: EnhancedConversationContext,
    messageHistory: Array<{ role: string; content: string }>
  ): Promise<ComprehensiveSalesAnalysis> {
    logger.debug('🔍 [SofiaSalesV4] Performing comprehensive sales analysis');

    const analysisStartTime = Date.now();

    try {
      // Executar todas as análises em paralelo para máxima performance
      const [
        stageAdvancement,
        leadQualification,
        objectionAnalysis,
        persuasionStrategy
      ] = await Promise.all([
        salesTransformationEngine.advanceSalesStage(context, userMessage, messageHistory),
        intelligentQualificationSystem.qualifyLeadImplicitly(context, userMessage, messageHistory),
        objectionHandlingSystem.handleObjections(userMessage, context),
        this.generateAdvancedPersuasionStrategy(context, userMessage)
      ]);

      // Combinar e consolidar updates de contexto
      const contextUpdates = this.consolidateContextUpdates(
        stageAdvancement,
        leadQualification,
        objectionAnalysis,
        context
      );

      const analysisTime = Date.now() - analysisStartTime;

      logger.info('📊 [SofiaSalesV4] Comprehensive sales analysis completed', {
        analysisTime,
        currentStage: stageAdvancement.currentStage.stage,
        nextStage: stageAdvancement.nextStage.stage,
        leadQualification: leadQualification.qualification,
        leadScore: leadQualification.overallScore,
        objectionsCount: objectionAnalysis.objections.length,
        conversionProbability: Math.round(stageAdvancement.conversionProbability * 100),
        urgencyLevel: stageAdvancement.urgencyLevel,
        buyingSignalsCount: stageAdvancement.buyingSignals.length
      });

      return {
        stageAdvancement,
        leadQualification,
        objectionAnalysis,
        persuasionStrategy,
        contextUpdates,
        performanceMetrics: {
          analysisTime,
          parallelExecutions: 4
        }
      };

    } catch (error) {
      logger.error('❌ [SofiaSalesV4] Error in comprehensive sales analysis', { error });
      
      // Retornar análise padrão funcional
      return this.getDefaultComprehensiveSalesAnalysis(context);
    }
  }

  /**
   * Gerar estratégia avançada de persuasão
   */
  private async generateAdvancedPersuasionStrategy(
    context: EnhancedConversationContext,
    userMessage: string
  ): Promise<any> {
    try {
      const properties = context.conversationState.propertiesShown || [];
      
      if (properties.length === 0) {
        return { 
          techniques: [], 
          content: '', 
          expectedImpact: 0.3,
          combinedTechniques: { techniquesUsed: [], expectedEffectiveness: 0.3 }
        };
      }

      // Simular dados de propriedade para demo
      const propertyData = { 
        id: properties[0], 
        location: context.clientData.city || 'Localização Premium', 
        price: 350,
        basePrice: 350,
        name: 'Propriedade Selecionada'
      };

      // Aplicar múltiplas técnicas de persuasão simultaneamente
      const [
        priceAnchoring,
        socialProof,
        urgencyElements,
        reciprocityStrategy,
        lossAversionMessage
      ] = await Promise.all([
        Promise.resolve(persuasionTechniques.applyPriceAnchoring([propertyData], context)),
        Promise.resolve(persuasionTechniques.applySocialProof(propertyData, context)),
        Promise.resolve(persuasionTechniques.applyScarcityUrgency(propertyData, context)),
        Promise.resolve(persuasionTechniques.applyReciprocity(context)),
        Promise.resolve(persuasionTechniques.applyLossAversion(context, propertyData))
      ]);

      // Combinar técnicas de forma ética e efetiva
      const combinedTechniques = persuasionTechniques.combinePersuasionTechniques(
        propertyData,
        context,
        ['social_proof', 'urgency', 'anchoring', 'loss_aversion']
      );

      return {
        priceAnchoring,
        socialProof,
        urgencyElements,
        reciprocityStrategy,
        lossAversionMessage,
        combinedTechniques,
        expectedImpact: combinedTechniques.expectedEffectiveness,
        ethicalScore: combinedTechniques.ethicalScore
      };

    } catch (error) {
      logger.warn('⚠️ [SofiaSalesV4] Error generating persuasion strategy', { error });
      return { 
        techniques: [], 
        content: '', 
        expectedImpact: 0.3,
        combinedTechniques: { techniquesUsed: [], expectedEffectiveness: 0.3 }
      };
    }
  }

  /**
   * Preparar mensagens com contexto avançado de vendas
   */
  private prepareAdvancedSalesMessages(
    promptData: any,
    input: SofiaSalesInput,
    context: EnhancedConversationContext,
    salesAnalysis: ComprehensiveSalesAnalysis
  ): any[] {
    const messages = [
      {
        role: 'system' as const,
        content: this.buildAdvancedSalesPrompt(promptData, salesAnalysis)
      }
    ];

    // Adicionar histórico contextual relevante
    const relevantHistory = this.selectRelevantHistory(input.messageHistory || [], context);
    messages.push(...relevantHistory);

    // Adicionar mensagem atual
    messages.push({
      role: 'user' as const,
      content: input.message
    });

    return messages;
  }

  /**
   * Construir prompt avançado com contexto completo de vendas
   */
  private buildAdvancedSalesPrompt(
    promptData: any,
    salesAnalysis: ComprehensiveSalesAnalysis
  ): string {
    let systemPrompt = promptData.systemPrompt;

    // CONTEXTO DE VENDAS PROFISSIONAL
    const salesContext = this.buildProfessionalSalesContext(salesAnalysis);
    if (salesContext) {
      systemPrompt += '\n\n' + salesContext;
    }

    // ESTRATÉGIAS DE PERSUASÃO ATIVAS
    const persuasionContext = this.buildPersuasionContext(salesAnalysis.persuasionStrategy);
    if (persuasionContext) {
      systemPrompt += '\n\n' + persuasionContext;
    }

    // TRATAMENTO DE OBJEÇÕES
    if (salesAnalysis.objectionAnalysis.objections.length > 0) {
      const objectionContext = this.buildObjectionHandlingContext(salesAnalysis.objectionAnalysis);
      systemPrompt += '\n\n' + objectionContext;
    }

    // QUALIFICAÇÃO DE LEAD
    const qualificationContext = this.buildLeadQualificationContext(salesAnalysis.leadQualification);
    systemPrompt += '\n\n' + qualificationContext;

    return systemPrompt;
  }

  /**
   * Construir contexto profissional de vendas
   */
  private buildProfessionalSalesContext(salesAnalysis: ComprehensiveSalesAnalysis): string {
    const stage = salesAnalysis.stageAdvancement;
    const lead = salesAnalysis.leadQualification;
    
    return `🎯 CONTEXTO PROFISSIONAL DE VENDAS:

📊 PIPELINE STATUS:
• Estágio Atual: ${stage.currentStage.stage} 
• Próximo Estágio: ${stage.nextStage.stage}
• Probabilidade de Conversão: ${Math.round(stage.conversionProbability * 100)}%
• Nível de Urgência: ${stage.urgencyLevel}/5

🔥 QUALIFICAÇÃO DO LEAD:
• Classificação: ${lead.qualification.toUpperCase()}
• Score: ${lead.overallScore}/100
• Confiança: ${Math.round(lead.confidence * 100)}%
• Orçamento Estimado: R$${lead.budget.estimatedRange.min}-${lead.budget.estimatedRange.max}/dia

💎 BUYING SIGNALS DETECTADOS:
${stage.buyingSignals.length > 0 ? 
  stage.buyingSignals.map(signal => `• ${signal}`).join('\n') : 
  '• Nenhum sinal forte detectado ainda'
}

📈 AÇÕES ESTRATÉGICAS RECOMENDADAS:
${stage.recommendedActions.length > 0 ? 
  stage.recommendedActions.slice(0, 3).map(action => `• ${action.content}`).join('\n') :
  '• Focar em descoberta e engajamento'
}

🎪 FOCO: ${this.getSalesFocus(stage, lead)}`;
  }

  /**
   * Construir contexto de persuasão
   */
  private buildPersuasionContext(persuasionStrategy: any): string {
    if (!persuasionStrategy.combinedTechniques || persuasionStrategy.combinedTechniques.techniquesUsed.length === 0) {
      return '';
    }

    const combined = persuasionStrategy.combinedTechniques;
    
    return `💎 ESTRATÉGIAS DE PERSUASÃO ATIVAS:

🎯 TÉCNICAS APLICÁVEIS:
${combined.techniquesUsed.map(technique => `• ${technique.replace('_', ' ').toUpperCase()}`).join('\n')}

📊 EFETIVIDADE ESPERADA: ${Math.round(combined.expectedEffectiveness * 100)}%
🛡️ SCORE ÉTICO: ${Math.round(combined.ethicalScore * 100)}%

${combined.combinedMessage ? `\n💬 MENSAGEM PERSUASIVA:\n${combined.combinedMessage}` : ''}`;
  }

  /**
   * Construir contexto de tratamento de objeções
   */
  private buildObjectionHandlingContext(objectionAnalysis: any): string {
    const objections = objectionAnalysis.objections;
    if (objections.length === 0) return '';

    return `🛡️ OBJEÇÕES IDENTIFICADAS E ESTRATÉGIAS:

${objections.map((obj, index) => 
  `${index + 1}. OBJEÇÃO: ${obj.type.toUpperCase()} (${obj.severity})
   • Conteúdo: "${obj.content}"
   • Intensidade: ${obj.emotionalIntensity}/5
   • Estratégia: ${obj.rootCause}`
).join('\n\n')}

💡 ABORDAGEM PRINCIPAL: ${objectionAnalysis.handlingStrategy.primaryApproach}
🎯 PROBABILIDADE DE RESOLUÇÃO: ${Math.round(objectionAnalysis.handlingStrategy.successProbability * 100)}%

IMPORTANTE: Tratar objeções com empatia e foco em soluções!`;
  }

  /**
   * Construir contexto de qualificação de lead
   */
  private buildLeadQualificationContext(leadQualification: any): string {
    const budget = leadQualification.budget;
    const authority = leadQualification.authority;
    const need = leadQualification.need;

    return `🔍 PERFIL DETALHADO DO CLIENTE:

💰 ORÇAMENTO:
• Categoria: ${budget.budgetCategory.toUpperCase()}
• Faixa: R$${budget.estimatedRange.min}-${budget.estimatedRange.max}/dia
• Confiança: ${Math.round(budget.confidence * 100)}%
• Métodos: ${budget.inferenceMethod.join(', ')}

👤 AUTORIDADE DE DECISÃO:
• Nível: ${authority.level.toUpperCase()}
• Tomadores de Decisão: ${authority.decisionMakers}
• Confiança: ${Math.round(authority.confidence * 100)}%

🎯 NECESSIDADE:
• Urgência: ${need.urgency}/5
• Especificidade: ${Math.round(need.specificity * 100)}%
• Motivação: ${need.motivation}

💡 ADAPTAÇÃO: Personalizar abordagem baseada neste perfil!`;
  }

  /**
   * Processar resposta com técnicas avançadas de vendas
   */
  private async processAdvancedSalesResponse(
    completion: any,
    context: EnhancedConversationContext,
    salesAnalysis: ComprehensiveSalesAnalysis,
    tenantId: string
  ): Promise<Omit<SofiaSalesResponse, 'processingTime' | 'tokensUsed' | 'performanceMetrics'>> {
    const choice = completion.choices[0];
    let reply = choice.message?.content || 'Desculpe, não consegui processar sua mensagem. Pode reformular?';
    const actions: any[] = [];

    // Processar function calls com execução paralela se possível
    if (choice.message?.function_call) {
      const functionResult = await this.executeAdvancedFunctionCall(
        choice.message.function_call,
        tenantId,
        context
      );
      
      if (functionResult.success) {
        actions.push(functionResult);
        
        // Integrar resultado da função com técnicas de persuasão
        reply = this.integrateAdvancedFunctionResult(reply, functionResult, salesAnalysis);
      }
    }

    // Aplicar otimizações de resposta
    reply = UltraOptimizedPrompts.optimizeResponse(reply, context);

    // Aplicar técnicas de persuasão específicas
    reply = this.applyAdvancedPersuasionToResponse(reply, salesAnalysis);

    // Aplicar tratamento de objeções se necessário
    if (salesAnalysis.objectionAnalysis.objections.length > 0) {
      reply = await this.enhanceResponseWithObjectionHandling(reply, salesAnalysis);
    }

    return {
      reply,
      actions,
      salesAnalysis: {
        currentStage: salesAnalysis.stageAdvancement.currentStage.stage,
        nextStage: salesAnalysis.stageAdvancement.nextStage.stage,
        conversionProbability: salesAnalysis.stageAdvancement.conversionProbability,
        leadQualification: salesAnalysis.leadQualification.qualification,
        buyingSignals: salesAnalysis.stageAdvancement.buyingSignals,
        objections: salesAnalysis.objectionAnalysis.objections.map(obj => obj.type),
        recommendedActions: salesAnalysis.stageAdvancement.recommendedActions.map(action => action.content),
        urgencyLevel: salesAnalysis.stageAdvancement.urgencyLevel
      },
      contextUpdates: salesAnalysis.contextUpdates,
      persuasionTechniques: salesAnalysis.persuasionStrategy.combinedTechniques?.techniquesUsed || []
    };
  }

  // ===== HELPER METHODS =====

  private getSalesFocus(stage: any, lead: any): string {
    if (stage.conversionProbability > 0.8) return "FECHAR VENDA IMEDIATAMENTE!";
    if (stage.conversionProbability > 0.6) return "CRIAR URGÊNCIA E CONVERTER";
    if (lead.qualification === 'hot') return "MAXIMIZAR ENGAJAMENTO";
    if (stage.currentStage.stage === 'awareness') return "DESCOBRIR NECESSIDADES";
    return "CONSTRUIR RELACIONAMENTO E INTERESSE";
  }

  private selectRelevantHistory(
    messageHistory: Array<{ role: string; content: string }>,
    context: EnhancedConversationContext
  ): Array<{ role: string; content: string }> {
    // Selecionar até 8 mensagens mais relevantes
    return messageHistory.slice(-8);
  }

  private consolidateContextUpdates(
    stageAdvancement: any,
    leadQualification: any,
    objectionAnalysis: any,
    currentContext: EnhancedConversationContext
  ): Partial<EnhancedConversationContext> {
    const updates: Partial<EnhancedConversationContext> = {};

    // Atualizar conversationState
    updates.conversationState = {
      ...currentContext.conversationState,
      stage: stageAdvancement.nextStage.stage,
      urgencyLevel: stageAdvancement.urgencyLevel,
      lastAction: 'sales_analysis_complete'
    };

    // Atualizar salesContext
    updates.salesContext = {
      ...currentContext.salesContext,
      leadScore: leadQualification.overallScore,
      temperature: this.mapQualificationToTemperature(leadQualification.qualification),
      conversionProbability: stageAdvancement.conversionProbability,
      objections: objectionAnalysis.objections,
      buyingSignals: stageAdvancement.buyingSignals
    };

    // Atualizar clientData se tiver informações do lead qualification
    if (leadQualification.budget) {
      updates.clientData = {
        ...currentContext.clientData,
        budget: (leadQualification.budget.estimatedRange.min + leadQualification.budget.estimatedRange.max) / 2
      };
    }

    return updates;
  }

  private mapQualificationToTemperature(qualification: string): 'cold' | 'warm' | 'hot' | 'burning' {
    switch (qualification) {
      case 'hot': return 'burning';
      case 'warm': return 'hot';
      case 'cold': return 'warm';
      default: return 'cold';
    }
  }

  private async executeAdvancedFunctionCall(
    functionCall: any,
    tenantId: string,
    context: EnhancedConversationContext
  ): Promise<any> {
    try {
      const functionName = functionCall.name;
      const functionArgs = JSON.parse(functionCall.arguments || '{}');

      logger.debug('🔧 [SofiaSalesV4] Executing advanced function', {
        functionName,
        args: functionArgs
      });

      const result = await CorrectedAgentFunctions.executeFunction(
        functionName,
        functionArgs,
        tenantId
      );

      return {
        success: true,
        functionName,
        args: functionArgs,
        result
      };

    } catch (error) {
      logger.error('❌ [SofiaSalesV4] Advanced function execution error', { error });
      
      return {
        success: false,
        functionName: functionCall.name,
        error: error.message
      };
    }
  }

  private integrateAdvancedFunctionResult(
    reply: string,
    functionResult: any,
    salesAnalysis: ComprehensiveSalesAnalysis
  ): string {
    if (!functionResult.success) return reply;

    switch (functionResult.functionName) {
      case 'search_properties':
        return this.enhancePropertySearchResponse(reply, functionResult, salesAnalysis);
      case 'send_property_media':
        return this.enhanceMediaResponse(reply, functionResult, salesAnalysis);
      case 'calculate_price':
        return this.enhancePriceResponse(reply, functionResult, salesAnalysis);
      default:
        return reply;
    }
  }

  private enhancePropertySearchResponse(reply: string, functionResult: any, salesAnalysis: ComprehensiveSalesAnalysis): string {
    const properties = functionResult.result?.properties || [];
    if (properties.length === 0) return reply;

    // Aplicar ancoragem de preços se disponível
    const anchoring = salesAnalysis.persuasionStrategy.priceAnchoring;
    if (anchoring && anchoring.anchoredProperties.length > 0) {
      const presentations = anchoring.anchoredProperties
        .slice(0, 3)
        .map(prop => prop.presentationText)
        .join('\n\n');
      
      return presentations + '\n\n' + (anchoring.comparisonMessage || '') + '\n\n' + reply;
    }

    return reply;
  }

  private enhanceMediaResponse(reply: string, functionResult: any, salesAnalysis: ComprehensiveSalesAnalysis): string {
    // Adicionar prova social após enviar mídia
    const socialProof = salesAnalysis.persuasionStrategy.socialProof;
    if (socialProof && socialProof.length > 0) {
      const bestProof = socialProof.find(sp => sp.impact === 'high') || socialProof[0];
      return reply + '\n\n' + bestProof.content;
    }

    return reply;
  }

  private enhancePriceResponse(reply: string, functionResult: any, salesAnalysis: ComprehensiveSalesAnalysis): string {
    // Adicionar elementos de urgência após mostrar preço
    const urgency = salesAnalysis.persuasionStrategy.urgencyElements;
    if (urgency && urgency.length > 0) {
      const highIntensityUrgency = urgency.find(u => u.intensity >= 4);
      if (highIntensityUrgency) {
        return reply + '\n\n' + highIntensityUrgency.message;
      }
    }

    return reply;
  }

  private applyAdvancedPersuasionToResponse(reply: string, salesAnalysis: ComprehensiveSalesAnalysis): string {
    const persuasion = salesAnalysis.persuasionStrategy;
    
    // Aplicar apenas se a efetividade for alta e ética
    if (persuasion.combinedTechniques && 
        persuasion.combinedTechniques.expectedEffectiveness > 0.6 &&
        persuasion.combinedTechniques.ethicalScore > 0.7) {
      
      // Adicionar elementos de reciprocidade
      if (persuasion.reciprocityStrategy && Math.random() > 0.7) {
        reply += '\n\n' + persuasion.reciprocityStrategy.content;
      }
    }

    return reply;
  }

  private async enhanceResponseWithObjectionHandling(
    reply: string,
    salesAnalysis: ComprehensiveSalesAnalysis
  ): Promise<string> {
    const objections = salesAnalysis.objectionAnalysis.objections;
    
    // Se há objeções de alta severidade, gerar resposta específica
    const highSeverityObjections = objections.filter(obj => obj.severity === 'high');
    
    if (highSeverityObjections.length > 0) {
      const primaryObjection = highSeverityObjections[0];
      
      try {
        const objectionResolution = await objectionHandlingSystem.generateObjectionResponse(
          primaryObjection,
          {} as EnhancedConversationContext, // Context simplificado
          salesAnalysis.objectionAnalysis.handlingStrategy
        );
        
        if (objectionResolution.confidence > 0.7) {
          return reply + '\n\n' + objectionResolution.response;
        }
      } catch (error) {
        logger.warn('⚠️ [SofiaSalesV4] Error enhancing response with objection handling', { error });
      }
    }

    return reply;
  }

  private async saveAdvancedConversationData(
    input: SofiaSalesInput,
    response: Omit<SofiaSalesResponse, 'processingTime' | 'tokensUsed' | 'performanceMetrics'>,
    context: EnhancedConversationContext,
    tokensUsed: number
  ): Promise<void> {
    try {
      // Salvar mensagem do usuário com análise
      await conversationContextServiceV2.saveMessage(
        input.clientPhone,
        input.tenantId,
        {
          role: 'user',
          content: input.message,
          tokensUsed: 0,
          buyingSignals: response.salesAnalysis.buyingSignals,
          engagementLevel: this.calculateAdvancedEngagementLevel(response.salesAnalysis)
        }
      );

      // Salvar resposta do assistente com dados de vendas
      await conversationContextServiceV2.saveMessage(
        input.clientPhone,
        input.tenantId,
        {
          role: 'assistant',
          content: response.reply,
          tokensUsed,
          functionCalls: response.actions?.map(a => a.functionName) || [],
          buyingSignals: response.salesAnalysis.buyingSignals,
          engagementLevel: this.calculateAdvancedEngagementLevel(response.salesAnalysis),
          intent: response.salesAnalysis.currentStage,
          confidence: response.salesAnalysis.conversionProbability
        }
      );

      // Atualizar contexto com dados consolidados
      if (response.contextUpdates && Object.keys(response.contextUpdates).length > 0) {
        await conversationContextServiceV2.updateContext(
          input.clientPhone,
          input.tenantId,
          response.contextUpdates
        );
      }

      // Incrementar tokens com tracking
      await conversationContextServiceV2.incrementTokensUsed(
        input.clientPhone,
        input.tenantId,
        tokensUsed
      );

    } catch (error) {
      logger.error('❌ [SofiaSalesV4] Error saving advanced conversation data', { error });
    }
  }

  private calculateAdvancedEngagementLevel(salesAnalysis: any): 'low' | 'medium' | 'high' {
    const conversionProb = salesAnalysis.conversionProbability;
    const buyingSignalsCount = salesAnalysis.buyingSignals.length;
    const urgencyLevel = salesAnalysis.urgencyLevel;
    
    // Algoritmo mais sofisticado
    const engagementScore = (conversionProb * 0.5) + 
                           (buyingSignalsCount / 5 * 0.3) + 
                           (urgencyLevel / 5 * 0.2);
    
    if (engagementScore > 0.7) return 'high';
    if (engagementScore > 0.4) return 'medium';
    return 'low';
  }

  private updatePerformanceMetrics(processingTime: number, tokensUsed: number, salesAnalysis: any): void {
    this.performanceMetrics.set('avgProcessingTime', 
      (this.performanceMetrics.get('avgProcessingTime') || 0) * 0.9 + processingTime * 0.1
    );
    this.performanceMetrics.set('avgTokensUsed', 
      (this.performanceMetrics.get('avgTokensUsed') || 0) * 0.9 + tokensUsed * 0.1
    );
    this.performanceMetrics.set('avgConversionProbability', 
      (this.performanceMetrics.get('avgConversionProbability') || 0) * 0.9 + 
      salesAnalysis.stageAdvancement.conversionProbability * 0.1
    );
  }

  private getDefaultComprehensiveSalesAnalysis(context: EnhancedConversationContext): ComprehensiveSalesAnalysis {
    return {
      stageAdvancement: {
        currentStage: { stage: 'awareness' },
        nextStage: { stage: 'interest' },
        conversionProbability: 0.3,
        buyingSignals: [],
        recommendedActions: [],
        urgencyLevel: 2
      },
      leadQualification: {
        qualification: 'warm',
        overallScore: 50,
        confidence: 0.5,
        budget: {
          estimatedRange: { min: 200, max: 600 },
          confidence: 0.3,
          budgetCategory: 'standard',
          inferenceMethod: ['default']
        },
        authority: {
          level: 'medium',
          confidence: 0.5,
          decisionMakers: 2
        },
        need: {
          urgency: 2,
          specificity: 0.4,
          motivation: 'leisure'
        }
      },
      objectionAnalysis: {
        objections: [],
        handlingStrategy: { 
          primaryApproach: 'empathetic_listening',
          successProbability: 0.5
        }
      },
      persuasionStrategy: {
        combinedTechniques: { 
          techniquesUsed: [], 
          expectedEffectiveness: 0.3,
          ethicalScore: 1.0
        }
      },
      contextUpdates: {},
      performanceMetrics: {
        analysisTime: 100
      }
    };
  }

  private generateAdvancedErrorResponse(error: any, processingTime: number): SofiaSalesResponse {
    return {
      reply: 'Desculpe, tive um problema técnico momentâneo. Pode repetir sua mensagem? Estou aqui para te ajudar a encontrar a propriedade perfeita! 😊',
      actions: [],
      tokensUsed: 0,
      processingTime,
      salesAnalysis: {
        currentStage: 'awareness',
        nextStage: 'interest',
        conversionProbability: 0.3,
        leadQualification: 'unqualified',
        buyingSignals: [],
        objections: [],
        recommendedActions: ['restart_conversation'],
        urgencyLevel: 1
      },
      contextUpdates: {},
      persuasionTechniques: [],
      performanceMetrics: {
        analysisTime: 0,
        contextRetrievalTime: 0,
        openaiTime: 0,
        functionExecutionTime: 0
      }
    };
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.substring(0, 2) + '***' + phone.substring(phone.length - 2);
  }

  // ===== PUBLIC METHODS =====

  /**
   * Obter métricas detalhadas da instância
   */
  getAdvancedInstanceMetrics(): {
    instanceId: string;
    activeConnections: number;
    maxConnections: number;
    utilization: number;
    avgProcessingTime: number;
    avgTokensUsed: number;
    avgConversionProbability: number;
    features: string[];
  } {
    return {
      instanceId: this.instanceId,
      activeConnections: this.activeConnections,
      maxConnections: this.maxConnections,
      utilization: this.activeConnections / this.maxConnections,
      avgProcessingTime: this.performanceMetrics.get('avgProcessingTime') || 0,
      avgTokensUsed: this.performanceMetrics.get('avgTokensUsed') || 0,
      avgConversionProbability: this.performanceMetrics.get('avgConversionProbability') || 0,
      features: [
        'sales_transformation',
        'persuasion_techniques', 
        'objection_handling',
        'intelligent_qualification',
        'parallel_execution',
        'ultra_optimized_prompts'
      ]
    };
  }

  /**
   * Configurar instância avançada
   */
  configureAdvancedInstance(config: {
    maxConnections?: number;
    enableAdvancedLogging?: boolean;
  }): void {
    if (config.maxConnections && config.maxConnections > 0) {
      this.maxConnections = config.maxConnections;
    }

    logger.info('⚙️ [SofiaSalesV4] Advanced instance configured', {
      instanceId: this.instanceId,
      maxConnections: this.maxConnections,
      config
    });
  }
}

// Export class and create singleton instance
export const sofiaSalesAgentV4 = new SofiaSalesAgentV4();
export default SofiaSalesAgentV4;