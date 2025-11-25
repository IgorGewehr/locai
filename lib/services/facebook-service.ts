import { logger } from '@/lib/utils/logger'

import { createSettingsService } from '@/lib/services/settings-service'

export class FacebookService {
    private apiVersion = 'v18.0'
    private baseUrl = 'https://graph.facebook.com'

    private async getAccessToken(tenantId: string): Promise<string> {
        if (!tenantId) return process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''

        try {
            const settingsService = createSettingsService(tenantId)
            const settings = await settingsService.getSettings(tenantId)
            const token = settings?.facebook?.pageAccessToken

            if (!token) {
                logger.warn(`Facebook Page Access Token not found for tenant ${tenantId}, falling back to env`)
                return process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''
            }

            return token
        } catch (error) {
            logger.error(`Error fetching Facebook settings for tenant ${tenantId}:`, error)
            return process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''
        }
    }

    async sendText(recipientId: string, text: string, tenantId: string): Promise<any> {
        return this.sendMessage(recipientId, { text }, tenantId)
    }

    async sendImage(recipientId: string, imageUrl: string, tenantId: string): Promise<any> {
        return this.sendMessage(recipientId, {
            attachment: {
                type: 'image',
                payload: {
                    url: imageUrl,
                    is_reusable: true
                }
            }
        }, tenantId)
    }

    private async sendMessage(recipientId: string, message: any, tenantId: string): Promise<any> {
        try {
            const accessToken = await this.getAccessToken(tenantId)

            const response = await fetch(
                `${this.baseUrl}/${this.apiVersion}/me/messages?access_token=${accessToken}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        recipient: { id: recipientId },
                        message
                    })
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to send Facebook message')
            }

            return data
        } catch (error) {
            logger.error('Error sending Facebook message:', error)
            throw error
        }
    }

    async getUserProfile(userId: string, tenantId: string): Promise<{ firstName: string; lastName: string; profilePic?: string }> {
        try {
            const accessToken = await this.getAccessToken(tenantId)

            const response = await fetch(
                `${this.baseUrl}/${this.apiVersion}/${userId}?fields=first_name,last_name,profile_pic&access_token=${accessToken}`
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to get user profile')
            }

            return {
                firstName: data.first_name,
                lastName: data.last_name,
                profilePic: data.profile_pic
            }
        } catch (error) {
            logger.error('Error getting Facebook user profile:', error)
            // Return fallback
            return { firstName: 'Facebook', lastName: 'User' }
        }
    }
}

export const facebookService = new FacebookService()
