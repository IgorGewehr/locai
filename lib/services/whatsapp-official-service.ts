import { logger } from '@/lib/utils/logger'
import { createSettingsService } from '@/lib/services/settings-service'

export class WhatsAppOfficialService {
    private apiVersion = 'v18.0'
    private baseUrl = 'https://graph.facebook.com'

    private async getCredentials(tenantId: string) {
        if (!tenantId) return null

        try {
            const settingsService = createSettingsService(tenantId)
            const settings = await settingsService.getSettings(tenantId)
            const whatsapp = settings?.whatsapp

            if (!whatsapp || !whatsapp.phoneNumberId || !whatsapp.accessToken) {
                logger.warn(`WhatsApp Official credentials not found for tenant ${tenantId}`)
                return null
            }

            return whatsapp
        } catch (error) {
            logger.error(`Error fetching WhatsApp settings for tenant ${tenantId}:`, error)
            return null
        }
    }

    async sendText(recipientPhone: string, text: string, tenantId: string): Promise<any> {
        return this.sendMessage(recipientPhone, {
            type: 'text',
            text: { body: text }
        }, tenantId)
    }

    async sendImage(recipientPhone: string, imageUrl: string, tenantId: string, caption?: string): Promise<any> {
        return this.sendMessage(recipientPhone, {
            type: 'image',
            image: {
                link: imageUrl,
                caption: caption
            }
        }, tenantId)
    }

    async markAsRead(messageId: string, tenantId: string): Promise<boolean> {
        try {
            const credentials = await this.getCredentials(tenantId)
            if (!credentials) return false

            const response = await fetch(
                `${this.baseUrl}/${this.apiVersion}/${credentials.phoneNumberId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${credentials.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        status: 'read',
                        message_id: messageId
                    })
                }
            )

            const data = await response.json()
            return response.ok && data.success
        } catch (error) {
            logger.error('Error marking WhatsApp message as read:', error)
            return false
        }
    }

    private async sendMessage(recipientPhone: string, messageData: any, tenantId: string): Promise<any> {
        try {
            const credentials = await this.getCredentials(tenantId)

            if (!credentials) {
                throw new Error('WhatsApp credentials not configured')
            }

            // Format phone number (remove non-digits)
            const formattedPhone = recipientPhone.replace(/\D/g, '')

            const body = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: formattedPhone,
                ...messageData
            }

            const response = await fetch(
                `${this.baseUrl}/${this.apiVersion}/${credentials.phoneNumberId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${credentials.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to send WhatsApp message')
            }

            return {
                success: true,
                messageId: data.messages?.[0]?.id
            }
        } catch (error) {
            logger.error('Error sending WhatsApp message (Official API):', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            }
        }
    }
}

export const whatsappOfficialService = new WhatsAppOfficialService()
