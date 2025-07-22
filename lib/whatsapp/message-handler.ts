import { WhatsAppClient } from './client'
import { WhatsAppWebhookData, WhatsAppIncomingMessage } from '@/lib/types/whatsapp'
import { AIResponse } from '@/lib/types/ai'
import { Message, MessageType, MessageStatus } from '@/lib/types/conversation'
import { ConversationService } from '@/lib/services/conversation-service'
import { AIService } from '@/lib/services/ai-service-stub'
import { AutomationService } from '@/lib/services/automation-service'
import { PropertyService } from '@/lib/services/property-service'
import { ReservationService } from '@/lib/services/reservation-service'
import { withTimeout, withRetry, RateLimiter } from '@/lib/utils/async'
import { validatePhoneNumber, validateMessageContent } from '@/lib/utils/validation'
import { NetworkError, RateLimitError, ErrorType, classifyError } from '@/lib/utils/errors'
import { TranscriptionService } from '@/lib/services/transcription-service'

export class WhatsAppMessageHandler {
  private whatsappClient: WhatsAppClient | null = null
  private aiService: AIService
  private conversationService: ConversationService
  private automationService: AutomationService | null = null
  private propertyService: PropertyService
  private reservationService: ReservationService
  private rateLimiter: RateLimiter
  private processingMessages: Set<string> = new Set()
  private processingConversations: Set<string> = new Set()
  private transcriptionService: TranscriptionService | null = null
  private tenantId: string
  
  // Sistema de delay para agrupar mensagens múltiplas
  private messageQueue: Map<string, { messages: WhatsAppIncomingMessage[], timeout: NodeJS.Timeout }> = new Map()
  private readonly MESSAGE_DELAY = 10000 // 10 segundos

  constructor(
    tenantId: string,
    whatsappClient?: WhatsAppClient,
    aiService?: AIService,
    conversationService?: ConversationService,
    automationService?: AutomationService,
    propertyService?: PropertyService,
    reservationService?: ReservationService
  ) {
    this.tenantId = tenantId
    this.whatsappClient = whatsappClient || null
    this.aiService = aiService || new AIService(tenantId)
    this.conversationService = conversationService || new ConversationService()
    this.automationService = automationService || null
    this.propertyService = propertyService || new PropertyService()
    this.reservationService = reservationService || new ReservationService()
    this.rateLimiter = new RateLimiter(20, 60000) // 20 messages per minute
    if (whatsappClient) {
      this.transcriptionService = new TranscriptionService(whatsappClient)
    }
  }
  
  async initializeClient(): Promise<void> {
    if (!this.whatsappClient) {
      console.log('🔧 Initializing WhatsApp client for tenant:', this.tenantId);
      // Create WhatsApp client with Web support
      this.whatsappClient = new WhatsAppClient('web', 'web', this.tenantId)
      this.transcriptionService = new TranscriptionService(this.whatsappClient)
      this.automationService = new AutomationService(this.tenantId, this.whatsappClient, this.aiService)
      console.log('✅ WhatsApp client initialized successfully');
    }
  }

  async handleWebhook(webhookData: WhatsAppWebhookData): Promise<void> {
    // Initialize client if needed
    await this.initializeClient()
    
    // Process the message
    await this.handleIncomingMessage(webhookData)
  }
  
  async handleIncomingMessage(webhookData: WhatsAppWebhookData): Promise<void> {
    try {
      const { message, from, contact } = this.extractMessageData(webhookData)

      if (!message || !from) {
        return
      }

      // Check if message should be processed (not from groups)
      const { shouldProcessMessage } = await import('@/lib/utils/whatsapp-utils');
      
      // Reconstruct the full JID for validation (from is just the phone number)
      const fullJid = from.includes('@') ? from : `${from}@s.whatsapp.net`;
      
      if (!shouldProcessMessage(fullJid)) {
        console.log(`🚫 Ignoring message from: ${fullJid} (group or invalid)`);
        return;
      }

      // Validate phone number format
      const validatedPhone = validatePhoneNumber(from)

      // Check rate limiting
      const rateLimitAllowed = await this.rateLimiter.isAllowed(validatedPhone)
      if (!rateLimitAllowed) {
        await this.sendRateLimitMessage(validatedPhone)
        return
      }

      // Check for duplicate message processing
      const messageId = message.id
      if (this.processingMessages.has(messageId)) {
        return
      }

      // Sistema de delay para agrupar mensagens múltiplas
      await this.queueMessageWithDelay(validatedPhone, message)
      return
    } catch (error) {
      console.error('❌ Error in handleIncomingMessage (queue):', error);
    }
  }

  // Método para enfileirar mensagens com delay
  private async queueMessageWithDelay(phoneNumber: string, message: WhatsAppIncomingMessage): Promise<void> {
    console.log(`📥 Queueing message from ${phoneNumber} with ${this.MESSAGE_DELAY/1000}s delay`);
    
    // Limpa timeout anterior se existir
    if (this.messageQueue.has(phoneNumber)) {
      const existing = this.messageQueue.get(phoneNumber)!
      clearTimeout(existing.timeout)
      existing.messages.push(message)
      console.log(`📚 Added message to existing queue. Total messages: ${existing.messages.length}`);
    } else {
      this.messageQueue.set(phoneNumber, {
        messages: [message],
        timeout: setTimeout(() => {}, 0) // placeholder
      })
      console.log(`📚 Created new message queue for ${phoneNumber}`);
    }

    // Cria novo timeout
    const timeout = setTimeout(async () => {
      const queuedData = this.messageQueue.get(phoneNumber)
      if (queuedData) {
        this.messageQueue.delete(phoneNumber)
        console.log(`⏱️ Processing ${queuedData.messages.length} queued messages from ${phoneNumber}`)
        await this.processQueuedMessages(phoneNumber, queuedData.messages)
      }
    }, this.MESSAGE_DELAY)

    this.messageQueue.get(phoneNumber)!.timeout = timeout
  }

  // Processa mensagens agrupadas
  private async processQueuedMessages(phoneNumber: string, messages: WhatsAppIncomingMessage[]): Promise<void> {
    if (this.processingConversations.has(phoneNumber)) {
      console.log(`⏳ Already processing conversation for ${phoneNumber}, skipping queued messages`);
      return;
    }

    this.processingConversations.add(phoneNumber)

    try {
      // Combina o conteúdo de todas as mensagens
      const combinedContent = await this.combineMessageContents(messages)
      const lastMessage = messages[messages.length - 1]
      
      // Marcar todas as mensagens como lidas
      for (const message of messages) {
        try {
          await withTimeout(
            this.whatsappClient?.markAsRead(message.id),
            5000,
            'Mark message as read'
          )
        } catch (error) {
          console.error('Error marking message as read:', error)
        }
      }

      // Find or create conversation
      let conversation = await this.conversationService.findByPhone(phoneNumber)
      if (!conversation) {
        conversation = await this.conversationService.createNew(phoneNumber, undefined)
      }

      // Salva apenas a mensagem combinada no banco
      const savedMessage = await this.conversationService.addMessage(
        conversation.id,
        {
          content: combinedContent,
          type: MessageType.TEXT,
          direction: 'inbound',
          whatsappMessageId: lastMessage.id,
          timestamp: new Date(parseInt(lastMessage.timestamp) * 1000),
          status: MessageStatus.RECEIVED,
          isFromAI: false
        }
      )

      // Process with AI (with timeout) - usando conteúdo combinado
      const aiResponse = await withTimeout(
        this.aiService.processMessage(conversation, savedMessage),
        45000,
        'AI processing'
      )

      // Send AI response
      await this.sendAIResponse(phoneNumber, aiResponse, false)

      // Save AI response message - filter undefined values
      const responseData: any = {
        content: aiResponse.content,
        type: MessageType.TEXT,
        direction: 'outbound',
        isFromAI: true,
        timestamp: new Date(),
        status: MessageStatus.SENT
      }
      
      // Only add fields if they are not undefined
      if (aiResponse.functionCall !== undefined) {
        // Filter undefined values from function call result
        const cleanedFunctionCall = {
          ...aiResponse.functionCall,
          result: aiResponse.functionCall.result ? this.filterUndefinedValues(aiResponse.functionCall.result) : undefined
        }
        responseData.functionCall = cleanedFunctionCall
      }
      if (aiResponse.confidence !== undefined) {
        responseData.confidence = aiResponse.confidence
      }

      await this.conversationService.addMessage(conversation.id, responseData)

      // Update conversation context and analytics
      await this.conversationService.updateConversationFromAI(conversation.id, aiResponse)

    } catch (error) {
      console.error('❌ Error in processQueuedMessages:', error)
    } finally {
      this.processingConversations.delete(phoneNumber)
    }
  }

  // Combina o conteúdo de múltiplas mensagens
  private async combineMessageContents(messages: WhatsAppIncomingMessage[]): Promise<string> {
    const contents: string[] = []
    
    for (const message of messages) {
      let content = message.text?.body || this.getMediaCaption(message) || ''
      
      // Handle audio messages with transcription
      if (message.type === 'audio' && message.audio?.id && this.transcriptionService) {
        try {
          const transcriptionResult = await this.transcriptionService.transcribeAudio(message.audio.id)
          content = typeof transcriptionResult === 'string' ? transcriptionResult : transcriptionResult.text
        } catch (error) {
          content = 'Recebi seu áudio! Por favor, envie sua mensagem por texto para eu processar melhor. 😊'
        }
      }
      
      if (content.trim()) {
        contents.push(validateMessageContent(content))
      }
    }
    
    // Combina as mensagens de forma mais inteligente
    if (contents.length === 1) {
      return contents[0] || 'Mensagens recebidas'
    } else if (contents.length > 1) {
      console.log(`🔄 Combining ${contents.length} messages into one context`);
      // Combine messages with natural flow
      return contents.join('. ') || 'Mensagens recebidas'
    }
    
    return 'Mensagens recebidas'
  }

  // Error handling para o webhook principal
  private async handleWebhookError(error: unknown, webhookData: any): Promise<void> {
    console.error('❌ Error in handleIncomingMessage:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
    // Classify error and send appropriate response
    const errorType = this.classifyError(error)

    try {
      const { from } = this.extractMessageData(webhookData)
      if (from && this.whatsappClient) {
        const validatedPhone = validatePhoneNumber(from)
        const errorMessage = this.getErrorMessage(errorType)

        await withTimeout(
          this.whatsappClient.sendText(validatedPhone, errorMessage),
          10000,
          'Send error message'
        )
      }
    } catch (sendError) {
      console.error('Error sending error message:', sendError)
    }
  }

  private extractMessageData(webhookData: WhatsAppWebhookData): { message: WhatsAppIncomingMessage | null, from: string | null, contact: any | null } {
    const entry = webhookData.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    if (!value || !value.messages?.[0]) {
      return { message: null, from: null, contact: null }
    }

    const message = value.messages[0]
    const from = message.from
    const contact = value.contacts?.[0]

    return { message, from, contact }
  }

  private getMessageType(message: WhatsAppIncomingMessage): MessageType {
    switch (message.type) {
      case 'text':
        return MessageType.TEXT
      case 'image':
        return MessageType.IMAGE
      case 'video':
        return MessageType.VIDEO
      case 'audio':
        return MessageType.AUDIO
      case 'document':
        return MessageType.DOCUMENT
      case 'location':
        return MessageType.LOCATION
      case 'contact':
        return MessageType.CONTACT
      default:
        return MessageType.TEXT
    }
  }

  private getMediaCaption(message: WhatsAppIncomingMessage): string {
    switch (message.type) {
      case 'image':
        return message.image?.caption || ''
      case 'video':
        return message.video?.caption || ''
      case 'document':
        return message.document?.filename || ''
      case 'location':
        return `${message.location?.name || ''} - ${message.location?.address || ''}`
      default:
        return ''
    }
  }

  private async getMediaUrl(message: WhatsAppIncomingMessage): Promise<string | undefined> {
    try {
      let mediaId: string | undefined

      switch (message.type) {
        case 'image':
          mediaId = message.image?.id
          break
        case 'video':
          mediaId = message.video?.id
          break
        case 'audio':
          mediaId = message.audio?.id
          break
        case 'document':
          mediaId = message.document?.id
          break
      }

      if (!mediaId) return undefined

      const mediaDetails = await withTimeout(
        this.whatsappClient.getMediaDetails(mediaId),
        10000,
        'Get media details'
      )
      return mediaDetails.url
    } catch (error) {
      return undefined
    }
  }

  private shouldSkipAIProcessing(message: WhatsAppIncomingMessage): boolean {
    // Skip AI processing only for message types that truly don't need responses
    const skipTypes = ['sticker', 'reaction'] // Audio now supported!
    return skipTypes.includes(message.type)
  }

  private async sendAcknowledgment(to: string, messageType: string): Promise<void> {
    const acknowledgments = {
      'document': 'Recebi seu documento! Vou analisar e responder em breve. 📄',
      'location': 'Recebi sua localização! Isso me ajuda a sugerir propriedades próximas. 📍',
      'contact': 'Recebi seu contato! Obrigado por compartilhar. 👤',
      'sticker': '😊 Adorei o sticker! Como posso ajudar você?',
      'reaction': 'Obrigado pela reação! Em que mais posso ajudar? 👍',
      'image': 'Recebi sua imagem! Vou analisar e responder em breve. 🖼️',
      'video': 'Recebi seu vídeo! Vou analisar e responder em breve. 🎥'
    }

    const ackMessage = acknowledgments[messageType] || 'Recebi sua mensagem! 📱'
    await withRetry(
      () => this.whatsappClient.sendText(to, ackMessage),
      2,
      1000
    )
  }

  /**
   * Enhanced AI response sender with audio support
   */
  private async sendAIResponse(
    to: string, 
    response: AIResponse, 
    preferAudio: boolean = false
  ): Promise<void> {
    console.log(`🤖 Sending AI response to ${to}`);
    console.log(`📄 Response content length: ${response.content?.length || 0}`);
    console.log(`🔧 Has function call: ${!!response.functionCall}`);
    if (response.functionCall) {
      console.log(`⚙️ Function call name: ${response.functionCall.name}`);
    }
    
    try {
      // Send main response (text or audio)
      if (response.content) {
        if (preferAudio && response.content.length > 20) {
          // Try to send audio response
          try {
            const audioResult = await this.transcriptionService.generateAudioResponse(
              response.content,
              undefined, // Use default preferences
              to
            )

            if (audioResult.audioBuffer) {
              // Audio response generated successfully

              await withRetry(
                () => this.whatsappClient.sendAudio(to, audioResult.audioBuffer!),
                2,
                1000
              )

              } else {
              // Fallback to text if audio generation failed
              await this.sendTextResponse(to, response.content)
            }

          } catch (audioError) {
            await this.sendTextResponse(to, response.content)
          }
        } else {
          // Send text response
          await this.sendTextResponse(to, response.content)
        }
      }

      // Handle function call responses
      if (response.functionCall) {
        await this.handleFunctionCallResponse(to, response.functionCall)
        
        // Handle chained media results if present
        if (response.functionCall.result?.mediaResults) {
          // Processing chained media results
          for (const mediaResult of response.functionCall.result.mediaResults) {
            // Sending property media
            await this.sendPropertyMedia(to, mediaResult.media);
            await this.delay(2000); // Delay between media sends
          }
        }
      }

      // Add delay between messages to feel more natural
      await this.delay(1000)

    } catch (error) {
      throw error
    }
  }

  /**
   * Send text response with retry logic
   */
  private async sendTextResponse(to: string, content: string): Promise<void> {
    console.log(`📤 Sending text response to ${to}: ${content.substring(0, 100)}...`);
    
    if (!this.whatsappClient) {
      console.error('❌ WhatsApp client not initialized!');
      throw new Error('WhatsApp client not initialized');
    }
    
    try {
      await withRetry(
        () => this.whatsappClient.sendText(to, content),
        3,
        1000
      )
      console.log('✅ Text response sent successfully!');
    } catch (error) {
      console.error('❌ Error sending text response:', error);
      throw error;
    }
  }

  private async handleFunctionCallResponse(to: string, functionCall: any): Promise<void> {
    const { name, result } = functionCall

    if (!result?.success) {
      return
    }

    switch (name) {
      case 'send_property_media':
        console.log(`🎯 Handling send_property_media function call for ${to}`);
        console.log(`📋 Media data:`, JSON.stringify(result, null, 2));
        await this.sendPropertyMedia(to, result)
        break

      case 'search_properties':
        // Se precisa de mais informações, deixa a IA responder primeiro
        if (!result.needsMoreInfo) {
          await this.sendPropertyResults(to, result)
        }
        break

      case 'create_reservation':
        await this.sendReservationConfirmation(to, result)
        break

      case 'calculate_total_price':
        await this.sendPriceBreakdown(to, result)
        break

      case 'apply_discount':
        await this.sendDiscountConfirmation(to, result)
        break
    }
  }

  private async sendPropertyMedia(to: string, mediaData: any): Promise<void> {
    const { photos, videos, propertyName } = mediaData

    // Send photos with captions
    if (photos && photos.length > 0) {
      for (const [index, photo] of photos.entries()) {
        await this.whatsappClient.sendImage(
          to,
          photo.url,
          `${propertyName} - Foto ${index + 1}/${photos.length}`
        )

        // Add delay between photos
        if (index < photos.length - 1) {
          await this.delay(1500)
        }
      }
    }

    // Send videos
    if (videos && videos.length > 0) {
      for (const video of videos) {
        await this.whatsappClient.sendVideo(
          to,
          video.url,
          `${propertyName} - ${video.title || 'Vídeo'}`
        )
        await this.delay(2000)
      }
    }
  }

  private async sendPropertyResults(to: string, searchResult: any): Promise<void> {
    const { properties, totalFound, hasMedia } = searchResult

    if (!properties || properties.length === 0) {
      await withRetry(
        () => this.whatsappClient.sendText(
          to,
          'Não encontrei propriedades que atendam exatamente aos seus critérios. Que tal ajustarmos a busca?'
        ),
        2,
        1000
      )
      return
    }

    // Send photos for each property with organized info
    for (const property of properties) {
      // Send main photo first
      if (property.photos && property.photos.length > 0) {
        const amenitiesText = property.amenities ? property.amenities.slice(0, 3).join(', ') : 'Não informado'
        const caption = `🏠 *${property.title}*\n- ${property.address}\n- ${property.bedrooms} quarto(s), ${property.bathrooms} banheiro(s)\n- Preço base: R$ ${property.basePrice}/noite\n- Taxa de limpeza: R$ ${property.cleaningFee}\n- Comodidades: ${amenitiesText}\n- Permite pets: ${property.allowsPets ? 'Sim' : 'Não'}`
        
        await withRetry(
          () => this.whatsappClient.sendImage(
            to,
            property.photos[0].url,
            caption
          ),
          2,
          1000
        )
        
        // Delay between properties
        await this.delay(1500)
      }
    }

    // Final message asking for more info
    await withRetry(
      () => this.whatsappClient.sendText(
        to,
        `Qual destas propriedades mais te interessou? Preciso saber as datas e quantas pessoas para calcular o preço final.`
      ),
      2,
      1000
    )
  }

  private async sendReservationConfirmation(to: string, reservationData: any): Promise<void> {
    const { reservation } = reservationData

    const confirmationText = `
✅ *Reserva Confirmada!*

📋 *Código de Confirmação:* ${reservation.confirmationCode}
🏠 *Propriedade:* ${reservation.propertyName || 'Propriedade selecionada'}
👤 *Hóspede:* ${reservation.clientName}
📅 *Check-in:* ${reservation.checkIn}
📅 *Check-out:* ${reservation.checkOut}
👥 *Hóspedes:* ${reservation.guests}
💰 *Total:* ${reservation.totalAmount}

Em breve você receberá um e-mail com todos os detalhes da reserva e instruções de pagamento.

Obrigado por escolher nossos serviços! 🙏
    `.trim()

    await this.whatsappClient.sendText(to, confirmationText)
  }

  private async sendPriceBreakdown(to: string, priceData: any): Promise<void> {
    const { breakdown } = priceData

    const priceText = `
💰 *Detalhamento do Preço*

🏠 Diária: R$ ${breakdown.basePrice?.toLocaleString('pt-BR')} x ${breakdown.nights} noites
📊 Subtotal: R$ ${breakdown.subtotal?.toLocaleString('pt-BR')}
${breakdown.weekendSurcharge ? `🌅 Taxa fim de semana: R$ ${breakdown.weekendSurcharge.toLocaleString('pt-BR')}\n` : ''}
${breakdown.holidaySurcharge ? `🎉 Taxa feriado: R$ ${breakdown.holidaySurcharge.toLocaleString('pt-BR')}\n` : ''}
🧹 Taxa de limpeza: R$ ${breakdown.cleaningFee?.toLocaleString('pt-BR')}
⚙️ Taxa de serviço: R$ ${breakdown.serviceFee?.toLocaleString('pt-BR')}
${breakdown.discountAmount ? `🎁 Desconto: -R$ ${breakdown.discountAmount.toLocaleString('pt-BR')}\n` : ''}

💳 *Total Final: R$ ${breakdown.finalPrice?.toLocaleString('pt-BR')}*
    `.trim()

    await this.whatsappClient.sendText(to, priceText)
  }

  private async sendDiscountConfirmation(to: string, discountData: any): Promise<void> {
    const { discount } = discountData

    const discountText = `
🎉 *Desconto Especial Aplicado!*

💰 Preço original: ${discount.originalPrice}
🎁 Desconto: ${discount.discountPercentage}
💳 *Novo preço: ${discount.finalPrice}*

⏰ *Válido até: ${discount.validUntil}*
📝 Motivo: ${discount.reason}

Não perca essa oportunidade! 🚀
    `.trim()

    await this.whatsappClient.sendText(to, discountText)
  }

  async handleStatusUpdate(webhookData: WhatsAppWebhookData): Promise<void> {
    try {
      const entry = webhookData.entry?.[0]
      const change = entry?.changes?.[0]
      const value = change?.value

      if (!value?.statuses?.[0]) return

      const status = value.statuses[0]

      // Update message status in database
      await this.conversationService.updateMessageStatus(
        status.id,
        status.status,
        new Date(parseInt(status.timestamp) * 1000)
      )

      } catch (error) {
      }
  }

  async handleError(webhookData: WhatsAppWebhookData): Promise<void> {
    // Log error for monitoring
    // You can integrate with your error tracking system here
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Template message helpers
  async sendWelcomeTemplate(to: string, clientName: string): Promise<void> {
    await this.whatsappClient.sendTemplate(
      to,
      'welcome_message',
      'pt_BR',
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: clientName }
          ]
        }
      ]
    )
  }

  async sendBookingConfirmationTemplate(to: string, bookingDetails: any): Promise<void> {
    await this.whatsappClient.sendTemplate(
      to,
      'booking_confirmation',
      'pt_BR',
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: bookingDetails.propertyName },
            { type: 'text', text: bookingDetails.checkIn },
            { type: 'text', text: bookingDetails.checkOut },
            { type: 'text', text: bookingDetails.totalAmount }
          ]
        }
      ]
    )
  }

  async sendFollowUpTemplate(to: string, clientName: string): Promise<void> {
    await this.whatsappClient.sendTemplate(
      to,
      'follow_up',
      'pt_BR',
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: clientName }
          ]
        }
      ]
    )
  }

  /**
   * Get comprehensive audio statistics for analytics
   */
  getAudioStats(): {
    cacheStats: { size: number; keys: string[] }
    totalProcessed: number
    successRate: number
  } {
    const cacheStats = this.transcriptionService.getCacheStats()

    return {
      cacheStats,
      totalProcessed: cacheStats.size, // Simplified - in real app would track more
      successRate: 0.95 // Simplified - in real app would calculate actual rate
    }
  }

  /**
   * Clear audio cache for memory management
   */
  clearAudioCache(): void {
    this.transcriptionService.clearCache()
    }

  /**
   * Handle audio-specific errors with user-friendly messages
   */
  private handleAudioError(error: any, clientPhone: string): string {
    if (error.message?.includes('format')) {
      return 'Formato de áudio não suportado. Tente gravar novamente ou envie por texto. 🎤'
    }

    if (error.message?.includes('size')) {
      return 'Áudio muito grande. Tente um áudio mais curto ou envie por texto. 📱'
    }

    if (error.message?.includes('timeout')) {
      return 'Áudio demorou para processar. Tente novamente ou envie por texto. ⏱️'
    }

    return 'Tive dificuldade para processar seu áudio. Pode tentar novamente ou enviar por texto? 😊'
  }

  private async sendRateLimitMessage(to: string): Promise<void> {
    try {
      await this.whatsappClient.sendText(
        to,
        'Você está enviando muitas mensagens seguidas. Aguarde um momento e tente novamente.'
      )
    } catch (error) {
      }
  }

  private classifyError(error: any): ErrorType {
    if (error.name === 'ValidationError') {
      return ErrorType.VALIDATION
    }

    if (error.name === 'TimeoutError') {
      return ErrorType.TIMEOUT
    }

    if (error.name === 'RateLimitError') {
      return ErrorType.RATE_LIMIT
    }

    return classifyError(error)
  }

  private getErrorMessage(errorType: ErrorType): string {
    switch (errorType) {
      case ErrorType.VALIDATION:
        return 'Não consegui processar sua mensagem. Pode tentar reformular de forma mais simples?'

      case ErrorType.RATE_LIMIT:
        return 'Muitas mensagens recebidas. Aguarde um momento e tente novamente.'

      case ErrorType.TIMEOUT:
        return 'Sua solicitação está demorando mais que o esperado. Vou processar e responder em breve.'

      case ErrorType.NETWORK:
        return 'Estou com problemas de conexão. Nossa equipe técnica foi notificada.'

      case ErrorType.API_LIMIT:
        return 'Estou com muitas conversas simultâneas. Tente novamente em alguns segundos.'

      default:
        return 'Desculpe, ocorreu um erro temporário. Nossa equipe foi notificada e em breve retornaremos o contato.'
    }
  }

  private async isBillingResponse(content: string, phoneNumber: string): Promise<boolean> {
    // Check if there are active billing reminders for this phone number
    try {
      const { billingService } = await import('@/lib/services/billing-service')
      const reminders = await billingService.getActiveRemindersForPhone(phoneNumber)
      
      if (reminders.length === 0) {
        return false
      }

      // Keywords that indicate a billing-related response
      const billingKeywords = [
        'pag', 'pago', 'paguei', 'pagamento',
        'vou pagar', 'posso pagar', 'quando pagar',
        'boleto', 'pix', 'transferencia', 'cartão',
        'vencimento', 'vencido', 'atraso', 'juros',
        'desconto', 'parcela', 'valor',
        'ja paguei', 'já paguei', 'efetuei', 'realizei',
        'comprovante', 'recibo',
        'contestar', 'discordo', 'não concordo',
        'ajuda', 'dificuldade', 'problema'
      ]

      const lowerContent = content.toLowerCase()
      return billingKeywords.some(keyword => lowerContent.includes(keyword))
    } catch (error) {
      // Error checking billing response handled
      return false
    }
  }

  /**
   * Filter undefined values from nested objects
   */
  private filterUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) return undefined
    
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const filtered: any = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          if (typeof value === 'object' && value !== null) {
            const filteredValue = this.filterUndefinedValues(value)
            if (filteredValue !== undefined) {
              filtered[key] = filteredValue
            }
          } else {
            filtered[key] = value
          }
        }
      }
      return Object.keys(filtered).length > 0 ? filtered : undefined
    }
    
    return obj
  }

  private async processBillingResponse(
    content: string, 
    phoneNumber: string, 
    conversation: any
  ): Promise<void> {
    try {
      const { billingService } = await import('@/lib/services/billing-service')
      
      // Determine sentiment of the response
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
      
      const positiveKeywords = ['paguei', 'pago', 'sim', 'ok', 'certo', 'vou pagar', 'pode', 'confirmo']
      const negativeKeywords = ['não', 'contestar', 'discordo', 'erro', 'problema', 'dificuldade']
      
      const lowerContent = content.toLowerCase()
      
      if (positiveKeywords.some(k => lowerContent.includes(k))) {
        sentiment = 'positive'
      } else if (negativeKeywords.some(k => lowerContent.includes(k))) {
        sentiment = 'negative'
      }
      
      // Process the billing response
      await billingService.processClientResponse(phoneNumber, content, sentiment)
      
      // Update conversation context to indicate billing discussion
      if (conversation.context) {
        conversation.context.lastBillingInteraction = new Date()
        conversation.context.billingResponseSentiment = sentiment
      }
    } catch (error) {
      // Error processing billing response handled
    }
  }
}