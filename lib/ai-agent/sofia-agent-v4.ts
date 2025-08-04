// lib/ai-agent/sofia-agent-v4.ts
// SOFIA V4 - Versão Multi-Tenant
// Agente de IA conversacional com estrutura tenants/{tenantId}/collections

import { OpenAI } from 'openai';
import { getTenantAwareOpenAIFunctions, executeTenantAwareFunction } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { SOFIA_PROMPT } from './sofia-prompt';

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
  summary: any;
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

// ===== CLASSE PRINCIPAL MULTI-TENANT =====

export class SofiaAgentV4 {
  private openai: OpenAI;
  private static instance: SofiaAgentV4;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): SofiaAgentV4 {
    if (!this.instance) {
      logger.info('🚀 [Sofia V4] Criando nova instância multi-tenant');
      this.instance = new SofiaAgentV4();
    }
    return this.instance;
  }

  async processMessage(input: SofiaInput): Promise<SofiaResponse> {
    const startTime = Date.now();
    const functionsExecuted: string[] = [];

    try {
      logger.info('💬 [Sofia V4] Processando mensagem multi-tenant', {
        clientPhone: this.maskPhone(input.clientPhone),
        messagePreview: input.message.substring(0, 50) + '...',
        source: input.metadata?.source || 'unknown',
        tenantId: input.tenantId
      });

      // 1. Detectar se deve forçar função
      const shouldForce = this.shouldForceFunction(input.message);
      
      logger.info('🎯 [Sofia V4] Decisão de execução', {
        message: input.message.substring(0, 50),
        shouldForce,
        toolChoice: shouldForce ? 'required' : 'auto',
        tenantId: input.tenantId
      });

      // 2. Preparar mensagens com contexto multi-tenant
      const messages = [
        {
          role: 'system' as const,
          content: `${SOFIA_PROMPT}\n\nIMPORTANTE: Você está operando para o tenant ${input.tenantId}. Todas as funções que executar serão isoladas para este tenant específico.`
        },
        {
          role: 'user' as const,
          content: input.message
        }
      ];

      // 3. Chamada OpenAI com funções multi-tenant
      logger.info('🔄 [Sofia V4] Chamando OpenAI com funções multi-tenant...');
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        tools: getTenantAwareOpenAIFunctions(),
        tool_choice: shouldForce ? 'required' : 'auto',
        max_tokens: 1000,
        temperature: 0.7
      });

      const response = completion.choices[0].message;
      let reply = response.content || '';
      const actions: any[] = [];
      let totalTokens = completion.usage?.total_tokens || 0;

      logger.info('🔍 [Sofia V4] Resposta OpenAI recebida', {
        hasToolCalls: !!response.tool_calls,
        toolCallsCount: response.tool_calls?.length || 0,
        hasContent: !!response.content,
        totalTokens,
        tenantId: input.tenantId
      });

      // 4. Processar funções multi-tenant se existirem
      if (response.tool_calls && response.tool_calls.length > 0) {
        logger.info('🔧 [Sofia V4] Processando funções multi-tenant', {
          count: response.tool_calls.length,
          functions: response.tool_calls.map(tc => tc.function.name),
          tenantId: input.tenantId
        });

        // Processar cada função com isolamento de tenant
        for (const toolCall of response.tool_calls) {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            logger.info('⚙️ [Sofia V4] Executando função multi-tenant', {
              name: functionName,
              args: functionArgs,
              tenantId: input.tenantId
            });

            // Executar função com tenant isolation
            const result = await executeTenantAwareFunction(
              functionName, 
              functionArgs, 
              input.tenantId
            );

            if (result.success) {
              functionsExecuted.push(functionName);
              actions.push({ type: functionName, result });
              logger.info('✅ [Sofia V4] Função executada com sucesso', {
                name: functionName,
                success: true,
                tenantId: input.tenantId
              });
            } else {
              logger.warn('⚠️ [Sofia V4] Função falhou', {
                name: functionName,
                error: result.error || result.message,
                tenantId: input.tenantId
              });
            }

          } catch (error: any) {
            logger.error('❌ [Sofia V4] Erro ao executar função', {
              function: toolCall.function.name,
              error: error.message,
              tenantId: input.tenantId
            });
          }
        }

        // Se executou funções, gerar resposta baseada nos resultados
        if (functionsExecuted.length > 0) {
          reply = this.generateResponseFromFunctions(functionsExecuted, actions);
        }
      }

      const responseTime = Date.now() - startTime;

      logger.info('✅ [Sofia V4] Mensagem processada com sucesso', {
        responseTime: `${responseTime}ms`,
        tokensUsed: totalTokens,
        functionsExecuted: functionsExecuted.length,
        functions: functionsExecuted,
        tenantId: input.tenantId
      });

      return {
        reply,
        summary: this.createSimpleSummary(input.tenantId),
        actions,
        tokensUsed: totalTokens,
        responseTime,
        functionsExecuted,
        metadata: {
          stage: functionsExecuted.length > 0 ? 'function_executed' : 'conversation',
          confidence: 0.9,
          reasoningUsed: true
        }
      };

    } catch (error: any) {
      return this.handleError(error, input, startTime);
    }
  }

  private shouldForceFunction(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Palavras que SEMPRE devem executar funções
    const businessKeywords = [
      'alugar', 'apartamento', 'casa', 'imóvel', 'propriedade', 'temporada',
      'hospedagem', 'quarto', 'studio', 'kitnet', 'flat', 'loft',
      'fotos', 'imagens', 'ver', 'mostrar', 'preço', 'valor', 'quanto',
      'reservar', 'confirmar', 'fechar', 'agendar', 'visita',
      'localização', 'endereço', 'região', 'bairro', 'centro', 'praia',
      'pessoas', 'hóspedes', 'casal', 'família', 'amigos',
      'dias', 'semana', 'mês', 'período', 'data'
    ];
    
    // Nomes próprios (cadastro de cliente)
    const hasName = /\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(message);
    
    // Contém qualquer palavra de negócio?
    const hasBusinessKeyword = businessKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    // Saudações puras (sem keywords de negócio) - não forçar
    const isPureGreeting = /^(oi|olá|boa\s+(tarde|noite|dia)|hello|hi)(\s*[!.?]?\s*)?$/i.test(message.trim());
    
    const shouldForce = (hasBusinessKeyword || hasName) && !isPureGreeting;
    
    logger.info('🎯 [Sofia V4] Avaliação de função', {
      messagePreview: message.substring(0, 50),
      shouldForce,
      hasBusinessKeyword,
      hasName,
      isPureGreeting
    });

    return shouldForce;
  }

  private generateResponseFromFunctions(functionsExecuted: string[], actions: any[]): string {
    // Gerar resposta baseada nas funções executadas
    if (functionsExecuted.includes('search_properties')) {
      return "Encontrei algumas opções incríveis para você! 🏠 Vou mostrar as propriedades disponíveis que combinam com o que está procurando. ✨";
    }
    
    if (functionsExecuted.includes('calculate_price')) {
      return "Calculei o valor para você! 💰 Vou enviar os detalhes do orçamento completo.";
    }
    
    if (functionsExecuted.includes('create_reservation')) {
      return "Perfeito! Sua reserva foi criada com sucesso. 📝 Vou enviar os detalhes da sua reserva.";
    }
    
    if (functionsExecuted.includes('register_client')) {
      return "Perfeito! Seus dados foram registrados com sucesso. 👤 Agora posso ajudar você de forma ainda mais personalizada!";
    }

    return "Pronto! Executei as ações necessárias para ajudar você. 😊";
  }

  private createSimpleSummary(tenantId: string): any {
    return {
      conversationState: { stage: 'active' },
      clientInfo: { hasName: false, hasDocument: false },
      searchCriteria: { guests: 2 },
      propertiesViewed: [],
      tenantId
    };
  }

  private handleError(error: any, input: SofiaInput, startTime: number): SofiaResponse {
    const responseTime = Date.now() - startTime;

    logger.error('❌ [Sofia V4] Erro ao processar mensagem', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      clientPhone: this.maskPhone(input.clientPhone),
      messagePreview: input.message.substring(0, 50) + '...',
      responseTime: `${responseTime}ms`,
      tenantId: input.tenantId
    });

    return {
      reply: 'Ops! Tive um probleminha técnico. Pode repetir sua mensagem? 🙏',
      summary: this.createSimpleSummary(input.tenantId),
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

  private maskPhone(phone: string): string {
    if (phone.length > 4) {
      return phone.substring(0, 4) + '***' + phone.substring(phone.length - 2);
    }
    return phone;
  }
  
  // Método para limpar contexto do cliente
  async clearClientContext(clientPhone: string, tenantId: string): Promise<void> {
    logger.info('🗑️ [Sofia V4] Limpando contexto do cliente', {
      clientPhone: this.maskPhone(clientPhone),
      tenantId
    });
    // O contexto é limpo automaticamente em cada nova conversa
    // Este método existe apenas para compatibilidade
  }
}

// Export da instância singleton
export const sofiaAgentV4 = SofiaAgentV4.getInstance();