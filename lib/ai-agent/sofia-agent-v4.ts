// lib/ai-agent/sofia-agent-v4.ts
// SOFIA AI AGENT V4 - STEP 2 IMPLEMENTATION COMPLETE
// Integração completa dos sistemas de alta performance implementados no Passo 2

import { OpenAI } from 'openai';
import { 
  EnhancedConversationContext,
  extractCriticalData,
  createEmptyEnhancedContext 
} from '@/lib/types/context-types-enhanced';
import { conversationContextServiceV2 } from '@/lib/services/conversation-context-service-v2';
import { advancedMemoryEngine } from '@/lib/services/advanced-memory-engine';
import { UltraOptimizedPrompts } from '@/lib/services/ultra-optimized-prompts';
import { parallelExecutionEngine, createOptimizedFunctionCalls } from '@/lib/services/parallel-execution-engine';
import { smartCacheSystem } from '@/lib/services/smart-cache-system';
import { responseOptimizer } from '@/lib/services/response-optimizer';
import { performanceMonitor } from '@/lib/services/performance-monitor';
import { getCorrectedOpenAIFunctions, CorrectedAgentFunctions } from '@/lib/ai/agent-functions-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface SofiaInputV4 {
  message: string;
  clientPhone: string;
  tenantId: string;
  metadata?: {
    source: 'whatsapp' | 'web' | 'api';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    context?: any;
  };
}

export interface SofiaResponseV4 {
  reply: string;
  originalReply?: string;           // Resposta antes da otimização
  actions?: any[];
  tokensUsed: number;
  originalTokens?: number;          // Tokens antes da otimização
  responseTime: number;
  compressionRatio?: number;
  functionsExecuted: string[];
  cacheHitRate: number;
  performanceScore: number;
  optimizationTechniques?: string[];
  metadata: {
    stage: string;
    leadScore: number;
    contextUpdates: number;
    parallelExecutionTime?: number;
    memoryLayer: 'L1' | 'L2' | 'L3';
  };
}

export interface SofiaPerformanceMetrics {
  averageResponseTime: number;
  averageTokenReduction: number;
  averageCacheHitRate: number;
  totalOptimizations: number;
  performanceScore: number;
  recommendedActions: string[];
}

// ===== SOFIA AGENT V4 - STEP 2 COMPLETE =====

export class SofiaAgentV4 {
  private openai: OpenAI;
  private availableFunctions: Map<string, Function>;
  private instanceId: string;
  private startTime: number;

  constructor(instanceId: string = 'sofia-v4-main') {
    this.instanceId = instanceId;
    this.startTime = Date.now();
    
    // Inicializar OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Mapear funções disponíveis
    this.availableFunctions = new Map();
    const functions = getCorrectedOpenAIFunctions();
    
    // Adicionar todas as funções do agent
    Object.keys(CorrectedAgentFunctions).forEach(funcName => {
      if (typeof CorrectedAgentFunctions[funcName] === 'function') {
        this.availableFunctions.set(funcName, CorrectedAgentFunctions[funcName]);
      }
    });

    logger.info('🚀 [SofiaV4] Sofia Agent V4 initialized with Step 2 optimizations', {
      instanceId: this.instanceId,
      availableFunctions: this.availableFunctions.size,
      optimizationsEnabled: [
        'ultra-optimized-prompts',
        'parallel-execution',
        'smart-cache',
        'response-optimizer',
        'performance-monitor',
        'advanced-memory'
      ]
    });
  }

  /**
   * Processar mensagem com todas as otimizações do Passo 2
   * OBJETIVO: <1000ms response time, <400 tokens, 90%+ cache hit rate
   */
  async processMessage(input: SofiaInputV4): Promise<SofiaResponseV4> {
    const requestId = performanceMonitor.startRequest();
    const startTime = Date.now();
    
    logger.info('🎯 [SofiaV4] Processing message with Step 2 optimizations', {
      requestId,
      clientPhone: this.maskPhone(input.clientPhone),
      messageLength: input.message.length,
      priority: input.metadata?.priority || 'normal'
    });

    try {
      // STEP 1: OBTER CONTEXTO COM SISTEMA DE MEMÓRIA AVANÇADO
      const context = await this.getOptimizedContext(input.clientPhone, input.tenantId);
      const criticalData = extractCriticalData(context);

      // STEP 2: VERIFICAR CACHE INTELIGENTE PRIMEIRO
      const cacheResult = await this.checkSmartCache(input, context);
      if (cacheResult) {
        return this.handleCacheHit(cacheResult, requestId, startTime, context);
      }

      // STEP 3: OBTER HISTÓRICO OTIMIZADO
      const messageHistory = await this.getOptimizedHistory(input.clientPhone, input.tenantId);

      // STEP 4: GERAR PROMPT ULTRA-OTIMIZADO
      const promptResult = UltraOptimizedPrompts.generateOptimizedPrompt(context, messageHistory);
      
      logger.debug('⚡ [SofiaV4] Ultra-optimized prompt generated', {
        originalTokens: promptResult.originalTokens,
        optimizedTokens: promptResult.totalTokens,
        compressionRatio: promptResult.metrics.compressionRatio,
        processingTime: promptResult.metrics.processingTime
      });

      // STEP 5: EXECUTAR OPENAI COM PROMPT OTIMIZADO
      const openaiResult = await this.executeOpenAIOptimized(
        input.message,
        promptResult,
        context
      );

      // STEP 6: PROCESSAR FUNÇÕES EM PARALELO (SE NECESSÁRIO)
      let parallelResults = null;
      let contextUpdates = {};
      
      if (openaiResult.tool_calls && openaiResult.tool_calls.length > 0) {
        const functionCalls = createOptimizedFunctionCalls(
          openaiResult.tool_calls.map(tc => tc.function.name),
          openaiResult.tool_calls.map(tc => JSON.parse(tc.function.arguments)),
          context
        );

        parallelResults = await parallelExecutionEngine.executeInParallel(
          functionCalls,
          context,
          this.availableFunctions
        );

        contextUpdates = parallelResults.contextUpdates || {};
        
        logger.info('🔄 [SofiaV4] Parallel function execution completed', {
          functionsExecuted: functionCalls.length,
          successfulFunctions: parallelResults.results.filter(r => r.success).length,
          executionTime: parallelResults.metrics.totalExecutionTime,
          timeReduction: parallelResults.metrics.timeReduction
        });
      }

      // STEP 7: OTIMIZAR RESPOSTA
      const optimizationResult = await responseOptimizer.optimizeResponse(
        openaiResult.content || openaiResult.response,
        context,
        context.conversationState.stage
      );

      // STEP 8: ATUALIZAR CONTEXTO COM MERGE INTELIGENTE
      await this.updateContextOptimized(
        input.clientPhone,
        input.tenantId,
        input.message,
        optimizationResult.optimizedResponse,
        contextUpdates,
        context
      );

      // STEP 9: CACHE DA RESPOSTA PARA OTIMIZAÇÃO FUTURA
      await this.cacheResponseOptimized(input, optimizationResult.optimizedResponse, context);

      // STEP 10: REGISTRAR MÉTRICAS DE PERFORMANCE
      const totalResponseTime = Date.now() - startTime;
      const functionsExecuted = parallelResults?.results.map(r => r.functionName) || [];
      const cacheStats = smartCacheSystem.getStats();

      performanceMonitor.endRequest(
        requestId,
        startTime,
        optimizationResult.optimizedTokens,
        functionsExecuted.length,
        true,
        { hits: cacheStats.hitRate, misses: cacheStats.missRate }
      );

      // STEP 11: CONSTRUIR RESPOSTA FINAL
      const response: SofiaResponseV4 = {
        reply: optimizationResult.optimizedResponse,
        originalReply: optimizationResult.originalResponse,
        actions: parallelResults?.results.filter(r => r.success).map(r => r.result) || [],
        tokensUsed: optimizationResult.optimizedTokens,
        originalTokens: optimizationResult.originalTokens,
        responseTime: totalResponseTime,
        compressionRatio: optimizationResult.compressionRatio,
        functionsExecuted,
        cacheHitRate: cacheStats.hitRate,
        performanceScore: optimizationResult.qualityScore,
        optimizationTechniques: optimizationResult.optimizationTechniques,
        metadata: {
          stage: context.conversationState.stage,
          leadScore: context.salesContext.leadScore,
          contextUpdates: context.metadata.contextUpdates,
          parallelExecutionTime: parallelResults?.metrics.totalExecutionTime,
          memoryLayer: this.determineMemoryLayer(context)
        }
      };

      logger.info('✅ [SofiaV4] Message processing completed with optimizations', {
        requestId,
        responseTime: totalResponseTime,
        tokenReduction: `${optimizationResult.originalTokens} → ${optimizationResult.optimizedTokens}`,
        compressionRatio: `${Math.round(optimizationResult.compressionRatio * 100)}%`,
        functionsExecuted: functionsExecuted.length,
        performanceScore: optimizationResult.qualityScore,
        cacheHitRate: cacheStats.hitRate
      });

      return response;

    } catch (error) {
      logger.error('❌ [SofiaV4] Message processing failed', {
        error,
        requestId,
        clientPhone: this.maskPhone(input.clientPhone)
      });

      // Registrar erro no monitor de performance
      performanceMonitor.endRequest(requestId, startTime, 0, 0, false);

      // Retornar resposta de fallback
      return this.createFallbackResponse(input, startTime);
    }
  }

  /**
   * Obter contexto otimizado com sistema de memória avançado
   */
  private async getOptimizedContext(
    clientPhone: string,
    tenantId: string
  ): Promise<EnhancedConversationContext> {
    // Usar o sistema de memória avançado (L1 → L2 → L3)
    return await advancedMemoryEngine.getContextWithCache(clientPhone, tenantId);
  }

  /**
   * Verificar cache inteligente para respostas similares
   */
  private async checkSmartCache(
    input: SofiaInputV4,
    context: EnhancedConversationContext
  ): Promise<string | null> {
    // Gerar chave de cache baseada na mensagem e contexto
    const cacheKey = this.generateMessageCacheKey(input.message, context);
    
    // Verificar se temos resposta em cache
    const cachedResponse = await smartCacheSystem.get<string>(cacheKey, ['response', 'message']);
    
    if (cachedResponse) {
      logger.debug('🚄 [SofiaV4] Cache hit for similar message', {
        cacheKey,
        messageLength: input.message.length
      });
    }
    
    return cachedResponse;
  }

  /**
   * Obter histórico otimizado
   */
  private async getOptimizedHistory(
    clientPhone: string,
    tenantId: string
  ): Promise<Array<{ role: string; content: string }>> {
    const history = await conversationContextServiceV2.getMessageHistory(
      clientPhone,
      tenantId,
      20 // Limitar a 20 mensagens para otimização
    );

    // Converter para formato simplificado
    return history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Executar OpenAI com prompt otimizado
   */
  private async executeOpenAIOptimized(
    userMessage: string,
    promptResult: any,
    context: EnhancedConversationContext
  ): Promise<any> {
    try {
      const messages = [
        {
          role: 'system' as const,
          content: promptResult.systemPrompt
        },
        ...promptResult.contextPrompts.map(ctx => ({
          role: 'system' as const,
          content: ctx
        })),
        {
          role: 'user' as const,
          content: userMessage
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        functions: getCorrectedOpenAIFunctions(),
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 500  // Limitado para forçar concisão
      });

      const choice = response.choices[0];
      
      if (choice.message.function_call) {
        return {
          content: choice.message.content,
          tool_calls: [{
            function: {
              name: choice.message.function_call.name,
              arguments: choice.message.function_call.arguments
            }
          }]
        };
      }

      return {
        content: choice.message.content,
        response: choice.message.content
      };

    } catch (error) {
      logger.error('❌ [SofiaV4] OpenAI execution failed', { error });
      throw error;
    }
  }

  /**
   * Atualizar contexto com otimizações
   */
  private async updateContextOptimized(
    clientPhone: string,
    tenantId: string,
    userMessage: string,
    assistantResponse: string,
    contextUpdates: any,
    currentContext: EnhancedConversationContext
  ): Promise<void> {
    // Salvar mensagens do usuário e assistente
    await conversationContextServiceV2.saveMessage(clientPhone, tenantId, {
      role: 'user',
      content: userMessage,
      engagementLevel: this.detectEngagementLevel(userMessage),
      buyingSignals: this.detectBuyingSignals(userMessage)
    });

    await conversationContextServiceV2.saveMessage(clientPhone, tenantId, {
      role: 'assistant',
      content: assistantResponse,
      responseTime: Date.now() - this.startTime
    });

    // Atualizar contexto com as mudanças
    if (Object.keys(contextUpdates).length > 0) {
      await conversationContextServiceV2.updateContext(clientPhone, tenantId, contextUpdates);
    }
  }

  /**
   * Cache da resposta otimizada
   */
  private async cacheResponseOptimized(
    input: SofiaInputV4,
    response: string,
    context: EnhancedConversationContext
  ): Promise<void> {
    const cacheKey = this.generateMessageCacheKey(input.message, context);
    
    await smartCacheSystem.set(cacheKey, response, {
      ttl: 30 * 60 * 1000, // 30 minutos
      priority: 3,
      tags: ['response', 'message', context.conversationState.stage],
      compress: true
    });
  }

  /**
   * Lidar com cache hit
   */
  private handleCacheHit(
    cachedResponse: string,
    requestId: string,
    startTime: number,
    context: EnhancedConversationContext
  ): SofiaResponseV4 {
    const responseTime = Date.now() - startTime;
    
    performanceMonitor.endRequest(requestId, startTime, 0, 0, true, { hits: 1, misses: 0 });

    logger.info('🚄 [SofiaV4] Cache hit - ultra-fast response', {
      requestId,
      responseTime,
      cacheOptimization: true
    });

    return {
      reply: cachedResponse,
      actions: [],
      tokensUsed: 0,
      responseTime,
      compressionRatio: 1,
      functionsExecuted: [],
      cacheHitRate: 100,
      performanceScore: 100,
      optimizationTechniques: ['cache-hit'],
      metadata: {
        stage: context.conversationState.stage,
        leadScore: context.salesContext.leadScore,
        contextUpdates: 0,
        memoryLayer: 'L1'
      }
    };
  }

  /**
   * Criar resposta de fallback
   */
  private createFallbackResponse(input: SofiaInputV4, startTime: number): SofiaResponseV4 {
    const fallbackMessage = "Desculpe, estou com dificuldades técnicas no momento. Pode repetir sua mensagem?";
    
    return {
      reply: fallbackMessage,
      actions: [],
      tokensUsed: 50,
      responseTime: Date.now() - startTime,
      compressionRatio: 1,
      functionsExecuted: [],
      cacheHitRate: 0,
      performanceScore: 0,
      optimizationTechniques: ['fallback'],
      metadata: {
        stage: 'discovery',
        leadScore: 50,
        contextUpdates: 0,
        memoryLayer: 'L3'
      }
    };
  }

  // ===== MÉTODOS AUXILIARES =====

  private generateMessageCacheKey(message: string, context: EnhancedConversationContext): string {
    const messageHash = this.simpleHash(message.toLowerCase().trim());
    const contextHash = this.simpleHash(JSON.stringify(extractCriticalData(context)));
    return `msg:${messageHash}:${contextHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private determineMemoryLayer(context: EnhancedConversationContext): 'L1' | 'L2' | 'L3' {
    const age = Date.now() - context.metadata.lastActivity.getTime();
    
    if (age < 5 * 60 * 1000) return 'L1';      // < 5 min
    if (age < 60 * 60 * 1000) return 'L2';     // < 1 hora
    return 'L3';                               // > 1 hora
  }

  private detectEngagementLevel(message: string): 'low' | 'medium' | 'high' {
    const highEngagementWords = ['interessado', 'gostei', 'quero', 'quando posso', 'como faço'];
    const mediumEngagementWords = ['legal', 'boa', 'interessante', 'vou pensar'];
    
    const lowerMessage = message.toLowerCase();
    
    if (highEngagementWords.some(word => lowerMessage.includes(word))) return 'high';
    if (mediumEngagementWords.some(word => lowerMessage.includes(word))) return 'medium';
    return 'low';
  }

  private detectBuyingSignals(message: string): string[] {
    const signals = [
      'quero reservar', 'vou fechar', 'quando posso', 'como faço',
      'aceito', 'confirmo', 'me interessa', 'gostei muito'
    ];
    
    const lowerMessage = message.toLowerCase();
    return signals.filter(signal => lowerMessage.includes(signal));
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.substring(0, 2) + '***' + phone.substring(phone.length - 2);
  }

  // ===== MÉTODOS PÚBLICOS PARA MONITORAMENTO =====

  /**
   * Obter métricas de performance da instância
   */
  getPerformanceMetrics(): SofiaPerformanceMetrics {
    const performanceReport = performanceMonitor.getPerformanceReport();
    const optimizerStats = responseOptimizer.getOptimizationStats();
    const cacheStats = smartCacheSystem.getStats();
    const memoryMetrics = advancedMemoryEngine.getMetrics();

    return {
      averageResponseTime: performanceReport.summary.averageResponseTime,
      averageTokenReduction: optimizerStats.averageCompressionRatio,
      averageCacheHitRate: cacheStats.hitRate,
      totalOptimizations: optimizerStats.totalOptimizations,
      performanceScore: performanceReport.summary.performanceScore,
      recommendedActions: performanceReport.optimizationSuggestions.map(s => s.title)
    };
  }

  /**
   * Otimizar configurações baseado no desempenho
   */
  async optimizeConfiguration(): Promise<void> {
    const suggestions = performanceMonitor.getOptimizationSuggestions();
    
    logger.info('🔧 [SofiaV4] Running configuration optimization', {
      totalSuggestions: suggestions.length,
      criticalSuggestions: suggestions.filter(s => s.priority === 'critical').length
    });

    // Implementar otimizações automáticas baseadas nas sugestões
    for (const suggestion of suggestions.filter(s => s.priority === 'critical')) {
      await this.implementOptimization(suggestion);
    }
  }

  private async implementOptimization(suggestion: any): Promise<void> {
    switch (suggestion.type) {
      case 'cache':
        await smartCacheSystem.optimize();
        break;
      case 'memory':
        await advancedMemoryEngine.forceCleanup();
        break;
      default:
        logger.info('📝 [SofiaV4] Manual optimization required', {
          title: suggestion.title,
          type: suggestion.type
        });
    }
  }

  /**
   * Resetar métricas para testes
   */
  resetMetrics(): void {
    performanceMonitor.resetCounters();
    responseOptimizer.resetStats();
    logger.info('🔄 [SofiaV4] Metrics reset completed');
  }

  /**
   * Status de saúde da instância
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    issues: string[];
    optimizations: string[];
  } {
    const uptime = Date.now() - this.startTime;
    const performanceReport = performanceMonitor.getPerformanceReport();
    const activeAlerts = performanceReport.activeAlerts;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const issues: string[] = [];
    
    if (activeAlerts.some(a => a.type === 'critical')) {
      status = 'critical';
      issues.push(...activeAlerts.filter(a => a.type === 'critical').map(a => a.message));
    } else if (activeAlerts.some(a => a.type === 'warning')) {
      status = 'warning';
      issues.push(...activeAlerts.filter(a => a.type === 'warning').map(a => a.message));
    }

    return {
      status,
      uptime,
      issues,
      optimizations: performanceReport.optimizationSuggestions.map(s => s.title)
    };
  }
}

// Export singleton instance
export const sofiaAgentV4 = new SofiaAgentV4();

export default SofiaAgentV4;