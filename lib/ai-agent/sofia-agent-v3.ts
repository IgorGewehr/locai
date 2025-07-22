// lib/ai-agent/sofia-agent-v3.ts
// SOFIA AI AGENT V3 - Com funções corrigidas e fluxo cliente→reserva

import { OpenAI } from 'openai';
import { conversationContextService, ConversationContextData } from '@/lib/services/conversation-context-service';
import { getCorrectedOpenAIFunctions, CorrectedAgentFunctions } from '@/lib/ai/agent-functions-corrected';

// ===== INTERFACES =====

interface SofiaInput {
  message: string;
  clientPhone: string;
  tenantId: string;
}

interface SofiaResponse {
  reply: string;
  actions?: any[];
  tokensUsed: number;
}

interface MessageHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Contexto estendido para gerenciar o fluxo de reserva
interface ExtendedContextData extends ConversationContextData {
  pendingReservation?: {
    propertyId?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    totalPrice?: number;
    clientId?: string; // ID do cliente registrado
  };
}

// ===== PROMPTS OTIMIZADOS PARA SOFIA V3 =====

const SOFIA_SYSTEM_PROMPT_V3 = `Você é Sofia, uma assistente virtual especializada em aluguel de imóveis por temporada.

PERSONALIDADE:
- Simpática, prática e direta
- Responde em português brasileiro casual
- Usa emojis moderadamente
- Foca em ajudar o cliente a encontrar o imóvel ideal

REGRAS IMPORTANTES:
1. SEMPRE responda de forma concisa (máximo 3 linhas)
2. NUNCA assuma informações que o cliente não forneceu
3. SEMPRE pergunte a cidade se não foi mencionada
4. Para criar reserva, SEMPRE registre o cliente primeiro com register_client
5. Use os IDs reais das propriedades retornados pelas funções
6. Colete dados do cliente (nome completo) antes de finalizar reserva

FLUXO DE RESERVA CORRETO:
1. Buscar propriedades (search_properties)
2. Mostrar detalhes se solicitado (get_property_details)  
3. Calcular preços (calculate_price)
4. PRIMEIRO: Registrar cliente (register_client) - coletar nome completo
5. DEPOIS: Criar reserva (create_reservation) usando clientId retornado

FUNÇÕES DISPONÍVEIS:
- search_properties: buscar imóveis (sempre use IDs reais retornados)
- get_property_details: detalhes de uma propriedade específica
- calculate_price: calcular valores (use IDs reais das propriedades)
- register_client: registrar cliente ANTES da reserva
- create_reservation: criar reserva APÓS registrar cliente`;

// ===== CLASSE PRINCIPAL =====

export class SofiaAgentV3 {
  private openai: OpenAI;
  private static instance: SofiaAgentV3;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): SofiaAgentV3 {
    if (!this.instance) {
      console.log('🤖 [Sofia V3] Criando nova instância');
      this.instance = new SofiaAgentV3();
    }
    return this.instance;
  }

  async processMessage(input: SofiaInput): Promise<SofiaResponse> {
    try {
      console.log(`💬 [Sofia V3] Processando mensagem de ${input.clientPhone}: "${input.message}"`);

      // 1. Obter contexto e histórico
      const context = await conversationContextService.getOrCreateContext(
        input.clientPhone,
        input.tenantId
      ) as any; // Usar contexto estendido

      // 2. Obter apenas mensagens da conversa ATUAL (resetar a cada dia)
      const messageHistory = await this.getCurrentDayHistory(
        input.clientPhone,
        input.tenantId
      );

      // 3. Construir mensagens para o GPT
      const messages: MessageHistory[] = [
        {
          role: 'system',
          content: SOFIA_SYSTEM_PROMPT_V3
        }
      ];

      // 4. Adicionar contexto atual
      if (context.context.clientData && Object.keys(context.context.clientData).length > 0) {
        messages.push({
          role: 'system',
          content: `Dados coletados: ${JSON.stringify(context.context.clientData)}`
        });
      }

      // 5. Adicionar contexto de reserva pendente se existir
      if (context.context.pendingReservation) {
        messages.push({
          role: 'system',
          content: `Reserva em andamento: ${JSON.stringify(context.context.pendingReservation)}`
        });
      }

      // 6. Adicionar histórico da conversa (máximo 8 mensagens para não confundir)
      const recentHistory = messageHistory.slice(-8);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      });

      // 7. Adicionar mensagem atual
      messages.push({
        role: 'user',
        content: input.message
      });

      console.log(`🤖 [Sofia V3] Chamando GPT com ${messages.length} mensagens no contexto`);
      
      // 8. Primeira chamada: determinar se precisa usar funções
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages as any,
        tools: getCorrectedOpenAIFunctions(),
        tool_choice: 'auto',
        max_tokens: 150,
        temperature: 0.7
      });

      const response = completion.choices[0].message;
      let reply = response.content || '';
      const actions: any[] = [];
      let totalTokens = completion.usage?.total_tokens || 0;

      // 9. Processar function calls se houver
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`🔧 [Sofia V3] Processando ${response.tool_calls.length} function calls`);
        
        const toolMessages = [];
        toolMessages.push(response); // Mensagem do assistente com tool_calls

        // Executar cada função
        for (const toolCall of response.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          
          console.log(`⚡ [Sofia V3] Executando função: ${functionName}`, args);
          
          try {
            const result = await CorrectedAgentFunctions.executeFunction(
              functionName,
              args,
              input.tenantId
            );
            
            actions.push({
              type: functionName,
              parameters: args,
              result
            });

            // Adicionar resultado da função como tool message
            toolMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });

            // Atualizar contexto baseado na função executada
            await this.updateContextFromFunction(
              input.clientPhone,
              input.tenantId,
              functionName,
              args,
              result
            );
          } catch (error) {
            console.error(`❌ [Sofia V3] Erro ao executar função ${functionName}:`, error);
            
            // Adicionar erro como tool message
            toolMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ 
                success: false, 
                message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
              })
            });
          }
        }

        // Segunda chamada: gerar resposta baseada nos resultados das funções
        const followUpMessages = [
          ...messages,
          ...toolMessages
        ];

        const followUp = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: followUpMessages as any,
          max_tokens: 200, // Aumentar um pouco para respostas com dados
          temperature: 0.7
        });

        reply = followUp.choices[0].message.content || reply;
        totalTokens += followUp.usage?.total_tokens || 0;
      }

      // 10. Salvar mensagens no histórico
      await conversationContextService.saveMessage(
        input.clientPhone,
        input.tenantId,
        {
          role: 'user',
          content: input.message
        }
      );

      await conversationContextService.saveMessage(
        input.clientPhone,
        input.tenantId,
        {
          role: 'assistant',
          content: reply,
          tokensUsed: totalTokens
        }
      );

      // 11. Atualizar tokens usados
      await conversationContextService.incrementTokensUsed(
        input.clientPhone,
        input.tenantId,
        totalTokens
      );

      console.log(`✅ [Sofia V3] Resposta gerada (${totalTokens} tokens): "${reply.substring(0, 100)}..."`);

      return {
        reply,
        actions,
        tokensUsed: totalTokens
      };

    } catch (error) {
      console.error('❌ [Sofia V3] Erro ao processar mensagem:', error);
      
      return {
        reply: 'Ops! Tive um probleminha técnico. Pode repetir sua mensagem? 🙏',
        tokensUsed: 0
      };
    }
  }

  // Obter histórico apenas do dia atual
  private async getCurrentDayHistory(
    clientPhone: string,
    tenantId: string
  ): Promise<Array<{ role: string; content: string }>> {
    try {
      const allHistory = await conversationContextService.getMessageHistory(
        clientPhone,
        tenantId,
        50
      );

      // Filtrar apenas mensagens do dia atual
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayHistory = allHistory.filter(msg => {
        const msgDate = msg.timestamp?.toDate() || new Date();
        msgDate.setHours(0, 0, 0, 0);
        return msgDate.getTime() === today.getTime();
      });

      console.log(`📅 [Sofia V3] Histórico do dia: ${todayHistory.length} mensagens`);

      return todayHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    } catch (error) {
      console.error('❌ [Sofia V3] Erro ao obter histórico:', error);
      return [];
    }
  }

  private async updateContextFromFunction(
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
          if (args.location) {
            updates.clientData = { city: args.location };
          }
          if (args.guests) {
            updates.clientData = { ...updates.clientData, guests: args.guests };
          }
          if (args.checkIn && args.checkOut) {
            updates.clientData = { 
              ...updates.clientData, 
              checkIn: args.checkIn,
              checkOut: args.checkOut
            };
          }
          if (result.success && result.properties && result.properties.length > 0) {
            // Usar IDs REAIS das propriedades
            updates.interestedProperties = result.properties.slice(0, 3).map((p: any) => p.id);
          }
          updates.stage = 'discovery';
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
          }
          updates.stage = 'presentation';
          break;

        case 'register_client':
          if (result.success && result.client) {
            updates.clientData = { 
              ...updates.clientData, 
              name: result.client.name
            };
            // Salvar ID do cliente na reserva pendente
            if (updates.pendingReservation) {
              updates.pendingReservation.clientId = result.client.id;
            } else {
              updates.pendingReservation = { clientId: result.client.id };
            }
          }
          break;

        case 'create_reservation':
          if (result.success) {
            updates.stage = 'closing';
            // Limpar reserva pendente após sucesso
            updates.pendingReservation = {};
          }
          break;
      }

      updates.lastAction = functionName;

      if (Object.keys(updates).length > 0) {
        await conversationContextService.updateContext(
          clientPhone,
          tenantId,
          updates as any
        );

        console.log(`📝 [Sofia V3] Contexto atualizado após ${functionName}:`, updates);
      }
    } catch (error) {
      console.error('❌ [Sofia V3] Erro ao atualizar contexto:', error);
    }
  }

  // Limpar contexto de um cliente
  async clearClientContext(clientPhone: string, tenantId: string): Promise<void> {
    try {
      await conversationContextService.markConversationCompleted(clientPhone, tenantId);
      console.log(`🧹 [Sofia V3] Contexto limpo para ${clientPhone}`);
    } catch (error) {
      console.error('❌ [Sofia V3] Erro ao limpar contexto:', error);
    }
  }
}

// Exportar instância singleton
export const sofiaAgentV3 = SofiaAgentV3.getInstance();