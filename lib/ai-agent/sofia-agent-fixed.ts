// Sofia Agent V3 - VERSÃO CORRIGIDA SEM TIMEOUT
// Versão simplificada que funciona, sem componentes problemáticos

import { OpenAI } from 'openai';
import { getOpenAIFunctions, AgentFunctions } from '@/lib/ai/agent-functions';
import { logger } from '@/lib/utils/logger';
import { SOFIA_PROMPT } from './sofia-prompt';

// Interfaces simplificadas
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

export class SofiaAgentFixed {
  private openai: OpenAI;
  private static instance: SofiaAgentFixed;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): SofiaAgentFixed {
    if (!this.instance) {
      logger.info('🚀 [Sofia V3 Fixed CORRIGIDA] Criando nova instância');
      this.instance = new SofiaAgentFixed();
    }
    return this.instance;
  }

  async processMessage(input: SofiaInput): Promise<SofiaResponse> {
    const startTime = Date.now();
    const functionsExecuted: string[] = [];

    try {
      logger.info('💬 [Sofia V3 Fixed] Processando mensagem', {
        clientPhone: this.maskPhone(input.clientPhone),
        messagePreview: input.message.substring(0, 50) + '...',
        source: input.metadata?.source || 'unknown',
        tenantId: input.tenantId
      });

      // 1. Detectar se deve forçar função
      const shouldForce = this.shouldForceFunction(input.message);
      
      logger.info('🎯 [Sofia V3 Fixed] Decisão de execução', {
        message: input.message.substring(0, 50),
        shouldForce,
        toolChoice: shouldForce ? 'required' : 'auto'
      });

      // 🚨 LOG CRÍTICO PARA DEBUG
      console.log('🚨 SOFIA FIXED DEBUG:', {
        message: input.message,
        shouldForce,
        toolChoice: shouldForce ? 'required' : 'auto'
      });

      // 2. Preparar mensagens
      const messages = [
        {
          role: 'system' as const,
          content: SOFIA_PROMPT
        },
        {
          role: 'user' as const,
          content: input.message
        }
      ];

      // 3. Chamada OpenAI - DIRETA, SEM COMPONENTES COMPLEXOS
      logger.info('🔄 [Sofia V3 Fixed] Chamando OpenAI...');
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        tools: getOpenAIFunctions(),
        tool_choice: shouldForce ? 'required' : 'auto',
        max_tokens: 1000,
        temperature: 0.7
      });

      const response = completion.choices[0].message;
      let reply = response.content || '';
      const actions: any[] = [];
      let totalTokens = completion.usage?.total_tokens || 0;

      logger.info('🔍 [Sofia V3 Fixed] Resposta OpenAI recebida', {
        hasToolCalls: !!response.tool_calls,
        toolCallsCount: response.tool_calls?.length || 0,
        hasContent: !!response.content,
        totalTokens
      });

      // 🚨 LOG CRÍTICO APÓS OPENAI
      console.log('🚨 SOFIA FIXED - RESPOSTA OPENAI:', {
        hasToolCalls: !!response.tool_calls,
        toolCallsCount: response.tool_calls?.length || 0,
        toolCalls: response.tool_calls?.map(tc => tc.function.name) || [],
        content: response.content,
        totalTokens
      });

      // 4. Processar funções se existirem
      if (response.tool_calls && response.tool_calls.length > 0) {
        logger.info('🔧 [Sofia V3 Fixed] Processando funções', {
          count: response.tool_calls.length,
          functions: response.tool_calls.map(tc => tc.function.name)
        });

        // Processar cada função
        for (const toolCall of response.tool_calls) {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            logger.info('⚙️ [Sofia V3 Fixed] Executando função', {
              name: functionName,
              args: functionArgs
            });

            // Executar função
            const result = await AgentFunctions.executeFunction(
              functionName, 
              functionArgs, 
              input.tenantId
            );

            if (result.success) {
              functionsExecuted.push(functionName);
              actions.push({ type: functionName, result });
              logger.info('✅ [Sofia V3 Fixed] Função executada', {
                name: functionName,
                success: true
              });
            } else {
              logger.warn('⚠️ [Sofia V3 Fixed] Função falhou', {
                name: functionName,
                error: result.message
              });
            }

          } catch (error: any) {
            logger.error('❌ [Sofia V3 Fixed] Erro ao executar função', {
              function: toolCall.function.name,
              error: error.message
            });
          }
        }

        // Se executou funções, gerar resposta baseada nos resultados
        if (functionsExecuted.length > 0) {
          reply = this.generateResponseFromFunctions(functionsExecuted, actions);
        }
      }

      const responseTime = Date.now() - startTime;

      logger.info('✅ [Sofia V3 Fixed] Mensagem processada com sucesso', {
        responseTime: `${responseTime}ms`,
        tokensUsed: totalTokens,
        functionsExecuted: functionsExecuted.length,
        functions: functionsExecuted
      });

      return {
        reply,
        summary: this.createSimpleSummary(),
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
    
    logger.info('🎯 [Sofia V3 Fixed] Avaliação de função', {
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
    
    if (functionsExecuted.includes('send_property_media')) {
      return "Enviando as fotos da propriedade! 📸 São imagens lindas que mostram todos os detalhes.";
    }
    
    if (functionsExecuted.includes('register_client')) {
      return "Perfeito! Seus dados foram registrados com sucesso. 👤 Agora posso ajudar você de forma ainda mais personalizada!";
    }

    return "Pronto! Executei as ações necessárias para ajudar você. 😊";
  }

  private createSimpleSummary(): any {
    return {
      conversationState: { stage: 'active' },
      clientInfo: { hasName: false, hasDocument: false },
      searchCriteria: { guests: 2 },
      propertiesViewed: []
    };
  }

  private handleError(error: any, input: SofiaInput, startTime: number): SofiaResponse {
    const responseTime = Date.now() - startTime;

    logger.error('❌ [Sofia V3 Fixed] Erro ao processar mensagem', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      clientPhone: this.maskPhone(input.clientPhone),
      messagePreview: input.message.substring(0, 50) + '...',
      responseTime: `${responseTime}ms`
    });

    // Log crítico para debug
    console.error('🚨 ERRO CRÍTICO SOFIA FIXED:', {
      message: error.message || error,
      stack: error.stack,
      type: typeof error,
      name: error.name
    });

    return {
      reply: 'Ops! Tive um probleminha técnico. Pode repetir sua mensagem? 🙏',
      summary: this.createSimpleSummary(),
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
}

// EXPORTAÇÃO ESSENCIAL - SEM ISSO A CLASSE NÃO É IMPORTADA!
export { SofiaAgentFixed };