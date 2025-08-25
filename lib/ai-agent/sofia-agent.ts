// lib/ai-agent/sofia-agent.ts
// SOFIA Agent - Versão de Produção
// Sistema completo com Few-Shot Prompting e funções otimizadas

import { OpenAI } from 'openai';
import { getTenantAwareOpenAIFunctions, executeTenantAwareFunction } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { SOFIA_PROMPT } from './sofia-prompt';
import { FEW_SHOT_EXAMPLES } from './few-shot-examples';
// REMOVIDO: UnifiedContextManager - usando apenas ConversationContextService
import { smartSummaryService, SmartSummary } from './smart-summary-service';

// ===== COMPONENTES ESSENCIAIS APENAS =====
import IntentDetector, { DetectedIntent } from './intent-detector';
import ConversationStateManager, { ConversationState } from './conversation-state';
import { loopPrevention } from './loop-prevention';
import { sofiaAnalytics } from '@/lib/services/sofia-analytics-service';
import { parallelExecutionService } from '@/lib/ai/parallel-execution-service';
import { enhancedIntentDetector, type EnhancedIntentResult } from './enhanced-intent-detector';
import { ENHANCED_INTENT_CONFIG } from '@/lib/config/enhanced-intent-config';
// REMOVIDO: messageBatchingSystem - desabilitado temporariamente
import { FallbackSystem, type FallbackResponse } from './fallback-system';
import { conversationContextService } from '@/lib/services/conversation-context-service';

// ===== INTERFACES SIMPLIFICADAS =====

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
    intentDetected?: DetectedIntent | null;
    loopPrevented?: boolean;
    fallbackUsed?: boolean;
  };
}

// ===== CLASSE PRINCIPAL MVP =====

export class SofiaAgent {
  private openai: OpenAI;
  private static instance: SofiaAgent;
  private summaryCache = new Map<string, SmartSummary>();
  private messageHistory = new Map<string, Array<{ message: string, timestamp: number }>>();
  private useEnhancedDetection: boolean = ENHANCED_INTENT_CONFIG.enabled; // Usa config centralizada
  
  // Anti-spam system
  private recentMessages = new Map<string, Array<{ message: string, timestamp: number, normalized: string }>>();
  private readonly MAX_RECENT_MESSAGES = 5;
  private readonly REPETITION_TIME_WINDOW = 60000; // 1 minute
  private readonly SIMILARITY_THRESHOLD = 0.8;

  constructor() {
    // Initialize openai client lazily in getOpenAI method
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  static getInstance(): SofiaAgent {
    if (!this.instance) {
      logger.info('🚀 [Sofia] Criando instância para produção');
      this.instance = new SofiaAgent();
    }
    return this.instance;
  }

  async processMessage(input: SofiaInput): Promise<SofiaResponse> {
    const startTime = Date.now();
    const functionsExecuted: string[] = [];
    let intentDetected: DetectedIntent | null = null;
    let loopPrevented = false;
    let fallbackUsed = false;

    try {
      // ===== MESSAGE BATCHING SYSTEM - DESABILITADO =====
      // PROBLEMA IDENTIFICADO: Batching causando perda de contexto
      // TODO: Reimplementar com lógica melhorada após estabilizar fluxo
      
      // Por enquanto, processar mensagem imediatamente
      const batchResult = {
        shouldProcess: true,
        combinedMessage: input.message,
        messagesInBatch: 1,
        waitTime: 0
      };

      if (!batchResult.shouldProcess) {
        logger.info('📦 [Sofia] Mensagem adicionada ao batch, aguardando mais mensagens');
        
        return {
          reply: '', // Resposta vazia - não enviar nada ainda
          summary: { stage: 'batching', summary: 'Mensagem em batch', nextAction: null },
          tokensUsed: 0,
          responseTime: Date.now() - startTime,
          functionsExecuted: [],
          metadata: {
            stage: 'message_batching',
            confidence: 1.0,
            reasoningUsed: false,
            batchInfo: {
              messagesInBatch: batchResult.messagesInBatch,
              waitingForMore: true
            }
          }
        };
      }

      // Usar a mensagem combinada do batch
      const processedMessage = batchResult.combinedMessage;
      const batchDelay = batchResult.waitTime || 0;

      logger.info('📦 [Sofia] Processando batch de mensagens', {
        originalMessage: input.message.substring(0, 30) + '...',
        combinedMessage: processedMessage.substring(0, 50) + '...',
        messagesInBatch: batchResult.messagesInBatch,
        batchDelay: `${batchDelay}ms`
      });

      // Aplicar delay natural se necessário
      if (batchDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }

      // Atualizar input com mensagem combinada
      input.message = processedMessage;
      // ===== FILTROS ANTI-LOOP =====
      // Detectar se a mensagem parece ser do próprio bot
      if (this.isBotMessage(input.message)) {
        logger.warn('🚫 [Sofia] Mensagem detectada como sendo do próprio bot, ignorando', {
          clientPhone: this.maskPhone(input.clientPhone),
          messagePreview: input.message.substring(0, 50) + '...',
          tenantId: input.tenantId
        });
        
        return {
          reply: '', // Resposta vazia para evitar loop
          summary: { stage: 'ignored', summary: 'Mensagem do próprio bot ignorada', nextAction: null },
          tokensUsed: 0,
          responseTime: Date.now() - startTime,
          functionsExecuted: [],
          metadata: {
            stage: 'bot_message_filtered',
            confidence: 1.0,
            reasoningUsed: false,
            loopPrevented: true
          }
        };
      }

          // Verificar mensagens muito repetitivas ou suspeitas (versão melhorada)
      const repetitionCheck = this.checkForRepetitiveMessage(input.message, input.clientPhone);
      if (repetitionCheck.isRepetitive) {
        logger.warn('🚫 [Sofia] Mensagem repetitiva detectada', {
          clientPhone: this.maskPhone(input.clientPhone),
          messagePreview: input.message.substring(0, 50) + '...',
          similarity: repetitionCheck.similarity,
          reason: repetitionCheck.reason
        });
        
        return {
          reply: repetitionCheck.isExactMatch 
            ? 'Acabei de responder essa pergunta! 😊 Tem algo mais específico que posso te ajudar?'
            : 'Vejo que está com pressa! 😅 Para te ajudar melhor, pode reformular sua pergunta com mais detalhes?',
          summary: { stage: 'repetition_detected', summary: 'Mensagem repetitiva detectada', nextAction: null },
          tokensUsed: 0,
          responseTime: Date.now() - startTime,
          functionsExecuted: [],
          metadata: {
            stage: 'message_repetition',
            confidence: 1.0,
            reasoningUsed: false,
            loopPrevented: true
          }
        };
      }

      // Adicionar mensagem ao histórico anti-spam
      this.addToRecentMessages(input.message, input.clientPhone);

      logger.info('💬 [Sofia] Processando mensagem', {
        clientPhone: this.maskPhone(input.clientPhone),
        messagePreview: input.message.substring(0, 50) + '...',
        tenantId: input.tenantId,
        source: input.metadata?.source || 'unknown'
      });

      // ===== ANALYTICS TRACKING - START =====
      // CORRIGIDO: Usar ID consistente baseado apenas no telefone
      const conversationId = `conv_${input.tenantId}_${input.clientPhone}`;
      
      // Tentar carregar summary anterior primeiro
      let previousSummary = null;
      
      // Tentar carregar contexto existente ANTES de inicializar como null
      try {
        const existingContext = await conversationContextService.getOrCreateContext(
          input.clientPhone, 
          input.tenantId
        );
        
        if (existingContext?.context?.smartSummary) {
          previousSummary = existingContext.context.smartSummary;
          logger.info('📥 [Sofia] Summary anterior encontrado', {
            stage: previousSummary.conversationState.stage,
            guests: previousSummary.searchCriteria?.guests,
            propertiesCount: previousSummary.propertiesViewed?.length || 0,
            hasClientName: !!previousSummary.clientInfo?.name
          });
        }
      } catch (error) {
        logger.warn('⚠️ [Sofia] Erro ao carregar contexto anterior', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      // Iniciar tracking se for primeira mensagem da conversa
      if (!previousSummary) {
        // Nova conversa - iniciar tracking
        try {
          await sofiaAnalytics.startConversation(
            input.tenantId,
            conversationId,
            input.clientPhone
          );
        } catch (error) {
          logger.error('❌ [Sofia] Erro ao iniciar tracking da conversa', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Rastrear mensagem do cliente - não bloquear fluxo
      sofiaAnalytics.trackMessage(
        input.tenantId,
        conversationId,
        true, // isFromClient
        undefined // sem tempo de resposta para mensagem do cliente
      ).catch(error => {
        logger.error('❌ [Sofia] Erro no analytics tracking', {
          error: error instanceof Error ? error.message : String(error),
          clientPhone: this.maskPhone(input.clientPhone)
        });
      });
      
      logger.info('📊 [Sofia] Analytics tracking concluído', {
        clientPhone: this.maskPhone(input.clientPhone),
        conversationId: conversationId.substring(0, 20) + '***'
      });
      
      // ===== SMART SUMMARY INTEGRATION =====
      // Summary anterior já foi carregado no início do método
      
      // ATUALIZADO: Usar apenas ConversationContextService para contexto
      logger.info('📋 [Sofia] Carregando contexto do ConversationContextService', {
        clientPhone: this.maskPhone(input.clientPhone),
        tenantId: input.tenantId.substring(0, 8) + '***'
      });
      
      // Usar método com cache unificado
      const contextDoc = await conversationContextService.getContextWithCache(input.clientPhone, input.tenantId);
      const messageHistory = contextDoc.context.messageHistory || [];
      
      logger.info('📋 [Sofia] Contexto carregado', {
        historyLength: messageHistory.length,
        hasContext: !!contextDoc,
        hasSmartSummary: !!contextDoc.context.smartSummary
      });
      
      // Adicionar mensagem atual ao histórico
      const currentHistory = [
        ...messageHistory,
        { role: 'user', content: input.message }
      ];

      // Atualizar summary com a nova mensagem
      let updatedSummary;
      try {
        updatedSummary = await smartSummaryService.updateSummary(
          input.message,
          previousSummary,
          currentHistory
        );
      } catch (error) {
        logger.error('❌ [Sofia] Erro ao atualizar summary, usando anterior', {
          error: error instanceof Error ? error.message : String(error)
        });
        // Usar summary anterior ou criar novo básico
        updatedSummary = previousSummary || {
          conversationState: { stage: 'greeting' },
          searchCriteria: {},
          clientInfo: {},
          propertiesViewed: [],
          nextBestAction: { action: 'greet', confidence: 0.5 }
        };
      }
      
      // CORRIGIDO: Salvar summary com await para garantir persistência
      try {
        await conversationContextService.updateContext(
          input.clientPhone,
          input.tenantId,
          { smartSummary: updatedSummary }
        );
        
        // Limpar cache local para forçar reload na próxima requisição
        conversationContextService.clearLocalCache(input.clientPhone, input.tenantId);
        
        logger.info('💾 [Sofia] Summary persistido com sucesso', {
          stage: updatedSummary.conversationState.stage,
          tenantId: input.tenantId.substring(0, 8) + '***'
        });
      } catch (error) {
        logger.error('❌ [Sofia] Erro ao persistir summary', {
          error: error instanceof Error ? error.message : String(error)
        });
        // Continuar mesmo com erro de persistência
      }

      logger.info('🧠 [Sofia] Summary atualizado', {
        stage: updatedSummary.conversationState.stage,
        guests: updatedSummary.searchCriteria.guests,
        hasClientName: !!updatedSummary.clientInfo.name,
        propertiesCount: updatedSummary.propertiesViewed.length,
        nextAction: updatedSummary.nextBestAction.action
      });

      // NOVA LÓGICA: Enhanced Intent Detection - Configuração Centralizada
      const useEnhanced = this.useEnhancedDetection && ENHANCED_INTENT_CONFIG.abTestPercentage >= 100;
      
      if (useEnhanced) {
        logger.info('🎯 [Sofia] Usando Enhanced Intent Detection', { 
          clientPhone: this.maskPhone(input.clientPhone),
          enhancedActive: `${ENHANCED_INTENT_CONFIG.abTestPercentage}%`,
          confidenceThreshold: ENHANCED_INTENT_CONFIG.confidenceThreshold
        });
        
        const enhancedIntent = await this.processWithEnhancedDetection(
          input, 
          updatedSummary, 
          conversationId
        );
        
        if (enhancedIntent) {
          // Rastrear mensagem de resposta
          await sofiaAnalytics.trackMessage(
            input.tenantId,
            conversationId,
            false, // isFromClient
            enhancedIntent.responseTime
          );
          
          // Finalizar conversa se necessário
          if (enhancedIntent.metadata.stage === 'completed') {
            await sofiaAnalytics.endConversation(
              input.tenantId,
              conversationId,
              'completed'
            );
          }
          
          return enhancedIntent;
        }
        
        logger.info('🔄 [Sofia] Enhanced falhou, usando método original');
      }

      // 1. DETECTAR INTENÇÃO (funcionalidade testada)
      intentDetected = IntentDetector.detectIntent(
        input.message,
        input.clientPhone,
        input.tenantId
      );
      
      // Rastrear intenção detectada
      if (intentDetected?.intent) {
        await sofiaAnalytics.trackIntent(
          input.tenantId,
          conversationId,
          intentDetected.intent
        );
      }

      // 2. VERIFICAR PREVENÇÃO DE LOOP (funcionalidade testada)
      if (intentDetected?.shouldForceExecution) {
        const loopCheck = loopPrevention.checkForLoop(
          input.clientPhone,
          intentDetected.function,
          intentDetected.args
        );

        if (loopCheck.isLoop) {
          logger.warn('🔄 [Sofia MVP] Loop detectado - usando fallback', {
            functionName: intentDetected.function,
            reason: loopCheck.reason
          });

          loopPrevented = true;
          fallbackUsed = true;

          return {
            reply: this.getLoopFallbackMessage(intentDetected.function),
            summary: updatedSummary,
            actions: [],
            tokensUsed: 0,
            responseTime: Date.now() - startTime,
            functionsExecuted: [],
            metadata: {
              stage: 'loop_prevention',
              confidence: 0.8,
              reasoningUsed: false,
              intentDetected,
              loopPrevented: true,
              fallbackUsed: true
            }
          };
        }
      }

      // 3. EXECUÇÃO DIRETA SE INTENÇÃO DETECTADA COM ALTA CONFIANÇA
      if (intentDetected?.shouldForceExecution && intentDetected.confidence >= 0.85) {
        logger.info('⚡ [Sofia MVP] Execução direta', {
          functionName: intentDetected.function,
          confidence: intentDetected.confidence
        });

        // Registrar execução para prevenção de loops
        const executionId = `direct_${Date.now()}`;
        loopPrevention.recordExecution(
          input.clientPhone,
          intentDetected.function,
          intentDetected.args,
          executionId
        );

        // Executar função diretamente
        const result = await executeTenantAwareFunction(
          intentDetected.function,
          intentDetected.args,
          input.tenantId,
          input.clientPhone
        );

        if (result.success) {
          // Verificar se é resultado vazio e usar fallback apropriado
          const isEmpty = this.isEmptyFunctionResult(intentDetected.function, result);
          
          if (isEmpty) {
            fallbackUsed = true;
            logger.info('📭 [Sofia] Resultado vazio detectado, usando fallback', {
              function: intentDetected.function,
              clientPhone: this.maskPhone(input.clientPhone)
            });
            
            // Usar FallbackSystem para resultados vazios
            const fallbackResponse = this.getAdvancedFallbackResponse(intentDetected.function, intentDetected.args);
            const reply = fallbackResponse.reply;

            // Salvar no histórico
            await this.saveMessageHistory(input, reply, 0);

            // Atualizar summary
            const updatedSummaryWithResult = await smartSummaryService.updateSummaryWithFunctionResult(
              updatedSummary,
              intentDetected.function,
              intentDetected.args,
              { ...result, isEmpty: true }
            );
            
            // Cache removido - persistindo diretamente no ConversationContextService
            await conversationContextService.updateContext(
              input.clientPhone,
              input.tenantId,
              { smartSummary: updatedSummaryWithResult }
            );

            return {
              reply,
              summary: updatedSummaryWithResult,
              actions: [{ type: intentDetected.function, result: { ...result, isEmpty: true } }],
              tokensUsed: 0,
              responseTime: Date.now() - startTime,
              functionsExecuted: [intentDetected.function],
              metadata: {
                stage: 'empty_result_fallback',
                confidence: intentDetected.confidence,
                reasoningUsed: false,
                intentDetected,
                loopPrevented: false,
                fallbackUsed: true
              }
            };
          }
          
          functionsExecuted.push(intentDetected.function);
          
          // Rastrear execução da função no analytics
          await sofiaAnalytics.trackFunctionCall(
            input.tenantId,
            conversationId,
            intentDetected.function,
            result
          );
          
          // Atualizar estado da conversa
          this.updateConversationState(
            input.clientPhone,
            input.tenantId,
            intentDetected.function,
            result
          );

          const reply = this.generateContextualResponse([intentDetected.function], [result]);
        } else {
          // Tratar falha na função com fallback
          fallbackUsed = true;
          logger.warn('⚠️ [Sofia] Função falhou, usando fallback', {
            function: intentDetected.function,
            error: result.error,
            clientPhone: this.maskPhone(input.clientPhone)
          });
          
          // Usar FallbackSystem avançado
          const fallbackResponse = this.getAdvancedFallbackResponse(intentDetected.function, intentDetected.args, result.error);
          const reply = fallbackResponse.reply;

          // Salvar no histórico - não bloquear fluxo
          this.saveMessageHistory(input, reply, 0).catch(error => {
            logger.error('❌ [Sofia] Erro ao salvar histórico', { error });
          });

          // Atualizar summary com resultado da função
          const updatedSummaryWithResult = await smartSummaryService.updateSummaryWithFunctionResult(
            updatedSummary,
            intentDetected.function,
            intentDetected.args,
            result
          );
          
          // Salvar no cache
          // Cache removido - persistindo diretamente no ConversationContextService
          await conversationContextService.updateContext(
            input.clientPhone,
            input.tenantId,
            { smartSummary: updatedSummaryWithResult }
          );

          return {
            reply,
            summary: updatedSummaryWithResult,
            actions: [{ type: intentDetected.function, result }],
            tokensUsed: 0,
            responseTime: Date.now() - startTime,
            functionsExecuted,
            metadata: {
              stage: 'direct_execution',
              confidence: intentDetected.confidence,
              reasoningUsed: false,
              intentDetected,
              loopPrevented: false,
              fallbackUsed: false
            }
          };
        }
      }

      // 4. USAR GPT COM CONTEXTO INTELIGENTE
      logger.info('🧠 [Sofia] Usando GPT com SmartSummary');

      const messages = [
        {
          role: 'system' as const,
          content: this.buildSmartPrompt(input.tenantId, updatedSummary, intentDetected)
        },
        {
          role: 'user' as const,
          content: input.message
        }
      ];

      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        tools: getTenantAwareOpenAIFunctions(),
        tool_choice: intentDetected?.shouldForceExecution ? 'required' : 'auto',
        max_tokens: 800, // Reduzido para MVP
        temperature: 0.7
      });

      const response = completion.choices[0].message;
      let reply = response.content || '';
      const actions: any[] = [];
      let totalTokens = completion.usage?.total_tokens || 0;

      // 5. PROCESSAR TOOL CALLS COM PREVENÇÃO DE LOOP E PARALELIZAÇÃO
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Verificar se temos search_properties e calculate_price para paralelizar
        const searchCall = response.tool_calls.find(tc => tc.function.name === 'search_properties');
        const calculateCall = response.tool_calls.find(tc => tc.function.name === 'calculate_price');
        
        if (searchCall && calculateCall) {
          // EXECUÇÃO PARALELA OTIMIZADA
          logger.info('⚡ [Sofia] Detectada oportunidade de paralelização');
          
          const searchArgs = JSON.parse(searchCall.function.arguments);
          const calculateArgs = JSON.parse(calculateCall.function.arguments);
          
          const parallelResult = await parallelExecutionService.searchAndCalculateParallel(
            searchArgs,
            calculateArgs,
            input.tenantId,
            input.clientPhone
          );
          
          if (parallelResult.searchResult.success) {
            functionsExecuted.push('search_properties');
            actions.push({ type: 'search_properties', result: parallelResult.searchResult });
            
            await sofiaAnalytics.trackFunctionCall(
              input.tenantId,
              conversationId,
              'search_properties',
              parallelResult.searchResult
            );
          }
          
          if (parallelResult.calculateResult?.success) {
            functionsExecuted.push('calculate_price');
            actions.push({ type: 'calculate_price', result: parallelResult.calculateResult });
            
            await sofiaAnalytics.trackFunctionCall(
              input.tenantId,
              conversationId,
              'calculate_price',
              parallelResult.calculateResult
            );
          }
          
          logger.info('✅ [Sofia] Execução paralela concluída', {
            executionTime: parallelResult.executionTime,
            searchSuccess: parallelResult.searchResult.success,
            calculateSuccess: parallelResult.calculateResult?.success
          });
          
          // Remover essas tool calls da lista para não processar novamente
          response.tool_calls = response.tool_calls.filter(
            tc => tc.function.name !== 'search_properties' && tc.function.name !== 'calculate_price'
          );
        }
        
        // Processar demais tool calls normalmente
        for (const toolCall of response.tool_calls) {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            // Verificar loop simples
            const loopCheck = loopPrevention.checkForLoop(
              input.clientPhone,
              functionName,
              functionArgs
            );

            if (loopCheck.isLoop) {
              logger.warn('🔄 [Sofia MVP] Loop detectado na tool call');
              loopPrevented = true;
              continue;
            }

            // Registrar e executar
            const executionId = `gpt_${toolCall.id}`;
            loopPrevention.recordExecution(
              input.clientPhone,
              functionName,
              functionArgs,
              executionId
            );

            const result = await executeTenantAwareFunction(
              functionName,
              functionArgs,
              input.tenantId,
              input.clientPhone
            );

            if (result.success) {
              functionsExecuted.push(functionName);
              actions.push({ type: functionName, result });
              
              // Rastrear execução da função no analytics
              await sofiaAnalytics.trackFunctionCall(
                input.tenantId,
                conversationId,
                functionName,
                result
              );

              // Atualizar estado
              this.updateConversationState(
                input.clientPhone,
                input.tenantId,
                functionName,
                result
              );
            } else {
              // Tratar falha na função
              fallbackUsed = true;
              logger.warn('⚠️ [Sofia] Tool call falhou', {
                function: functionName,
                error: result.error,
                clientPhone: this.maskPhone(input.clientPhone)
              });
              
              // Adicionar informação de fallback para resposta
              actions.push({ type: functionName, result: { ...result, fallback: true } });
            }

          } catch (error: any) {
            logger.error('❌ [Sofia MVP] Erro ao executar tool call', {
              function: toolCall.function.name,
              error: error.message
            });
          }
        }

        // Gerar resposta baseada nas funções executadas
        if (functionsExecuted.length > 0) {
          reply = this.generateContextualResponse(functionsExecuted, actions);
        }
      }

      // 6. FALLBACK INTELIGENTE SE NECESSÁRIO
      if (functionsExecuted.length === 0) {
        if (intentDetected?.shouldForceExecution) {
          logger.warn('⚠️ [Sofia MVP] Nenhuma função executada - usando fallback específico');
          reply = this.getNoExecutionFallback(intentDetected.function, conversationState);
          fallbackUsed = true;
        } else if (!reply || reply.trim() === '') {
          // Se GPT não gerou resposta adequada
          logger.warn('⚠️ [Sofia MVP] Resposta vazia do GPT - usando fallback contextual');
          reply = this.getContextualFallback(input.message, conversationState);
          fallbackUsed = true;
        }
      }

      // 7. SALVAR HISTÓRICO E ANALYTICS
      await this.saveMessageHistory(input, reply, totalTokens);
      
      // Rastrear mensagem de resposta da Sofia
      const responseTime = Date.now() - startTime;
      await sofiaAnalytics.trackMessage(
        input.tenantId,
        conversationId,
        false, // não é do cliente
        responseTime
      );
      
      // Atualizar contexto do analytics com o summary
      if (updatedSummary) {
        await sofiaAnalytics.updateContext(
          input.tenantId,
          conversationId,
          {
            searchFilters: updatedSummary.searchCriteria,
            interestedProperties: updatedSummary.propertiesViewed,
            sentiment: updatedSummary.conversationState.sentiment
          }
        );
      }

      logger.info('✅ [Sofia MVP] Processamento completo', {
        responseTime: `${responseTime}ms`,
        tokensUsed: totalTokens,
        functionsExecuted: functionsExecuted.length,
        loopPrevented,
        fallbackUsed
      });

      // Atualizar summary com resultados das funções executadas  
      let finalSummary = updatedSummary;
      if (functionsExecuted.length > 0) {
        for (let i = 0; i < functionsExecuted.length; i++) {
          const functionName = functionsExecuted[i];
          const result = actions[i]?.result;
          if (result) {
            finalSummary = await smartSummaryService.updateSummaryWithFunctionResult(
              finalSummary,
              functionName,
              {}, // args podem ser passados se necessário
              result
            );
          }
        }
        // Salvar summary final no cache
        // Cache removido - persistindo diretamente no ConversationContextService
        await conversationContextService.updateContext(
          input.clientPhone,
          input.tenantId,
          { smartSummary: finalSummary }
        );
      }

      return {
        reply,
        summary: finalSummary,
        actions,
        tokensUsed: totalTokens,
        responseTime,
        functionsExecuted,
        metadata: {
          stage: finalSummary.conversationState.stage,
          confidence: finalSummary.nextBestAction.confidence,
          reasoningUsed: true,
          intentDetected,
          loopPrevented,
          fallbackUsed
        }
      };

    } catch (error: any) {
      return this.handleError(error, input, startTime, intentDetected, loopPrevented, fallbackUsed);
    }
  }

  // ===== MÉTODOS AUXILIARES INTELIGENTES =====

  private buildSmartPrompt(
    tenantId: string,
    summary: SmartSummary,
    intentDetected: DetectedIntent | null
  ): string {
    // Usar o formatForPrompt do SmartSummary que é muito inteligente
    const summaryContext = smartSummaryService.formatForPrompt(summary);
    
    let prompt = `${SOFIA_PROMPT}\n\n${FEW_SHOT_EXAMPLES}\n\n`;
    prompt += `IMPORTANTE: Você está operando para o tenant ${tenantId}.\n\n`;
    prompt += `${summaryContext}\n\n`;

    // Adicionar intenção detectada se houver
    if (intentDetected) {
      prompt += `🎯 INTENÇÃO DETECTADA:\n`;
      prompt += `- Função sugerida: ${intentDetected.function}\n`;
      prompt += `- Confiança: ${(intentDetected.confidence * 100).toFixed(1)}%\n`;
      prompt += `- Considere executar esta função se apropriada.\n\n`;
    }

    // Instruções baseadas no stage atual
    prompt += `📋 INSTRUÇÕES CONTEXTUAIS:\n`;
    switch (summary.conversationState.stage) {
      case 'greeting':
        prompt += `- Seja acolhedora e descubra as necessidades\n`;
        prompt += `- Pergunte sobre datas (check-in/check-out), número de pessoas e comodidades desejadas\n`;
        break;
      case 'discovery':
        prompt += `- Colete informações faltantes para busca\n`;
        prompt += `- Execute search_properties quando tiver dados suficientes\n`;
        break;
      case 'presentation':
        prompt += `- Apresente as propriedades encontradas\n`;
        prompt += `- Envie fotos com send_property_media se solicitado\n`;
        break;
      case 'engagement':
        prompt += `- Cliente demonstrou interesse, aprofunde o engajamento\n`;
        prompt += `- Calcule preços com calculate_price se solicitado\n`;
        break;
      case 'negotiation':
        prompt += `- Foque em fechar o negócio\n`;
        prompt += `- Registre o cliente se necessário\n`;
        break;
      case 'booking':
        prompt += `- Finalize a reserva com create_reservation\n`;
        prompt += `- Confirme todos os detalhes\n`;
        break;
      case 'completed':
        prompt += `- Acompanhe pagamento e forneça suporte\n`;
        break;
    }

    prompt += `\n💡 LEMBRE-SE:\n`;
    prompt += `- Respostas concisas (máximo 3 linhas)\n`;
    prompt += `- Use IDs REAIS das propriedades quando disponíveis\n`;
    prompt += `- Seja natural, amigável e eficiente\n`;
    prompt += `- NUNCA invente informações\n`;

    return prompt;
  }

  private buildMVPPrompt(
    tenantId: string,
    conversationState: ConversationState,
    messageHistory: any[],
    intentDetected: DetectedIntent | null
  ): string {
    let prompt = `${SOFIA_PROMPT}\n\n${FEW_SHOT_EXAMPLES}\n\n`;
    prompt += `IMPORTANTE: Você está operando para o tenant ${tenantId}.\n\n`;

    // Adicionar contexto básico de estado
    if (conversationState.lastPropertyIds.length > 0) {
      prompt += `CONTEXTO IMPORTANTE:\n`;
      prompt += `- JÁ FORAM ENCONTRADAS ${conversationState.lastPropertyIds.length} propriedades\n`;
      prompt += `- IDs das propriedades: ${conversationState.lastPropertyIds.join(', ')}\n`;
      prompt += `- Fase: ${conversationState.conversationPhase}\n`;
      prompt += `- Se cliente perguntar sobre "opções" ou "propriedades", LISTE as propriedades encontradas\n`;
      prompt += `- NÃO execute search_properties novamente a menos que sejam novos critérios\n`;
      
      if (conversationState.clientInfo?.name) {
        prompt += `- Cliente: ${conversationState.clientInfo.name}\n`;
      }
      prompt += `\n`;
    }

    // Adicionar intenção detectada
    if (intentDetected) {
      prompt += `INTENÇÃO DETECTADA:\n`;
      prompt += `- Função sugerida: ${intentDetected.function}\n`;
      prompt += `- Confiança: ${(intentDetected.confidence * 100).toFixed(1)}%\n\n`;
    }

    prompt += `INSTRUÇÕES:\n`;
    prompt += `- Respostas concisas (máximo 3 linhas)\n`;
    prompt += `- Use o contexto para evitar repetições\n`;
    prompt += `- Se detectou intenção, considere usá-la\n`;

    return prompt;
  }

  private updateConversationState(
    clientPhone: string,
    tenantId: string,
    functionName: string,
    result: any
  ): void {
    switch (functionName) {
      case 'search_properties':
        if (result.properties && result.properties.length > 0) {
          const propertyIds = result.properties.map((p: any) => p.id);
          ConversationStateManager.updateAfterSearch(clientPhone, tenantId, propertyIds);
          
          // CRM AUTO-UPDATE: Cliente está engaged após ver propriedades
          this.updateLeadStatusAuto(clientPhone, tenantId, 'engaged', 'Visualizou propriedades');
          
          // Marcar que deve auto-calcular preços se tiver dados suficientes
          const state = ConversationStateManager.getState(clientPhone, tenantId);
          if (state.searchCriteria?.checkIn && state.searchCriteria?.checkOut && state.searchCriteria?.guests) {
            // Auto-cálculo será feito no próximo processamento se necessário
            logger.info('🔄 [Sofia] Contexto preparado para auto-cálculo de preços', {
              clientPhone: clientPhone.substring(0, 6) + '***',
              hasSearchCriteria: true
            });
          }
        }
        break;

      case 'calculate_price':
        if (result.pricing) {
          ConversationStateManager.updateAfterPriceCalculation(
            clientPhone,
            tenantId,
            {
              propertyId: result.property?.id || '',
              checkIn: result.dates?.checkIn || '',
              checkOut: result.dates?.checkOut || '',
              totalPrice: result.pricing?.totalPrice || 0,
              details: result.pricing
            }
          );
        }
        break;

      case 'register_client':
        if (result.client) {
          ConversationStateManager.updateClientInfo(
            clientPhone,
            tenantId,
            {
              name: result.client.name,
              email: result.client.email,
              id: result.client.id
            }
          );
        }
        break;
      
      case 'get_property_details':
        if (result.property) {
          ConversationStateManager.updateCurrentProperty(
            clientPhone,
            tenantId,
            result.property.id
          );
        }
        break;
      
      case 'send_property_media':
        if (result.property) {
          ConversationStateManager.updateCurrentProperty(
            clientPhone,
            tenantId,
            result.property.id
          );
        }
        break;
      
      case 'schedule_visit':
        if (result.visit) {
          ConversationStateManager.updateAfterVisitScheduled(
            clientPhone,
            tenantId,
            {
              visitId: result.visit.id,
              propertyId: result.visit.propertyId,
              scheduledDate: result.visit.scheduledDate,
              scheduledTime: result.visit.scheduledTime
            }
          );
          
          // CRM AUTO-UPDATE: Cliente agendou visita
          this.updateLeadStatusAuto(clientPhone, tenantId, 'visit_scheduled', 'Agendou visita');
        }
        break;
      
      case 'create_reservation':
        if (result.reservation) {
          ConversationStateManager.updateAfterReservation(
            clientPhone,
            tenantId,
            {
              reservationId: result.reservation.id,
              propertyId: result.reservation.propertyId,
              clientId: result.reservation.clientId,
              checkIn: result.reservation.checkIn,
              checkOut: result.reservation.checkOut,
              totalAmount: result.reservation.totalAmount,
              status: result.reservation.status
            }
          );
          
          // CRM AUTO-UPDATE: Cliente criou reserva
          this.updateLeadStatusAuto(clientPhone, tenantId, 'proposal_sent', 'Reserva criada - aguardando pagamento');
          
          // Registrar conversão para métricas em background
          setImmediate(async () => {
            try {
              const { AgentMonitor } = await import('@/lib/monitoring/agent-monitor');
              AgentMonitor.recordReservationConversion(tenantId, result.reservation.totalAmount);
            } catch (error) {
              // Fail silently para não afetar o fluxo principal
            }
          });
        }
        break;
      
      case 'create_transaction':
        if (result.transaction) {
          ConversationStateManager.updateAfterTransaction(
            clientPhone,
            tenantId,
            {
              transactionId: result.transaction.id,
              reservationId: result.transaction.reservationId,
              advanceAmount: result.transaction.advanceAmount,
              totalAmount: result.transaction.totalAmount,
              paymentMethod: result.transaction.paymentMethod,
              status: 'pending'
            }
          );
          
          // CRM AUTO-UPDATE: Cliente fechou negócio
          this.updateLeadStatusAuto(clientPhone, tenantId, 'won', 'Pagamento processado - lead convertido');
          
          // Registrar conversão de pagamento para métricas em background
          setImmediate(async () => {
            try {
              const { AgentMonitor } = await import('@/lib/monitoring/agent-monitor');
              AgentMonitor.recordPaymentConversion(tenantId);
            } catch (error) {
              // Fail silently para não afetar o fluxo principal
            }
          });
        }
        break;
    }
  }

  /**
   * Auto-atualizar status do lead no CRM (execução em background)
   */
  private updateLeadStatusAuto(
    clientPhone: string, 
    tenantId: string, 
    newStatus: string, 
    reason: string
  ): void {
    // Executar em background para não afetar performance da conversa
    setImmediate(async () => {
      try {
        const { updateLeadStatus } = await import('@/lib/ai/tenant-aware-agent-functions');
        
        const result = await updateLeadStatus({
          clientPhone: clientPhone,
          newStatus: newStatus,
          reason: reason,
          notes: `Auto-update via Sofia Agent: ${reason}`
        }, tenantId);

        if (result.success) {
          logger.info('🎯 [Sofia CRM] Lead status auto-atualizado', {
            clientPhone: clientPhone.substring(0, 6) + '***',
            tenantId,
            oldStatus: result.lead?.oldStatus,
            newStatus: newStatus,
            reason: reason
          });
          
          // Registrar métrica de update de lead
          const { AgentMonitor } = await import('@/lib/monitoring/agent-monitor');
          AgentMonitor.recordLeadUpdated(tenantId);
        } else {
          logger.warn('⚠️ [Sofia CRM] Falha no auto-update do lead', {
            clientPhone: clientPhone.substring(0, 6) + '***',
            tenantId,
            newStatus,
            error: result.error
          });
        }
      } catch (error) {
        logger.error('❌ [Sofia CRM] Erro no auto-update do lead', {
          clientPhone: clientPhone.substring(0, 6) + '***',
          tenantId,
          newStatus,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  /**
   * Gerar resposta de fallback quando função falha
   */
  private generateFallbackResponse(functionName: string, error?: string): string {
    const fallbackResponses: Record<string, string> = {
      'search_properties': 'Ops! Tive um probleminha ao buscar propriedades. Pode me confirmar as datas e quantas pessoas vão se hospedar? 😊',
      'calculate_price': 'Desculpe, não consegui calcular o preço agora. Pode me confirmar as datas de check-in e check-out? 📅',
      'create_reservation': 'Ops! Houve um problema ao criar a reserva. Vamos tentar novamente? Posso confirmar os dados? 🏠',
      'register_client': 'Tive uma dificuldade ao registrar seus dados. Pode me confirmar seu nome completo? 👤',
      'get_property_details': 'Não consegui acessar os detalhes desta propriedade agora. Quer ver outras opções? 🏠',
      'send_property_media': 'Ops! Não consegui enviar as fotos agora. Posso te contar sobre as comodidades? 📸',
      'schedule_visit': 'Tive um problema ao agendar a visita. Pode me confirmar a data e horário desejados? 📅',
      'create_transaction': 'Houve um problema ao processar o pagamento. Vamos tentar outro método? 💳'
    };

    const fallback = fallbackResponses[functionName] || 
      'Ops! Tive um pequeno problema técnico. Pode repetir sua solicitação? 🙏';
    
    logger.info('🔄 [Sofia] Fallback response gerada', {
      functionName,
      error: error?.substring(0, 50) + '...'
    });
    
    return fallback;
  }

  /**
   * Verificar se resultado da função está vazio
   */
  private isEmptyFunctionResult(functionName: string, result: any): boolean {
    switch (functionName) {
      case 'search_properties':
        return !result.properties || result.properties.length === 0;
      
      case 'get_property_details':
        return !result.property;
      
      case 'send_property_media':
        return !result.media || result.media.length === 0;
      
      case 'calculate_price':
        return !result.pricing || result.pricing.totalPrice == null;
        
      default:
        // Para outras funções, assumir que não está vazio se success = true
        return false;
    }
  }

  /**
   * Gerar resposta de fallback avançada usando FallbackSystem
   */
  private getAdvancedFallbackResponse(functionName: string, args: any, error?: string): FallbackResponse {
    // Usar o sistema de fallback avançado
    switch (functionName) {
      case 'search_properties':
        return FallbackSystem.handleEmptySearch(args);
      
      case 'get_property_details':
        return FallbackSystem.handleNoPropertiesForDetails();
      
      case 'send_property_media':
        return FallbackSystem.handleNoPropertiesForMedia();
      
      case 'calculate_price':
        return FallbackSystem.handleNoPropertiesForPrice();
      
      case 'schedule_visit':
      case 'check_visit_availability':
        return FallbackSystem.handleNoPropertiesForVisit();
      
      case 'create_reservation':
        return FallbackSystem.handleNoPropertiesForReservation();
      
      default:
        // Para funções não mapeadas, usar fallback genérico de erro
        return FallbackSystem.handleFunctionError(functionName, error || 'Unknown error');
    }
  }

  private generateContextualResponse(
    functionsExecuted: string[],
    actions: any[]
  ): string {
    const mainFunction = functionsExecuted[0];
    const mainResult = actions[0]?.result;
    
    // Verificar se alguma função falhou
    if (mainResult?.fallback) {
      return this.generateFallbackResponse(mainFunction, mainResult.error);
    }
    
    switch (mainFunction) {
      case 'search_properties':
        const properties = actions[0]?.result?.properties || [];
        const propCount = properties.length;
        
        if (propCount > 0) {
          let response = propCount === 1 
            ? `Encontrei uma opção perfeita para você! 🏠\n\n`
            : `Encontrei ${propCount} opções incríveis! 🏠✨\n\n`;
          
          properties.forEach((prop: any, index: number) => {
            response += `${index + 1}. **${prop.name}**\n`;
            response += `   📍 ${prop.location}\n`;
            response += `   🛏️ ${prop.bedrooms} quarto${prop.bedrooms > 1 ? 's' : ''} | 🚿 ${prop.bathrooms} banheiro${prop.bathrooms > 1 ? 's' : ''}\n`;
            response += `   👥 Até ${prop.maxGuests} hóspede${prop.maxGuests > 1 ? 's' : ''}\n`;
            response += `   💰 A partir de R$ ${prop.basePrice}/noite\n`;
            if (prop.amenities && prop.amenities.length > 0) {
              const amenitiesDisplay = prop.amenities.slice(0, 3).join(', ');
              response += `   ✨ ${amenitiesDisplay}`;
              if (prop.amenities.length > 3) {
                response += ` +${prop.amenities.length - 3}`;
              }
              response += '\n';
            }
            response += '\n';
          });
          
          response += propCount === 1 
            ? 'Gostou? Posso mostrar fotos ou calcular o valor para suas datas! 📸💰'
            : 'Qual te chamou mais atenção? Posso mostrar fotos, detalhes ou calcular preços! 📸';
          return response;
        } else {
          // Usar FallbackSystem para resultados vazios de busca
          const searchArgs = actions[0]?.result?.searchArgs || {};
          const fallbackResponse = FallbackSystem.handleEmptySearch(searchArgs);
          return fallbackResponse.reply;
        }
      
      case 'calculate_price':
        const priceResult = actions[0]?.result;
        if (priceResult?.pricing) {
          const { basePrice, nights, subtotal, cleaningFee, serviceFee, totalPrice } = priceResult.pricing;
          let response = `💰 **Cálculo Rápido**\n\n`;
          response += `📅 ${nights} noite${nights > 1 ? 's' : ''}\n`;
          response += `🏠 R$ ${basePrice}/noite × ${nights} = R$ ${subtotal}\n`;
          if (cleaningFee > 0) response += `🧹 Taxa limpeza: R$ ${cleaningFee}\n`;
          if (serviceFee > 0) response += `📋 Taxa serviço: R$ ${serviceFee}\n`;
          response += `\n💵 **Total: R$ ${totalPrice.toFixed(2)}**\n\n`;
          response += `Gostou do valor? Para um orçamento detalhado com possíveis descontos, é só pedir! 😊`;
          return response;
        } else {
          // Usar FallbackSystem para falha no cálculo de preço
          const fallbackResponse = FallbackSystem.handleNoPropertiesForPrice();
          return fallbackResponse.reply;
        }
      
      case 'create_reservation':
        const reservationResult = actions[0]?.result;
        if (reservationResult?.reservation) {
          const { propertyName, checkIn, checkOut, guests, totalPrice } = reservationResult.reservation;
          let response = `✅ **Reserva Confirmada!**\n\n`;
          response += `🏠 ${propertyName}\n`;
          response += `📅 ${new Date(checkIn).toLocaleDateString('pt-BR')} até ${new Date(checkOut).toLocaleDateString('pt-BR')}\n`;
          response += `👥 ${guests} hóspede${guests > 1 ? 's' : ''}\n`;
          if (totalPrice) {
            response += `💰 Valor total: R$ ${totalPrice.toFixed(2)}\n`;
          }
          response += `\nAgora vamos ao pagamento! Qual forma prefere?\n`;
          response += `• 💚 **PIX** (pode ter desconto!)\n`;
          response += `• 💳 **Cartão** de crédito/débito\n`;
          response += `• 💵 **Transferência** bancária\n\n`;
          response += `Me diz qual prefere que já preparo tudo! 😊`;
          return response;
        }
        return `✅ Reserva confirmada! Agora me diz: qual forma de pagamento prefere? PIX, cartão ou transferência? 💳`;
      
      case 'register_client':
        const clientResult = actions[0]?.result;
        if (clientResult?.client) {
          const { name, isNew } = clientResult.client;
          if (isNew) {
            return `Prazer, ${name}! 😊 Acabei de criar seu cadastro.\n\nAgora consigo personalizar ainda mais suas opções! Em que posso ajudar?`;
          } else {
            return `Oi ${name}! Que bom ter você de volta! 🎉\n\nJá tenho seu cadastro aqui. Como posso ajudar hoje?`;
          }
        }
        return `✅ Cadastro atualizado! Agora consigo te ajudar melhor. 😊`;
      
      case 'get_property_details':
        const details = actions[0]?.result?.property;
        if (details) {
          let response = `🏠 **${details.name}**\n\n`;
          response += `📍 ${details.location?.address}, ${details.location?.neighborhood}\n`;
          response += `🛏️ ${details.specs?.bedrooms} quartos | 🚿 ${details.specs?.bathrooms} banheiros\n`;
          response += `👥 Até ${details.specs?.maxGuests} hóspedes | 🏠 ${details.specs?.area}m²\n`;
          response += `💰 R$ ${details.pricing?.basePrice}/diária\n\n`;
          if (details.amenities?.length > 0) {
            response += `✨ **Comodidades:** ${details.amenities.slice(0, 5).join(', ')}\n\n`;
          }
          response += `Quer ver as fotos? 📸 Ou calcular o preço para suas datas?`;
          return response;
        } else {
          // Usar FallbackSystem para quando não há propriedade para mostrar detalhes
          const fallbackResponse = FallbackSystem.handleNoPropertiesForDetails();
          return fallbackResponse.reply;
        }
      
      case 'send_property_media':
        const media = actions[0]?.result;
        if (media?.media?.length > 0) {
          return `📸 Enviando ${media.mediaDescription} de **${media.property?.name}**! Que tal? Posso calcular preços ou agendar uma visita!`;
        } else {
          // Usar FallbackSystem para quando não há mídia para enviar
          const fallbackResponse = FallbackSystem.handleNoPropertiesForMedia();
          return fallbackResponse.reply;
        }
      
      case 'schedule_visit':
        const visit = actions[0]?.result?.visit;
        if (visit) {
          return `✅ **Visita agendada com sucesso!**\n\n📅 ${visit.scheduledDate}\n⏰ ${visit.scheduledTime}\n🏠 ${visit.propertyName}\n📍 ${visit.propertyAddress}\n\nConfirmarei todos os detalhes por WhatsApp! 😊`;
        } else {
          return `Visita agendada com sucesso! 📅 Em breve envio a confirmação.`;
        }
      
      case 'generate_quote':
        const quote = actions[0]?.result?.quote;
        if (quote) {
          let response = `💰 **Orçamento Detalhado**\n\n`;
          response += `🏠 **${actions[0]?.result?.property?.name}**\n`;
          response += `📅 ${quote.checkIn} até ${quote.checkOut} (${quote.nights} noites)\n`;
          response += `👥 ${quote.guests} hóspedes\n\n`;
          
          response += `💵 **Valores:**\n`;
          response += `• Hospedagem: R$ ${quote.pricing.subtotal.toFixed(2)}\n`;
          if (quote.pricing.cleaningFee > 0) {
            response += `• Taxa de limpeza: R$ ${quote.pricing.cleaningFee.toFixed(2)}\n`;
          }
          if (quote.pricing.extraGuestFee > 0) {
            response += `• Taxa hóspedes extras (${quote.pricing.extraGuests}): R$ ${quote.pricing.extraGuestFee.toFixed(2)}\n`;
          }
          response += `• Taxa de serviço: R$ ${quote.pricing.serviceFee.toFixed(2)}\n`;
          if (quote.pricing.paymentSurcharge > 0) {
            response += `• Taxa pagamento: R$ ${quote.pricing.paymentSurcharge.toFixed(2)}\n`;
          }
          
          response += `\n🎯 **TOTAL: R$ ${quote.pricing.totalPrice.toFixed(2)}**\n`;
          response += `📊 Média: R$ ${quote.averagePricePerNight}/noite\n\n`;
          
          if (quote.surcharges.weekend > 0 || quote.surcharges.holiday > 0) {
            response += `ℹ️ *Inclui acréscimos de `;
            const surcharges = [];
            if (quote.surcharges.weekend > 0) surcharges.push('fim de semana');
            if (quote.surcharges.holiday > 0) surcharges.push('feriados');
            if (quote.surcharges.seasonal > 0) surcharges.push('alta temporada');
            response += surcharges.join(' e ') + '*\n\n';
          }
          
          response += `Confirma esse orçamento para prosseguirmos? 😊`;
          return response;
        } else {
          return `Orçamento calculado! 💰 Consulte os valores e me avise se está de acordo.`;
        }
      
      case 'classify_lead':
        const leadData = actions[0]?.result?.lead;
        if (leadData) {
          const statusLabels = {
            'new': 'Novo',
            'contacted': 'Contatado',
            'qualified': 'Qualificado',
            'opportunity': 'Oportunidade',
            'negotiation': 'Negociação'
          };
          
          if (leadData.isNewLead) {
            return `👋 Prazer em conhecer! Já te cadastrei como ${statusLabels[leadData.status as keyof typeof statusLabels] || leadData.status}. Como posso te ajudar hoje?`;
          } else {
            return `📊 Perfil atualizado! Score: ${leadData.score}/100 | Status: ${statusLabels[leadData.status as keyof typeof statusLabels] || leadData.status}`;
          }
        }
        return `Perfil do cliente atualizado no sistema! 📊`;
      
      case 'update_lead_status':
        const leadUpdate = actions[0]?.result?.lead;
        if (leadUpdate) {
          return `✅ Status atualizado: ${leadUpdate.oldStatus} → ${leadUpdate.newStatus} | Score: ${leadUpdate.score}/100`;
        }
        return `Status do lead atualizado com sucesso! 📈`;
      
      case 'create_transaction':
        const transaction = actions[0]?.result?.transaction;
        const paymentInstructions = actions[0]?.result?.paymentInstructions;
        if (transaction) {
          let response = `💳 **Transação Criada com Sucesso!**\n\n`;
          response += `🏠 ${transaction.propertyName}\n`;
          response += `👤 ${transaction.clientName}\n\n`;
          
          response += `💰 **Detalhes Financeiros:**\n`;
          response += `• Valor total: R$ ${transaction.totalAmount.toFixed(2)}\n`;
          response += `• Entrada (${transaction.advancePercentage}%): R$ ${transaction.advanceAmount.toFixed(2)}\n`;
          if (transaction.discount > 0) {
            response += `• Desconto ${transaction.paymentMethod.toUpperCase()}: R$ ${transaction.discount.toFixed(2)}\n`;
          }
          response += `• Restante: R$ ${transaction.remainingAmount.toFixed(2)}\n`;
          response += `• Vencimento: ${paymentInstructions?.dueDate}\n\n`;
          
          response += `🔸 **Forma de Pagamento: ${transaction.paymentMethod.toUpperCase()}**\n`;
          
          if (paymentInstructions?.pixKey) {
            response += `📱 PIX: ${paymentInstructions.pixKey}\n`;
          }
          
          if (paymentInstructions?.bankDetails) {
            response += `🏦 Banco: ${paymentInstructions.bankDetails.bank}\n`;
            response += `🏦 Agência: ${paymentInstructions.bankDetails.agency}\n`;
            response += `🏦 Conta: ${paymentInstructions.bankDetails.account}\n`;
          }
          
          response += `\n✅ Pagamento pendente. Confirmarei assim que receber o comprovante!`;
          return response;
        } else {
          return `Transação financeira criada! 💳 Em breve envio os detalhes do pagamento.`;
        }
      
      default:
        return `Pronto! Executei as ações necessárias. 😊`;
    }
  }

  private createSimpleSummary(tenantId: string, clientPhone: string): any {
    const conversationState = ConversationStateManager.getState(clientPhone, tenantId);
    const stateSummary = ConversationStateManager.getStateSummary(clientPhone, tenantId);
    
    return {
      ...stateSummary,
      tenantId,
      timestamp: new Date().toISOString()
    };
  }

  private async saveMessageHistory(
    input: SofiaInput,
    reply: string,
    tokensUsed: number
  ): Promise<void> {
    try {
      await conversationContextService.saveMessage(
        input.clientPhone,
        input.tenantId,
        { role: 'user', content: input.message }
      );

      await conversationContextService.saveMessage(
        input.clientPhone,
        input.tenantId,
        { role: 'assistant', content: reply, tokensUsed }
      );
    } catch (error) {
      logger.error('❌ [Sofia MVP] Erro ao salvar histórico', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private getLoopFallbackMessage(functionName: string): string {
    switch (functionName) {
      case 'search_properties':
        return `Já te mostrei as propriedades disponíveis! 😊 Qual te chamou mais atenção?`;
      case 'calculate_price':
        return `Já calculei o preço! 💰 Quer recalcular para outras datas?`;
      case 'get_property_details':
        return `Já te passei os detalhes! 📋 Tem alguma dúvida específica?`;
      case 'send_property_media':
        return `Acabei de enviar as fotos! 📸 Gostou do que viu?`;
      case 'schedule_visit':
        return `Sua visita já está agendada! 📅 Confirmarei os detalhes em breve.`;
      case 'generate_quote':
        return `Já calculei esse orçamento! 💰 Quer recalcular para outras datas?`;
      case 'classify_lead':
        return `Cliente já classificado no sistema! 📊 Como posso ajudar mais?`;
      case 'update_lead_status':
        return `Status do lead já atualizado! 📈 Algo mais que posso fazer?`;
      case 'create_transaction':
        return `Transação já criada! 💳 Assim que efetivar o pagamento, confirmarei sua reserva.`;
      default:
        return `Acabamos de fazer essa ação! 😊 Em que mais posso ajudar?`;
    }
  }

  // NOVO MÉTODO: Processar com Enhanced Detection
  private async processWithEnhancedDetection(
    input: SofiaInput, 
    context: SmartSummary, 
    conversationId: string
  ): Promise<SofiaResponse | null> {
    const startTime = Date.now();
    
    try {
      // 1. Detectar intenção com LangChain
      const enhancedIntent = await enhancedIntentDetector.detectIntent({
        message: input.message,
        conversationContext: context,
        tenantId: input.tenantId,
        clientPhone: input.clientPhone
      });

      // 2. Se confiança baixa, usar método original
      if (!enhancedIntent.function || enhancedIntent.confidence < ENHANCED_INTENT_CONFIG.confidenceThreshold) {
        logger.info('⚠️ [Sofia Enhanced] Confiança baixa, usando fallback', {
          function: enhancedIntent.function,
          confidence: enhancedIntent.confidence,
          threshold: ENHANCED_INTENT_CONFIG.confidenceThreshold
        });
        return null; // Vai usar método original
      }

      // 3. Executar função detectada
      logger.info('🔧 [Sofia Enhanced] Executando função detectada', {
        function: enhancedIntent.function,
        confidence: enhancedIntent.confidence,
        parameters: Object.keys(enhancedIntent.parameters)
      });

      const functionResult = await executeTenantAwareFunction(
        enhancedIntent.function,
        enhancedIntent.parameters,
        input.tenantId,
        input.clientPhone
      );

      if (!functionResult.success) {
        logger.error('❌ [Sofia Enhanced] Falha na execução da função', {
          function: enhancedIntent.function,
          error: functionResult.error
        });
        return null; // Fallback para método original
      }

      // Rastrear execução da função
      await sofiaAnalytics.trackFunctionCall(
        input.tenantId,
        conversationId,
        enhancedIntent.function,
        functionResult
      );

      // 4. Gerar resposta humanizada mantendo personalidade
      const humanizedResponse = await this.generateHumanizedResponse(
        functionResult,
        input,
        enhancedIntent,
        context
      );

      // 5. Atualizar contexto
      await this.updateContextWithEnhancedResult(
        input.clientPhone,
        input.tenantId,
        enhancedIntent,
        functionResult
      );

      const responseTime = Date.now() - startTime;

      logger.info('✅ [Sofia Enhanced] Processamento concluído com sucesso', {
        function: enhancedIntent.function,
        confidence: enhancedIntent.confidence,
        responseTime: `${responseTime}ms`
      });

      // Atualizar summary com resultado
      const updatedSummary = await smartSummaryService.updateSummaryWithFunctionResult(
        context,
        enhancedIntent.function,
        enhancedIntent.parameters,
        functionResult
      );
      
      // Salvar no cache
      // Cache removido - usando apenas ConversationContextService

      // 6. SALVAR HISTÓRICO DE MENSAGENS (CRÍTICO PARA MEMÓRIA!)
      await this.saveMessageHistory(input, humanizedResponse, 0);

      logger.info('💾 [Sofia Enhanced] Mensagens salvas no histórico', {
        clientPhone: this.maskPhone(input.clientPhone),
        tenantId: input.tenantId.substring(0, 8) + '***'
      });

      return {
        reply: humanizedResponse,
        summary: updatedSummary,
        actions: [{
          type: enhancedIntent.function,
          parameters: enhancedIntent.parameters,
          result: functionResult
        }],
        tokensUsed: 0,
        responseTime,
        functionsExecuted: [enhancedIntent.function],
        metadata: {
          stage: 'enhanced_detection',
          confidence: enhancedIntent.confidence,
          reasoningUsed: false,
          enhancedDetection: true,
          detectionConfidence: enhancedIntent.confidence,
          detectedFunction: enhancedIntent.function
        }
      };

    } catch (error) {
      logger.error('🚨 [Sofia Enhanced] Erro crítico', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return null; // Fallback para método original
    }
  }

  // NOVO MÉTODO: Gerar resposta humanizada
  private async generateHumanizedResponse(
    functionResult: any,
    input: SofiaInput,
    intent: EnhancedIntentResult,
    context: SmartSummary
  ): Promise<string> {
    
    // Hard-coded response for simple initial messages to avoid OpenAI confusion
    const simpleMessagePatterns = [
      'quero um imovel',
      'quero um imóvel', 
      'preciso de um imovel',
      'preciso de um imóvel',
      'quero alugar',
      'quero um apartamento',
      'quero uma casa',
      'procuro um imovel',
      'procuro um imóvel',
      'busco um imovel',
      'busco um imóvel',
      'to procurando',
      'tô procurando',
      'estou procurando',
      'gostaria de alugar',
      'preciso alugar',
      'quero reservar',
      'interesse em',
      'tenho interesse'
    ];
    
    const normalizedMessage = input.message.toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' '); // Normaliza espaços
    
    logger.info('🔍 [Sofia] Verificando mensagem para hard-coded response', {
      originalMessage: input.message,
      normalizedMessage,
      matchesAny: simpleMessagePatterns.some(pattern => normalizedMessage.includes(pattern))
    });
    
    // Verificar se algum padrão simples está presente
    if (simpleMessagePatterns.some(pattern => normalizedMessage.includes(pattern))) {
      logger.info('✅ [Sofia] Usando resposta hard-coded para mensagem inicial');
      return "Olá, perfeito! Estou aqui para te ajudar. Pode me dar mais alguns detalhes como número de hóspedes, data de check-in e check-out, preferência por ar-condicionado nos quartos, piscina? 😊";
    }
    
    const humanizationPrompt = `
PERSONALIDADE: Sofia - atendente imobiliária super simpática, descontraída, eficiente e genuinamente prestativa.

TAREFA: Transformar o resultado da função em uma resposta NATURAL, HUMANIZADA e CONVERSACIONAL.

CONTEXTO:
- Função executada: ${intent.function}
- Confiança da detecção: ${intent.confidence}  
- Mensagem original: "${input.message}"
- Resultado da função: ${JSON.stringify(functionResult.data)}

🚫 REGRA ABSOLUTA - JAMAIS QUEBRAR:
NUNCA, EM HIPÓTESE ALGUMA, PERGUNTE SOBRE:
- Localização, região, cidade, bairro, zona
- Tipo de imóvel (apartamento, casa, etc.) se não foi mencionado
- "Onde você gostaria", "qual região", "que bairro"
- "Em que cidade", "qual localização", "onde procura"

✅ SEMPRE FOQUE APENAS EM:
- Datas de check-in e check-out
- Número de hóspedes/pessoas
- Comodidades específicas (piscina, ar-condicionado, churrasqueira)

EXEMPLO OBRIGATÓRIO PARA MENSAGENS INICIAIS:
Se a mensagem for similar a "quero um imóvel" ou variações:
RESPOSTA OBRIGATÓRIA: "Olá, perfeito! Estou aqui para te ajudar. Pode me dar mais alguns detalhes como número de hóspedes, data de check-in e check-out, preferência por ar-condicionado nos quartos, piscina? 😊"

🔥 DIRETRIZES CRÍTICAS:
✅ Seja NATURAL e CONVERSACIONAL 
✅ Use emojis moderadamente
✅ Mantenha tom brasileiro descontraído  
✅ Foque SEMPRE em: datas → hóspedes → comodidades
✅ Seja proativa e útil

❌ RESPOSTAS PROIBIDAS - NUNCA USE:
❌ "Que legal! Em que região você está pensando?"
❌ "Conta pra mim, você tem alguma localização em mente?"
❌ "Onde você gostaria de ficar?"
❌ "Que tipo de imóvel você procura?"
❌ Qualquer variação dessas perguntas

FOCO ABSOLUTO: Datas + Hóspedes + Comodidades APENAS!

RESPOSTA HUMANIZADA (sem mencionar localização):
`;

    try {
      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: humanizationPrompt },
          { role: 'user', content: `Mensagem original: "${input.message}"\n\n🚫 ALERTA CRÍTICO: JAMAIS PERGUNTE SOBRE LOCALIZAÇÃO!\n\n✅ FOQUE APENAS EM:\n- Datas de check-in/check-out\n- Número de hóspedes\n- Comodidades (ar-condicionado, piscina, etc.)\n\n❌ PROIBIDO:\n- Perguntar sobre região, cidade, bairro\n- Perguntar sobre tipo de imóvel\n- Usar frases como "onde você gostaria", "que região"\n\nPara mensagens iniciais simples como "quero um imóvel", use EXATAMENTE:\n"Olá, perfeito! Estou aqui para te ajudar. Pode me dar mais alguns detalhes como número de hóspedes, data de check-in e check-out, preferência por ar-condicionado nos quartos, piscina? 😊"\n\nGere a resposta seguindo RIGOROSAMENTE as diretrizes:` }
        ],
        max_tokens: 300,
        temperature: 0.1
      });
      
      return completion.choices[0]?.message?.content || this.generateBasicHumanResponse(functionResult, intent.function!);
      
    } catch (error) {
      logger.error('❌ [Sofia Enhanced] Erro na humanização', { error });
      
      // Fallback para resposta básica mas humanizada
      return this.generateBasicHumanResponse(functionResult, intent.function!);
    }
  }

  // NOVO MÉTODO: Atualizar contexto com resultado enhanced
  private async updateContextWithEnhancedResult(
    clientPhone: string,
    tenantId: string,
    intent: EnhancedIntentResult,
    functionResult: any
  ): Promise<void> {
    try {
      const contextUpdate = {
        lastIntent: intent.function,
        lastIntentConfidence: intent.confidence,
        lastFunctionResult: functionResult.success,
        enhancedDetectionUsed: true,
        timestamp: new Date()
      };

      // Usar o ConversationContextService para atualizar
      await conversationContextService.updateContext(clientPhone, tenantId, contextUpdate);
      
    } catch (error) {
      logger.error('❌ [Sofia Enhanced] Erro ao atualizar contexto', { error });
      // Não bloquear o fluxo por erro de contexto
    }
  }

  // NOVO MÉTODO: Gerar resposta básica humanizada
  private generateBasicHumanResponse(functionResult: any, functionName: string): string {
    const responses: Record<string, string> = {
      search_properties: "Opa! Encontrei algumas opções legais pra você! 😊",
      calculate_price: "Pronto! Calculei o preço pra você! 💰",
      get_property_details: "Aqui estão os detalhes que você pediu! 🏠",
      send_property_media: "Vou te enviar as fotos agora! 📸",
      create_reservation: "Perfeito! Vamos finalizar sua reserva! ✅",
      register_client: "Ótimo! Cadastro realizado com sucesso! 👍",
      schedule_visit: "Show! Vamos agendar sua visita! 📅",
      check_availability: "Deixa eu verificar a disponibilidade pra você! 🔍",
      get_contact_info: "Aqui estão as informações de contato! 📞",
      cancel_reservation: "Entendi, vou cancelar a reserva pra você! ❌",
      modify_reservation: "Beleza! Vou ajustar sua reserva! ✏️",
      get_policies: "Aqui estão as políticas e regras! 📋"
    };

    return responses[functionName] || "Prontinho! Consegui processar sua solicitação! 😊";
  }

  private getNoExecutionFallback(functionName: string, state: ConversationState): string {
    // Usar FallbackSystem avançado para quando a função não é executada
    if (state.lastPropertyIds.length === 0) {
      switch (functionName) {
        case 'get_property_details':
          return FallbackSystem.handleNoPropertiesForDetails().reply;
        case 'calculate_price':
          return FallbackSystem.handleNoPropertiesForPrice().reply;
        case 'send_property_media':
          return FallbackSystem.handleNoPropertiesForMedia().reply;
        case 'schedule_visit':
          return FallbackSystem.handleNoPropertiesForVisit().reply;
        case 'create_reservation':
          return FallbackSystem.handleNoPropertiesForReservation().reply;
        default:
          return FallbackSystem.handleNoFunctionExecuted('Gostaria de encontrar um imóvel').reply;
      }
    }
    
    return `Em que posso te ajudar? Posso mostrar detalhes, calcular preços ou agendar visitas! 😊`;
  }

  private handleError(
    error: any,
    input: SofiaInput,
    startTime: number,
    intentDetected: DetectedIntent | null,
    loopPrevented: boolean,
    fallbackUsed: boolean
  ): SofiaResponse {
    const responseTime = Date.now() - startTime;

    logger.error('❌ [Sofia] Erro no processamento', {
      error: error instanceof Error ? error.message : (error ? String(error) : 'Unknown error'),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      clientPhone: this.maskPhone(input.clientPhone),
      responseTime: `${responseTime}ms`
    });

    // Usar summary vazio para erro - evitar outro await que pode falhar
    const fallbackSummary = smartSummaryService.createEmptySummary();

    return {
      reply: 'Ops! Probleminha técnico. Pode repetir sua mensagem? 🙏',
      summary: fallbackSummary,
      actions: [],
      tokensUsed: 0,
      responseTime,
      functionsExecuted: [],
      metadata: {
        stage: 'error',
        confidence: 0,
        reasoningUsed: false,
        intentDetected,
        loopPrevented,
        fallbackUsed: true
      }
    };
  }

  private getContextualFallback(message: string, state: ConversationState): string {
    const lowerMessage = message.toLowerCase();
    
    // Saudações
    if (lowerMessage.includes('oi') || lowerMessage.includes('olá') || lowerMessage.includes('bom dia') || 
        lowerMessage.includes('boa tarde') || lowerMessage.includes('boa noite')) {
      if (state.clientInfo?.name) {
        return `Oi ${state.clientInfo.name}! 😊 Como posso ajudar você hoje?`;
      }
      return `Oi! Seja bem-vindo! 😊 Sou a Sofia, sua consultora de imóveis. Em que posso ajudar?`;
    }
    
    // Agradecimentos
    if (lowerMessage.includes('obrigad') || lowerMessage.includes('valeu') || lowerMessage.includes('thanks')) {
      return `Por nada! 😊 Estou aqui sempre que precisar. Algo mais em que posso ajudar?`;
    }
    
    // Dúvidas genéricas
    if (lowerMessage.includes('?')) {
      if (state.lastPropertyIds.length > 0) {
        return `Ótima pergunta! Sobre qual das propriedades você quer saber mais? Ou prefere ver outras opções? 🏠`;
      }
      return `Claro! Me conta mais detalhes para eu poder ajudar melhor. Que tipo de imóvel você procura? 😊`;
    }
    
    // Fallback genérico baseado no estado
    if (state.lastPropertyIds.length > 0) {
      return `Legal! Sobre as propriedades que mostrei, você quer:\n• Ver fotos 📸\n• Calcular preços 💰\n• Conhecer mais detalhes 📋\n• Ver outras opções 🔍\n\nO que prefere?`;
    }
    
    // Usar FallbackSystem para quando GPT não consegue processar a mensagem
    return FallbackSystem.handleNoFunctionExecuted(message).reply;
  }

  /**
   * Detecta se a mensagem parece ser do próprio bot
   */
  private isBotMessage(message: string): boolean {
    const botPatterns = [
      /olá.{0,20}sofia/i,
      /sou.{0,20}sofia/i,
      /como.{0,20}posso.{0,20}ajud/i,
      /encontrei.{0,20}propriedades/i,
      /calculei.{0,20}pre[çc]o/i,
      /aqui.{0,20}est[ãá].{0,20}pre[çc]o/i,
      /para.{0,20}mais.{0,20}informa[çc][õo]es/i,
      /gostaria.{0,20}de.{0,20}agendar/i,
      /reserva.{0,20}confirmada/i,
      /WhatsApp.*Bot/i,
      /Mensagem.{0,20}automática/i,
      /Bot.{0,20}AlugZap/i,
      /Sofia.{0,20}AI/i
    ];

    // Verificar padrões específicos do bot
    const containsBotPattern = botPatterns.some(pattern => pattern.test(message));
    
    // Verificar se contém muitos emojis (típico de respostas do bot)
    const emojiCount = (message.match(/[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}]/gu) || []).length;
    const hasLotsOfEmojis = emojiCount > 3 && message.length < 200;
    
    // Verificar se contém formatação típica de bot (bullets, listas)
    const hasTypicalBotFormatting = /[•\-\*]\s+.+(\n[•\-\*]\s+.+){2,}/g.test(message);
    
    return containsBotPattern || hasLotsOfEmojis || hasTypicalBotFormatting;
  }

  /**
   * Detecta mensagens suspeitas ou repetitivas
   */
  // ===== ANTI-SPAM E DETECÇÃO DE REPETIÇÃO =====

  private checkForRepetitiveMessage(message: string, clientPhone: string): {
    isRepetitive: boolean;
    isExactMatch: boolean;
    similarity: number;
    reason: string;
  } {
    const key = `${clientPhone}`;
    const recentMessages = this.recentMessages.get(key) || [];
    const now = Date.now();
    
    // Limpar mensagens antigas
    const validMessages = recentMessages.filter(
      msg => now - msg.timestamp < this.REPETITION_TIME_WINDOW
    );
    
    if (validMessages.length === 0) {
      return { isRepetitive: false, isExactMatch: false, similarity: 0, reason: '' };
    }

    const normalizedCurrent = this.normalizeMessage(message);
    
    // Verificar match exato
    const exactMatch = validMessages.find(msg => 
      msg.normalized === normalizedCurrent
    );
    
    if (exactMatch) {
      return {
        isRepetitive: true,
        isExactMatch: true,
        similarity: 1.0,
        reason: 'Mensagem idêntica enviada recentemente'
      };
    }

    // Verificar similaridade alta
    let maxSimilarity = 0;
    for (const recentMsg of validMessages) {
      const similarity = this.calculateSimilarity(normalizedCurrent, recentMsg.normalized);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    }

    if (maxSimilarity > this.SIMILARITY_THRESHOLD) {
      return {
        isRepetitive: true,
        isExactMatch: false,
        similarity: maxSimilarity,
        reason: `Mensagem muito similar (${Math.round(maxSimilarity * 100)}%)`
      };
    }

    return { isRepetitive: false, isExactMatch: false, similarity: maxSimilarity, reason: '' };
  }

  private addToRecentMessages(message: string, clientPhone: string): void {
    const key = `${clientPhone}`;
    const recentMessages = this.recentMessages.get(key) || [];
    const now = Date.now();
    
    // Adicionar nova mensagem
    recentMessages.push({
      message: message,
      timestamp: now,
      normalized: this.normalizeMessage(message)
    });
    
    // Manter apenas as mensagens mais recentes
    const validMessages = recentMessages
      .filter(msg => now - msg.timestamp < this.REPETITION_TIME_WINDOW)
      .slice(-this.MAX_RECENT_MESSAGES);
    
    this.recentMessages.set(key, validMessages);
  }

  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .substring(0, 100); // Limita tamanho
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    // Levenshtein distance simplificado
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private isSuspiciousMessage(message: string, clientPhone: string): boolean {
    const now = Date.now();
    const historyKey = `${clientPhone}`;
    const history = this.messageHistory.get(historyKey) || [];
    
    // Limpar histórico antigo (últimas 5 minutos)
    const recentHistory = history.filter(entry => now - entry.timestamp < 300000);
    
    // Verificar se a mesma mensagem foi enviada recentemente
    const hasDuplicate = recentHistory.some(entry => 
      entry.message === message && now - entry.timestamp < 30000 // 30 segundos
    );
    
    // Verificar muitas mensagens em pouco tempo
    const recentCount = recentHistory.filter(entry => now - entry.timestamp < 60000).length; // 1 minuto
    const isTooFrequent = recentCount > 10;
    
    // Verificar mensagem muito curta e repetitiva
    const isTooShort = message.trim().length < 3 && recentCount > 3;
    
    // Atualizar histórico
    recentHistory.push({ message, timestamp: now });
    this.messageHistory.set(historyKey, recentHistory.slice(-20)); // Manter apenas últimas 20
    
    if (hasDuplicate || isTooFrequent || isTooShort) {
      logger.warn('🚨 [Sofia] Mensagem suspeita detectada', {
        clientPhone: this.maskPhone(clientPhone),
        hasDuplicate,
        isTooFrequent,
        isTooShort,
        recentCount,
        messageLength: message.length
      });
      return true;
    }
    
    return false;
  }

  private maskPhone(phone: string): string {
    if (phone.length > 4) {
      return phone.substring(0, 4) + '***' + phone.substring(phone.length - 2);
    }
    return phone;
  }

  // Método para limpar contexto do cliente
  async clearClientContext(clientPhone: string, tenantId: string): Promise<void> {
    logger.info('🗑️ [Sofia MVP] Limpando contexto do cliente', {
      clientPhone: this.maskPhone(clientPhone),
      tenantId
    });

    ConversationStateManager.clearState(clientPhone, tenantId);
    loopPrevention.clearClientHistory(clientPhone);
    
    try {
      await conversationContextService.clearClientContext(clientPhone, tenantId);
    } catch (error) {
      logger.error('❌ Erro ao limpar contexto do serviço', { error });
    }
  }
}

// Export da instância singleton
export const sofiaAgent = SofiaAgent.getInstance();