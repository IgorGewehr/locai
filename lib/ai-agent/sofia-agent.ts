// lib/ai-agent/sofia-agent.ts
// SOFIA AI AGENT - MVP PRODUCTION VERSION
// Merge estratégico das melhores práticas V3 + features essenciais V4

import { OpenAI } from 'openai';
import { conversationContextService, ConversationContextData } from '@/lib/services/conversation-context-service';
import { getOpenAIFunctions, AgentFunctions } from '@/lib/ai/agent-functions';
import { logger } from '@/lib/utils/logger';

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
  actions?: any[];
  tokensUsed: number;
  responseTime: number;
  functionsExecuted: string[];
  metadata: {
    stage: string;
    contextUpdates: number;
  };
}

interface MessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Contexto estendido para gerenciar o fluxo
interface ExtendedContextData extends ConversationContextData {
  pendingReservation?: {
    propertyId?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    totalPrice?: number;
    clientId?: string;
  };
}

// ===== PROMPT OTIMIZADO (V3) =====

const SOFIA_SYSTEM_PROMPT = `Sofia: consultora virtual de aluguel por temporada. OBJETIVO: CONVERTER CLIENTES.

🎯 PERSONALIDADE: Entusiástica, consultiva, persuasiva. Cria urgência, foca conversão.

⚡ REGRA FUNDAMENTAL: EXECUTE FUNÇÕES IMEDIATAMENTE quando tiver informações suficientes!

🚨 TRIGGERS OBRIGATÓRIOS PARA EXECUÇÃO DE FUNÇÕES:

🔍 EXECUTE search_properties IMEDIATAMENTE quando:
- Cliente menciona: "alugar", "aluguel", "apartamento", "apto", "casa", "propriedade"
- Tenho número de pessoas (mesmo que seja 1 pessoa por padrão)
- MESMO SEM datas específicas - busque TODAS as propriedades disponíveis
- NUNCA peça mais informações antes de mostrar opções!

📸 EXECUTE send_property_media quando:
- Cliente pergunta "tem fotos?", "posso ver?", "como é?"
- Cliente demonstra interesse específico em uma propriedade

💰 EXECUTE calculate_price quando:
- Cliente tem datas específicas E escolheu uma propriedade
- Cliente pergunta sobre preço total

👤 EXECUTE register_client quando:
- Cliente quer agendar visita OU fazer reserva
- Colete: nome completo + CPF + telefone

📋 REGRAS CRÍTICAS:
1. NUNCA invente propriedades/IDs - SEMPRE use funções
2. BUSQUE PRIMEIRO, pergunte detalhes DEPOIS
3. SEMPRE apresente: nome, localização, preço/diária  
4. APÓS apresentar: "Quer ver fotos/vídeos?"
5. SEMPRE ofereça outras opções antes de fechar
6. Interesse → ofereça VISITA ou RESERVA DIRETA

🏠 FLUXO OBRIGATÓRIO:
1. Cliente menciona aluguel → EXECUTE search_properties IMEDIATAMENTE
2. Apresente: "🏠 [Nome] - 📍 [Local] - 💰 R$[preço]/dia"
3. "Quer ver fotos/vídeos?"
4. Interesse → "Prefere visita presencial ou reserva direta?"

⚠️ JAMAIS faça conversa genérica sem buscar propriedades!
⚠️ JAMAIS peça orçamento - mostre opções baratas primeiro!
⚠️ JAMAIS fique perguntando detalhes infinitamente!

💎 FILTROS DISPONÍVEIS: ['piscina', 'academia', 'wifi', 'ar_condicionado', 'cozinha_completa', 'lavanderia', 'estacionamento', 'pet_friendly']

🎪 VENDAS: "Últimas datas!", "Muito procurada!", "Preço promocional!"

🔧 FUNÇÕES (9): search_properties, get_property_details, send_property_media, calculate_price, register_client, check_visit_availability, schedule_visit, create_reservation, classify_lead_status

FOCO: Transformar interessados em compradores RAPIDAMENTE!`;

// ===== PROMPTS CONTEXTUAIS DINÂMICOS (V3) =====

const SOFIA_CONTEXT_PROMPTS = {
  AVAILABLE_PROPERTIES: (properties: string[]) => `
🏠 IDs REAIS DISPONÍVEIS:
${properties.map((id, index) => `${index + 1}ª: "${id}"`).join('\n')}
⚠️ Use APENAS estes IDs reais! JAMAIS invente "1", "2", "ABC123"!`,

  PENDING_RESERVATION: (reservation: any) => `
RESERVA PENDENTE: ${JSON.stringify(reservation)}
${reservation.clientId ? '🚨 TEM clientId - CRIAR RESERVA IMEDIATAMENTE!' : '⚠️ SEM clientId - REGISTRAR CLIENTE PRIMEIRO!'}`,

  CLIENT_DATA: (clientData: any) => `
DADOS COLETADOS: ${JSON.stringify(clientData)}`
};

// ===== BUYING SIGNALS (Feature útil da V4) =====

const BUYING_SIGNALS = [
  'quero alugar', 'quero reservar', 'vou fechar', 'quando posso', 'como faço',
  'aceito', 'confirmo', 'me interessa', 'gostei muito', 'gostei',
  'perfeito', 'ideal', 'exatamente', 'fechado', 'alugar', 'reservar',
  'aluguel', 'booking', 'book', 'disponível', 'disponibilidade'
];

// ===== CLASSE PRINCIPAL =====

export class SofiaAgent {
  private openai: OpenAI;
  private static instance: SofiaAgent;
  
  // Métricas simples (inspirado na V4)
  private metrics = {
    totalRequests: 0,
    totalTokens: 0,
    averageResponseTime: 0,
    successRate: 100
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): SofiaAgent {
    if (!this.instance) {
      logger.info('🤖 [Sofia] Criando nova instância do agente MVP');
      this.instance = new SofiaAgent();
    }
    return this.instance;
  }

  async processMessage(input: SofiaInput): Promise<SofiaResponse> {
    const startTime = Date.now();
    const functionsExecuted: string[] = [];
    let contextUpdates = 0;

    try {
      logger.info('💬 [Sofia] Processando mensagem', {
        clientPhone: this.maskPhone(input.clientPhone),
        messagePreview: input.message.substring(0, 50),
        source: input.metadata?.source || 'unknown'
      });

      // 1. Obter contexto e histórico
      const context = await conversationContextService.getOrCreateContext(
        input.clientPhone,
        input.tenantId
      ) as ExtendedContextData;

      // 2. Detectar buying signals (feature da V4)
      const hasBuyingSignal = this.detectBuyingSignals(input.message);
      if (hasBuyingSignal) {
        logger.info('💰 [Sofia] Buying signal detectado', { 
          signals: hasBuyingSignal 
        });
      }

      // 3. Construir mensagens otimizadas
      const messages = this.buildOptimizedMessages(input.message, context);

      // 4. Chamar OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        tools: getOpenAIFunctions(),
        tool_choice: 'auto',
        max_tokens: 150,
        temperature: 0.7
      });

      const response = completion.choices[0].message;
      let reply = response.content || '';
      const actions: any[] = [];
      let totalTokens = completion.usage?.total_tokens || 0;

      // 5. Processar function calls se houver
      if (response.tool_calls && response.tool_calls.length > 0) {
        logger.info('🔧 [Sofia] Processando function calls', {
          count: response.tool_calls.length,
          functions: response.tool_calls.map(tc => tc.function.name)
        });

        const toolMessages = [response];

        for (const toolCall of response.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          // Validar e corrigir propertyId (da V3)
          this.validateAndCorrectPropertyId(args, context.context);
          
          // Validar e corrigir datas se necessário
          this.validateAndCorrectDates(args);

          try {
            const result = await AgentFunctions.executeFunction(
              functionName,
              args,
              input.tenantId
            );

            functionsExecuted.push(functionName);
            actions.push({
              type: functionName,
              parameters: args,
              result
            });

            toolMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });

            // Atualizar contexto
            await this.updateContext(
              input.clientPhone,
              input.tenantId,
              functionName,
              args,
              result
            );
            contextUpdates++;

          } catch (error) {
            logger.error('❌ [Sofia] Erro em função', {
              functionName,
              error: error instanceof Error ? error.message : 'Unknown error'
            });

            toolMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: false,
                message: 'Erro ao executar função'
              })
            });
          }
        }

        // Segunda chamada para resposta final
        const followUpMessages = [...messages, ...toolMessages];
        const followUp = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: followUpMessages as any,
          max_tokens: 200,
          temperature: 0.7
        });

        reply = followUp.choices[0].message.content || reply;
        totalTokens += followUp.usage?.total_tokens || 0;
      }

      // 6. Salvar histórico
      await this.saveConversationHistory(input, reply, totalTokens);

      // 7. Atualizar métricas
      const responseTime = Date.now() - startTime;
      this.updateMetrics(totalTokens, responseTime, true);

      logger.info('✅ [Sofia] Mensagem processada com sucesso', {
        responseTime,
        tokensUsed: totalTokens,
        functionsExecuted,
        stage: context.context.stage || 'discovery'
      });

      return {
        reply,
        actions,
        tokensUsed: totalTokens,
        responseTime,
        functionsExecuted,
        metadata: {
          stage: context.context.stage || 'discovery',
          contextUpdates
        }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(0, responseTime, false);

      logger.error('❌ [Sofia] Erro ao processar mensagem', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clientPhone: this.maskPhone(input.clientPhone)
      });

      return {
        reply: 'Ops! Tive um probleminha técnico. Pode repetir sua mensagem? 🙏',
        actions: [],
        tokensUsed: 0,
        responseTime,
        functionsExecuted: [],
        metadata: {
          stage: 'error',
          contextUpdates: 0
        }
      };
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  private buildOptimizedMessages(
    userMessage: string,
    context: ExtendedContextData
  ): MessageHistory[] {
    const messages: MessageHistory[] = [
      {
        role: 'system',
        content: SOFIA_SYSTEM_PROMPT
      }
    ];

    // NOVO: Sistema de ENFORCE para garantir execução de funções
    const enforceMessage = this.generateEnforceMessage(userMessage, context);
    if (enforceMessage) {
      messages.push({
        role: 'system',
        content: enforceMessage
      });
    }

    // Context injection dinâmico (da V3)
    if (context.context.interestedProperties?.length > 0) {
      messages.push({
        role: 'system',
        content: SOFIA_CONTEXT_PROMPTS.AVAILABLE_PROPERTIES(context.context.interestedProperties)
      });
    }

    if (context.context.pendingReservation && Object.keys(context.context.pendingReservation).length > 0) {
      messages.push({
        role: 'system',
        content: SOFIA_CONTEXT_PROMPTS.PENDING_RESERVATION(context.context.pendingReservation)
      });
    }

    if (context.context.clientData && Object.keys(context.context.clientData).length > 0) {
      messages.push({
        role: 'system',
        content: SOFIA_CONTEXT_PROMPTS.CLIENT_DATA(context.context.clientData)
      });
    }

    // Histórico limitado (máximo 8 mensagens)
    const messageHistory = this.getCurrentDayHistory(context);
    const recentHistory = messageHistory.slice(-8);

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

  private generateEnforceMessage(userMessage: string, context: ExtendedContextData): string | null {
    const lowerMessage = userMessage.toLowerCase();
    const hasPropertySearch = lowerMessage.includes('alugar') || lowerMessage.includes('aluguel') || 
                             lowerMessage.includes('apartamento') || lowerMessage.includes('apto') ||
                             lowerMessage.includes('casa') || lowerMessage.includes('propriedade');
    
    const hasGuestInfo = /\b(duas?|dois|três|quatro|cinco|uma?|um)\b/.test(lowerMessage) ||
                        /\b\d+\b/.test(lowerMessage) ||
                        lowerMessage.includes('pessoa');
    
    const hasDateInfo = lowerMessage.includes('dia') || lowerMessage.includes('agosto') ||
                       lowerMessage.includes('julho') || /\d{1,2}/.test(lowerMessage);

    // Se cliente mencionou aluguel E ainda não temos propriedades no contexto
    if (hasPropertySearch && (!context.context.interestedProperties || context.context.interestedProperties.length === 0)) {
      return `🚨 ATENÇÃO: Cliente mencionou aluguel! EXECUTE search_properties AGORA mesmo!
      
PARÂMETROS OBRIGATÓRIOS:
- guests: ${hasGuestInfo ? 'extrair do contexto' : '2 (padrão para casal)'}
- checkIn: ${hasDateInfo ? 'extrair datas da mensagem' : 'opcional'}
- checkOut: ${hasDateInfo ? 'extrair datas da mensagem' : 'opcional'}

NÃO RESPONDA COM TEXTO GENÉRICO - EXECUTE A FUNÇÃO IMEDIATAMENTE!`;
    }

    // Se cliente deu número de pessoas mas ainda não buscamos
    if (hasGuestInfo && (!context.context.interestedProperties || context.context.interestedProperties.length === 0)) {
      const previousMessages = this.getCurrentDayHistory(context);
      const mentionedRental = previousMessages.some(msg => 
        msg.content.toLowerCase().includes('alugar') || msg.content.toLowerCase().includes('aluguel')
      );
      
      if (mentionedRental) {
        return `🚨 AGORA tenho o número de pessoas! EXECUTE search_properties IMEDIATAMENTE!
        
STOP conversando - EXECUTE a função search_properties com os dados que tenho!`;
      }
    }

    return null;
  }

  private validateAndCorrectPropertyId(args: any, contextData: any): void {
    if (!args.propertyId) return;

    const availableIds = contextData.interestedProperties || [];
    const requestedId = args.propertyId;

    // Padrões de IDs inválidos (da V3)
    const invalidPatterns = [
      /^[0-9]{1,3}$/,
      /^[A-Z]{3}[0-9]{3}$/,
      /primeira|segunda|terceira/i,
      /property|prop|apt|apartamento/i,
      /^default$|^example$/i
    ];

    const isInvalid = invalidPatterns.some(pattern => pattern.test(requestedId)) ||
                      requestedId.length < 15;

    if (isInvalid && availableIds.length > 0) {
      logger.warn('🚨 [Sofia] ID inválido corrigido', {
        invalid: requestedId,
        corrected: availableIds[0]
      });
      args.propertyId = availableIds[0];
    }
  }

  private validateAndCorrectDates(args: any): void {
    if (!args.checkIn && !args.checkOut) return;

    const currentYear = new Date().getFullYear();
    const currentDate = new Date();

    // Corrigir checkIn se for no passado
    if (args.checkIn) {
      const checkInDate = new Date(args.checkIn);
      if (checkInDate < currentDate) {
        // Se a data é no passado, assumir próximo ano ou corrigir ano
        if (args.checkIn.startsWith('202')) {
          const month = args.checkIn.substring(5, 7);
          const day = args.checkIn.substring(8, 10);
          args.checkIn = `${currentYear}-${month}-${day}`;
          
          // Se ainda for no passado, usar próximo ano
          if (new Date(args.checkIn) < currentDate) {
            args.checkIn = `${currentYear + 1}-${month}-${day}`;
          }
        }
        
        logger.warn('📅 [Sofia] Data check-in corrigida', {
          original: checkInDate.toISOString().split('T')[0],
          corrected: args.checkIn
        });
      }
    }

    // Corrigir checkOut se for no passado ou antes do checkIn
    if (args.checkOut) {
      const checkOutDate = new Date(args.checkOut);
      const checkInDate = new Date(args.checkIn || currentDate);
      
      if (checkOutDate < currentDate || checkOutDate <= checkInDate) {
        if (args.checkOut.startsWith('202')) {
          const month = args.checkOut.substring(5, 7);
          const day = args.checkOut.substring(8, 10);
          args.checkOut = `${currentYear}-${month}-${day}`;
          
          // Se ainda for inválida, usar próximo ano
          if (new Date(args.checkOut) <= checkInDate) {
            args.checkOut = `${currentYear + 1}-${month}-${day}`;
          }
        }
        
        logger.warn('📅 [Sofia] Data check-out corrigida', {
          original: checkOutDate.toISOString().split('T')[0],
          corrected: args.checkOut
        });
      }
    }
  }

  private async updateContext(
    clientPhone: string,
    tenantId: string,
    functionName: string,
    args: any,
    result: any
  ): Promise<void> {
    try {
      const updates: Partial<ExtendedContextData> = {};

      switch (functionName) {
        case 'search_properties':
          if (result.success && result.properties?.length > 0) {
            updates.interestedProperties = result.properties.slice(0, 3).map((p: any) => p.id);
            updates.stage = 'discovery';
          }
          break;

        case 'send_property_media':
          if (result.success) {
            updates.lastAction = 'viewed_media';
            updates.stage = 'engagement';
          }
          break;

        case 'calculate_price':
          if (result.success && result.calculation) {
            updates.pendingReservation = {
              propertyId: result.calculation.propertyId,
              checkIn: result.calculation.checkIn,
              checkOut: result.calculation.checkOut,
              guests: result.calculation.guests,
              totalPrice: result.calculation.total
            };
            updates.stage = 'presentation';
          }
          break;

        case 'register_client':
          if (result.success && result.client) {
            const currentContext = await conversationContextService.getOrCreateContext(clientPhone, tenantId);
            const existingReservation = currentContext.context.pendingReservation || {};

            updates.pendingReservation = {
              ...existingReservation,
              clientId: result.client
            };
          }
          break;

        case 'create_reservation':
          if (result.success) {
            updates.stage = 'closing';
            updates.pendingReservation = {};
            
            // Auto-classificar lead
            await this.autoClassifyLead(clientPhone, tenantId, 'deal_closed', 
              `Reserva criada: ${result.reservation?.id}`);
          }
          break;

        case 'schedule_visit':
          if (result.success) {
            updates.stage = 'visit_scheduled';
            
            // Auto-classificar lead
            await this.autoClassifyLead(clientPhone, tenantId, 'visit_scheduled',
              `Visita agendada: ${result.visit?.visitDate}`);
          }
          break;
      }

      updates.lastAction = functionName;

      if (Object.keys(updates).length > 0) {
        await conversationContextService.updateContext(clientPhone, tenantId, updates as any);
      }
    } catch (error) {
      logger.error('❌ [Sofia] Erro ao atualizar contexto', { error });
    }
  }

  private async autoClassifyLead(
    clientPhone: string,
    tenantId: string,
    outcome: string,
    reason: string
  ): Promise<void> {
    try {
      await AgentFunctions.executeFunction(
        'classify_lead_status',
        {
          clientPhone,
          conversationOutcome: outcome,
          reason,
          metadata: { automated: true }
        },
        tenantId
      );
    } catch (error) {
      logger.error('❌ [Sofia] Erro ao classificar lead', { error });
    }
  }

  private getCurrentDayHistory(context: any): Array<{ role: string; content: string }> {
    try {
      return context.messageHistory?.slice(-20) || [];
    } catch (error) {
      return [];
    }
  }

  private async saveConversationHistory(
    input: SofiaInput,
    reply: string,
    tokensUsed: number
  ): Promise<void> {
    try {
      await Promise.all([
        conversationContextService.saveMessage(input.clientPhone, input.tenantId, {
          role: 'user',
          content: input.message
        }),
        conversationContextService.saveMessage(input.clientPhone, input.tenantId, {
          role: 'assistant',
          content: reply,
          tokensUsed
        })
      ]);
    } catch (error) {
      logger.error('❌ [Sofia] Erro ao salvar histórico', { error });
    }
  }

  // ===== FEATURES DA V4 SIMPLIFICADAS =====

  private detectBuyingSignals(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    return BUYING_SIGNALS.filter(signal => lowerMessage.includes(signal));
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.substring(0, 2) + '***' + phone.substring(phone.length - 2);
  }

  private updateMetrics(tokens: number, responseTime: number, success: boolean): void {
    this.metrics.totalRequests++;
    this.metrics.totalTokens += tokens;
    
    // Média móvel simples
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
    
    if (!success) {
      this.metrics.successRate = 
        ((this.metrics.totalRequests - 1) * this.metrics.successRate / 100 - 1) / 
        this.metrics.totalRequests * 100;
    }
  }

  // ===== MÉTODOS PÚBLICOS =====

  async clearClientContext(clientPhone: string, tenantId: string): Promise<void> {
    try {
      await conversationContextService.markConversationCompleted(clientPhone, tenantId);
      logger.info('🧹 [Sofia] Contexto limpo', { clientPhone: this.maskPhone(clientPhone) });
    } catch (error) {
      logger.error('❌ [Sofia] Erro ao limpar contexto', { error });
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      status: this.metrics.successRate > 95 ? 'healthy' : 'degraded'
    };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    return {
      status: metrics.status,
      uptime: metrics.uptime,
      metrics: {
        requests: metrics.totalRequests,
        avgResponseTime: Math.round(metrics.averageResponseTime),
        successRate: Math.round(metrics.successRate)
      }
    };
  }
}

// Exportar instância singleton
export const sofiaAgent = SofiaAgent.getInstance();

export default SofiaAgent;