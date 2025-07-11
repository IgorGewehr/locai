import { OpenAI } from 'openai'
import { AIPersonality, AIResponse, BusinessContext } from '@/lib/types/ai'
import { Conversation, Message, ConversationContext } from '@/lib/types/conversation'
import { AIFunctionExecutor, AI_FUNCTIONS } from './agent-functions'
import { withTimeout } from '@/lib/utils/async'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { classifyError, getErrorResponse, ValidationError, ErrorType } from '@/lib/utils/errors'

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
    const systemPrompt = this.buildSystemPrompt()
    const conversationHistory = this.buildConversationHistory(conversation)
    const contextualInfo = this.buildContextualInfo(context)

    try {
      // Validate and sanitize input
      const sanitizedContent = sanitizeUserInput(newMessage.content)
      this.validateMessageLength(sanitizedContent)

      const completion = await withTimeout(
        this.openai.chat.completions.create({
          model: this.personality.model || 'gpt-4',
          temperature: this.personality.temperature || 0.7,
          max_tokens: this.personality.maxTokens || 1000,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'system', content: contextualInfo },
            ...conversationHistory,
            { role: 'user', content: sanitizedContent }
          ],
          functions: AI_FUNCTIONS.filter(f => f.autoExecute).map(f => ({
            name: f.name,
            description: f.description,
            parameters: f.parameters
          })),
          function_call: 'auto'
        }),
        30000, // 30 second timeout
        'OpenAI API call'
      )

      return await this.processAIResponse(completion, conversation, context)
    } catch (error) {
      const errorType = classifyError(error)
      const errorResponse = getErrorResponse(errorType, error)

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

  private buildSystemPrompt(): string {
    return `
Você é ${this.personality.name}, um corretor especializado em locações por temporada da ${this.businessContext.companyName}.

PERSONALIDADE:
- Tom: ${this.personality.tone}
- Estilo: ${this.personality.style}
- Tamanho das respostas: ${this.personality.responseLength}
- Foco: ${this.personality.specialityFocus.join(', ')}

EMPRESA:
- Nome: ${this.businessContext.companyName}
- Localização: ${this.businessContext.location}
- Especialidade: ${this.businessContext.specialty}
- Imóveis disponíveis: ${this.businessContext.totalProperties}
- Desconto máximo permitido: ${this.businessContext.maxDiscountPercentage}%

SUAS RESPONSABILIDADES:
1. Entender as necessidades do cliente de forma consultiva
2. Apresentar imóveis que realmente atendam aos critérios
3. Enviar fotos e vídeos quando solicitado ou relevante
4. Calcular preços exatos incluindo taxas e promoções
5. Negociar quando necessário (desconto máximo: ${this.businessContext.maxDiscountPercentage}%)
6. Finalizar reservas quando cliente decidir
7. Manter contexto de toda a conversa
8. Ser proativo em sugestões e follow-ups

REGRAS DE NEGÓCIO:
- Preços mudam por fim de semana (+20%) e feriados (+50%)
- Mínimo de 2 diárias na maioria dos imóveis
- Check-in: 15h, Check-out: 11h
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
- Calcule preços exatos antes de informar valores
- Verifique disponibilidade antes de fazer ofertas
- Seja transparente sobre taxas e políticas
- Mantenha contexto da conversa para personalização
- Se não conseguir resolver, seja honesto e ofereça escalação
    `
  }

  private buildConversationHistory(conversation: Conversation): any[] {
    return conversation.messages
      .filter(msg => msg.type === 'text')
      .slice(-10) // Últimas 10 mensagens para contexto
      .map(msg => ({
        role: msg.isFromAI ? 'assistant' : 'user',
        content: msg.content
      }))
  }

  private buildContextualInfo(context: ConversationContext): string {
    let contextInfo = 'CONTEXTO DA CONVERSA:\n'

    if (context.clientPreferences) {
      contextInfo += `Cliente prefere: ${JSON.stringify(context.clientPreferences)}\n`
    }

    if (context.searchCriteria) {
      contextInfo += `Critérios de busca: ${JSON.stringify(context.searchCriteria)}\n`
    }

    if (context.viewedProperties.length > 0) {
      contextInfo += `Propriedades já vistas: ${context.viewedProperties.join(', ')}\n`
    }

    if (context.favoriteProperties.length > 0) {
      contextInfo += `Propriedades favoritas: ${context.favoriteProperties.join(', ')}\n`
    }

    if (context.budgetRange) {
      contextInfo += `Orçamento: R$ ${context.budgetRange.min} - R$ ${context.budgetRange.max}\n`
    }

    if (context.lastOfferMade) {
      contextInfo += `Última oferta feita: ${JSON.stringify(context.lastOfferMade)}\n`
    }

    if (context.nextAction) {
      contextInfo += `Próxima ação sugerida: ${context.nextAction}\n`
    }

    return contextInfo
  }

  private async processAIResponse(
    completion: any,
    conversation: Conversation,
    context: ConversationContext
  ): Promise<AIResponse> {
    const message = completion.choices[0].message

    // Se há function call, processa função
    if (message.function_call) {
      const functionResult = await this.executeFunctionCall(
        message.function_call,
        conversation,
        context
      )

      // Segunda chamada para gerar resposta baseada no resultado
      const secondCompletion = await this.openai.chat.completions.create({
        model: this.personality.model || 'gpt-4',
        temperature: this.personality.temperature || 0.7,
        messages: [
          { role: 'system', content: this.buildSystemPrompt() },
          { role: 'user', content: conversation.messages[conversation.messages.length - 1].content },
          message,
          { 
            role: 'function', 
            name: message.function_call.name, 
            content: JSON.stringify(functionResult) 
          }
        ]
      })

      return {
        content: secondCompletion.choices[0].message.content || '',
        functionCall: {
          name: message.function_call.name,
          arguments: JSON.parse(message.function_call.arguments),
          result: functionResult
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
      const result = await this.functionExecutor.executeFunctionCall(functionCall.name, args)

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