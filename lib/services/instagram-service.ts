import { logger } from '@/lib/utils/logger';
import { createSettingsService } from '@/lib/services/settings-service';
import {
    GRAPH_API_VERSION,
    GRAPH_API_BASE_URL,
    INSTAGRAM_API_BASE_URL
} from '@/lib/facebook/constants';

export interface InstagramSendResult {
    success: boolean;
    messageId?: string;
    recipientId?: string;
    error?: string;
}

export interface InstagramUserProfile {
    id: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
}

/**
 * Instagram Service
 *
 * Handles sending and receiving Instagram Direct Messages.
 * Supports two authentication methods:
 * 1. Via Facebook Page - Uses Page Access Token
 * 2. Via Instagram Direct Login - Uses Instagram Access Token
 *
 * Note: Instagram messaging uses the Facebook Graph API with the Instagram
 * Business Account ID as the recipient/sender.
 */
export class InstagramService {
    private apiVersion = GRAPH_API_VERSION;
    private graphBaseUrl = GRAPH_API_BASE_URL;
    private instagramBaseUrl = INSTAGRAM_API_BASE_URL;

    /**
     * Get access token for a tenant
     * Checks both Instagram Direct Login token and Facebook Page token
     */
    private async getAccessToken(tenantId: string): Promise<{ token: string; authMethod: string } | null> {
        if (!tenantId) {
            const testToken = process.env.INSTAGRAM_TEST_TOKEN || process.env.FACEBOOK_TEST_TOKEN;
            if (testToken) {
                return { token: testToken, authMethod: 'test' };
            }
            return null;
        }

        try {
            const settingsService = createSettingsService(tenantId);
            const settings = await settingsService.getSettings(tenantId);

            // Check Instagram Direct Login token first
            if (settings?.instagram?.accessToken && settings.instagram.authMethod === 'instagram_login') {
                return {
                    token: settings.instagram.accessToken,
                    authMethod: 'instagram_login'
                };
            }

            // Fall back to Facebook Page token
            if (settings?.instagram?.pageAccessToken) {
                return {
                    token: settings.instagram.pageAccessToken,
                    authMethod: 'facebook_page'
                };
            }

            // Fall back to Facebook settings
            if (settings?.facebook?.pageAccessToken) {
                return {
                    token: settings.facebook.pageAccessToken,
                    authMethod: 'facebook_page'
                };
            }

            // Fall back to test tokens
            const testToken = process.env.INSTAGRAM_TEST_TOKEN || process.env.FACEBOOK_TEST_TOKEN;
            if (testToken) {
                return { token: testToken, authMethod: 'test' };
            }

            logger.warn(`[Instagram Service] No access token found for tenant ${tenantId}`);
            return null;
        } catch (error) {
            logger.error(`[Instagram Service] Error fetching settings for tenant ${tenantId}:`, error);
            return null;
        }
    }

    /**
     * Get Instagram Business Account ID for a tenant
     */
    private async getInstagramAccountId(tenantId: string): Promise<string | null> {
        try {
            const settingsService = createSettingsService(tenantId);
            const settings = await settingsService.getSettings(tenantId);

            return settings?.instagram?.businessAccountId || null;
        } catch (error) {
            logger.error(`[Instagram Service] Error getting account ID:`, error);
            return null;
        }
    }

    /**
     * Send a text message via Instagram DM
     *
     * Uses the Messenger Platform API endpoint for Instagram
     */
    async sendText(recipientId: string, text: string, tenantId: string): Promise<InstagramSendResult> {
        return this.sendMessage(recipientId, { text }, tenantId);
    }

    /**
     * Send an image via Instagram DM
     */
    async sendImage(recipientId: string, imageUrl: string, tenantId: string): Promise<InstagramSendResult> {
        return this.sendMessage(recipientId, {
            attachment: {
                type: 'image',
                payload: {
                    url: imageUrl,
                    is_reusable: true
                }
            }
        }, tenantId);
    }

    /**
     * Send a message via Instagram DM
     *
     * Instagram DMs use the same API as Facebook Messenger:
     * POST /me/messages (with Page Access Token)
     *
     * The recipient.id should be the Instagram-scoped ID (IGSID) of the user
     */
    private async sendMessage(recipientId: string, message: any, tenantId: string): Promise<InstagramSendResult> {
        try {
            const tokenData = await this.getAccessToken(tenantId);

            if (!tokenData) {
                logger.error('[Instagram Service] No access token available');
                return {
                    success: false,
                    error: 'No Instagram access token configured'
                };
            }

            logger.info(`[Instagram Service] Sending message to ${recipientId}`, {
                tenantId: tenantId?.substring(0, 8) + '***',
                authMethod: tokenData.authMethod
            });

            // Instagram messaging uses the same endpoint as Facebook Messenger
            // The Page Access Token determines which Page/Instagram account sends the message
            const response = await fetch(
                `${this.graphBaseUrl}/${this.apiVersion}/me/messages?access_token=${tokenData.token}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        recipient: { id: recipientId },
                        message,
                        messaging_type: 'RESPONSE' // Responding to a user message
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                logger.error('[Instagram Service] API error:', data.error);
                return {
                    success: false,
                    error: data.error?.message || 'Failed to send Instagram message'
                };
            }

            logger.info(`[Instagram Service] Message sent successfully`, {
                messageId: data.message_id,
                recipientId: data.recipient_id
            });

            return {
                success: true,
                messageId: data.message_id,
                recipientId: data.recipient_id
            };
        } catch (error) {
            logger.error('[Instagram Service] Error sending message:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get user profile from Instagram
     *
     * For Instagram Direct Login: Uses graph.instagram.com
     * For Facebook Page method: Uses graph.facebook.com
     */
    async getUserProfile(userId: string, tenantId: string): Promise<InstagramUserProfile | null> {
        try {
            const tokenData = await this.getAccessToken(tenantId);

            if (!tokenData) {
                return null;
            }

            // For Instagram-scoped users, use the Facebook Graph API
            const response = await fetch(
                `${this.graphBaseUrl}/${this.apiVersion}/${userId}?fields=name,username,profile_pic&access_token=${tokenData.token}`
            );

            const data = await response.json();

            if (!response.ok) {
                logger.warn('[Instagram Service] Failed to get user profile:', data.error);
                return null;
            }

            return {
                id: data.id,
                username: data.username || 'Instagram User',
                name: data.name,
                profilePictureUrl: data.profile_pic
            };
        } catch (error) {
            logger.error('[Instagram Service] Error getting user profile:', error);
            return null;
        }
    }

    /**
     * Get the connected Instagram account info
     */
    async getAccountInfo(tenantId: string): Promise<{
        id: string;
        username: string;
        name?: string;
        profilePictureUrl?: string;
        followersCount?: number;
    } | null> {
        try {
            const tokenData = await this.getAccessToken(tenantId);
            const accountId = await this.getInstagramAccountId(tenantId);

            if (!tokenData || !accountId) {
                return null;
            }

            // Use the appropriate endpoint based on auth method
            const baseUrl = tokenData.authMethod === 'instagram_login'
                ? this.instagramBaseUrl
                : this.graphBaseUrl;

            const response = await fetch(
                `${baseUrl}/${accountId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${tokenData.token}`
            );

            const data = await response.json();

            if (!response.ok) {
                logger.error('[Instagram Service] Error getting account info:', data.error);
                return null;
            }

            return {
                id: data.id,
                username: data.username,
                name: data.name,
                profilePictureUrl: data.profile_picture_url,
                followersCount: data.followers_count
            };
        } catch (error) {
            logger.error('[Instagram Service] Error getting account info:', error);
            return null;
        }
    }
}

export const instagramService = new InstagramService();
