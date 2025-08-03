// lib/ai-agent/sofia-agent-v2.ts
// SOFIA V2 - Agente otimizado com todas as melhorias implementadas
// ✅ Prompt unificado
// ✅ Prevenção de loops
// ✅ LRU Cache para memória
// ✅ Validação de datas com confirmação
// ✅ Configuração centralizada

import { OpenAI } from 'openai';
import { smartSummaryService, SmartSummary } from './smart-summary-service';
import { getOpenAIFunctions, AgentFunctions } from '@/lib/ai/agent-functions';
import { conversationContextService } from '@/lib/services/conversation-context-service';
import { logger } from '@/lib/utils/logger';
import { SOFIA_UNIFIED_PROMPT, getDynamicContext, validateIntentionConflict } from './sofia-unified-prompt';
import FallbackSystem from './fallback-system';
import IntentDetector, { DetectedIntent } from './intent-detector';
import ConversationStateManagerV2 from './conversation-state-v2';
import { loopPrevention } from './loop-prevention';
import { dateValidator } from './date-validator';
import { SOFIA_CONFIG, getDefaultCheckIn, getDefaultCheckOut } from '@/lib/config/sofia-config';

// ===== INTERFACES =====

interface SofiaInput {
  message: string;
  clientPhone: string;
  tenantId: string;
  metadata?: {
    source: 'whatsapp' | 'web' | 'api';
    priority?: 'low' | 'normal' | 'high';
  };
}

interface SofiaResponse {
  reply: string;
  summary: SmartSummary;
  actions?: any[];
  tokensUsed: number;
  responseTime: number;
  functionsExecuted: string[];
  metadata: {
    stage: string;
    confidence: number;
    reasoningUsed: boolean;
  };
}

// ===== CLASSE PRINCIPAL OTIMIZADA =====

export class SofiaAgentV2 {
  private openai: OpenAI;
  private static instance: SofiaAgentV2;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Validar configuração na inicialização
    logger.info('🚀 [Sofia V2] Inicializando com configuração otimizada', {
      model: SOFIA_CONFIG.ai.MODEL,
      maxCachedConversations: SOFIA_CONFIG.context.MAX_CACHED_CONVERSATIONS,
      loopPreventionEnabled: true,
      dateValidationEnabled: SOFIA_CONFIG.validation.AUTO_CORRECT_DATES
    });
  }

  static getInstance(): SofiaAgentV2 {
    if (!this.instance) {
      logger.info('🚀 [Sofia V2] Criando nova instância otimizada');
      this.instance = new SofiaAgentV2();
    }
    return this.instance;
  }

  async processMessage(input: SofiaInput): Promise<SofiaResponse> {
    const startTime = Date.now();
    const functionsExecuted: string[] = [];

    try {
      logger.info('💬 [Sofia V2] Processando mensagem', {
        clientPhone: this.maskPhone(input.clientPhone),
        messagePreview: input.message.substring(0, 50) + '...',
        source: input.metadata?.source || 'unknown',
        tenantId: input.tenantId
      });

      // 1. Obter contexto e histórico
      const context = await conversationContextService.getOrCreateContext(
        input.clientPhone,
        input.tenantId
      );

      const messageHistory = await conversationContextService.getMessageHistory(
        input.clientPhone,
        input.tenantId,
        SOFIA_CONFIG.context.MAX_MESSAGE_HISTORY
      );
      
      const conversationHistory = messageHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 2. Obter e atualizar sumário inteligente
      const currentSummary = context.context.smartSummary || null;
      let updatedSummary = await smartSummaryService.updateSummary(
        input.message,
        currentSummary,
        conversationHistory
      );

      // 3. Atualizar estado V2 com LRU Cache
      if (updatedSummary.propertiesViewed.length > 0) {
        const propertyIds = updatedSummary.propertiesViewed
          .map(p => p.id)
          .filter((id): id is string => !!id && id.length >= 15);
        
        ConversationStateManagerV2.updateAfterSearch(
          input.clientPhone,
          input.tenantId,
          propertyIds
        );
      }

      // 4. Detectar mensagens casuais
      if (this.isCasualMessage(input.message) && !this.hasBusinessIntent(input.message)) {
        return await this.handleCasualMessage(input, updatedSummary, startTime);
      }

      // 5. DETECÇÃO COM PREVENÇÃO DE LOOPS
      const forcedIntent = IntentDetector.detectIntent(
        input.message,
        input.clientPhone,
        input.tenantId
      );

      if (forcedIntent && forcedIntent.shouldForceExecution) {
        // Verificar loop antes de executar
        const loopCheck = loopPrevention.checkForLoop(
          input.clientPhone,
          forcedIntent.function,
          forcedIntent.args
        );

        if (!loopCheck.isLoop) {
          logger.info('🎯 [Sofia V2] Execução forçada sem loop', {
            function: forcedIntent.function,
            confidence: forcedIntent.confidence
          });

          try {
            const executionId = `forced_${Date.now()}`;
            loopPrevention.recordExecution(
              input.clientPhone,
              forcedIntent.function,
              forcedIntent.args,
              executionId
            );

            const result = await AgentFunctions.executeFunction(
              forcedIntent.function,
              forcedIntent.args,
              input.tenantId
            );

            const executionTime = Date.now() - startTime;

            // Atualizar sumário
            const updatedSummaryFromForced = smartSummaryService.updateFromFunctionResult(
              updatedSummary,
              forcedIntent.function,
              result,
              input.message
            );

            // Gerar resposta natural
            const naturalResponse = await this.generateNaturalResponse(
              input.message,
              result,
              forcedIntent.function,
              updatedSummaryFromForced
            );

            return {
              reply: naturalResponse,
              summary: updatedSummaryFromForced,
              actions: [result],
              tokensUsed: 150,
              responseTime: executionTime,
              functionsExecuted: [forcedIntent.function],
              metadata: {
                stage: updatedSummaryFromForced.conversationState.stage,
                confidence: forcedIntent.confidence,
                reasoningUsed: true
              }
            };
          } catch (error) {
            logger.error('❌ [Sofia V2] Erro na execução forçada', { error });
          }
        } else {
          logger.warn('🔄 [Sofia V2] Loop detectado, ignorando execução forçada', {
            reason: loopCheck.reason,
            cooldownRemaining: loopCheck.cooldownRemaining
          });
        }
      }

      // 6. Construir mensagens com prompt unificado
      const messages = this.buildOptimizedMessages(
        input.message,
        updatedSummary,
        conversationHistory
      );

      // 7. Chamada OpenAI com configuração otimizada
      const shouldForceFunction = this.shouldForceFunction(input.message);
      
      const completion = await this.openai.chat.completions.create({
        model: SOFIA_CONFIG.ai.MODEL,
        messages: messages as any,
        tools: getOpenAIFunctions(),
        tool_choice: shouldForceFunction ? 'required' : 'auto',
        max_tokens: SOFIA_CONFIG.ai.MAX_TOKENS,
        temperature: SOFIA_CONFIG.ai.TEMPERATURE
      });

      const response = completion.choices[0].message;
      let reply = response.content || '';
      const actions: any[] = [];
      let totalTokens = completion.usage?.total_tokens || 0;

      // 8. Processar function calls com prevenção de loops
      if (response.tool_calls && response.tool_calls.length > 0) {
        const { finalReply, finalTokens, executedFunctions, updatedSummaryFromFunctions } =
          await this.processFunctionCallsWithLoopPrevention(
            response.tool_calls,
            messages,
            updatedSummary,
            input.tenantId,
            input.clientPhone
          );

        reply = finalReply || reply;
        totalTokens += finalTokens;
        functionsExecuted.push(...executedFunctions);
        actions.push(...executedFunctions.map(f => ({ type: f })));
        updatedSummary = updatedSummaryFromFunctions;
      }

      // 9. Salvar contexto atualizado
      await conversationContextService.updateContext(input.clientPhone, input.tenantId, {
        smartSummary: updatedSummary,
        lastAction: functionsExecuted[functionsExecuted.length - 1] || 'chat',
        stage: updatedSummary.conversationState.stage
      });

      // 10. Salvar histórico
      await this.saveConversationHistory(input, reply, totalTokens);

      const responseTime = Date.now() - startTime;

      logger.info('✅ [Sofia V2] Mensagem processada com sucesso', {
        responseTime: `${responseTime}ms`,
        tokensUsed: totalTokens,
        functionsExecuted,
        stage: updatedSummary.conversationState.stage,
        cacheStats: ConversationStateManagerV2.getCacheStats()
      });

      return {
        reply,
        summary: updatedSummary,
        actions,
        tokensUsed: totalTokens,
        responseTime,
        functionsExecuted,
        metadata: {
          stage: updatedSummary.conversationState.stage,
          confidence: updatedSummary.nextBestAction.confidence,
          reasoningUsed: true
        }
      };

    } catch (error) {
      return this.handleError(error, input, startTime);
    }
  }

  /**
   * Processar function calls com prevenção de loops
   */
  private async processFunctionCallsWithLoopPrevention(
    toolCalls: any[],
    messages: any[],
    summary: SmartSummary,
    tenantId: string,
    clientPhone?: string
  ): Promise<{
    finalReply: string;
    finalTokens: number;
    executedFunctions: string[];
    updatedSummaryFromFunctions: SmartSummary;
  }> {
    const toolMessages = [messages[messages.length - 1], { role: 'assistant', tool_calls: toolCalls }];
    const executedFunctions: string[] = [];
    let updatedSummary = { ...summary };

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      let args = JSON.parse(toolCall.function.arguments);
      
      // Verificar loop antes de executar
      if (clientPhone) {
        const loopCheck = loopPrevention.checkForLoop(clientPhone, functionName, args);
        
        if (loopCheck.isLoop) {
          logger.warn('🔄 [Sofia V2] Função bloqueada por loop', {
            functionName,
            reason: loopCheck.reason
          });
          
          toolMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              message: 'Essa ação já foi executada recentemente. Posso ajudar com algo diferente?',
              blocked: true
            })
          });
          continue;
        }
      }

      // Validar datas se necessário
      if (functionName === 'calculate_price' || functionName === 'create_reservation') {
        if (args.checkIn && args.checkOut) {
          const dateValidation = dateValidator.validateDates(args.checkIn, args.checkOut);
          
          if (dateValidation.needsConfirmation && SOFIA_CONFIG.validation.CONFIRM_DATE_CORRECTIONS) {
            toolMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: false,
                message: dateValidation.confirmationMessage,
                needsConfirmation: true,
                suggestedDates: dateValidation.suggestedDates
              })
            });
            continue;
          }
          
          if (dateValidation.suggestedDates) {
            args.checkIn = dateValidation.suggestedDates.checkIn;
            args.checkOut = dateValidation.suggestedDates.checkOut;
          }
        }
      }

      // Adicionar clientPhone se não tiver
      if (!args.clientPhone && clientPhone) {
        args.clientPhone = clientPhone;
      }

      try {
        // Registrar execução
        if (clientPhone) {
          const executionId = `gpt_${Date.now()}`;
          loopPrevention.recordExecution(clientPhone, functionName, args, executionId);
        }

        const result = await AgentFunctions.executeFunction(
          functionName,
          args,
          tenantId
        );

        executedFunctions.push(functionName);

        // Atualizar sumário
        updatedSummary = await smartSummaryService.updateSummaryWithFunctionResult(
          updatedSummary,
          functionName,
          args,
          result
        );

        // Atualizar estado V2 se necessário
        if (functionName === 'search_properties' && result.success && result.properties) {
          const propertyIds = result.properties.map((p: any) => p.id).filter(Boolean);
          if (clientPhone) {
            ConversationStateManagerV2.updateAfterSearch(clientPhone, tenantId, propertyIds);
          }
        }

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });

      } catch (error) {
        logger.error('❌ [Sofia V2] Erro na execução da função', { functionName, error });

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            success: false,
            message: 'Tive um problema técnico. Pode repetir sua solicitação?',
            error: 'function_execution_error'
          })
        });
      }
    }

    // Segunda chamada para resposta final
    const followUpMessages = [...messages.slice(0, -1), ...toolMessages];
    const followUp = await this.openai.chat.completions.create({
      model: SOFIA_CONFIG.ai.MODEL,
      messages: followUpMessages as any,
      max_tokens: 250,
      temperature: SOFIA_CONFIG.ai.TEMPERATURE + 0.1 // Levemente mais criativo para respostas
    });

    return {
      finalReply: followUp.choices[0].message.content || '',
      finalTokens: followUp.usage?.total_tokens || 0,
      executedFunctions,
      updatedSummaryFromFunctions: updatedSummary
    };
  }

  /**
   * Construir mensagens otimizadas com prompt unificado
   */
  private buildOptimizedMessages(
    userMessage: string,
    summary: SmartSummary,
    history: Array<{ role: string; content: string }>
  ): Array<{ role: string; content: string }> {
    // Contexto dinâmico baseado no estado
    const dynamicContext = getDynamicContext({
      hasProperties: summary.propertiesViewed.length > 0,
      propertyIds: summary.propertiesViewed
        .filter(p => p.id && p.id.length >= 15)
        .map(p => p.id as string),
      currentPhase: summary.conversationState.stage,
      lastFunction: summary.nextBestAction.function
    });

    const messages = [
      {
        role: 'system',
        content: SOFIA_UNIFIED_PROMPT + '\n\n' + dynamicContext
      }
    ];

    // Contexto temporal atual
    const currentDate = new Date();
    messages.push({
      role: 'system',
      content: `📅 DATA ATUAL: ${currentDate.toLocaleDateString('pt-BR')}
Ano: ${currentDate.getFullYear()}
SEMPRE use datas futuras válidas para reservas.`
    });

    // Sumário formatado
    messages.push({
      role: 'system',
      content: smartSummaryService.formatForPrompt(summary)
    });

    // Histórico recente configurável
    const recentHistory = history.slice(-SOFIA_CONFIG.context.MAX_MESSAGE_HISTORY);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      });
    });

    // Mensagem atual
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  /**
   * Detectar mensagens casuais
   */
  private isCasualMessage(message: string): boolean {
    const casualPatterns = [
      /^(oi|olá|oie|ola)$/i,
      /^(como você está|como está|tudo bem|td bem).*$/i,
      /^(bom dia|boa tarde|boa noite).*$/i
    ];

    return casualPatterns.some(pattern => pattern.test(message.trim().toLowerCase()));
  }

  /**
   * Detectar intenção de negócio
   */
  private hasBusinessIntent(message: string): boolean {
    const businessKeywords = [
      'alugar', 'aluguel', 'apartamento', 'casa', 'imóvel', 'propriedade',
      'temporada', 'hospedagem', 'reserva', 'preço', 'valor', 'fotos'
    ];

    const normalizedMessage = message.toLowerCase();
    return businessKeywords.some(keyword => normalizedMessage.includes(keyword));
  }

  /**
   * Determinar se deve forçar execução de função
   */
  private shouldForceFunction(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    const forceFunctionPatterns = [
      /quero\s+(alugar|apartamento|casa)/i,
      /procuro\s+(apartamento|casa|imóvel)/i,
      /\d+\s+pessoas?/i,
      /quanto\s+(custa|é|fica)/i,
      /fotos/i,
      /reservar/i
    ];

    return forceFunctionPatterns.some(pattern => pattern.test(lowerMessage));
  }

  /**
   * Gerar resposta casual
   */
  private generateCasualResponse(message: string): string {
    const normalizedMessage = message.trim().toLowerCase();

    if (normalizedMessage.includes('como está')) {
      return "Estou ótima, obrigada por perguntar! 😊 E você, como está? Posso te ajudar com alguma propriedade?";
    }

    if (normalizedMessage === 'oi' || normalizedMessage === 'olá') {
      return "Oi! Tudo bem? 😊 Como posso te ajudar hoje?";
    }

    if (normalizedMessage.includes('bom dia')) {
      return "Bom dia! 🌅 Como posso te ajudar hoje?";
    }

    if (normalizedMessage.includes('boa tarde')) {
      return "Boa tarde! ☀️ Em que posso te ajudar?";
    }

    if (normalizedMessage.includes('boa noite')) {
      return "Boa noite! 🌙 Como posso te ajudar?";
    }

    return "Oi! 😊 Como posso te ajudar hoje?";
  }

  /**
   * Lidar com mensagens casuais
   */
  private async handleCasualMessage(
    input: SofiaInput,
    summary: SmartSummary,
    startTime: number
  ): Promise<SofiaResponse> {
    const casualResponse = this.generateCasualResponse(input.message);

    await conversationContextService.updateContext(input.clientPhone, input.tenantId, {
      smartSummary: summary,
      lastAction: 'casual_chat',
      stage: 'greeting'
    });

    await this.saveConversationHistory(input, casualResponse, 50);

    const responseTime = Date.now() - startTime;

    return {
      reply: casualResponse,
      summary,
      actions: [],
      tokensUsed: 50,
      responseTime,
      functionsExecuted: [],
      metadata: {
        stage: 'greeting',
        confidence: 1.0,
        reasoningUsed: false
      }
    };
  }

  /**
   * Gerar resposta natural baseada no resultado
   */
  private async generateNaturalResponse(
    userMessage: string,
    functionResult: any,
    functionName: string,
    summary: SmartSummary
  ): Promise<string> {
    try {
      const responsePrompt = `Você é Sofia, consultora imobiliária calorosa.
Cliente disse: "${userMessage}"
Função ${functionName} executada com sucesso.
Resultado: ${JSON.stringify(functionResult, null, 2)}
Responda naturalmente em até 3 linhas com emojis.`;

      const completion = await this.openai.chat.completions.create({
        model: SOFIA_CONFIG.ai.MODEL,
        messages: [
          { role: 'system', content: responsePrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 300,
        temperature: 0.8
      });

      return completion.choices[0].message.content || 'Perfeito! Como posso ajudar mais? 😊';
    } catch (error) {
      logger.error('❌ [Sofia V2] Erro ao gerar resposta natural', { error });
      return 'Pronto! Como posso ajudar mais? 😊✨';
    }
  }

  /**
   * Lidar com erros
   */
  private handleError(error: any, input: SofiaInput, startTime: number): SofiaResponse {
    const responseTime = Date.now() - startTime;

    logger.error('❌ [Sofia V2] Erro ao processar mensagem', {
      error: error instanceof Error ? error.message : 'Unknown error',
      clientPhone: this.maskPhone(input.clientPhone),
      responseTime: `${responseTime}ms`
    });

    return {
      reply: 'Ops! Tive um probleminha técnico. Pode repetir sua mensagem? 🙏',
      summary: smartSummaryService.createEmptySummary(),
      actions: [],
      tokensUsed: 0,
      responseTime,
      functionsExecuted: [],
      metadata: {
        stage: 'error',
        confidence: 0,
        reasoningUsed: false
      }
    };
  }

  /**
   * Salvar histórico da conversa
   */
  private async saveConversationHistory(
    input: SofiaInput,
    reply: string,
    tokensUsed: number
  ): Promise<void> {
    try {
      await Promise.all([
        conversationContextService.saveMessage(input.clientPhone, input.tenantId, {
          role: 'user',
          content: input.message,
          timestamp: new Date()
        }),
        conversationContextService.saveMessage(input.clientPhone, input.tenantId, {
          role: 'assistant',
          content: reply,
          tokensUsed,
          timestamp: new Date()
        })
      ]);
    } catch (error) {
      logger.error('❌ [Sofia V2] Erro ao salvar histórico', { error });
    }
  }

  /**
   * Mascarar telefone para logs
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.substring(0, 2) + '***' + phone.substring(phone.length - 2);
  }

  /**
   * Limpar contexto do cliente
   */
  async clearClientContext(clientPhone: string, tenantId: string): Promise<void> {
    try {
      logger.info('🧹 [Sofia V2] Limpando contexto completo', {
        clientPhone: this.maskPhone(clientPhone),
        tenantId
      });

      // Limpar todos os sistemas
      await conversationContextService.clearClientContext(clientPhone, tenantId);
      ConversationStateManagerV2.clearState(clientPhone, tenantId);
      loopPrevention.clearClientHistory(clientPhone);
      smartSummaryService.clearCacheForClient(clientPhone);
      
      logger.info('✅ [Sofia V2] Contexto limpo com sucesso');
    } catch (error) {
      logger.error('❌ [Sofia V2] Erro ao limpar contexto', { error });
      throw error;
    }
  }

  /**
   * Obter estatísticas do sistema
   */
  getSystemStats(): {
    cacheStats: any;
    loopPreventionStats: any;
  } {
    return {
      cacheStats: ConversationStateManagerV2.getCacheStats(),
      loopPreventionStats: loopPrevention.getStats()
    };
  }
}

// Exportar instância singleton
export const sofiaAgentV2 = SofiaAgentV2.getInstance();