import { WhatsAppClient } from './client'
import { WhatsAppWebhookData, WhatsAppIncomingMessage } from '@/lib/types/whatsapp'
import { AIResponse } from '@/lib/types/ai'
import { Message, MessageType, MessageStatus } from '@/lib/types/conversation'
import { ConversationService } from '@/lib/services/conversation-service'
import { AIService } from '@/lib/services/ai-service'
import { AutomationService } from '@/lib/services/automation-service'
import { PropertyService } from '@/lib/services/property-service'
import { ReservationService } from '@/lib/services/reservation-service'
import { withTimeout, withRetry, RateLimiter } from '@/lib/utils/async'
import { validatePhoneNumber, validateMessageContent } from '@/lib/utils/validation'
import { NetworkError, RateLimitError, ErrorType, classifyError } from '@/lib/utils/errors'
import { TranscriptionService } from '@/lib/services/transcription-service'

export class WhatsAppMessageHandler {
  private whatsappClient: WhatsAppClient
  private aiService: AIService
  private conversationService: ConversationService
  private automationService: AutomationService
  private propertyService: PropertyService
  private reservationService: ReservationService
  private rateLimiter: RateLimiter
  private processingMessages: Set<string> = new Set()
  private transcriptionService: TranscriptionService

  constructor(
    whatsappClient: WhatsAppClient,
    aiService: AIService,
    conversationService: ConversationService,
    automationService: AutomationService,
    propertyService: PropertyService,
    reservationService: ReservationService
  ) {
    this.whatsappClient = whatsappClient
    this.aiService = aiService
    this.conversationService = conversationService
    this.automationService = automationService
    this.propertyService = propertyService
    this.reservationService = reservationService
    this.rateLimiter = new RateLimiter(20, 60000) // 20 messages per minute
    this.transcriptionService = new TranscriptionService(whatsappClient)
  }

  async handleIncomingMessage(webhookData: WhatsAppWebhookData): Promise<void> {
    try {
      const { message, from, contact } = this.extractMessageData(webhookData)
      
      if (!message || !from) {
        console.log('Invalid webhook data received')
        return
      }

      // Validate phone number format
      const validatedPhone = validatePhoneNumber(from)
      
      // Check rate limiting
      const rateLimitAllowed = await this.rateLimiter.isAllowed(validatedPhone)
      if (!rateLimitAllowed) {
        console.log(`Rate limit exceeded for ${validatedPhone}`)
        await this.sendRateLimitMessage(validatedPhone)
        return
      }

      // Check for duplicate message processing
      const messageId = message.id
      if (this.processingMessages.has(messageId)) {
        console.log(`Duplicate message detected: ${messageId}`)
        return
      }

      this.processingMessages.add(messageId)
      
      try {
        // Process message content (including audio transcription)
        let messageContent = message.text?.body || this.getMediaCaption(message) || ''
        
        // Handle audio messages with transcription
        if (message.type === 'audio' && message.audio?.id) {
          try {
            console.log(`Transcribing audio message: ${message.audio.id}`)
            messageContent = await this.transcriptionService.transcribeAudio(message.audio.id)
            console.log(`Audio transcribed: "${messageContent.slice(0, 100)}..."`)
          } catch (error) {
            console.error('Audio transcription failed:', error)
            messageContent = 'Recebi seu áudio! Por favor, envie sua mensagem por texto para eu processar melhor. 😊'
          }
        }
        
        const validatedContent = validateMessageContent(messageContent)
        
        console.log(`Processing message from ${validatedPhone}: ${validatedContent.slice(0, 100)}...`)

        // Mark message as read immediately with timeout
        await withTimeout(
          this.whatsappClient.markAsRead(message.id),
          5000,
          'Mark message as read'
        )

        // Find or create conversation
        let conversation = await this.conversationService.findByPhone(validatedPhone)
        if (!conversation) {
          conversation = await this.conversationService.createNew(validatedPhone, contact?.profile?.name)
        }

        // Save incoming message
        const savedMessage = await this.conversationService.addMessage(
          conversation.id,
          {
            content: validatedContent,
            type: this.getMessageType(message),
            direction: 'inbound',
            whatsappMessageId: message.id,
            mediaUrl: await this.getMediaUrl(message),
            timestamp: new Date(parseInt(message.timestamp) * 1000),
            status: MessageStatus.RECEIVED,
            isFromAI: false
          }
        )

        // Skip AI processing only for unsupported message types (audio now supported)
        if (this.shouldSkipAIProcessing(message)) {
          await this.sendAcknowledgment(validatedPhone, message.type)
          return
        }

        // Process with AI (with timeout)
        const aiResponse = await withTimeout(
          this.aiService.processMessage(conversation, savedMessage),
          45000,
          'AI processing'
        )

        // Determine if we should respond with audio
        const shouldUseAudio = message.type === 'audio' && 
          this.transcriptionService.shouldGenerateAudioResponse(
            validatedPhone,
            conversation.messages || [],
            undefined // Will use default preferences
          )

        // Send AI response (text or audio based on context)
        await this.sendAIResponse(validatedPhone, aiResponse, shouldUseAudio)

        // Save AI response message
        await this.conversationService.addMessage(
          conversation.id,
          {
            content: aiResponse.content,
            type: MessageType.TEXT,
            direction: 'outbound',
            isFromAI: true,
            functionCall: aiResponse.functionCall,
            confidence: aiResponse.confidence,
            timestamp: new Date(),
            status: MessageStatus.SENT
          }
        )

        // Update conversation context and analytics
        await this.conversationService.updateConversationFromAI(conversation.id, aiResponse)

        // Trigger automations
        await this.automationService.triggerAutomations('message_received', {
          conversationId: conversation.id,
          messageId: savedMessage.id,
          clientPhone: validatedPhone,
          messageContent: savedMessage.content,
          aiResponse: aiResponse
        })
        
      } finally {
        // Remove message from processing set
        this.processingMessages.delete(messageId)
      }

    } catch (error) {
      console.error('Error handling WhatsApp message:', error)
      
      // Classify error and send appropriate response
      const errorType = this.classifyError(error)
      
      try {
        const { from } = this.extractMessageData(webhookData)
        if (from) {
          const validatedPhone = validatePhoneNumber(from)
          const errorMessage = this.getErrorMessage(errorType)
          
          await withTimeout(
            this.whatsappClient.sendText(validatedPhone, errorMessage),
            10000,
            'Send error message'
          )
        }
      } catch (sendError) {
        console.error('Failed to send error message:', sendError)
      }
    }
  }

  private extractMessageData(webhookData: WhatsAppWebhookData): { message: WhatsAppIncomingMessage, from: string, contact: any } {
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
      console.error('Error getting media URL:', error)
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
    try {
      // Send main response (text or audio)
      if (response.content) {
        if (preferAudio && response.content.length > 20) {
          // Try to send audio response
          try {
            console.log(`🎤 Generating audio response for ${to}`)
            
            const audioResult = await this.transcriptionService.generateAudioResponse(
              response.content,
              undefined, // Use default preferences
              to
            )
            
            if (audioResult.audioBuffer) {
              console.log(`🔊 Sending audio response: ${(audioResult.audioBuffer.length / 1024).toFixed(1)}KB`)
              
              await withRetry(
                () => this.whatsappClient.sendAudio(to, audioResult.audioBuffer!),
                2,
                1000
              )
              
              console.log(`✅ Audio response sent successfully`)
            } else {
              // Fallback to text if audio generation failed
              console.log(`⚠️ Audio generation failed, falling back to text`)
              await this.sendTextResponse(to, response.content)
            }
            
          } catch (audioError) {
            console.error('❌ Audio response failed, sending text:', audioError)
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
      }

      // Add delay between messages to feel more natural
      await this.delay(1000)

    } catch (error) {
      console.error('❌ Error sending AI response:', error)
      throw error
    }
  }
  
  /**
   * Send text response with retry logic
   */
  private async sendTextResponse(to: string, content: string): Promise<void> {
    await withRetry(
      () => this.whatsappClient.sendText(to, content),
      3,
      1000
    )
  }

  private async handleFunctionCallResponse(to: string, functionCall: any): Promise<void> {
    const { name, result } = functionCall

    if (!result?.success) {
      console.error(`Function ${name} failed:`, result?.error)
      return
    }

    switch (name) {
      case 'send_property_media':
        await this.sendPropertyMedia(to, result)
        break
      
      case 'search_properties':
        await this.sendPropertyResults(to, result)
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
    const { properties, totalFound } = searchResult

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

    // Send summary with retry
    await withRetry(
      () => this.whatsappClient.sendText(
        to,
        `Encontrei ${totalFound} propriedades que atendem aos seus critérios! Aqui estão as principais:`
      ),
      2,
      1000
    )

    // Send top 3 properties with photos
    const topProperties = properties.slice(0, 3)
    
    for (const property of topProperties) {
      // Send property info
      const propertyText = `
🏠 *${property.name}*
📍 ${property.location}
🛏️ ${property.bedrooms} quartos | 🚿 ${property.bathrooms} banheiros
👥 Até ${property.maxGuests} hóspedes
💰 R$ ${property.calculatedPrice?.toLocaleString('pt-BR')} total (${property.totalNights} noites)
      `.trim()

      await withRetry(
        () => this.whatsappClient.sendText(to, propertyText),
        2,
        1000
      )

      // Send main photo
      if (property.photos && property.photos.length > 0) {
        await withRetry(
          () => this.whatsappClient.sendImage(
            to,
            property.photos[0].url,
            `${property.name} - Foto principal`
          ),
          2,
          1000
        )
      }

      await this.delay(2000)
    }

    // Offer to see more or get details
    if (totalFound > 3) {
      await withRetry(
        () => this.whatsappClient.sendText(
          to,
          `Posso mostrar mais ${totalFound - 3} propriedades ou enviar mais detalhes de alguma específica. O que prefere?`
        ),
        2,
        1000
      )
    }
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

      console.log(`Message ${status.id} status updated to: ${status.status}`)

    } catch (error) {
      console.error('Error handling status update:', error)
    }
  }

  async handleError(webhookData: WhatsAppWebhookData): Promise<void> {
    console.error('WhatsApp webhook error:', webhookData)
    
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
    console.log('🧹 Audio processing cache cleared')
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
      console.error('Failed to send rate limit message:', error)
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
}