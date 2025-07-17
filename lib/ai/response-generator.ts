import { OpenAI } from 'openai'
import { AIPersonality, AIResponse, BusinessContext } from '@/lib/types/ai'
import { Conversation, Message, ConversationContext } from '@/lib/types/conversation'
import { AIFunctionExecutor, AI_FUNCTIONS } from './agent-functions'
import { withTimeout } from '@/lib/utils/async'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { classifyError, getErrorResponse, ValidationError, ErrorType } from '@/lib/utils/errors'
import { responseCache } from './response-cache'
import { findPredefinedResponse, shouldUsePredefinedResponse } from './predefined-responses'

export class AIResponseGenerator {
  private openai: OpenAI
  private personality: AIPersonality
  private businessContext: BusinessContext
  private functionExecutor: AIFunctionExecutor

  constructor(
    openai: OpenAI, 
    personality: AIPersonality, 
    businessContext: BusinessContext,
    tenantId: string
  ) {
    this.openai = openai
    this.personality = personality
    this.businessContext = businessContext
    this.functionExecutor = new AIFunctionExecutor(tenantId)
  }

  async generateResponse(
    conversation: Conversation,
    newMessage: Message,
    context: ConversationContext
  ): Promise<AIResponse> {
    try {
      // Validate and sanitize input
      const sanitizedContent = sanitizeUserInput(newMessage.content)
      this.validateMessageLength(sanitizedContent)

      console.log('🤖 Sending message to OpenAI:', sanitizedContent);

      // Verificar respostas predefinidas primeiro (apenas para mensagens muito simples)
      const conversationLength = conversation.messages?.length || 0
      console.log(`🔍 Checking predefined responses for: "${sanitizedContent}" (conversation length: ${conversationLength})`);
      
      if (shouldUsePredefinedResponse(sanitizedContent, conversationLength)) {
        const predefinedResponse = findPredefinedResponse(sanitizedContent)
        if (predefinedResponse) {
          console.log('⚡ Using predefined response for:', sanitizedContent);
          return predefinedResponse.response
        }
      }
      
      console.log('🤖 Using AI processing for:', sanitizedContent);

      // Verificar cache
      const cacheKey = { content: sanitizedContent, context: context }
      const cachedResponse = responseCache.get(sanitizedContent, cacheKey)
      
      if (cachedResponse) {
        console.log('🚀 Cache hit! Returning cached response');
        return cachedResponse
      }

      // Determinar complexidade da mensagem
      const isComplexQuery = this.isComplexQuery(sanitizedContent, context)
      const selectedModel = isComplexQuery ? 'gpt-4' : 'gpt-3.5-turbo-1106' // Usar modelo mais eficiente
      
      console.log(`🤖 Using model: ${selectedModel} (complex: ${isComplexQuery})`);

      const systemPrompt = this.buildOptimizedSystemPrompt(isComplexQuery)
      const conversationHistory = this.buildConversationHistory(conversation, isComplexQuery)
      const contextualInfo = this.buildContextualInfo(context)

      // Filtrar funções baseado na complexidade
      const availableFunctions = this.getRelevantFunctions(sanitizedContent, isComplexQuery)

      const completion = await withTimeout(
        this.openai.chat.completions.create({
          model: selectedModel,
          temperature: this.personality.temperature || 0.7,
          max_tokens: isComplexQuery ? 800 : 300, // Reduzir tokens para economizar
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'system', content: contextualInfo },
            ...conversationHistory,
            { role: 'user', content: sanitizedContent }
          ],
          functions: availableFunctions.map(f => ({
            name: f.name,
            description: f.description,
            parameters: f.parameters
          })),
          function_call: 'auto'
        }),
        isComplexQuery ? 45000 : 30000, // Timeout baseado na complexidade
        'OpenAI API call'
      )

      console.log('🤖 OpenAI response received:', completion.choices[0]);

      const aiResponse = await this.processAIResponse(completion, conversation, context)
      
      // Cache a resposta para reutilização
      responseCache.set(sanitizedContent, cacheKey, aiResponse)
      
      return aiResponse
    } catch (error) {
      console.error('❌ Error in generateResponse:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      const errorType = classifyError(error)
      console.log('🔧 Error classified as:', errorType);
      
      const errorResponse = getErrorResponse(errorType, error)
      console.log('🔧 Error response:', errorResponse);

      await this.logError({
        type: errorType,
        error,
        conversationId: conversation.id,
        messageId: newMessage.id,
        timestamp: new Date()
      })

      return errorResponse
    }
  }

  private isComplexQuery(content: string, context: ConversationContext): boolean {
    const complexKeywords = [
      'orçamento', 'preço', 'calcular', 'reserva', 'disponibilidade',
      'negociar', 'desconto', 'comparar', 'análise', 'relatório',
      'quanto', 'valor', 'custo', 'cobrar', 'pagar'
    ]
    
    // FORÇAR queries de fotos como complexas para usar GPT-4
    const photoKeywords = [
      'foto', 'imagem', 'me envie', 'envie', 'ver', 'mostrar', 'apartamento',
      'manda', 'envia', 'visualizar', 'como é', 'quero ver'
    ]
    
    // FORÇAR intenções de reserva como complexas para melhor compreensão de contexto
    const reservationKeywords = [
      'quero reservar', 'fazer reserva', 'vou fechar', 'confirmar', 'alugar',
      'fechar negócio', 'vou pegar', 'decidido', 'escolhido',
      'reservar', 'booking', 'fecha', 'quero ficar', 'vamos fechar'
    ]
    
    const hasComplexKeywords = complexKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    )
    
    const hasPhotoRequest = photoKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    )
    
    const hasReservationIntent = reservationKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    )
    
    const hasContext = context.searchCriteria && Object.keys(context.searchCriteria).length > 0
    const hasViewedProperties = context.viewedProperties.length > 0
    
    return hasComplexKeywords || hasPhotoRequest || hasReservationIntent || hasContext || hasViewedProperties
  }

  private getRelevantFunctions(content: string, isComplex: boolean): any[] {
    const allFunctions = AI_FUNCTIONS.filter(f => f.autoExecute)
    
    if (!isComplex) {
      // Para queries simples, só funções básicas
      return allFunctions.filter(f => 
        ['search_properties', 'register_client', 'send_property_media'].includes(f.name)
      )
    }
    
    // Para queries complexas, funções baseadas no conteúdo
    const keywords = content.toLowerCase()
    const relevantFunctions = allFunctions.filter(f => {
      // PRIORIZAR funções de reserva quando há intenção clara
      if (keywords.includes('quero reservar') || keywords.includes('fazer reserva') || 
          keywords.includes('vou fechar') || keywords.includes('confirmar') ||
          keywords.includes('alugar') || keywords.includes('decidido')) {
        return ['create_reservation', 'check_availability', 'calculate_total_price', 'register_client'].includes(f.name)
      }
      if (keywords.includes('preço') || keywords.includes('orçamento') || keywords.includes('valor')) {
        return ['calculate_total_price', 'apply_discount', 'search_properties'].includes(f.name)
      }
      if (keywords.includes('reserva') || keywords.includes('disponibilidade')) {
        return ['create_reservation', 'check_availability', 'calculate_total_price'].includes(f.name)
      }
      if (keywords.includes('foto') || keywords.includes('apartamento') || keywords.includes('imagem')) {
        return ['search_properties', 'send_property_media'].includes(f.name)
      }
      return ['search_properties', 'register_client'].includes(f.name)
    })
    
    return relevantFunctions.length > 0 ? relevantFunctions : allFunctions.slice(0, 5)
  }

  private buildOptimizedSystemPrompt(isComplex: boolean): string {
    if (!isComplex) {
      // Prompt minimalista para economizar tokens
      return `Você é Sofia, consultora imobiliária. Use termos simples (data entrada/saída). Responda direto ao ponto. Se preciso, use funções disponíveis.`
    }
    
    // Prompt otimizado para queries complexas
    return `Você é Sofia, consultora especializada em temporada. Use linguagem popular. Se cliente quer reservar, finalize. Para fotos: search_properties + send_property_media. Seja direta e eficiente.`
  }

  private buildFullSystemPrompt(): string {
    return `
Você é ${this.personality.name}, consultora de temporada da ${this.businessContext.companyName}.

FOCO: Entender EXATAMENTE o que cliente quer e responder de forma DIRETA.

LINGUAGEM SIMPLES:
- "data de entrada/saída" (não check-in/out)
- "quantas pessoas" (não hóspedes)
- "valor total" (não diárias)

PRIORIDADES:
1. Cliente quer RESERVAR? → Finalize a reserva IMEDIATAMENTE
2. Cliente quer VALORES? → Pergunte: imóvel, datas, pessoas
3. Cliente quer VER imóveis? → Mostre fotos (máx 3)

INTERPRETAÇÃO INTELIGENTE:
- "quero reservar" = criar reserva AGORA
- "me envie fotos" = search + send_media 
- "quanto custa" = calcular preço
- "apartamento disponível" = verificar datas

SEJA DIRETA: Máximo 2-3 frases por resposta.
   - Quais datas (data de entrada e data de saída)?
   - Localização preferida?

2. NUNCA invente informações ou descontos que não existem
3. Use APENAS dados reais do banco de dados
4. Seja objetiva - máximo 3 linhas por resposta
5. NUNCA repita informações já enviadas
6. IDENTIFIQUE quando cliente quer FECHAR RESERVA vs apenas pesquisar

QUANDO CLIENTE QUER FAZER RESERVA (palavras-chave: "quero reservar", "vou alugar", "fechar", "confirmar", "fazer reserva", "gostei", "escolhi", "vou ficar"):
- PRIORIZE finalizar a reserva em vez de mostrar mais opções
- Se cliente mencionou PROPRIEDADE ESPECÍFICA (ex: "apto 204", "apartamento 204") + DATAS (ex: "dia 1 ao 7", "agosto") + PESSOAS (ex: "1 pessoa"), EXECUTE:
  1. check_availability com a propriedade e datas mencionadas
  2. calculate_total_price se disponível
  3. create_reservation se cliente confirmar
- NÃO pergunte dados já fornecidos pelo cliente
- NÃO mostre outras opções de imóveis se cliente já escolheu
- LEMBRE-SE: cliente pode dar todas as informações de uma vez!

QUANDO CLIENTE PEDE FOTOS/APARTAMENTOS:
- SEMPRE use search_properties PRIMEIRO (não precisa de parâmetros obrigatórios)
- NUNCA use send_property_media sem ter um propertyId específico
- Mostre informações organizadas de cada propriedade:
  🏠 *Nome do Apartamento*
  - Endereço: [endereço]
  - Quartos: X, Banheiros: Y
  - Preço base: R$ X/noite
  - Taxa de limpeza: R$ X
  - Comodidades: [lista principais]
  - Permite pets: Sim/Não
- Após mostrar propriedades, pergunte: "Qual destas propriedades mais te interessou? Posso enviar as fotos."

EXEMPLOS DE RESPOSTAS EFICIENTES:
Para pedido de fotos: "Encontrei X apartamentos disponíveis. Vou mostrar as opções:"
Para orçamento: "Preciso saber as datas de entrada e saída exatas e quantas pessoas para calcular o valor correto."
Para intenção de reserva: "Perfeito! Para confirmar sua reserva do ap 204, preciso saber seu nome completo e confirmar as datas: entrada dia X e saída dia Y?"
Quando cliente já decidiu: "Ótima escolha! Vou calcular o valor total para suas datas e confirmar a disponibilidade."

PROIBIDO:
- Orçamentos sem datas/pessoas válidas
- Descontos inventados (jamais ofereça desconto 10% ou qualquer outro)
- Textos longos ou formatação excessiva
- Informações repetidas
- Múltiplas mensagens sobre o mesmo assunto
- Enviar links do Firebase ou URLs de imagens
- Passar informações técnicas como IDs de propriedades

REGRAS DE NEGÓCIO:
- Preços mudam por fim de semana (+20%) e feriados (+50%)
- Mínimo de 2 diárias na maioria dos imóveis
- Entrada: 15h, Saída: 11h
- Desconto para estadias longas (7+ dias): 10%
- Clientes recorrentes: 5% desconto automático
- Taxa de limpeza: R$ 50-150 dependendo do imóvel
- Taxa de serviço: 10% do valor total

COMPORTAMENTOS ESPECIAIS:
${this.personality.proactiveFollowUp ? '- Seja proativo com sugestões e follow-ups' : '- Responda apenas ao que foi perguntado'}
${this.personality.urgencyDetection ? '- Identifique urgência e ajuste abordagem' : '- Mantenha ritmo constante'}
${this.personality.priceNegotiation ? '- Negocie preços quando apropriado' : '- Mantenha preços fixos'}
${this.personality.crossSelling ? '- Sugira serviços adicionais quando relevante' : '- Foque apenas na solicitação principal'}

ESTILO DE COMUNICAÇÃO:
- ${this.personality.responseLength === 'concise' ? 'Seja conciso e direto' : 'Seja detalhado e explicativo'}
- Use emojis moderadamente para humanizar
- Sempre confirme detalhes importantes
- Faça perguntas qualificadoras inteligentes
- Mantenha tom ${this.personality.tone} e abordagem ${this.personality.style}

CUMPRIMENTO PADRÃO: "${this.personality.greetingMessage}"

INSTRUÇÕES IMPORTANTES:
- SEMPRE use as funções disponíveis quando apropriado
- FLUXO PARA FOTOS: Quando cliente pedir fotos/imóveis → search_properties primeiro → depois send_property_media com os IDs encontrados
- NUNCA mencione IDs técnicos ou URLs do Firebase para o cliente
- Calcule preços exatos antes de informar valores
- Verifique disponibilidade antes de fazer ofertas
- Seja transparente sobre taxas e políticas
- Mantenha contexto da conversa para personalização
- Se não conseguir resolver, seja honesto e ofereça escalação

FLUXO OBRIGATÓRIO PARA FOTOS/IMÓVEIS:
1. SEMPRE que cliente mencionar: "fotos", "imagens", "me envie", "quero ver", "apartamento" → use search_properties PRIMEIRO
2. DEPOIS de search_properties retornar propriedades → SEMPRE use send_property_media para CADA propriedade
3. NUNCA envie apenas texto sem as fotos quando cliente pedir para "ver" imóveis
4. Limite a 3 propriedades por consulta para melhor experiência
    `
  }

  private buildConversationHistory(conversation: Conversation, isComplex: boolean): any[] {
    const messages = conversation.messages?.filter(msg => msg.type === 'text') || []
    
    if (!isComplex) {
      // Para queries simples, apenas última mensagem para economizar tokens
      return messages
        .slice(-1)
        .map(msg => ({
          role: msg.isFromAI ? 'assistant' : 'user',
          content: msg.content.substring(0, 80) // Ainda mais curto
        }))
    }
    
    // Para queries complexas, até 3 mensagens mais relevantes (reduzido de 4)
    return messages
      .slice(-3)
      .map(msg => ({
        role: msg.isFromAI ? 'assistant' : 'user',
        content: msg.content.substring(0, 150) // Reduzido de 200
      }))
  }

  private buildContextualInfo(context: ConversationContext): string {
    // Contexto mais compacto para economizar tokens
    const parts: string[] = []

    if (context.searchCriteria && Object.keys(context.searchCriteria).length > 0) {
      parts.push(`Busca: ${JSON.stringify(context.searchCriteria)}`)
    }

    if (context.viewedProperties.length > 0) {
      parts.push(`Visto: ${context.viewedProperties.slice(-3).join(', ')}`) // Apenas últimas 3
    }

    if (context.budgetRange) {
      parts.push(`Orçamento: R$${context.budgetRange.min}-${context.budgetRange.max}`)
    }

    if (context.nextAction) {
      parts.push(`Ação: ${context.nextAction}`)
    }

    return parts.length > 0 ? `CONTEXTO: ${parts.join(' | ')}\n` : ''
  }

  private async processAIResponse(
    completion: any,
    conversation: Conversation,
    context: ConversationContext
  ): Promise<AIResponse> {
    const message = completion.choices[0].message

    console.log('🔧 Processing AI response. Has function call:', !!message.function_call);

    // Se há function call, processa função
    if (message.function_call) {
      console.log('🔧 Executing function call:', message.function_call.name);
      const functionResult = await this.executeFunctionCall(
        message.function_call,
        conversation,
        context
      )
      console.log('🔧 Function result:', functionResult);

      // Segunda chamada para gerar resposta baseada no resultado
      const lastMessage = conversation.messages?.[conversation.messages.length - 1];
      const userContent = lastMessage?.content || 'Solicitação de informações';
      
      // Check if we need to chain functions (search_properties → send_property_media)
      let shouldChainFunctions = false;
      let chainedResults = functionResult;
      
      if (message.function_call.name === 'search_properties' && functionResult.success && functionResult.properties?.length > 0) {
        // Check if user is asking for photos/images - expanded detection
        const userWantsPhotos = /foto|imagem|ver|mostrar|enviar.*foto|quero.*foto|me.*envie|envie.*foto|fotos|imagens|ver.*apartamento|apartamento.*foto|imóvel|imovel|apartamento/i.test(userContent);
        
        console.log(`🔍 User content: "${userContent}"`);
        console.log(`📸 User wants photos: ${userWantsPhotos}`);
        console.log(`🏠 Found ${functionResult.properties.length} properties`);
        
        // SEMPRE enviar mídias quando encontrar propriedades
        if (userWantsPhotos || true) { // Forçar sempre
          console.log('🔗 Chaining search_properties → send_property_media');
          shouldChainFunctions = true;
          
          // Send media for found properties (limit to first 3)
          const propertiesToShow = functionResult.properties.slice(0, 3);
          const mediaResults = [];
          
          for (const property of propertiesToShow) {
            console.log(`📤 Executing send_property_media for property: ${property.id} (${property.title})`);
            try {
              const mediaResult = await this.functionExecutor.executeFunctionCall('send_property_media', {
                propertyId: property.id,
                mediaType: 'photos'
              });
              console.log(`📱 Media result for ${property.id}:`, mediaResult);
              if (mediaResult.success) {
                mediaResults.push({
                  property: property,
                  media: mediaResult
                });
                console.log(`✅ Successfully added media for ${property.title}`);
              } else {
                console.log(`❌ Failed to get media for ${property.title}:`, mediaResult.error);
              }
            } catch (error) {
              console.error('❌ Error sending media for property:', property.id, error);
            }
          }
          
          chainedResults = {
            ...functionResult,
            mediaResults,
            chainedFunction: true
          };
        }
      }
      
      const secondCompletion = await this.openai.chat.completions.create({
        model: this.personality.model || 'gpt-4',
        temperature: this.personality.temperature || 0.7,
        messages: [
          { role: 'system', content: this.buildFullSystemPrompt() },
          { role: 'user', content: userContent },
          message,
          { 
            role: 'function', 
            name: message.function_call.name, 
            content: JSON.stringify(chainedResults) 
          }
        ]
      })

      return {
        content: secondCompletion.choices[0].message.content || '',
        functionCall: {
          name: message.function_call.name,
          arguments: JSON.parse(message.function_call.arguments),
          result: chainedResults // Include media results from chaining
        },
        confidence: this.calculateConfidence(secondCompletion),
        sentiment: this.analyzeSentiment(secondCompletion.choices[0].message.content || ''),
        suggestedActions: this.extractSuggestedActions(secondCompletion, functionResult)
      }
    }

    return {
      content: message.content || '',
      confidence: this.calculateConfidence(completion),
      sentiment: this.analyzeSentiment(message.content || ''),
      suggestedActions: this.extractSuggestedActions(completion)
    }
  }

  private async executeFunctionCall(
    functionCall: any,
    conversation: Conversation,
    context: ConversationContext
  ): Promise<any> {
    try {
      const args = JSON.parse(functionCall.arguments)
      console.log('🔧 Function call arguments:', args);
      const result = await this.functionExecutor.executeFunctionCall(functionCall.name, args)
      console.log('🔧 Function execution result:', result);

      // Atualizar contexto baseado no resultado
      this.updateContextFromFunctionResult(context, functionCall.name, result)

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na execução da função'
      }
    }
  }

  private updateContextFromFunctionResult(
    context: ConversationContext,
    functionName: string,
    result: any
  ): void {
    switch (functionName) {
      case 'search_properties':
        if (result.success && result.properties) {
          context.viewedProperties = result.properties.map((p: any) => p.id)
        }
        break

      case 'calculate_total_price':
        if (result.success) {
          context.lastOfferMade = {
            propertyId: result.propertyId,
            originalPrice: result.breakdown.totalBeforeDiscount,
            offeredPrice: result.breakdown.finalPrice,
            discountPercentage: result.breakdown.discountPercentage || 0,
            validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 dias
            accepted: false
          }
        }
        break

      case 'apply_discount':
        if (result.success && context.lastOfferMade) {
          context.lastOfferMade.offeredPrice = result.discount.finalPrice
          context.lastOfferMade.discountPercentage = result.discount.discountPercentage
        }
        break
    }
  }

  private calculateConfidence(completion: any): number {
    // Lógica para calcular confiança baseada na resposta
    const message = completion.choices[0].message
    const contentLength = message.content?.length || 0

    // Fatores que afetam confiança
    let confidence = 0.8 // Base

    if (contentLength > 50) confidence += 0.1 // Resposta substancial
    if (contentLength > 200) confidence += 0.1 // Resposta detalhada
    if (message.function_call) confidence += 0.2 // Usou função

    return Math.min(confidence, 1.0)
  }

  private analyzeSentiment(content: string): any {
    // Análise simples de sentimento
    const positiveWords = ['obrigado', 'perfeito', 'excelente', 'ótimo', 'maravilhoso', 'adorei']
    const negativeWords = ['problema', 'ruim', 'péssimo', 'terrível', 'horrível', 'não gostei']

    const lowercaseContent = content.toLowerCase()
    const positiveCount = positiveWords.filter(word => lowercaseContent.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowercaseContent.includes(word)).length

    let score = 0
    let label = 'neutral'

    if (positiveCount > negativeCount) {
      score = 0.7
      label = 'positive'
    } else if (negativeCount > positiveCount) {
      score = -0.7
      label = 'negative'
    }

    return {
      score,
      label,
      confidence: 0.6
    }
  }

  private extractSuggestedActions(completion: any, functionResult?: any): string[] {
    const actions: string[] = []

    if (functionResult?.success === false) {
      actions.push('retry')
    }

    if (completion.choices[0].message.function_call) {
      const functionName = completion.choices[0].message.function_call.name

      switch (functionName) {
        case 'search_properties':
          actions.push('send_property_media', 'calculate_total_price')
          break
        case 'calculate_total_price':
          actions.push('check_availability', 'apply_discount')
          break
        case 'check_availability':
          actions.push('create_reservation')
          break
      }
    }

    return actions
  }

  private validateMessageLength(content: string): void {
    if (content.length > 4000) {
      throw new ValidationError('Message too long', 'content')
    }
  }

  private async logError(errorData: {
    type: ErrorType
    error: any
    conversationId: string
    messageId: string
    timestamp: Date
  }): Promise<void> {
    try {
      // In production, send to monitoring service
      // await this.monitoringService.recordError(errorData)
    } catch (logError) {
      }
  }
}