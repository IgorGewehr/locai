// lib/ai-agent/sofia-agent-v2.ts
// SOFIA AI AGENT - Versão Corrigida com GPT para todas as respostas

import { OpenAI } from 'openai';
import { conversationContextService, ConversationContextData } from '@/lib/services/conversation-context-service';
import { getOpenAIFunctions, SimplifiedAgentFunctions } from '@/lib/ai/agent-functions';

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

// ===== PROMPTS OTIMIZADOS PARA SOFIA =====

const SOFIA_SYSTEM_PROMPT = `Você é Sofia, uma assistente virtual especializada em aluguel de imóveis por temporada.

PERSONALIDADE:
- Simpática, prática e direta
- Responde em português brasileiro casual
- Usa emojis moderadamente
- Foca em ajudar o cliente a encontrar o imóvel ideal

REGRAS IMPORTANTES:
1. SEMPRE responda de forma concisa (máximo 3 linhas)
2. NUNCA assuma informações que o cliente não forneceu
3. SEMPRE pergunte a cidade se não foi mencionada
4. Use as funções disponíveis para buscar propriedades e criar reservas
5. Lembre-se de TUDO que o cliente disse na conversa atual
6. Seja proativa em sugerir próximos passos

FLUXO IDEAL:
1. Cumprimentar e perguntar dados básicos (cidade, datas, pessoas)
2. Buscar e apresentar opções (use search_properties APENAS após ter cidade)
3. Mostrar detalhes e valores (use calculate_price)
4. Criar a reserva (use create_reservation)

IMPORTANTE: Use as funções disponíveis SOMENTE quando tiver informações suficientes.`;

// ===== CLASSE PRINCIPAL =====

export class SofiaAgentV2 {
  private openai: OpenAI;
  private static instance: SofiaAgentV2;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): SofiaAgentV2 {
    if (!this.instance) {
      console.log('🤖 [Sofia] Criando nova instância v2');
      this.instance = new SofiaAgentV2();
    }
    return this.instance;
  }

  async processMessage(input: SofiaInput): Promise<SofiaResponse> {
    try {
      console.log(`💬 [Sofia] Processando mensagem de ${input.clientPhone}: "${input.message}"`);

      // 1. Obter contexto e histórico
      const context = await conversationContextService.getOrCreateContext(
        input.clientPhone,
        input.tenantId
      );

      // 2. Obter apenas mensagens da conversa ATUAL (resetar a cada dia)
      const messageHistory = await this.getCurrentDayHistory(
        input.clientPhone,
        input.tenantId
      );

      // 3. Construir mensagens para o GPT
      const messages: MessageHistory[] = [
        {
          role: 'system',
          content: SOFIA_SYSTEM_PROMPT
        }
      ];

      // 4. Adicionar contexto da conversa ATUAL
      if (context.context.clientData && Object.keys(context.context.clientData).length > 0) {
        messages.push({
          role: 'system',
          content: `Informações coletadas nesta conversa: ${JSON.stringify(context.context.clientData)}`
        });
      }

      // 5. Adicionar histórico da conversa (máximo 10 mensagens para não confundir)
      const recentHistory = messageHistory.slice(-10);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      });

      // 6. Adicionar mensagem atual
      messages.push({
        role: 'user',
        content: input.message
      });

      console.log(`🤖 [Sofia] Chamando GPT com ${messages.length} mensagens no contexto`);
      
      // 7. Primeira chamada: determinar se precisa usar funções
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
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

      // 8. Processar function calls se houver
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`🔧 [Sofia] Processando ${response.tool_calls.length} function calls`);
        
        const toolMessages = [];
        toolMessages.push(response); // Mensagem do assistente com tool_calls

        // Executar cada função
        for (const toolCall of response.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          
          console.log(`⚡ [Sofia] Executando função: ${functionName}`, args);
          
          try {
            const result = await SimplifiedAgentFunctions.executeFunction(
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
            console.error(`❌ [Sofia] Erro ao executar função ${functionName}:`, error);
            
            // Adicionar erro como tool message
            toolMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
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
          max_tokens: 150,
          temperature: 0.7
        });

        reply = followUp.choices[0].message.content || reply;
        totalTokens += followUp.usage?.total_tokens || 0;
      }

      // 9. Salvar mensagens no histórico
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

      // 10. Atualizar tokens usados
      await conversationContextService.incrementTokensUsed(
        input.clientPhone,
        input.tenantId,
        totalTokens
      );

      console.log(`✅ [Sofia] Resposta gerada (${totalTokens} tokens): "${reply.substring(0, 100)}..."`);

      return {
        reply,
        actions,
        tokensUsed: totalTokens
      };

    } catch (error) {
      console.error('❌ [Sofia] Erro ao processar mensagem:', error);
      
      return {
        reply: 'Ops! Tive um probleminha técnico. Pode repetir sua mensagem? 🙏',
        tokensUsed: 0
      };
    }
  }

  // Obter histórico apenas do dia atual para evitar confundir o contexto
  private async getCurrentDayHistory(
    clientPhone: string,
    tenantId: string
  ): Promise<Array<{ role: string; content: string }>> {
    try {
      const allHistory = await conversationContextService.getMessageHistory(
        clientPhone,
        tenantId,
        50 // Buscar muitas mensagens
      );

      // Filtrar apenas mensagens do dia atual
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayHistory = allHistory.filter(msg => {
        const msgDate = msg.timestamp?.toDate() || new Date();
        msgDate.setHours(0, 0, 0, 0);
        return msgDate.getTime() === today.getTime();
      });

      console.log(`📅 [Sofia] Histórico do dia: ${todayHistory.length} mensagens`);

      return todayHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    } catch (error) {
      console.error('❌ [Sofia] Erro ao obter histórico do dia:', error);
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
      const updates: Partial<ConversationContextData> = {};

      switch (functionName) {
        case 'search_properties':
          if (args.location) {
            updates.clientData = { city: args.location };
          }
          if (args.guests) {
            updates.clientData = { ...updates.clientData, guests: args.guests };
          }
          if (args.checkIn) {
            updates.clientData = { ...updates.clientData, checkIn: args.checkIn };
          }
          if (args.checkOut) {
            updates.clientData = { ...updates.clientData, checkOut: args.checkOut };
          }
          if (result && Array.isArray(result) && result.length > 0) {
            updates.interestedProperties = result.slice(0, 3).map((p: any) => p.id);
          }
          updates.stage = 'discovery';
          break;

        case 'calculate_price':
          updates.stage = 'presentation';
          break;

        case 'create_reservation':
          updates.stage = 'closing';
          if (args.clientName) {
            updates.clientData = { ...updates.clientData, name: args.clientName };
          }
          break;

        case 'register_client':
          if (args.name) {
            updates.clientData = { ...updates.clientData, name: args.name };
          }
          break;
      }

      updates.lastAction = functionName;

      if (Object.keys(updates).length > 0) {
        await conversationContextService.updateContext(
          clientPhone,
          tenantId,
          updates
        );

        console.log(`📝 [Sofia] Contexto atualizado após ${functionName}:`, updates);
      }
    } catch (error) {
      console.error('❌ [Sofia] Erro ao atualizar contexto:', error);
    }
  }

  // Limpar contexto de um cliente (útil para testes)
  async clearClientContext(clientPhone: string, tenantId: string): Promise<void> {
    try {
      await conversationContextService.markConversationCompleted(clientPhone, tenantId);
      console.log(`🧹 [Sofia] Contexto limpo para ${clientPhone}`);
    } catch (error) {
      console.error('❌ [Sofia] Erro ao limpar contexto:', error);
    }
  }
}

// Exportar instância singleton
export const sofiaAgentV2 = SofiaAgentV2.getInstance();