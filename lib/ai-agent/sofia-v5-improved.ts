// lib/ai-agent/sofia-v5-improved.ts
// SOFIA V5 - AGENTE INTELIGENTE FINAL CORRIGIDO
// Integra todas as correções críticas para IDs e contexto

import { OpenAI } from 'openai';
import { smartSummaryService, SmartSummary } from './smart-summary-service';
import { getOpenAIFunctions, AgentFunctions } from '@/lib/ai/agent-functions';
import { conversationContextService } from '@/lib/services/conversation-context-service';
import { logger } from '@/lib/utils/logger';

// ===== PROMPT FINAL CORRIGIDO =====
const SOFIA_V5_PROMPT = `Você é Sofia, consultora imobiliária especializada em locação por temporada.

🚨 REGRA CRÍTICA #1 - IDs DE PROPRIEDADES (MAIS IMPORTANTE):
- JAMAIS use IDs fictícios como "primeira", "segunda", "ABC123", "1", "2", "3"
- SEMPRE use IDs REAIS retornados pelas funções (começam com 20+ caracteres aleatórios)
- EXEMPLOS CORRETOS: "2a3b4c5d6e7f8g9h0i1j2k3l", "prop_abc123xyz789def456"
- EXEMPLOS INCORRETOS: "primeira", "1", "2", "abc123", "property1" ❌
- SE não tiver ID real, execute search_properties PRIMEIRO
- NUNCA invente IDs - isso causa FALHAS CRÍTICAS no sistema!

🔧 FLUXO OBRIGATÓRIO PARA EVITAR ERROS:
1. Cliente quer aluguel → EXECUTE search_properties → obter IDs reais
2. Cliente pergunta preço → EXECUTE calculate_price(propertyId: ID_REAL_DA_BUSCA)
3. Cliente quer fotos → EXECUTE send_property_media(propertyId: ID_REAL_DA_BUSCA)
4. NUNCA use IDs inventados como "primeira" - sistema VAI FALHAR!

⚡ EXECUÇÃO IMEDIATA DE FUNÇÕES (CRÍTICO):
- "apartamento para 2 pessoas" → EXECUTE search_properties(guests: 2) IMEDIATAMENTE
- "quanto custa?" → EXECUTE calculate_price(propertyId: usar_ID_real_das_propriedades_já_vistas)
- "tem fotos?" → EXECUTE send_property_media(propertyId: usar_ID_real)
- SE não tiver ID real válido → EXECUTE search_properties PRIMEIRO!

🚨 REGRA CRÍTICA #2 - USAR SEMPRE O CONTEXTO:
- LEIA o RESUMO DA CONVERSA antes de qualquer ação
- NÃO repita buscas se já tem propriedades válidas
- NÃO pergunte informações já coletadas
- USE propriedades já vistas para cálculos/fotos
- SE sumário tem dados, USE-OS!

🎯 SEJA NATURAL E HUMANA:
- Responda cumprimentos de forma calorosa primeiro
- Use emojis naturalmente 😊 🏠 💰 📸
- Fale como consultora real, não robô
- Faça transições suaves para negócios
- Mostre entusiasmo genuíno

💬 EXEMPLOS DE RESPOSTAS CORRETAS:
✅ "Oi! Tudo bem? 😊 Está planejando alguma viagem especial?"
✅ "Achei apartamentos lindos para vocês! Quer ver as opções? 🏠"
✅ "Deixe-me calcular o valor exato para essas datas! 💰"
✅ "Vou enviar as fotos dessa propriedade agora! 📸"

❌ NUNCA FAÇA (EXEMPLOS DO QUE NÃO FAZER):
❌ "Para buscar propriedades preciso de informações..."
❌ calculate_price(propertyId: "primeira") ← ISSO VAI FALHAR!
❌ "Vou executar a função search_properties..." ← Seja natural!
❌ Seja robótica: "Executando função..." ← Fale humanamente!

🚨 REGRAS PARA EVITAR FALHAS DO SISTEMA:
1. SEMPRE valide se tem ID real antes de calcular preço
2. SE não tem propriedades no resumo → EXECUTE search_properties
3. SE cliente pergunta preço SEM propriedade escolhida → busque primeiro
4. USE o ID EXATO retornado por search_properties
5. JAMAIS invente ou abrevie IDs

💰 FLUXO CORRETO PARA PREÇOS (EVITA ERROS):
- Cliente: "quanto custa?"
- Você: VERIFIQUE resumo → TEM propriedades? → SIM: use ID real → NÃO: busque primeiro
- SEMPRE: calculate_price(propertyId: "ID_REAL_DE_20+_CARACTERES")

📸 FLUXO CORRETO PARA FOTOS (EVITA ERROS):
- Cliente: "tem fotos?"
- Você: VERIFIQUE resumo → TEM propriedades? → SIM: use ID real → NÃO: busque primeiro
- SEMPRE: send_property_media(propertyId: "ID_REAL_DE_20+_CARACTERES")

🏆 REGRAS PARA RESERVAS:
- SEMPRE calcule preço ANTES de criar reserva
- USE propertyId REAL das propriedades já vistas
- Confirme dados importantes antes de finalizar

LEMBRE-SE: IDs reais são CRÍTICOS! Um ID errado = sistema falha = cliente frustrado!
Use SEMPRE os IDs REAIS retornados pelas funções! Isso evita 90% dos problemas!`;

// ===== INTERFACES =====

interface SofiaV5Input {
  message: string;
  clientPhone: string;
  tenantId: string;
  metadata?: {
    source: 'whatsapp' | 'web' | 'api';
    priority?: 'low' | 'normal' | 'high';
  };
}

interface SofiaV5Response {
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

// ===== CLASSE PRINCIPAL =====

export class SofiaV5Agent {
  private openai: OpenAI;
  private static instance: SofiaV5Agent;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): SofiaV5Agent {
    if (!this.instance) {
      logger.info('🚀 [Sofia V5] Criando nova instância inteligente');
      this.instance = new SofiaV5Agent();
    }
    return this.instance;
  }

  async processMessage(input: SofiaV5Input): Promise<SofiaV5Response> {
    const startTime = Date.now();
    const functionsExecuted: string[] = [];

    try {
      logger.info('💬 [Sofia V5] Processando mensagem', {
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

      const conversationHistory = this.getConversationHistory(context);

      // 2. Obter e atualizar sumário inteligente
      const currentSummary = context.context.smartSummary || null;
      let updatedSummary = await smartSummaryService.updateSummary(
          input.message,
          currentSummary,
          conversationHistory
      );

      logger.info('🧠 [Sofia V5] Sumário atualizado', {
        stage: updatedSummary.conversationState.stage,
        propertiesCount: updatedSummary.propertiesViewed.length,
        hasValidProperties: updatedSummary.propertiesViewed.filter(p =>
            p.id && p.id.length >= 15 && !this.isInvalidPropertyId(p.id)
        ).length,
        guests: updatedSummary.searchCriteria.guests,
        hasClientInfo: !!updatedSummary.clientInfo.name
      });

      // 3. Validar consistência do sumário
      const validation = smartSummaryService.validateSummaryConsistency(updatedSummary);
      if (!validation.isValid) {
        logger.warn('⚠️ [Sofia V5] Sumário inconsistente detectado', {
          issues: validation.issues,
          fixes: validation.fixes
        });

        // Aplicar correções automáticas
        if (validation.fixes.stageCorrection) {
          updatedSummary.conversationState.stage = validation.fixes.stageCorrection;
        }
      }

      // 4. Detectar mensagens casuais e responder naturalmente
      const isCasualMessage = this.isCasualMessage(input.message);
      if (isCasualMessage && updatedSummary.conversationState.stage === 'greeting') {
        logger.info('💬 [Sofia V5] Processando mensagem casual');
        return await this.handleCasualMessage(input, updatedSummary, startTime);
      }

      // 5. Construir mensagens com validação crítica de IDs
      const messages = this.buildIntelligentMessages(
          input.message,
          updatedSummary,
          conversationHistory
      );

      // 6. Primeira chamada OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        tools: getOpenAIFunctions(),
        tool_choice: 'auto',
        max_tokens: 1000,
        temperature: 0.7
      });

      const response = completion.choices[0].message;
      let reply = response.content || '';
      const actions: any[] = [];
      let totalTokens = completion.usage?.total_tokens || 0;

      // 7. Processar function calls com validação crítica
      if (response.tool_calls && response.tool_calls.length > 0) {
        logger.info('🔧 [Sofia V5] Processando function calls', {
          count: response.tool_calls.length,
          functions: response.tool_calls.map(tc => tc.function.name)
        });

        const { finalReply, finalTokens, executedFunctions, updatedSummaryFromFunctions } =
            await this.processFunctionCalls(
                response.tool_calls,
                messages,
                updatedSummary,
                input.tenantId
            );

        reply = finalReply || reply;
        totalTokens += finalTokens;
        functionsExecuted.push(...executedFunctions);
        actions.push(...executedFunctions.map(f => ({ type: f })));

        // Usar sumário atualizado pelas funções
        updatedSummary = updatedSummaryFromFunctions;
      }

      // 8. Salvar contexto atualizado
      await conversationContextService.updateContext(input.clientPhone, input.tenantId, {
        smartSummary: updatedSummary,
        lastAction: functionsExecuted[functionsExecuted.length - 1] || 'chat',
        stage: updatedSummary.conversationState.stage
      });

      // 9. Salvar histórico
      await this.saveConversationHistory(input, reply, totalTokens);

      const responseTime = Date.now() - startTime;

      logger.info('✅ [Sofia V5] Mensagem processada com sucesso', {
        responseTime: `${responseTime}ms`,
        tokensUsed: totalTokens,
        functionsExecuted,
        stage: updatedSummary.conversationState.stage,
        confidence: Math.round(updatedSummary.nextBestAction.confidence * 100),
        replyLength: reply.length
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

  // ===== MÉTODOS AUXILIARES CORRIGIDOS =====

  /**
   * CRÍTICO: Processar function calls com validação de IDs
   */
  private async processFunctionCalls(
      toolCalls: any[],
      messages: any[],
      summary: SmartSummary,
      tenantId: string
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

      logger.info('🔧 [Sofia V5] Processando função', {
        functionName,
        args: {
          propertyId: args.propertyId?.substring(0, 10) + '...' || 'N/A',
          guests: args.guests,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          hasOtherArgs: Object.keys(args).length > 4
        }
      });

      // ✅ VALIDAÇÃO CRÍTICA DE ARGUMENTOS
      const validationResult = this.validateAndFixArguments(args, updatedSummary, functionName);

      if (validationResult._skipExecution) {
        logger.warn('⚠️ [Sofia V5] Execução de função pulada', {
          function: functionName,
          reason: validationResult._errorMessage || 'Dados já disponíveis'
        });

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            success: true,
            message: validationResult._errorMessage || 'Usando dados já coletados anteriormente',
            data: updatedSummary.propertiesViewed,
            skipped: true
          })
        });
        continue;
      }

      if (validationResult._needsPropertySearch) {
        logger.warn('⚠️ [Sofia V5] Precisa buscar propriedades primeiro');

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            success: false,
            message: 'Preciso buscar as propriedades disponíveis primeiro. Para quantas pessoas seria?',
            suggestion: 'search_properties',
            needsPropertySearch: true
          })
        });
        continue;
      }

      if (validationResult._needsPriceCalculation) {
        logger.warn('⚠️ [Sofia V5] Operação bloqueada - precisa calcular preço primeiro');

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            success: false,
            message: 'Preciso calcular o preço antes de fazer a reserva. Você já decidiu as datas?',
            suggestion: 'calculate_price'
          })
        });
        continue;
      }

      // Usar argumentos validados
      args = validationResult;

      try {
        logger.info('⚡ [executeFunction] Executando função validada', {
          functionName,
          validatedArgs: {
            propertyId: args.propertyId?.substring(0, 10) + '...' || 'N/A',
            hasRequiredArgs: this.hasRequiredArgs(functionName, args)
          }
        });

        const result = await AgentFunctions.executeFunction(
            functionName,
            args,
            tenantId
        );

        executedFunctions.push(functionName);

        logger.info(result.success ? '✅ [executeFunction] Função executada com sucesso' : '❌ [executeFunction] Função falhou', {
          functionName,
          success: result.success,
          hasData: !!(result.properties || result.media || result.calculation || result.client),
          message: result.message?.substring(0, 100) + '...' || 'N/A'
        });

        // ✅ ATUALIZAR SUMÁRIO COM RESULTADO
        updatedSummary = await smartSummaryService.updateSummaryWithFunctionResult(
            updatedSummary,
            functionName,
            args,
            result
        );

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });

      } catch (error) {
        logger.error('❌ [Sofia V5] Erro na execução da função', {
          functionName,
          error: error instanceof Error ? error.message : 'Unknown error',
          args: {
            propertyId: args.propertyId?.substring(0, 10) + '...' || 'N/A'
          }
        });

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

    // Segunda chamada para resposta final contextual
    const followUpMessages = [...messages.slice(0, -1), ...toolMessages];
    const followUp = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: followUpMessages as any,
      max_tokens: 250,
      temperature: 0.8
    });

    return {
      finalReply: followUp.choices[0].message.content || '',
      finalTokens: followUp.usage?.total_tokens || 0,
      executedFunctions,
      updatedSummaryFromFunctions: updatedSummary
    };
  }

  /**
   * CRÍTICO: Construir mensagens com validação de IDs
   */
  private buildIntelligentMessages(
      userMessage: string,
      summary: SmartSummary,
      history: Array<{ role: string; content: string }>
  ): Array<{ role: string; content: string }> {
    const messages = [
      {
        role: 'system',
        content: SOFIA_V5_PROMPT
      }
    ];

    // ✅ NOVO: Context-Aware Prompting com inteligência temporal
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();
    
    messages.push({
      role: 'system',
      content: `🗓️ CONTEXTO TEMPORAL ATUAL (CRÍTICO):
Data de hoje: ${currentDay}/${currentMonth}/${currentYear}
Ano atual: ${currentYear}

⚠️ REGRA CRÍTICA DE DATAS:
- SEMPRE use o ano ${currentYear} para qualquer data
- JAMAIS use anos passados como 2023 ou 2024
- Se o cliente mencionar datas sem ano, assuma ${currentYear}
- Se detectar datas no passado, corrija automaticamente para ${currentYear}
- Para cálculos de preço, sempre use datas futuras válidas

EXEMPLOS CORRETOS:
- "20/03/2025" ✅ (ano atual)
- "15/07/2025" ✅ (ano atual)
- "dezembro de 2025" ✅ (ano atual)

EXEMPLOS INCORRETOS (NUNCA USE):
- "20/03/2023" ❌ (ano passado)
- "15/07/2024" ❌ (ano passado)
- Qualquer data anterior a ${currentYear} ❌

🎯 AÇÃO REQUERIDA: Se precisar calcular preços ou trabalhar com datas, SEMPRE confirme que está usando ${currentYear}!`
    });

    // ✅ VALIDAÇÃO CRÍTICA DE PROPRIEDADES E IDs
    if (summary.propertiesViewed && summary.propertiesViewed.length > 0) {
      const validProperties = summary.propertiesViewed.filter(p =>
          p.id &&
          p.id.length >= 15 &&
          !this.isInvalidPropertyId(p.id)
      );

      if (validProperties.length > 0) {
        logger.info('🏠 [Sofia V5] Propriedades válidas encontradas no contexto', {
          totalProperties: summary.propertiesViewed.length,
          validProperties: validProperties.length,
          firstValidId: validProperties[0].id?.substring(0, 10) + '...'
        });

        messages.push({
          role: 'system',
          content: `🏠 PROPRIEDADES VÁLIDAS DISPONÍVEIS (USE ESTES IDs REAIS):

${validProperties.map((p, index) => `${index + 1}. "${p.name}" 
   🆔 ID REAL: "${p.id}"
   💰 Preço: R$${p.price}/dia
   ${p.location ? `📍 Local: ${p.location}` : ''}
   ${p.interested ? '💖 CLIENTE INTERESSADO' : ''}
   ${p.photosViewed ? '📸 Fotos já vistas' : ''}
   ${p.priceCalculated ? '💰 Preço já calculado' : ''}
`).join('\n')}

⚠️ CRÍTICO: Use APENAS estes IDs reais! JAMAIS use "primeira", "segunda", números!

EXEMPLOS DE USO CORRETO:
📸 Para fotos: send_property_media(propertyId: "${validProperties[0].id}")
💰 Para preços: calculate_price(propertyId: "${validProperties[0].id}")
🏆 Para reservas: create_reservation(propertyId: "${validProperties[0].id}")

SE cliente não especificar qual propriedade, use a primeira: "${validProperties[0].id}"`
        });
      } else {
        logger.warn('⚠️ [Sofia V5] Propriedades com IDs inválidos detectadas', {
          totalProperties: summary.propertiesViewed.length,
          invalidIds: summary.propertiesViewed.map(p => p.id)
        });

        messages.push({
          role: 'system',
          content: `⚠️ ALERTA CRÍTICO: Propriedades anteriores têm IDs inválidos!
IDs problemáticos encontrados: ${summary.propertiesViewed.map(p => p.id).join(', ')}

AÇÃO OBRIGATÓRIA: Se cliente pedir preços/fotos/detalhes → EXECUTE search_properties PRIMEIRO!
JAMAIS use IDs inválidos - isso causará falha no sistema!`
        });
      }
    } else {
      logger.info('🔍 [Sofia V5] Nenhuma propriedade no contexto');

      // Detectar se cliente está perguntando sobre propriedades sem ter buscado
      const lowerMessage = userMessage.toLowerCase();
      if (lowerMessage.includes('preço') || lowerMessage.includes('valor') ||
          lowerMessage.includes('quanto') || lowerMessage.includes('fotos')) {
        messages.push({
          role: 'system',
          content: `🚨 ALERTA: Cliente pergunta sobre preços/fotos mas não temos propriedades!
AÇÃO OBRIGATÓRIA: Execute search_properties PRIMEIRO para obter propriedades com IDs válidos!
JAMAIS tente calcular preços ou enviar fotos sem ter propriedades buscadas!`
        });
      }
    }

    // Adicionar sumário formatado
    messages.push({
      role: 'system',
      content: smartSummaryService.formatForPrompt(summary)
    });

    // Adicionar contexto específico baseado na mensagem
    const contextualHints = this.getContextualHints(summary, userMessage);
    if (contextualHints) {
      messages.push({
        role: 'system',
        content: contextualHints
      });
    }

    // Histórico recente (últimas 6 mensagens)
    const recentHistory = history.slice(-6);
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
   * NOVO: Gerar hints contextuais baseados na mensagem
   */
  private getContextualHints(summary: SmartSummary, userMessage: string): string | null {
    const hints: string[] = [];
    const lowerMessage = userMessage.toLowerCase();

    // Hints para busca de propriedades
    if ((lowerMessage.includes('apartamento') || lowerMessage.includes('casa') ||
            lowerMessage.includes('alugar') || lowerMessage.includes('aluguel')) &&
        summary.propertiesViewed.length === 0) {
      hints.push('🚨 EXECUTAR IMEDIATAMENTE: search_properties');

      // Detectar número de pessoas
      const guestMatch = userMessage.match(/(\d+)\s*pessoas?/i) ||
          userMessage.match(/para\s+(\d+)/i) ||
          userMessage.match(/(\d+)\s*hóspedes?/i);

      if (guestMatch) {
        hints.push(`✅ USAR: guests: ${guestMatch[1]}`);
      } else if (lowerMessage.includes('casal') || lowerMessage.includes('nós dois')) {
        hints.push('✅ USAR: guests: 2 (casal detectado)');
      }
    }

    // Hints para preços
    if ((lowerMessage.includes('preço') || lowerMessage.includes('valor') ||
            lowerMessage.includes('quanto') || lowerMessage.includes('custa')) &&
        summary.propertiesViewed.length > 0) {
      const validProperty = summary.propertiesViewed.find(p =>
          p.id && p.id.length >= 15 && !this.isInvalidPropertyId(p.id)
      );

      if (validProperty) {
        hints.push(`💰 EXECUTAR: calculate_price(propertyId: "${validProperty.id}")`);
        if (summary.searchCriteria.checkIn && summary.searchCriteria.checkOut) {
          hints.push(`✅ USAR DATAS DO CONTEXTO: ${summary.searchCriteria.checkIn} a ${summary.searchCriteria.checkOut}`);
        }
      } else {
        hints.push('⚠️ PROBLEMA: Propriedades têm IDs inválidos, executar search_properties primeiro!');
      }
    }

    // Hints para fotos
    if ((lowerMessage.includes('foto') || lowerMessage.includes('imagem') ||
            lowerMessage.includes('ver') || lowerMessage.includes('mostrar')) &&
        summary.propertiesViewed.length > 0) {
      const validProperty = summary.propertiesViewed.find(p =>
          p.id && p.id.length >= 15 && !this.isInvalidPropertyId(p.id)
      );

      if (validProperty) {
        hints.push(`📸 EXECUTAR: send_property_media(propertyId: "${validProperty.id}")`);
      } else {
        hints.push('⚠️ PROBLEMA: Propriedades têm IDs inválidos, executar search_properties primeiro!');
      }
    }

    return hints.length > 0 ? hints.join('\n') : null;
  }

  /**
   * CRÍTICO: Validar e corrigir argumentos das funções
   */
  private validateAndFixArguments(
      args: any,
      summary: SmartSummary,
      functionName: string
  ): any {
    const fixedArgs = { ...args };

    logger.info('🔍 [Sofia V5] Validando argumentos da função', {
      functionName,
      hasPropertyId: !!args.propertyId,
      propertyId: args.propertyId?.substring(0, 10) + '...' || 'N/A',
      propertiesInSummary: summary.propertiesViewed.length
    });

    switch (functionName) {
      case 'calculate_price':
      case 'send_property_media':
      case 'get_property_details':
        // Validação crítica de propertyId
        if (!args.propertyId || this.isInvalidPropertyId(args.propertyId)) {
          logger.warn('🚨 [Sofia V5] PropertyId inválido ou ausente', {
            provided: args.propertyId,
            isInvalid: this.isInvalidPropertyId(args.propertyId || ''),
            function: functionName
          });

          // Tentar usar propriedade do contexto
          const validProperties = summary.propertiesViewed.filter(p =>
              p.id && p.id.length >= 15 && !this.isInvalidPropertyId(p.id)
          );

          if (validProperties.length > 0) {
            // Usar propriedade interessada ou primeira válida
            const interestedProperty = validProperties.find(p => p.interested);
            const selectedProperty = interestedProperty || validProperties[0];

            fixedArgs.propertyId = selectedProperty.id;
            logger.info('✅ [Sofia V5] PropertyId corrigido automaticamente', {
              function: functionName,
              originalId: args.propertyId,
              correctedId: selectedProperty.id?.substring(0, 10) + '...',
              propertyName: selectedProperty.name,
              wasInterested: !!interestedProperty
            });
          } else {
            // Não tem propriedades válidas - precisa buscar primeiro
            logger.warn('⚠️ [Sofia V5] Não há propriedades válidas no contexto', {
              totalProperties: summary.propertiesViewed.length,
              function: functionName
            });

            fixedArgs._needsPropertySearch = true;
            return fixedArgs;
          }
        }

        // Validação específica para calculate_price
        if (functionName === 'calculate_price') {
          if (!args.checkIn || !args.checkOut) {
            // Tentar usar datas do sumário
            if (summary.searchCriteria.checkIn && summary.searchCriteria.checkOut) {
              fixedArgs.checkIn = summary.searchCriteria.checkIn;
              fixedArgs.checkOut = summary.searchCriteria.checkOut;
              logger.info('✅ [Sofia V5] Datas preenchidas do contexto', {
                checkIn: fixedArgs.checkIn,
                checkOut: fixedArgs.checkOut
              });
            } else {
              logger.warn('⚠️ [Sofia V5] Datas não disponíveis', {
                hasCheckIn: !!args.checkIn,
                hasCheckOut: !!args.checkOut,
                summaryCheckIn: summary.searchCriteria.checkIn,
                summaryCheckOut: summary.searchCriteria.checkOut
              });

              fixedArgs._skipExecution = true;
              fixedArgs._errorMessage = 'Para calcular o preço, preciso saber as datas da hospedagem. Quando seria o check-in e check-out?';
              return fixedArgs;
            }
          }

          if (!args.guests && summary.searchCriteria.guests) {
            fixedArgs.guests = summary.searchCriteria.guests;
            logger.info('✅ [Sofia V5] Guests preenchido do contexto', { guests: fixedArgs.guests });
          }
        }
        break;

      case 'create_reservation':
        // Verificar se tem preço calculado
        const hasCalculatedPrice = summary.propertiesViewed.some(p => p.priceCalculated);
        if (!hasCalculatedPrice) {
          logger.warn('⚠️ [Sofia V5] Tentativa de reserva sem preço calculado');
          fixedArgs._needsPriceCalculation = true;
          return fixedArgs;
        }

        // Validar propertyId para reserva
        if (!args.propertyId || this.isInvalidPropertyId(args.propertyId)) {
          const interestedProperty = summary.propertiesViewed.find(p =>
              p.interested && p.id && p.id.length >= 15 && !this.isInvalidPropertyId(p.id)
          );

          if (interestedProperty) {
            fixedArgs.propertyId = interestedProperty.id;
            logger.info('✅ [Sofia V5] PropertyId para reserva corrigido', {
              correctedId: interestedProperty.id?.substring(0, 10) + '...',
              propertyName: interestedProperty.name
            });
          }
        }
        break;

      case 'search_properties':
        // Verificar se busca é realmente necessária
        if (summary.propertiesViewed.length > 0) {
          const hasValidProperties = summary.propertiesViewed.some(p =>
              p.id && p.id.length >= 15 && !this.isInvalidPropertyId(p.id)
          );

          if (hasValidProperties) {
            const currentCriteria = summary.searchCriteria;
            const sameGuests = !args.guests || args.guests === currentCriteria.guests;
            const sameLocation = !args.location || args.location === currentCriteria.location;
            const sameDates = (!args.checkIn && !args.checkOut) ||
                (args.checkIn === currentCriteria.checkIn && args.checkOut === currentCriteria.checkOut);

            if (sameGuests && sameLocation && sameDates) {
              logger.warn('⚠️ [Sofia V5] Busca desnecessária evitada', {
                existingProperties: summary.propertiesViewed.length,
                validProperties: summary.propertiesViewed.filter(p =>
                    p.id && p.id.length >= 15 && !this.isInvalidPropertyId(p.id)
                ).length,
                currentCriteria
              });

              fixedArgs._skipExecution = true;
              fixedArgs._errorMessage = 'Já encontrei ótimas opções para você! Quer ver os detalhes ou calcular preços?';
              return fixedArgs;
            }
          }
        }
        break;
    }

    logger.info('✅ [Sofia V5] Argumentos validados', {
      functionName,
      finalPropertyId: fixedArgs.propertyId?.substring(0, 10) + '...' || 'N/A',
      hasRequiredArgs: this.hasRequiredArgs(functionName, fixedArgs)
    });

    return fixedArgs;
  }

  /**
   * NOVA FUNÇÃO: Verificar se tem argumentos obrigatórios
   */
  private hasRequiredArgs(functionName: string, args: any): boolean {
    switch (functionName) {
      case 'search_properties':
        return true; // Busca pode ser feita sem argumentos
      case 'calculate_price':
        return !!(args.propertyId && args.checkIn && args.checkOut);
      case 'send_property_media':
      case 'get_property_details':
        return !!args.propertyId;
      case 'register_client':
        return !!(args.name && args.phone && args.document);
      case 'create_reservation':
        return !!(args.clientId && args.propertyId && args.checkIn && args.checkOut);
      default:
        return true;
    }
  }

  /**
   * NOVA FUNÇÃO: Detectar IDs inválidos
   */
  private isInvalidPropertyId(id: string): boolean {
    if (!id) return true;

    const invalidPatterns = [
      'primeira', 'segunda', 'terceira', 'quarta', 'quinta',
      'primeira_opcao', 'segunda_opcao', 'terceira_opcao',
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      'abc123', 'property1', 'property2', 'prop1', 'prop2',
      'apto1', 'apartamento1', 'casa1', 'imovel1',
      'default', 'example', 'test', 'sample', 'demo'
    ];

    const isInvalid = invalidPatterns.includes(id.toLowerCase()) ||
        id.length < 15 ||
        /^[0-9]{1,3}$/.test(id) ||
        /^[A-Z]{3}[0-9]{3}$/.test(id);

    if (isInvalid) {
      logger.warn('🚨 [Sofia V5] ID inválido detectado', {
        id,
        reason: invalidPatterns.includes(id.toLowerCase()) ? 'padrão conhecido' :
            id.length < 15 ? 'muito curto' : 'formato inválido'
      });
    }

    return isInvalid;
  }

  /**
   * Detectar mensagens casuais
   */
  private isCasualMessage(message: string): boolean {
    const casualPatterns = [
      /^(oi|olá|oie|ola)$/i,
      /^(como você está|como está|tudo bem|td bem).*$/i,
      /^(como vai|como vao as coisas).*$/i,
      /^(bom dia|boa tarde|boa noite).*$/i,
      /^(como você está hoje|como está hoje).*$/i
    ];

    const normalizedMessage = message.trim().toLowerCase();
    const result = casualPatterns.some(pattern => pattern.test(normalizedMessage));

    logger.info('🔍 [Sofia V5] Detecção de mensagem casual', {
      message: normalizedMessage,
      isCasual: result
    });

    return result;
  }

  /**
   * Gerar resposta casual natural
   */
  private generateCasualResponse(message: string): string {
    const normalizedMessage = message.trim().toLowerCase();

    if (normalizedMessage.includes('como está') || normalizedMessage.includes('como você está')) {
      return "Estou ótima, obrigada por perguntar! 😊 E você, como está? Está planejando alguma viagem especial?";
    }

    if (normalizedMessage === 'oi' || normalizedMessage === 'olá' || normalizedMessage === 'oie') {
      return "Oi! Tudo bem? 😊 Como posso te ajudar hoje? Está pensando em alguma viagem ou temporada?";
    }

    if (normalizedMessage.includes('tudo bem') || normalizedMessage.includes('td bem')) {
      return "Tudo ótimo por aqui, obrigada! 😊 E com você, como estão as coisas? Algum plano de viagem em mente?";
    }

    if (normalizedMessage.includes('bom dia')) {
      return "Bom dia! 🌅 Espero que seu dia esteja começando bem! Em que posso te ajudar hoje?";
    }

    if (normalizedMessage.includes('boa tarde')) {
      return "Boa tarde! ☀️ Como está seu dia? Posso te ajudar com alguma coisa?";
    }

    if (normalizedMessage.includes('boa noite')) {
      return "Boa noite! 🌙 Como foi seu dia? Em que posso te ajudar?";
    }

    // Fallback genérico
    return "Oi! Tudo bem? 😊 Como posso te ajudar hoje?";
  }

  /**
   * Lidar com mensagens casuais
   */
  private async handleCasualMessage(input: SofiaV5Input, summary: SmartSummary, startTime: number): Promise<SofiaV5Response> {
    const casualResponse = this.generateCasualResponse(input.message);

    await conversationContextService.updateContext(input.clientPhone, input.tenantId, {
      smartSummary: summary,
      lastAction: 'casual_chat',
      stage: 'greeting'
    });

    await this.saveConversationHistory(input, casualResponse, 50);

    const responseTime = Date.now() - startTime;

    logger.info('💬 [Sofia V5] Resposta casual gerada', {
      responseTime: `${responseTime}ms`,
      responseLength: casualResponse.length
    });

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
   * Lidar com erros
   */
  private handleError(error: any, input: SofiaV5Input, startTime: number): SofiaV5Response {
    const responseTime = Date.now() - startTime;

    logger.error('❌ [Sofia V5] Erro ao processar mensagem', {
      error: error instanceof Error ? error.message : 'Unknown error',
      clientPhone: this.maskPhone(input.clientPhone),
      messagePreview: input.message.substring(0, 50) + '...',
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
   * Obter histórico da conversa
   */
  private getConversationHistory(context: any): Array<{ role: string; content: string }> {
    try {
      return context.context.messageHistory?.slice(-10) || [];
    } catch (error) {
      logger.warn('⚠️ [Sofia V5] Erro ao obter histórico', { error });
      return [];
    }
  }

  /**
   * Salvar histórico da conversa
   */
  private async saveConversationHistory(
      input: SofiaV5Input,
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
      logger.error('❌ [Sofia V5] Erro ao salvar histórico', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Mascarar telefone para logs
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.substring(0, 2) + '***' + phone.substring(phone.length - 2);
  }
}

// Exportar instância singleton
export const sofiaV5Agent = SofiaV5Agent.getInstance();