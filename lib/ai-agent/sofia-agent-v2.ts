// sofia-agent-v2.ts
// Nova versão simplificada com contexto eficiente

import { OpenAI } from 'openai';
import { getTenantAwareOpenAIFunctions, executeTenantAwareFunction } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { SOFIA_PROMPT } from './sofia-prompt';
import { SimpleContextManager } from '@/lib/context/simple-context-manager';
import { sofiaAnalytics } from '@/lib/services/sofia-analytics-service';
import { enhancedIntentDetector, type EnhancedIntentResult } from './enhanced-intent-detector';
import { ENHANCED_INTENT_CONFIG } from '@/lib/config/enhanced-intent-config';

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
  actions?: any[];
  tokensUsed: number;
  responseTime: number;
  functionsExecuted: string[];
  metadata: {
    stage: string;
    confidence: number;
    reasoningUsed: boolean;
    contextSummary: string;
  };
}

export class SofiaAgentV2 {
  private openai: OpenAI;
  private static instance: SofiaAgentV2;
  private contextManager: SimpleContextManager;

  constructor() {
    this.contextManager = SimpleContextManager.getInstance();
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

  static getInstance(): SofiaAgentV2 {
    if (!SofiaAgentV2.instance) {
      SofiaAgentV2.instance = new SofiaAgentV2();
      logger.info('🚀 [Sofia V2] Instância criada');
    }
    return SofiaAgentV2.instance;
  }

  async processMessage(input: SofiaInput): Promise<SofiaResponse> {
    const startTime = Date.now();
    const functionsExecuted: string[] = [];
    let tokensUsed = 0;

    try {
      logger.info('🚀 [Sofia V2] Iniciando processamento', {
        clientPhone: input.clientPhone.substring(0, 7) + '***',
        tenantId: input.tenantId.substring(0, 8) + '***',
        messageLength: input.message.length
      });

      // 1. Analytics tracking
      try {
        await sofiaAnalytics.startConversation(
          input.tenantId,
          `conv_${input.tenantId}_${input.clientPhone}`,
          input.clientPhone
        );
        logger.debug('✅ [Sofia V2] Analytics tracking ok');
      } catch (error) {
        logger.warn('⚠️ [Sofia V2] Analytics falhou', {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // 2. Carregar contexto
      logger.debug('🔍 [Sofia V2] Carregando contexto...');
      const context = await this.contextManager.getContext(input.clientPhone, input.tenantId);
      const contextSummary = this.contextManager.getContextSummary(context);
      logger.debug('✅ [Sofia V2] Contexto carregado', {
        stage: context.stage,
        summary: contextSummary
      });

      logger.info('💬 [Sofia V2] Processando mensagem', {
        clientPhone: input.clientPhone.substring(0, 7) + '***',
        stage: context.stage,
        contextSummary
      });

      // 3. Tentar Enhanced Intent Detection primeiro
      if (ENHANCED_INTENT_CONFIG.enabled) {
        try {
          const enhancedResult = await enhancedIntentDetector.detectIntent({
            message: input.message,
            conversationContext: context,
            tenantId: input.tenantId,
            clientPhone: input.clientPhone
          });

          if (enhancedResult.confidence >= ENHANCED_INTENT_CONFIG.confidenceThreshold) {
            logger.info('🎯 [Sofia V2] Enhanced Intent detectado', {
              function: enhancedResult.function,
              confidence: enhancedResult.confidence
            });

            const functionResult = await executeTenantAwareFunction(
              enhancedResult.function!,
              enhancedResult.parameters || {},
              input.tenantId
            );

            functionsExecuted.push(enhancedResult.function!);

            // Atualizar contexto baseado na função executada
            await this.updateContextFromFunction(
              input.clientPhone,
              input.tenantId,
              enhancedResult.function!,
              enhancedResult.parameters || {},
              functionResult
            );

            const reply = this.generateReplyFromFunction(
              enhancedResult.function!,
              functionResult,
              context
            );

            // Salvar mensagens
            await this.contextManager.addMessage(input.clientPhone, input.tenantId, 'user', input.message);
            await this.contextManager.addMessage(input.clientPhone, input.tenantId, 'assistant', reply);

            return {
              reply,
              tokensUsed: 0, // Enhanced não usa tokens para função
              responseTime: Date.now() - startTime,
              functionsExecuted,
              metadata: {
                stage: context.stage,
                confidence: enhancedResult.confidence,
                reasoningUsed: false,
                contextSummary
              }
            };
          }
        } catch (error) {
          logger.warn('⚠️ [Sofia V2] Enhanced Intent falhou, usando GPT', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // 4. Fallback para GPT tradicional
      const reply = await this.processWithGPT(input, context);
      tokensUsed = 5000; // Estimativa

      // Salvar mensagens
      await this.contextManager.addMessage(input.clientPhone, input.tenantId, 'user', input.message);
      await this.contextManager.addMessage(input.clientPhone, input.tenantId, 'assistant', reply);

      return {
        reply,
        tokensUsed,
        responseTime: Date.now() - startTime,
        functionsExecuted,
        metadata: {
          stage: context.stage,
          confidence: 0.7,
          reasoningUsed: true,
          contextSummary
        }
      };

    } catch (error) {
      logger.error('❌ [Sofia V2] Erro no processamento', {
        clientPhone: input.clientPhone.substring(0, 7) + '***',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        reply: 'Desculpe, tive um problema técnico. Pode repetir sua mensagem?',
        tokensUsed: 0,
        responseTime: Date.now() - startTime,
        functionsExecuted,
        metadata: {
          stage: 'error',
          confidence: 0,
          reasoningUsed: false,
          contextSummary: 'erro'
        }
      };
    }
  }

  private async updateContextFromFunction(
    clientPhone: string,
    tenantId: string,
    functionName: string,
    parameters: any,
    result: any
  ): Promise<void> {
    const updates: any = {};

    // Extrair dados dos parâmetros da função
    if (parameters.guests && parameters.guests > 0) {
      updates.guests = parameters.guests;
    }
    if (parameters.check_in) {
      updates.checkIn = parameters.check_in;
    }
    if (parameters.check_out) {
      updates.checkOut = parameters.check_out;
    }
    if (parameters.client_name) {
      updates.clientName = parameters.client_name;
    }
    if (parameters.amenities) {
      updates.amenities = Array.isArray(parameters.amenities) ? parameters.amenities : [parameters.amenities];
    }

    // Atualizar stage baseado na função
    if (functionName === 'search_properties') {
      updates.stage = 'presenting';
      if (result?.properties?.length > 0) {
        updates.propertiesShown = result.properties.map((p: any) => p.id).slice(0, 5);
      }
    } else if (functionName === 'calculate_price') {
      updates.stage = 'pricing';
    } else if (functionName === 'create_reservation') {
      updates.stage = 'booking';
    }

    if (Object.keys(updates).length > 0) {
      await this.contextManager.updateContext(clientPhone, tenantId, updates);
      
      logger.debug('📋 [Sofia V2] Contexto atualizado via função', {
        functionName,
        updates: Object.keys(updates)
      });
    }
  }

  private generateReplyFromFunction(functionName: string, result: any, context: any): string {
    switch (functionName) {
      case 'search_properties':
        if (result?.properties?.length > 0) {
          const count = result.properties.length;
          const guest_text = context.guests ? ` para ${context.guests} pessoas` : '';
          return `Perfeito! Encontrei ${count} opções${guest_text}. Vou te mostrar as melhores:\n\n${result.properties.slice(0, 3).map((p: any, i: number) => {
            // Corrigir preço undefined
            const price = p.pricePerNight || p.basePrice || 0;
            const priceText = price > 0 ? `R$ ${price}` : 'Consulte';
            
            return `${i + 1}. **${p.name}**\n📍 ${p.location}\n💰 A partir de ${priceText}/noite\n🏠 ${p.bedrooms} quartos, ${p.bathrooms} banheiros\n${p.amenities?.slice(0, 3).join(', ') || ''}\n`;
          }).join('\n')}Gostaria de ver fotos ou calcular preços para suas datas?`;
        } else {
          return 'Não encontrei propriedades com esses critérios. Pode me dar mais detalhes sobre o que procura?';
        }

      case 'calculate_price':
        if (result?.totalPrice) {
          return `💰 **Orçamento calculado:**\n\nValor total: **R$ ${result.totalPrice}**\n${result.breakdown || ''}\n\nGostaria de fazer a reserva ou tem alguma dúvida?`;
        } else {
          return 'Não consegui calcular o preço. Pode me confirmar as datas e número de pessoas?';
        }

      case 'get_property_details':
        if (result?.property) {
          const p = result.property;
          return `🏠 **${p.name}**\n\n📍 ${p.location}\n💰 R$ ${p.pricePerNight}/noite\n🏠 ${p.bedrooms} quartos, ${p.bathrooms} banheiros\n\n✨ **Comodidades:**\n${p.amenities?.join(', ') || 'Informações não disponíveis'}\n\nGostaria de ver fotos ou agendar uma visita?`;
        }
        break;

      default:
        return 'Perfeito! Como posso ajudar com mais alguma coisa?';
    }

    return 'Como posso ajudar você?';
  }

  private async processWithGPT(input: SofiaInput, context: any): Promise<string> {
    const contextPrompt = this.buildContextPrompt(context);
    
    const messages = [
      { role: 'system' as const, content: SOFIA_PROMPT + '\n\n' + contextPrompt },
      ...context.recentMessages.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: input.message }
    ];

    const completion = await this.getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
      functions: getTenantAwareOpenAIFunctions(input.tenantId)
    });

    const response = completion.choices[0]?.message?.content || 'Como posso ajudar?';
    return response;
  }

  private buildContextPrompt(context: any): string {
    const parts = [`CONTEXTO ATUAL DA CONVERSA:`];
    
    if (context.guests) parts.push(`- Hóspedes: ${context.guests} pessoas`);
    if (context.checkIn && context.checkOut) {
      parts.push(`- Datas: ${context.checkIn} a ${context.checkOut}`);
    }
    if (context.clientName) parts.push(`- Cliente: ${context.clientName}`);
    if (context.amenities?.length) parts.push(`- Comodidades desejadas: ${context.amenities.join(', ')}`);
    if (context.budget) parts.push(`- Orçamento: R$ ${context.budget}`);
    if (context.propertiesShown?.length) {
      parts.push(`- Já mostradas ${context.propertiesShown.length} propriedades`);
    }
    if (context.interestedProperties?.length) {
      parts.push(`- Cliente interessado em ${context.interestedProperties.length} propriedades`);
    }
    
    parts.push(`- Estágio da conversa: ${context.stage}`);
    parts.push(`\nUSE ESSAS INFORMAÇÕES SEMPRE. NÃO PERGUNTE NOVAMENTE O QUE JÁ SABE.`);
    
    return parts.join('\n');
  }
}

// Singleton para compatibilidade
export const sofiaAgentV2 = SofiaAgentV2.getInstance();