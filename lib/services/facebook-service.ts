import { logger } from '@/lib/utils/logger'
import { createSettingsService } from '@/lib/services/settings-service'
import { GRAPH_API_VERSION, GRAPH_API_BASE_URL } from '@/lib/facebook/constants'

export interface FacebookSendResult {
    success: boolean;
    messageId?: string;
    recipientId?: string;
    error?: string;
}

export class FacebookService {
    private apiVersion = GRAPH_API_VERSION
    private baseUrl = GRAPH_API_BASE_URL

    private async getAccessToken(tenantId: string): Promise<string> {
        if (!tenantId) {
            // Fallback to test token or page access token
            return process.env.FACEBOOK_TEST_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''
        }

        try {
            const settingsService = createSettingsService(tenantId)
            const settings = await settingsService.getSettings(tenantId)
            const token = settings?.facebook?.pageAccessToken

            if (!token) {
                logger.warn(`Facebook Page Access Token not found for tenant ${tenantId}, falling back to env`)
                return process.env.FACEBOOK_TEST_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''
            }

            return token
        } catch (error) {
            logger.error(`Error fetching Facebook settings for tenant ${tenantId}:`, error)
            return process.env.FACEBOOK_TEST_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''
        }
    }

    async sendText(recipientId: string, text: string, tenantId: string): Promise<FacebookSendResult> {
        return this.sendMessage(recipientId, { text }, tenantId)
    }

    async sendImage(recipientId: string, imageUrl: string, tenantId: string): Promise<FacebookSendResult> {
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

    private async sendMessage(recipientId: string, message: any, tenantId: string): Promise<FacebookSendResult> {
        try {
            const accessToken = await this.getAccessToken(tenantId)

            if (!accessToken) {
                logger.error('No Facebook access token available')
                return {
                    success: false,
                    error: 'No Facebook access token configured'
                }
            }

            logger.info(`[Facebook] Sending message to ${recipientId}`, {
                tenantId: tenantId?.substring(0, 8) + '***',
                hasToken: !!accessToken
            })

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
                logger.error('Facebook API error:', data.error)
                return {
                    success: false,
                    error: data.error?.message || 'Failed to send Facebook message'
                }
            }

            logger.info(`[Facebook] Message sent successfully`, {
                messageId: data.message_id,
                recipientId: data.recipient_id
            })

            return {
                success: true,
                messageId: data.message_id,
                recipientId: data.recipient_id
            }
        } catch (error) {
            logger.error('Error sending Facebook message:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
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

    /**
     * Get page info from Facebook
     */
    async getPageInfo(pageId: string, tenantId: string): Promise<{ name: string; id: string } | null> {
        try {
            const accessToken = await this.getAccessToken(tenantId)

            const response = await fetch(
                `${this.baseUrl}/${this.apiVersion}/${pageId}?fields=name,id&access_token=${accessToken}`
            )

            const data = await response.json()

            if (!response.ok) {
                logger.error('Error getting page info:', data.error)
                return null
            }

            return {
                name: data.name,
                id: data.id
            }
        } catch (error) {
            logger.error('Error getting Facebook page info:', error)
            return null
        }
    }
}

export const facebookService = new FacebookService()
