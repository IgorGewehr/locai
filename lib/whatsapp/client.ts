import { WhatsAppMessage, WhatsAppTemplate, WhatsAppMediaResponse, WhatsAppMediaDetails, WhatsAppError } from '@/lib/types/whatsapp'

export class WhatsAppClient {
  private baseURL = 'https://graph.facebook.com/v18.0'
  private phoneNumberId: string
  private accessToken: string

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId
    this.accessToken = accessToken
  }

  async sendMessage(to: string, message: WhatsAppMessage): Promise<void> {
    const url = `${this.baseURL}/${this.phoneNumberId}/messages`
    
    const payload = {
      messaging_product: 'whatsapp',
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
      throw new WhatsAppError(error.error?.code || 500, error.error?.message || 'Unknown error')
    }

    return response.json()
  }

  async sendText(to: string, text: string): Promise<void> {
    await this.sendMessage(to, {
      type: 'text',
      text: { body: text }
    })
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
    await this.sendMessage(to, {
      type: 'image',
      image: { link: imageUrl, caption }
    })
  }

  async sendVideo(to: string, videoUrl: string, caption?: string): Promise<void> {
    await this.sendMessage(to, {
      type: 'video',
      video: { link: videoUrl, caption }
    })
  }

  async sendDocument(to: string, documentUrl: string, filename?: string): Promise<void> {
    await this.sendMessage(to, {
      type: 'document',
      document: { link: documentUrl, filename }
    })
  }

  async sendLocation(to: string, latitude: number, longitude: number, name?: string, address?: string): Promise<void> {
    await this.sendMessage(to, {
      type: 'location',
      location: { latitude, longitude, name, address }
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

  async markAsRead(messageId: string): Promise<void> {
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
      throw new WhatsAppError(error.error?.code || 500, error.error?.message || 'Failed to mark as read')
    }
  }

  async uploadMedia(file: File): Promise<WhatsAppMediaResponse> {
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
      throw new WhatsAppError(error.error?.code || 500, error.error?.message || 'Failed to upload media')
    }

    return response.json()
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

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new WhatsAppError(response.status, 'Failed to download media')
    }

    return Buffer.from(await response.arrayBuffer())
  }

  async getBusinessProfile(): Promise<any> {
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
    console.log('Webhook setup should be done through Facebook Developer Console')
    console.log('Webhook URL:', webhookUrl)
    console.log('Verify Token:', verifyToken)
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

  // Error handling
  handleWebhookError(error: any): WhatsAppError {
    return new WhatsAppError(
      error.code || 500,
      error.message || 'Webhook error',
      error.title || 'Webhook Error'
    )
  }
}

export class WhatsAppError extends Error {
  public code: number
  public title: string

  constructor(code: number, message: string, title?: string) {
    super(message)
    this.code = code
    this.title = title || 'WhatsApp Error'
    this.name = 'WhatsAppError'
  }
}