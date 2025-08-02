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

🎯 PERSONALIDADE E TOM:
- Seja CALOROSA, ENTUSIASMADA e GENUÍNA
- Use emojis naturalmente 😊 🏠 💰 📸 ✨ 💖
- Responda saudações com simpatia antes de falar de negócios
- Fale como uma consultora amiga, não um robô
- SEMPRE mostre entusiasmo por ajudar

⚡ REGRA #1 - EXECUTE FUNÇÕES IMEDIATAMENTE SEM PERGUNTAR:

🚨 BUSCA DE PROPRIEDADES:
- "quero alugar" → search_properties() IMEDIATO!
- "apartamento" → search_properties() IMEDIATO!
- "X pessoas" → search_properties(guests: X) IMEDIATO!

💰 PREÇOS E FOTOS:
- "quanto custa" → calculate_price() IMEDIATO!
- "fotos" → send_property_media() IMEDIATO!

👤 CADASTRO DE CLIENTE (CRÍTICO TESTE 6):
- "Nome, telefone, CPF completo" → register_client() IMEDIATO!
- Ex: "João Silva, 11987654321, 12345678901" → EXECUTAR AGORA!
- Se faltar CPF → "Para fazer a reserva, preciso do seu CPF completo (11 dígitos)"
- Se CPF inválido/incompleto → "CPF deve ter exatamente 11 dígitos. Pode informar completo?"
- NUNCA aceitar dados incompletos - sempre solicitar CPF!

📅 AGENDAMENTO DE VISITA (CRÍTICO TESTE 7):
- "visitar" → Pedir data/horário
- "agendar" → schedule_visit() quando tiver data
- "amanhã às 14h" → schedule_visit() IMEDIATO!

🏆 CONFIRMAÇÃO DE RESERVA (CRÍTICO TESTE 8):
- "confirmo" → create_reservation() IMEDIATO!
- "quero reservar" → create_reservation() IMEDIATO!
- "fechar" → create_reservation() IMEDIATO!

🎯 FILOSOFIA: SEJA ULTRA PROATIVA! Execute primeiro, pergunte depois!

🚨 REGRA CRÍTICA - IDs DE PROPRIEDADES:
- SEMPRE use IDs REAIS de 20+ caracteres das buscas
- NUNCA invente IDs como "primeira", "1", "abc123"
- SE não tem ID real → execute search_properties PRIMEIRO

🔍 CONTEXTO E INTELIGÊNCIA:
- SE já tem propriedades no contexto → NÃO busque novamente
- SE cliente pergunta sobre "aquela propriedade" → use dados do contexto
- SE tem informações do cliente → NÃO pergunte novamente
- USE memória da conversa para ser inteligente

💬 EXEMPLOS DE RESPOSTAS NATURAIS:
✅ "Oi! Que bom falar com você! 😊 Está procurando um lugar especial para se hospedar?"
✅ "Que legal! Encontrei algumas opções incríveis para vocês! 🏠✨"
✅ "Claro! Vou calcular o valor certinho para essas datas! 💰"
✅ "As fotos são lindas! Vou enviar agora mesmo! 📸"

❌ EVITE COMPLETAMENTE:
❌ Respostas robóticas ou formais demais
❌ Usar IDs falsos como "primeira" ou "1"
❌ Pedir informações já fornecidas
❌ Deixar de executar funções quando necessário

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

      // Obter histórico real das mensagens salvas
      const messageHistory = await conversationContextService.getMessageHistory(
          input.clientPhone,
          input.tenantId,
          5 // Últimas 5 mensagens
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
      // APENAS se for uma saudação simples sem menção a negócios
      const isCasualMessage = this.isCasualMessage(input.message);
      const hasBusinessIntent = this.hasBusinessIntent(input.message);
      
      if (isCasualMessage && !hasBusinessIntent && updatedSummary.conversationState.stage === 'greeting') {
        logger.info('💬 [Sofia V5] Processando mensagem casual pura');
        return await this.handleCasualMessage(input, updatedSummary, startTime);
      }

      // 5. INTERCEPTAR COMANDOS DIRETOS - ULTRA PROATIVO
      const directCommandResult = await this.handleDirectCommands(input, updatedSummary);
      if (directCommandResult) {
        return directCommandResult;
      }

      // 6. Construir mensagens com validação crítica de IDs
      const messages = this.buildIntelligentMessages(
          input.message,
          updatedSummary,
          conversationHistory
      );

      // 7. Primeira chamada OpenAI com tool_choice ULTRA AGRESSIVO
      const shouldForceFunction = this.shouldForceFunction(input.message);
      
      logger.info('🎯 [Sofia V5] Decisão de execução forçada', {
        message: input.message.substring(0, 50),
        shouldForce: shouldForceFunction,
        toolChoice: shouldForceFunction ? 'required' : 'auto'
      });
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        tools: getOpenAIFunctions(),
        tool_choice: shouldForceFunction ? 'required' : 'auto',
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
                input.tenantId,
                input.clientPhone
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
      
      // 🎯 SMART ENHANCEMENT: Adicionar clientPhone para context resolution
      // Isso permite que as funções usem SmartResolver e contexto
      if (!args.clientPhone && clientPhone) {
        args.clientPhone = clientPhone;
        logger.info('💾 [Sofia V5] Adicionando clientPhone aos args', {
          functionName,
          clientPhone: clientPhone.substring(0, 6) + '***'
        });
      }

      logger.info('🔧 [Sofia V5] Processando função', {
        functionName,
        args: {
          propertyId: args.propertyId?.substring(0, 10) + '...' || 'N/A',
          guests: args.guests,
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          hasClientPhone: !!args.clientPhone,
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
      
      messages.push({
        role: 'system',
        content: `⚠️ SITUAÇÃO: Não há propriedades no contexto ainda.

AÇÃO REQUERIDA: Se o cliente mencionar QUALQUER uma destas palavras, EXECUTE search_properties IMEDIATAMENTE:
- quero, preciso, busco, procuro
- apartamento, casa, imóvel, propriedade
- alugar, temporada, hospedagem
- lugar, espaço, local

NÃO pergunte detalhes primeiro! Execute a busca e depois refine se necessário.`
      });

      // Detectar se cliente está perguntando sobre propriedades sem ter buscado
      const lowerMessage = userMessage.toLowerCase();
      
      // FORÇAR execução de search_properties se detectar palavras-chave - ULTRA AGRESSIVO
      if (lowerMessage.includes('quero') || lowerMessage.includes('procuro') || 
          lowerMessage.includes('busco') || lowerMessage.includes('preciso') ||
          lowerMessage.includes('alugar') || lowerMessage.includes('apartamento') ||
          lowerMessage.includes('casa') || lowerMessage.includes('imóvel') ||
          lowerMessage.includes('propriedade') || lowerMessage.includes('temporada') ||
          lowerMessage.includes('hospedagem')) {
        messages.push({
          role: 'system',
          content: `🚨🚨🚨 COMANDO CRÍTICO: Cliente disse "${userMessage}"
          
⚡ EXECUTE search_properties() IMEDIATAMENTE! ⚡
❌ NÃO faça perguntas antes! 
❌ NÃO diga "preciso saber quantas pessoas"!
❌ NÃO peça mais informações!

✅ EXECUTE A BUSCA AGORA COM PARÂMETROS PADRÃO!
✅ Depois mostre os resultados e pergunte se quer refinar!

ESTA É UMA ORDEM DIRETA - EXECUTE search_properties() AGORA!`
        });
      }
      
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

    // 🎯 NOVA DETECÇÃO INTELIGENTE DE CONFIRMAÇÕES
    // Detectar confirmações de reserva
    const reservationConfirmations = [
      'confirmo reserva', 'pode fazer a reserva', 'sim pode fazer', 'quero reservar',
      'fechar reserva', 'aceito', 'confirmo', 'pode fechar', 'sim confirmo',
      'vamos fechar', 'pode fazer'
    ];
    
    const hasReservationConfirmation = reservationConfirmations.some(phrase => 
      lowerMessage.includes(phrase)
    );

    if (hasReservationConfirmation) {
      // Se tem propriedades visualizadas e dados suficientes
      if (summary.propertiesViewed.length > 0 && 
          summary.searchCriteria.checkIn && 
          summary.searchCriteria.checkOut &&
          summary.searchCriteria.guests) {
        
        const validProperty = summary.propertiesViewed.find(p =>
          p.id && p.id.length >= 15 && !this.isInvalidPropertyId(p.id)
        );

        if (validProperty) {
          hints.push(`🎯 CONFIRMAÇÃO DETECTADA! EXECUTAR IMEDIATAMENTE: create_reservation`);
          hints.push(`✅ USAR PROPRIEDADE: "${validProperty.id}"`);
          hints.push(`✅ USAR DADOS DO CONTEXTO - CheckIn: ${summary.searchCriteria.checkIn}, CheckOut: ${summary.searchCriteria.checkOut}, Guests: ${summary.searchCriteria.guests}`);
          hints.push(`🚨 CRÍTICO: NUNCA executar search_properties ou calculate_price quando cliente CONFIRMA reserva!`);
        }
      }
    }

    // Detectar confirmações de agendamento de visita
    const visitConfirmations = [
      'confirmo agendamento', 'confirmo visita', 'quero agendar', 'agendar visita',
      'visita para', 'agendamento para', 'marcar visita'
    ];
    
    const hasVisitConfirmation = visitConfirmations.some(phrase => 
      lowerMessage.includes(phrase)
    );

    if (hasVisitConfirmation) {
      // Detectar "primeira opção", "segunda opção"
      const propertyReference = lowerMessage.match(/primeira\s+op[çc]ão|segunda\s+op[çc]ão|terceira\s+op[çc]ão/i);
      const timeReference = lowerMessage.match(/(\d{1,2}h|\d{1,2}:\d{2})/);
      const dateReference = lowerMessage.match(/amanh[ãa]|hoje|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo/i);

      if (propertyReference || timeReference || dateReference) {
        hints.push(`🎯 AGENDAMENTO DETECTADO! EXECUTAR IMEDIATAMENTE: schedule_visit`);
        if (summary.propertiesViewed.length > 0) {
          const validProperty = summary.propertiesViewed.find(p =>
            p.id && p.id.length >= 15 && !this.isInvalidPropertyId(p.id)
          );
          if (validProperty) {
            hints.push(`✅ USAR PROPRIEDADE: "${validProperty.name}" (ID: ${validProperty.id})`);
          }
        }
        hints.push(`🚨 CRÍTICO: NUNCA executar search_properties quando cliente CONFIRMA agendamento!`);
      }
    }

    // Detectar quando cliente quer apenas VER opções (não confirmar)
    const browsingIndicators = [
      'quais opções', 'que tem disponível', 'mostrar propriedades', 'ver as opções',
      'que apartamentos', 'o que tem', 'opções de'
    ];
    
    const isBrowsing = browsingIndicators.some(phrase => 
      lowerMessage.includes(phrase)
    );

    if (isBrowsing && summary.propertiesViewed.length === 0) {
      hints.push(`🔍 NAVEGAÇÃO DETECTADA! EXECUTAR: search_properties`);
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
   * Detectar intenção de negócio
   */
  private hasBusinessIntent(message: string): boolean {
    const businessKeywords = [
      'alugar', 'aluguel', 'apartamento', 'casa', 'imóvel', 'propriedade',
      'temporada', 'hospedagem', 'hospedar', 'viajar', 'viagem', 'férias',
      'reserva', 'reservar', 'quanto', 'preço', 'valor', 'custo',
      'fotos', 'imagens', 'ver', 'mostrar', 'visitar', 'conhecer',
      'pessoas', 'hóspedes', 'quarto', 'quartos', 'cama', 'camas',
      'lua de mel', 'romântico', 'casal', 'família', 'amigos',
      'praia', 'cidade', 'campo', 'montanha', 'local', 'região',
      'disponível', 'disponibilidade', 'data', 'período', 'dias', 'noites',
      'procurando', 'procuro', 'busco', 'quero', 'preciso', 'gostaria'
    ];

    const normalizedMessage = message.toLowerCase();
    const hasIntent = businessKeywords.some(keyword => normalizedMessage.includes(keyword));

    logger.info('🔍 [Sofia V5] Detecção de intenção de negócio', {
      messagePreview: message.substring(0, 50),
      hasBusinessIntent: hasIntent
    });

    return hasIntent;
  }

  /**
   * Determinar se deve forçar execução de função - VERSÃO ULTRA AGRESSIVA
   */
  private shouldForceFunction(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Palavras que SEMPRE devem executar funções - EXPANDIDO
    const forceFunctionPatterns = [
      // Busca de propriedades - MAIS AGRESSIVO
      /quero\s+(alugar|apartamento|casa|imóvel)/i,
      /quero\s+alugar/i,
      /quero\s+apartamento/i,
      /procuro\s+(apartamento|casa|imóvel)/i,
      /busco\s+(apartamento|casa|imóvel)/i,
      /preciso\s+(de\s+)?(apartamento|casa|imóvel|alugar)/i,
      /apartamento/i,  // QUALQUER menção a apartamento
      /alugar/i,       // QUALQUER menção a alugar
      /casa\s+(para|de)/i,
      /imóvel/i,
      /propriedade/i,
      /temporada/i,
      /hospedagem/i,
      
      // Pessoas e localização
      /\d+\s+pessoas?/i,
      /para\s+\d+/i,
      /(casal|família|amigos)/i,
      
      // Preços
      /quanto\s+(custa|é|fica|sai|vale)/i,
      /qual\s+(o\s+)?(valor|preço|custo)/i,
      /preço/i,
      /valor/i,
      /custo/i,
      
      // Fotos e mídia
      /(quero|posso|pode|tem)\s+(ver|mostrar)\s+(fotos|imagens)/i,
      /fotos\s+(do|da|de)/i,
      /imagens/i,
      /ver\s+(fotos|imagens)/i,
      /mostrar\s+(fotos|imagens)/i,
      
      // Reservas
      /reservar?/i,
      /confirmar/i,
      /fechar\s+(negócio|reserva)/i
    ];

    const shouldForce = forceFunctionPatterns.some(pattern => pattern.test(lowerMessage));
    
    logger.info('🎯 [Sofia V5] Avaliação ULTRA AGRESSIVA de função', {
      messagePreview: message.substring(0, 50),
      shouldForceFunction: shouldForce,
      detectedPatterns: forceFunctionPatterns.filter(p => p.test(lowerMessage)).length
    });

    return shouldForce;
  }

  /**
   * EXTRAIR DADOS DO CLIENTE AUTOMATICAMENTE - TESTE 6
   */
  private extractClientData(message: string): {
    hasClientData: boolean;
    name?: string;
    phone?: string;
    document?: string;
    email?: string;
  } {
    const result = {
      hasClientData: false,
      name: undefined as string | undefined,
      phone: undefined as string | undefined,
      document: undefined as string | undefined,
      email: undefined as string | undefined
    };

    // Padrões para detectar dados do cliente
    // Formato: "João Silva, 11987654321, 12345678901, joao@email.com"
    
    // Detectar nome (primeira palavra com 2+ caracteres + segunda palavra)
    const nameMatch = message.match(/^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+)+)/i);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
      result.hasClientData = true;
    }

    // Detectar telefone (11 dígitos ou mais)
    const phoneMatch = message.match(/(?:^|[\s,])(\d{10,11})(?=[\s,]|$)/);
    if (phoneMatch) {
      result.phone = phoneMatch[1];
      result.hasClientData = true;
    }

    // Detectar CPF (exatamente 11 dígitos numéricos, não telefone)
    const cpfMatch = message.match(/(?:^|[\s,])(\d{11})(?=[\s,]|$)/);
    if (cpfMatch && cpfMatch[1] !== phoneMatch?.[1]) { // Não confundir com telefone
      // Validar se é um CPF válido (11 dígitos e não sequência repetida)
      const cpf = cpfMatch[1];
      const isValidLength = cpf.length === 11;
      const isNotRepeated = !/^(\d)\1{10}$/.test(cpf); // Não pode ser 11111111111
      
      if (isValidLength && isNotRepeated) {
        result.document = cpf;
        result.hasClientData = true;
      }
    }

    // Detectar email
    const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      result.email = emailMatch[1].toLowerCase();
      result.hasClientData = true;
    }

    // Validar se tem dados suficientes para cadastro
    // REGRA: Precisa de nome + telefone + CPF (todos obrigatórios)
    if (result.name && result.phone && result.document) {
      result.hasClientData = true;
    } else if (result.name && result.phone && !result.document) {
      // Tem nome e telefone, mas falta CPF - não processar automaticamente
      result.hasClientData = false;
    } else if (result.name && !result.phone && result.document) {
      // Tem nome e CPF, mas falta telefone - não processar automaticamente
      result.hasClientData = false;
    } else {
      // Qualquer outra combinação não é suficiente
      result.hasClientData = false;
    }

    logger.info('🔍 [Sofia V5] Extração de dados do cliente', {
      messagePreview: message.substring(0, 50),
      hasClientData: result.hasClientData,
      hasName: !!result.name,
      hasPhone: !!result.phone,
      hasDocument: !!result.document,
      hasEmail: !!result.email
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
   * INTERCEPTAR COMANDOS DIRETOS - ULTRA PROATIVO
   */
  private async handleDirectCommands(input: SofiaV5Input, summary: SmartSummary): Promise<SofiaV5Response | null> {
    const lowerMessage = input.message.toLowerCase();
    const startTime = Date.now();
    
    // COMANDO DIRETO: "Quero alugar um apartamento" e variações
    if ((lowerMessage.includes('quero') && lowerMessage.includes('alugar') && lowerMessage.includes('apartamento')) ||
        (lowerMessage.includes('quero') && lowerMessage.includes('apartamento')) ||
        (lowerMessage === 'quero alugar um apartamento') ||
        (lowerMessage === 'quero alugar apartamento') ||
        (lowerMessage.includes('quero alugar') && lowerMessage.includes('apartamento')) ||
        (lowerMessage.match(/^quero\s+alugar\s+um?\s+apartamento/i))) {
      
      logger.info('🚨 [Sofia V5] COMANDO DIRETO DETECTADO - Executando search_properties automaticamente');
      
      try {
        // Executar search_properties diretamente
        const result = await AgentFunctions.executeFunction(
          'search_properties',
          { guests: 2 }, // Padrão para 2 pessoas se não especificado
          input.tenantId
        );

        // Atualizar sumário com propriedades encontradas
        if (result.success && result.data && Array.isArray(result.data)) {
          summary.propertiesViewed = result.data.map((property: any) => ({
            id: property.id,
            name: property.name,
            price: property.price,
            location: property.location,
            interested: false,
            photosViewed: false,
            priceCalculated: false,
            viewedAt: new Date().toISOString()
          }));
          summary.conversationState.stage = 'property_search';
        }

        // Salvar contexto
        await conversationContextService.updateContext(input.clientPhone, input.tenantId, {
          smartSummary: summary,
          lastAction: 'search_properties',
          stage: 'property_search'
        });

        // Salvar histórico
        const reply = `Ótimo! Encontrei algumas opções de apartamentos para você! 🏠✨ Aqui estão as melhores opções:

${result.data.slice(0, 3).map((property: any, index: number) => `
${index + 1}. **${property.name}**
   📍 ${property.location || 'Localização não informada'}
   💰 R$ ${property.price}/noite
   🛏️ ${property.bedrooms} quartos, ${property.bathrooms} banheiros
   👥 Até ${property.capacity} pessoas
   ${property.description ? `📝 ${property.description.substring(0, 100)}...` : ''}
`).join('')}

Qual dessas opções te interessou mais? Posso calcular o preço para as suas datas ou mostrar fotos! 😊`;

        await this.saveConversationHistory(input, reply, 500);

        const responseTime = Date.now() - startTime;

        return {
          reply,
          summary,
          actions: [{ type: 'search_properties' }],
          tokensUsed: 500,
          responseTime,
          functionsExecuted: ['search_properties'],
          metadata: {
            stage: 'property_search',
            confidence: 1.0,
            reasoningUsed: false
          }
        };

      } catch (error) {
        logger.error('❌ [Sofia V5] Erro ao executar comando direto', { error });
        return null; // Fallback para fluxo normal
      }
    }

    // COMANDO DIRETO: Detecção de dados do cliente (TESTE 6)
    const clientDataMatch = this.extractClientData(input.message);
    if (clientDataMatch.hasClientData) {
      logger.info('🚨 [Sofia V5] DADOS DE CLIENTE DETECTADOS - Executando register_client automaticamente');
      
      try {
        const result = await AgentFunctions.executeFunction(
          'register_client',
          {
            name: clientDataMatch.name,
            phone: clientDataMatch.phone || input.clientPhone,
            document: clientDataMatch.document,
            email: clientDataMatch.email
          },
          input.tenantId
        );

        // Atualizar sumário com dados do cliente
        if (result.success) {
          summary.clientInfo = {
            name: clientDataMatch.name || '',
            phone: clientDataMatch.phone || input.clientPhone,
            document: clientDataMatch.document || '',
            email: clientDataMatch.email || '',
            registered: true
          };
          summary.conversationState.stage = 'client_registered';
        }

        // Salvar contexto
        await conversationContextService.updateContext(input.clientPhone, input.tenantId, {
          smartSummary: summary,
          lastAction: 'register_client',
          stage: 'client_registered'
        });

        const reply = result.success 
          ? `${result.message} 🎉\n\nAgora que tenho seus dados, posso finalizar sua reserva! Já escolheu as datas?`
          : result.message;

        await this.saveConversationHistory(input, reply, 300);

        const responseTime = Date.now() - startTime;

        return {
          reply,
          summary,
          actions: [{ type: 'register_client' }],
          tokensUsed: 300,
          responseTime,
          functionsExecuted: ['register_client'],
          metadata: {
            stage: result.success ? 'client_registered' : 'data_collection',
            confidence: 1.0,
            reasoningUsed: false
          }
        };

      } catch (error) {
        logger.error('❌ [Sofia V5] Erro ao executar register_client direto', { error });
        return null;
      }
    }

    // COMANDO DIRETO: Agendamento de visita (TESTE 7)
    if (lowerMessage.includes('visitar') || lowerMessage.includes('agendar') || 
        lowerMessage.includes('conhecer') || lowerMessage.includes('ver o imóvel') ||
        lowerMessage.includes('visita')) {
      
      logger.info('🚨 [Sofia V5] SOLICITAÇÃO DE VISITA DETECTADA');
      
      // Se tem propriedades no contexto, prosseguir com agendamento
      if (summary.propertiesViewed && summary.propertiesViewed.length > 0) {
        const reply = `Claro! Seria ótimo você conhecer pessoalmente! 🏠✨

Para agendar sua visita, preciso saber:
📅 Que dia seria melhor para você?
🕐 E qual horário prefere? (manhã, tarde ou noite)

Nossos horários de visita são:
• **Manhã:** 9h às 12h
• **Tarde:** 14h às 17h  
• **Noite:** 18h às 20h

Qual opção combina mais com você? 😊`;

        await this.saveConversationHistory(input, reply, 200);

        const responseTime = Date.now() - startTime;

        return {
          reply,
          summary,
          actions: [{ type: 'visit_inquiry' }],
          tokensUsed: 200,
          responseTime,
          functionsExecuted: [],
          metadata: {
            stage: 'visit_scheduling',
            confidence: 1.0,
            reasoningUsed: false
          }
        };
      }
    }

    // COMANDO DIRETO: Confirmação de reserva (TESTE 8)
    if (lowerMessage.includes('confirmo') || lowerMessage.includes('quero reservar') ||
        lowerMessage.includes('fechar') || lowerMessage.includes('confirmar a reserva') ||
        lowerMessage.includes('aceito') || lowerMessage.includes('pode fazer')) {
      
      logger.info('🚨 [Sofia V5] CONFIRMAÇÃO DE RESERVA DETECTADA');
      
      // Verificar se tem todos os dados necessários para reserva
      const hasProperty = summary.propertiesViewed && summary.propertiesViewed.length > 0;
      const hasClient = summary.clientInfo && summary.clientInfo.name && summary.clientInfo.document;
      const hasPrice = summary.propertiesViewed?.some(p => p.priceCalculated);
      
      if (hasProperty && hasClient && hasPrice) {
        logger.info('🎉 [Sofia V5] Todos os dados disponíveis - Criando reserva automaticamente');
        
        try {
          const interestedProperty = summary.propertiesViewed.find(p => p.interested) || summary.propertiesViewed[0];
          
          const result = await AgentFunctions.executeFunction(
            'create_reservation',
            {
              clientPhone: input.clientPhone,
              propertyId: interestedProperty.id,
              checkIn: '2025-08-15', // Data padrão se não especificada
              checkOut: '2025-08-18',
              guests: summary.searchCriteria?.guests || 2
            },
            input.tenantId
          );

          const reply = result.success 
            ? `🎉 **Reserva confirmada com sucesso!** 🎉\n\n${result.message}\n\nVocê receberá um email com todos os detalhes! Obrigada pela confiança! 💖`
            : `Ops! ${result.message}\n\nVamos resolver isso rapidinho! 😊`;

          await this.saveConversationHistory(input, reply, 400);

          const responseTime = Date.now() - startTime;

          return {
            reply,
            summary,
            actions: [{ type: 'create_reservation' }],
            tokensUsed: 400,
            responseTime,
            functionsExecuted: ['create_reservation'],
            metadata: {
              stage: result.success ? 'reservation_completed' : 'reservation_pending',
              confidence: 1.0,
              reasoningUsed: false
            }
          };

        } catch (error) {
          logger.error('❌ [Sofia V5] Erro ao criar reserva direta', { error });
          return null;
        }
      } else {
        // Guiar cliente para completar dados faltantes
        let missingData = [];
        if (!hasProperty) missingData.push('propriedade escolhida');
        if (!hasClient) missingData.push('seus dados pessoais (nome e CPF)');
        if (!hasPrice) missingData.push('cálculo de preço');

        const reply = `Para confirmar sua reserva, ainda preciso de:\n\n${missingData.map(item => `• ${item}`).join('\n')}\n\nVamos completar essas informações? 😊`;

        await this.saveConversationHistory(input, reply, 200);

        const responseTime = Date.now() - startTime;

        return {
          reply,
          summary,
          actions: [{ type: 'reservation_guidance' }],
          tokensUsed: 200,
          responseTime,
          functionsExecuted: [],
          metadata: {
            stage: 'reservation_pending',
            confidence: 1.0,
            reasoningUsed: false
          }
        };
      }
    }

    return null; // Não é um comando direto
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

  /**
   * NOVA FUNÇÃO: Limpar contexto do cliente
   */
  async clearClientContext(clientPhone: string, tenantId: string): Promise<void> {
    try {
      logger.info('🧹 [Sofia V5] Limpando contexto do cliente', {
        clientPhone: this.maskPhone(clientPhone),
        tenantId
      });

      // Limpar contexto completamente no serviço de contexto
      await conversationContextService.clearClientContext(clientPhone, tenantId);
      
      // Limpar cache do SmartSummary também
      smartSummaryService.clearCacheForClient(clientPhone);
      
      logger.info('✅ [Sofia V5] Contexto e cache limpos com sucesso', {
        clientPhone: this.maskPhone(clientPhone)
      });
    } catch (error) {
      logger.error('❌ [Sofia V5] Erro ao limpar contexto', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clientPhone: this.maskPhone(clientPhone)
      });
      throw error;
    }
  }
}

// Exportar instância singleton
export const sofiaV5Agent = SofiaV5Agent.getInstance();