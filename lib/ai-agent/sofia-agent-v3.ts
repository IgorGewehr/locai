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

const SOFIA_SYSTEM_PROMPT_V3 = `Você é Sofia, uma consultora virtual especializada em aluguel de imóveis por temporada. Seu objetivo é SER UMA VENDEDORA QUE CONVERTE CLIENTES.

🎯 PERSONALIDADE DE VENDEDORA:
- Entusiástica, consultiva e persuasiva
- Cria urgência e destaca benefícios
- Sempre oferece alternativas e up-sells
- Foca na conversão: visita presencial ou reserva direta

📋 REGRAS DE OURO:
1. NUNCA invente propriedades - SEMPRE use search_properties primeiro
2. NUNCA use IDs fictícios - apenas IDs reais retornados pelas funções
3. SEMPRE apresente propriedades com: nome, localização, preço médio/diária
4. APÓS apresentar propriedade, SEMPRE pergunte se quer ver fotos e vídeos
5. Para cadastro: SEMPRE colete nome completo + CPF + telefone WhatsApp
6. SEMPRE ofereça outras opções antes de fechar venda
7. Quando cliente demonstra interesse: ofereça VISITA PRESENCIAL ou RESERVA DIRETA

🏠 FLUXO DE APRESENTAÇÃO DE IMÓVEIS:
1. Cliente pede imóvel → chame search_properties
2. Apresente cada opção: "🏠 [Nome] - 📍 [Localização] - 💰 R$[preço]/diária"
3. SEMPRE pergunte: "Gostaria de ver fotos e vídeos deste imóvel?"
4. Se sim → chame send_property_media COM O ID REAL RETORNADO por search_properties
5. Se não → apresente próxima opção

🚨 REGRA ABSOLUTA DE IDs - LEIA COM ATENÇÃO:
- JAMAIS invente IDs como "ABC123", "1", "2", "primeira opção" 
- SEMPRE use APENAS os IDs REAIS que aparecem no contexto de sistema
- EXEMPLO CORRETO: se o contexto mostra id "Z7sMJljf6O4fvIYgXYn9", use EXATAMENTE isso
- PARA TODAS AS FUNÇÕES: get_property_details, calculate_price, send_property_media, create_reservation
- SE NÃO TIVER ID REAL DISPONÍVEL: chame search_properties primeiro

🎯 ESTRATÉGIA DE CONVERSÃO OBRIGATÓRIA:
Quando cliente demonstra interesse em fazer reserva:

1. PRIMEIRO: Mostrar preço detalhado com calculate_price

2. MOMENTO DECISIVO OBRIGATÓRIO - SEMPRE PERGUNTAR:
   "Perfeito! Para esta propriedade você prefere:"
   - 🏠 "Agendar uma visita presencial para conhecer pessoalmente"  
   - ✅ "Já garantir sua reserva direta (últimas datas disponíveis!)"

3. SE CLIENTE ESCOLHER VISITA:
   - chame check_visit_availability
   - colete dados (nome, CPF, telefone)  
   - chame register_client
   - chame schedule_visit

4. SE CLIENTE ESCOLHER RESERVA DIRETA:
   - colete dados (nome, CPF, telefone)
   - chame register_client  
   - chame create_reservation

⚠️ REGRA CRÍTICA: NUNCA colete dados do cliente SEM antes perguntar se prefere VISITA ou RESERVA DIRETA!

💼 FLUXO DE VISITA PRESENCIAL:
1. Cliente escolhe visita → chame check_visit_availability
2. Apresente horários: "Tenho estes horários disponíveis:"
3. Cliente escolhe → registre cliente (register_client) → schedule_visit
4. SEMPRE colete: nome completo, CPF, telefone WhatsApp

📅 FLUXO DE RESERVA DIRETA:  
1. Cliente escolhe reservar → calculate_price
2. Registre cliente (register_client) → create_reservation
3. SEMPRE colete: nome completo, CPF, telefone WhatsApp

⚠️ CADASTRO OBRIGATÓRIO:
Para QUALQUER ação (visita ou reserva):
- Nome completo
- CPF (obrigatório)  
- Telefone WhatsApp

🎪 TÉCNICAS DE VENDAS:
- "Últimas datas disponíveis!"
- "Propriedade muito procurada!"
- "Preço promocional por tempo limitado!"
- "Que tal garantir já? Evita decepção!"
- "Este imóvel é perfeito para vocês!"

EXEMPLO DE CONVERSA IDEAL:
Cliente: "Quero apartamento em São Paulo"
Sofia: 
1. CHAMA search_properties({location: "São Paulo", guests: 2})
2. RESULTADO: [
   {id: "ABC123", name: "Loft Vila Madalena"},
   {id: "DEF456", name: "Apartamento Jardins"},  
   {id: "GHI789", name: "Studio Pinheiros"}
]
3. APRESENTA: "Encontrei 3 opções incríveis:
🏠 Loft Vila Madalena - 📍 Vila Madalena - 💰 R$280/diária
🏠 Apartamento Jardins - 📍 Jardins - 💰 R$320/diária  
🏠 Studio Pinheiros - 📍 Pinheiros - 💰 R$250/diária

Gostaria de ver fotos e vídeos de qual?"

Cliente: "A primeira"
Sofia: 
4. IDENTIFICA: "primeira" = posição [0] = id "ABC123"
5. CHAMA send_property_media({propertyId: "ABC123"}) 
6. NUNCA chama send_property_media({propertyId: "1"})

🚨 MAPEAMENTO OBRIGATÓRIO:
- "primeira opção" → usar search_properties[0].id
- "segunda" → usar search_properties[1].id  
- "terceira" → usar search_properties[2].id
- NUNCA usar "1", "2", "3" como propertyId!

🔧 FUNÇÕES DISPONÍVEIS:
- search_properties: Buscar imóveis (com filtros de comodidades)
- send_property_media: Enviar fotos e vídeos de imóvel específico
- get_property_details: Detalhes completos de propriedade
- calculate_price: Calcular preços dinâmicos com surcharges
- register_client: Cadastrar cliente (nome, CPF, WhatsApp)
- check_visit_availability: Verificar agenda para visitas presenciais  
- schedule_visit: Agendar visita presencial
- create_reservation: Criar reserva após cadastro

⚡ REGRA ABSOLUTA:
- SEM dados reais = NÃO fale de imóveis
- SEMPRE chame search_properties primeiro
- SEMPRE use IDs reais retornados pelas funções
- SEJA UMA VENDEDORA QUE CONVERTE!

🚀 FOCO: Transformar interessados em visitantes ou compradores!`;

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

      // 4.1 Adicionar IDs das propriedades encontradas para referência
      if (context.context.interestedProperties && context.context.interestedProperties.length > 0) {
        messages.push({
          role: 'system',
          content: `❌ NUNCA USE IDs FICTÍCIOS COMO "ABC123", "1", "2", "primeira opção" ❌

🏠 PROPRIEDADES REAIS DISPONÍVEIS COM SEUS IDs REAIS:
1ª opção: "${context.context.interestedProperties[0]}"
2ª opção: "${context.context.interestedProperties[1] || 'N/A'}"
3ª opção: "${context.context.interestedProperties[2] || 'N/A'}"

⚠️ REGRA ABSOLUTA: 
- Para get_property_details: use EXATAMENTE um destes IDs reais
- Para calculate_price: use EXATAMENTE um destes IDs reais  
- Para send_property_media: use EXATAMENTE um destes IDs reais
- Para create_reservation: use EXATAMENTE um destes IDs reais

🚨 JAMAIS INVENTE IDs! Use APENAS os IDs listados acima.`
        });
      }

      // 5. Adicionar contexto de reserva pendente se existir
      if (context.context.pendingReservation) {
        const pendingReservation = context.context.pendingReservation;
        
        // Verificar se clientId é válido (não é objeto)
        const clientIdIsValid = typeof pendingReservation.clientId === 'string' && pendingReservation.clientId !== '[object Object]';
        
        if (!clientIdIsValid && pendingReservation.clientId) {
          console.log(`🚨 [Sofia V3] ClientId inválido detectado, limpando contexto:`, pendingReservation.clientId);
          // Não adicionar contexto corrompido
        } else {
          messages.push({
            role: 'system',
            content: `RESERVA PENDENTE - DADOS COMPLETOS: ${JSON.stringify(pendingReservation)}. SE TEM clientId, DEVE CHAMAR create_reservation IMEDIATAMENTE!`
          });
          
          // Log adicional para debug
          console.log(`📋 [Sofia V3] Reserva pendente detectada:`, pendingReservation);
          if (pendingReservation.clientId) {
            console.log(`⚠️ [Sofia V3] Cliente já registrado (${pendingReservation.clientId}) - Sofia deve criar reserva!`);
          }
        }
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
        model: 'gpt-4o-mini',
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
          
          // VALIDAÇÃO DE IDs: Corrigir IDs inválidos usando o contexto
          if ((functionName === 'get_property_details' || functionName === 'calculate_price' || 
               functionName === 'send_property_media' || functionName === 'create_reservation') && 
              args.propertyId) {
            
            const availableIds = context.context.interestedProperties || [];
            const requestedId = args.propertyId;
            
            // Se está usando ID fictício mas temos IDs reais disponíveis
            if ((requestedId === 'ABC123' || requestedId === '1' || requestedId === '2' || 
                 requestedId === 'primeira' || requestedId === 'primeira opção') && 
                availableIds.length > 0) {
              
              console.log(`🚨 [Sofia V3] CORRIGINDO ID INVÁLIDO: "${requestedId}" → "${availableIds[0]}"`);
              args.propertyId = availableIds[0]; // Usar o primeiro ID real disponível
            }
            
            // Se está usando ID inválido e não temos IDs disponíveis
            else if (!availableIds.includes(requestedId) && availableIds.length > 0) {
              console.log(`⚠️ [Sofia V3] ID não encontrado no contexto: "${requestedId}". IDs disponíveis:`, availableIds);
              console.log(`🔧 [Sofia V3] Usando primeiro ID disponível: "${availableIds[0]}"`);
              args.propertyId = availableIds[0];
            }
            
            // PROTEÇÃO EXTRA: Detectar se propertyId é igual ao clientId (erro comum)
            else if (functionName === 'create_reservation' && context.context.pendingReservation?.clientId && 
                     requestedId === context.context.pendingReservation.clientId && availableIds.length > 0) {
              console.log(`🚨 [Sofia V3] ERRO DETECTADO: PropertyId igual a ClientId! "${requestedId}"`);
              console.log(`🔧 [Sofia V3] CORRIGINDO: PropertyId → "${availableIds[0]}"`);
              args.propertyId = availableIds[0];
            }
          }
          
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

            // TRIGGER AUTOMÁTICO: Se registrou cliente com sucesso, deve criar reserva
            if (functionName === 'register_client' && result.success && result.client && result.client.id) {
              console.log(`🚨 [Sofia V3] TRIGGER AUTOMÁTICO: Cliente registrado, deve criar reserva na próxima iteração!`);
            }
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
          model: 'gpt-4o-mini',
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

        case 'send_property_media':
          if (result.success && result.property) {
            // Marcar que cliente viu mídia desta propriedade
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
          }
          updates.stage = 'presentation';
          break;

        case 'register_client':
          if (result.success && result.client) {
            // Agora result.client deve ser apenas o ID string
            const clientId = result.client; // Deve ser string agora
            const clientName = result.clientData ? result.clientData.name : 'Cliente';
            
            updates.clientData = { 
              ...updates.clientData, 
              name: clientName
            };
            
            // PRESERVAR dados existentes da reserva pendente e apenas adicionar clientId
            // Obter contexto atual para não perder propertyId, checkIn, checkOut, etc.
            const currentContext = await conversationContextService.getOrCreateContext(clientPhone, tenantId);
            const existingReservation = currentContext.context.pendingReservation || {};
            
            updates.pendingReservation = {
              ...existingReservation, // PRESERVAR todos os dados existentes
              clientId: clientId      // Adicionar apenas o clientId
            };
            
            console.log(`👤 [Sofia V3] Cliente registrado com ID: ${clientId}`);
            console.log(`⚠️ [Sofia V3] ATENÇÃO: Sofia deve chamar create_reservation IMEDIATAMENTE após register_client!`);
            console.log(`🔍 [Sofia V3] DEBUG - Tipo do result.client:`, typeof result.client);
            console.log(`🔍 [Sofia V3] DEBUG - ClientId:`, clientId);
            console.log(`🔍 [Sofia V3] DEBUG - Reserva pendente preservada:`, updates.pendingReservation);
          }
          break;

        case 'create_reservation':
          if (result.success) {
            updates.stage = 'closing';
            // Limpar reserva pendente após sucesso
            updates.pendingReservation = {};
          }
          break;

        case 'check_visit_availability':
          if (result.success && result.availableSlots) {
            updates.lastAction = 'checked_visit_availability';
            updates.stage = 'scheduling';
          }
          break;

        case 'schedule_visit':
          if (result.success) {
            updates.stage = 'visit_scheduled';
            updates.lastAction = 'visit_scheduled';
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