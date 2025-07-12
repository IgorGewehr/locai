import { WhatsAppMessage, WhatsAppTemplate, WhatsAppMediaResponse, WhatsAppMediaDetails, WhatsAppError } from '@/lib/types/whatsapp'
import { withTimeout } from '@/lib/utils/async'

export class WhatsAppClient {
  private baseURL = 'https://graph.facebook.com/v18.0'
  private phoneNumberId: string
  private accessToken: string

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId
    this.accessToken = accessToken
  }

  /**
   * Enhanced send message with better error handling and logging
   */
  async sendMessage(to: string, message: WhatsAppMessage): Promise<any> {
    try {
      const url = `${this.baseURL}/${this.phoneNumberId}/messages`

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        ...message
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new WhatsAppError(
          error.error?.code || response.status,
          error.error?.message || `Failed to send ${message.type} message`,
          `Send ${message.type} Error`
        )
      }

      const result = await response.json()
      return result

    } catch (error) {
      if (error instanceof WhatsAppError) {
        throw error
      }

      throw new WhatsAppError(
        500,
        error instanceof Error ? error.message : 'Failed to send message',
        'Send Message Error'
      )
    }
  }

  async sendText(to: string, text: string): Promise<void> {
    await this.sendMessage(to, {
      type: 'text',
      text: { body: text }
    })
  }

  /**
   * Send typing indicator (shows client that bot is "typing")
   */
  async sendTypingIndicator(to: string): Promise<void> {
    try {
      const url = `${this.baseURL}/${this.phoneNumberId}/messages`

      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: '...' // This creates a typing effect
          }
        })
      })

      // Note: WhatsApp API doesn't have official typing indicators
      // This is a workaround that sends a brief message

    } catch (error) {
      // Don't throw on typing indicator failures
      }
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
    await this.sendMessage(to, {
      type: 'image',
      image: caption ? { link: imageUrl, caption } : { link: imageUrl }
    })
  }

  async sendVideo(to: string, videoUrl: string, caption?: string): Promise<void> {
    await this.sendMessage(to, {
      type: 'video',
      video: caption ? { link: videoUrl, caption } : { link: videoUrl }
    })
  }

  async sendDocument(to: string, documentUrl: string, filename?: string): Promise<void> {
    await this.sendMessage(to, {
      type: 'document',
      document: filename ? { link: documentUrl, filename } : { link: documentUrl }
    })
  }

  /**
   * Send audio message (professional implementation)
   */
  async sendAudio(to: string, audioBuffer: Buffer, caption?: string): Promise<void> {
    try {
      // TODO: Add proper logging - Sending audio size

      // Create audio file from buffer
      const audioFile = new File([audioBuffer], 'audio_response.mp3', { type: 'audio/mpeg' })

      // Upload audio to WhatsApp
      const uploadResponse = await this.uploadMedia(audioFile)

      if (!uploadResponse.id) {
        throw new Error('Failed to upload audio file')
      }

      // Send audio message
      const audioObj: any = { id: uploadResponse.id }
      if (caption) audioObj.caption = caption

      await this.sendMessage(to, {
        type: 'audio',
        audio: audioObj
      })

      } catch (error) {
      throw new WhatsAppError(
        500, 
        error instanceof Error ? error.message : 'Failed to send audio message',
        'Audio Send Error'
      )
    }
  }

  /**
   * Send audio from URL (alternative method)
   */
  async sendAudioFromUrl(to: string, audioUrl: string, caption?: string): Promise<void> {
    try {
      const audioObj: any = { link: audioUrl }
      if (caption) audioObj.caption = caption

      await this.sendMessage(to, {
        type: 'audio',
        audio: audioObj
      })

      } catch (error) {
      throw new WhatsAppError(
        500, 
        error instanceof Error ? error.message : 'Failed to send audio from URL',
        'Audio URL Send Error'
      )
    }
  }

  async sendLocation(to: string, latitude: number, longitude: number, name?: string, address?: string): Promise<void> {
    const location: any = { latitude, longitude }
    if (name) location.name = name
    if (address) location.address = address

    await this.sendMessage(to, {
      type: 'location',
      location
    })
  }

  async sendTemplate(to: string, templateName: string, languageCode: string, components: any[]): Promise<void> {
    await this.sendMessage(to, {
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components
      }
    })
  }

  async sendInteractiveButtons(to: string, text: string, buttons: { id: string, title: string }[]): Promise<void> {
    await this.sendMessage(to, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title
            }
          }))
        }
      }
    })
  }

  async sendInteractiveList(to: string, text: string, buttonText: string, sections: any[]): Promise<void> {
    await this.sendMessage(to, {
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text },
        action: {
          button: buttonText,
          sections
        }
      }
    })
  }

  /**
   * Enhanced mark as read with error handling
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      const url = `${this.baseURL}/${this.phoneNumberId}/messages`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new WhatsAppError(
          error.error?.code || 500, 
          error.error?.message || 'Failed to mark as read',
          'Mark Read Error'
        )
      }

      } catch (error) {
      // Don't throw on mark-as-read failures - it's not critical
    }
  }

  /**
   * Enhanced media upload with audio support and validation
   */
  async uploadMedia(file: File): Promise<WhatsAppMediaResponse> {
    try {
      // Validate file before upload
      await this.validateMediaFile(file)
      
      // TODO: Add proper logging - Uploading media file

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', file.type)
      formData.append('messaging_product', 'whatsapp')

      const response = await fetch(`${this.baseURL}/${this.phoneNumberId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new WhatsAppError(
          error.error?.code || 500, 
          error.error?.message || 'Failed to upload media',
          'Media Upload Error'
        )
      }

      const result = await response.json()
      return result

    } catch (error) {
      if (error instanceof WhatsAppError) {
        throw error
      }
      throw new WhatsAppError(
        500, 
        error instanceof Error ? error.message : 'Failed to upload media',
        'Media Upload Error'
      )
    }
  }

  /**
   * Validate media file before upload
   */
  private async validateMediaFile(file: File): Promise<void> {
    const MAX_FILE_SIZE = 64 * 1024 * 1024 // 64MB WhatsApp limit
    const SUPPORTED_AUDIO_TYPES = [
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/wav',
      'audio/aac',
      'audio/webm'
    ]
    const SUPPORTED_IMAGE_TYPES = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
    const SUPPORTED_VIDEO_TYPES = [
      'video/mp4',
      'video/3gp',
      'video/avi',
      'video/mov'
    ]
    const SUPPORTED_DOCUMENT_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 64MB`)
    }

    // Check file type
    const allSupportedTypes = [
      ...SUPPORTED_AUDIO_TYPES,
      ...SUPPORTED_IMAGE_TYPES,
      ...SUPPORTED_VIDEO_TYPES,
      ...SUPPORTED_DOCUMENT_TYPES
    ]

    if (!allSupportedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`)
    }

    // Special validation for audio files
    if (SUPPORTED_AUDIO_TYPES.includes(file.type)) {
      const MAX_AUDIO_SIZE = 16 * 1024 * 1024 // 16MB for audio
      if (file.size > MAX_AUDIO_SIZE) {
        throw new Error(`Audio file too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 16MB`)
      }
    }
  }

  async getMediaDetails(mediaId: string): Promise<WhatsAppMediaDetails> {
    const response = await fetch(`${this.baseURL}/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new WhatsAppError(error.error?.code || 500, error.error?.message || 'Failed to get media details')
    }

    return response.json()
  }

  /**
   * Enhanced media download with timeout and validation
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      // TODO: Add proper logging - Downloading media from URL

      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': 'WhatsApp-Business-API-Client/1.0'
        },
        // Add timeout for large files
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        throw new WhatsAppError(
          response.status, 
          `Failed to download media: ${response.statusText}`,
          'Media Download Error'
        )
      }

      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const size = parseInt(contentLength)
        // TODO: Add proper logging - Downloading media size

        // Check size limit
        if (size > 25 * 1024 * 1024) { // 25MB limit
          throw new Error('Media file too large to download')
        }
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // TODO: Add proper logging - Media downloaded successfully

      return buffer

    } catch (error) {
      if (error instanceof WhatsAppError) {
        throw error
      }

      if (error.name === 'AbortError') {
        throw new WhatsAppError(408, 'Media download timeout', 'Download Timeout')
      }

      throw new WhatsAppError(
        500, 
        error instanceof Error ? error.message : 'Failed to download media',
        'Media Download Error'
      )
    }
  }

  async getBusinessProfile(): Promise<any> {
    try {
    const response = await fetch(`${this.baseURL}/${this.phoneNumberId}/whatsapp_business_profile`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new WhatsAppError(error.error?.code || 500, error.error?.message || 'Failed to get business profile')
    }

    return response.json()
    } catch (error) {
      throw new WhatsAppError(500, 'Failed to get business profile', 'Business Profile Error')
    }
  }

  async updateBusinessProfile(profile: any): Promise<void> {
    const response = await fetch(`${this.baseURL}/${this.phoneNumberId}/whatsapp_business_profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profile)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new WhatsAppError(error.error?.code || 500, error.error?.message || 'Failed to update business profile')
    }
  }

  async setWebhook(webhookUrl: string, verifyToken: string): Promise<void> {
    // This would typically be done through Facebook Developer Console
    // but can be programmatically set up if needed
    }

  async getPhoneNumberInfo(): Promise<any> {
    const response = await fetch(`${this.baseURL}/${this.phoneNumberId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new WhatsAppError(error.error?.code || 500, error.error?.message || 'Failed to get phone number info')
    }

    return response.json()
  }

  // Template management
  async createTemplate(name: string, category: string, language: string, components: any[]): Promise<any> {
    const response = await fetch(`${this.baseURL}/whatsapp_business_account/message_templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        category,
        language,
        components
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new WhatsAppError(error.error?.code || 500, error.error?.message || 'Failed to create template')
    }

    return response.json()
  }

  async getTemplates(): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/whatsapp_business_account/message_templates`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new WhatsAppError(error.error?.code || 500, error.error?.message || 'Failed to get templates')
    }

    const data = await response.json()
    return data.data || []
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/${templateId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new WhatsAppError(error.error?.code || 500, error.error?.message || 'Failed to delete template')
    }
  }

  /**
   * Get audio duration from buffer (approximation)
   */
  getEstimatedAudioDuration(audioBuffer: Buffer): number {
    // Rough estimation: MP3 compression ratio ~1MB per minute
    const sizeInMB = audioBuffer.length / (1024 * 1024)
    return Math.max(sizeInMB * 60, 1) // At least 1 second
  }

  /**
   * Check if audio file is valid
   */
  isValidAudioBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length === 0) {
      return false
    }

    // Check for common audio file headers
    const header = buffer.slice(0, 4)

    // MP3 header
    if (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) {
      return true
    }

    // MP4/M4A header
    if (header.toString() === 'ftyp') {
      return true
    }

    // OGG header
    if (header.toString('ascii', 0, 4) === 'OggS') {
      return true
    }

    // WAV header
    if (header.toString('ascii', 0, 4) === 'RIFF') {
      return true
    }

    return false
  }

  // Utility methods
  isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation for international format
    const regex = /^\+?[1-9]\d{1,14}$/
    return regex.test(phoneNumber.replace(/\s/g, ''))
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '')

    // Add + if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned
    }

    return cleaned
  }

  /**
   * Get audio file info from media details
   */
  getAudioInfo(mediaDetails: WhatsAppMediaDetails): {
    isAudio: boolean
    format: string | null
    estimatedDuration: number
  } {
    const isAudio = mediaDetails.mime_type?.startsWith('audio/') || false
    const format = isAudio ? mediaDetails.mime_type?.split('/')[1] || null : null
    const estimatedDuration = mediaDetails.file_size 
      ? (mediaDetails.file_size / (1024 * 1024)) * 60 // Rough estimate
      : 0

    return {
      isAudio,
      format,
      estimatedDuration
    }
  }

  // Error handling
  handleWebhookError(error: any): WhatsAppError {
    return new WhatsAppError(
      error.code || 500,
      error.message || 'Webhook error',
      error.title || 'Webhook Error'
    )
  }

  /**
   * Handle audio-specific errors
   */
  handleAudioError(error: any, operation: string): WhatsAppError {
    const errorMessage = error.message || `Audio ${operation} failed`
    const errorCode = error.code || 500

    // Map specific audio errors
    if (errorMessage.includes('format')) {
      return new WhatsAppError(400, 'Unsupported audio format', 'Audio Format Error')
    }

    if (errorMessage.includes('size')) {
      return new WhatsAppError(413, 'Audio file too large', 'Audio Size Error')
    }

    if (errorMessage.includes('timeout')) {
      return new WhatsAppError(408, 'Audio processing timeout', 'Audio Timeout Error')
    }

    return new WhatsAppError(errorCode, errorMessage, `Audio ${operation} Error`)
  }
}

export class WhatsAppError extends Error {
  public code: number
  public title: string
  public timestamp: Date

  constructor(code: number, message: string, title?: string) {
    super(message)
    this.code = code
    this.title = title || 'WhatsApp Error'
    this.name = 'WhatsAppError'
    this.timestamp = new Date()
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    // Network errors, rate limits, and temporary server errors are retryable
    return this.code >= 500 || this.code === 429 || this.code === 408
  }

  /**
   * Get user-friendly error message in Portuguese
   */
  getUserMessage(): string {
    switch (this.code) {
      case 400:
        return 'Formato de mensagem inválido. Tente novamente.'
      case 401:
        return 'Erro de autenticação. Entre em contato com o suporte.'
      case 403:
        return 'Sem permissão para enviar mensagens.'
      case 404:
        return 'Número não encontrado no WhatsApp.'
      case 408:
        return 'Timeout na conexão. Tente novamente.'
      case 413:
        return 'Arquivo muito grande. Tente um arquivo menor.'
      case 415:
        return 'Formato de arquivo não suportado.'
      case 429:
        return 'Muitas mensagens enviadas. Aguarde um momento.'
      case 500:
      case 503:
        return 'Erro temporário do WhatsApp. Tente novamente em alguns minutos.'
      default:
        return 'Erro no envio da mensagem. Tente novamente.'
    }
  }
}