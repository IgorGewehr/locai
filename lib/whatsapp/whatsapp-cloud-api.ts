/**
 * WhatsApp Cloud API - Official WhatsApp Business API
 * Compatible with serverless environments (Netlify, Vercel, etc.)
 * 
 * This replaces Baileys for production use as Baileys requires persistent connections
 * which are not possible in serverless functions.
 */

import { logger } from '@/lib/utils/logger';

export interface WhatsAppCloudConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  apiVersion: string;
}

export class WhatsAppCloudAPI {
  private config: WhatsAppCloudConfig;
  private baseUrl: string;

  constructor(config?: Partial<WhatsAppCloudConfig>) {
    this.config = {
      phoneNumberId: config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '',
      verifyToken: config?.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || '',
      apiVersion: config?.apiVersion || 'v18.0'
    };

    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`;
  }

  /**
   * Send a text message via WhatsApp Cloud API
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${this.config.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('WhatsApp Cloud API error:', error);
        return false;
      }

      const result = await response.json();
      logger.info('Message sent successfully:', { messageId: result.messages?.[0]?.id });
      return true;

    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send media (image) via WhatsApp Cloud API
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${this.config.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'image',
          image: {
            link: imageUrl,
            caption: caption
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('WhatsApp Cloud API error:', error);
        return false;
      }

      const result = await response.json();
      logger.info('Image sent successfully:', { messageId: result.messages?.[0]?.id });
      return true;

    } catch (error) {
      logger.error('Failed to send WhatsApp image:', error);
      return false;
    }
  }

  /**
   * Send template message (requires pre-approved template)
   */
  async sendTemplate(to: string, templateName: string, languageCode: string = 'pt_BR', components?: any[]): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${this.config.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: components
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('WhatsApp Cloud API error:', error);
        return false;
      }

      const result = await response.json();
      logger.info('Template sent successfully:', { messageId: result.messages?.[0]?.id });
      return true;

    } catch (error) {
      logger.error('Failed to send WhatsApp template:', error);
      return false;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${this.config.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      });

      return response.ok;

    } catch (error) {
      logger.error('Failed to mark message as read:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature (for security)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.verifyToken) {
      logger.info('Webhook verified successfully');
      return challenge;
    }
    
    logger.warn('Webhook verification failed');
    return null;
  }

  /**
   * Process incoming webhook from WhatsApp
   */
  async processWebhook(body: any): Promise<void> {
    try {
      // Extract message data from webhook
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        for (const message of messages) {
          logger.info('Received WhatsApp message:', {
            from: message.from,
            type: message.type,
            id: message.id
          });

          // Process different message types
          if (message.type === 'text') {
            await this.handleTextMessage(message);
          } else if (message.type === 'image') {
            await this.handleImageMessage(message);
          } else if (message.type === 'audio') {
            await this.handleAudioMessage(message);
          }

          // Mark as read
          await this.markAsRead(message.id);
        }
      }

    } catch (error) {
      logger.error('Error processing webhook:', error);
    }
  }

  private async handleTextMessage(message: any): Promise<void> {
    const from = message.from;
    const text = message.text.body;
    
    logger.info('Processing text message:', { from, text });
    
    // Here you would integrate with your AI agent
    // For now, we'll just log it
  }

  private async handleImageMessage(message: any): Promise<void> {
    const from = message.from;
    const imageId = message.image.id;
    
    logger.info('Processing image message:', { from, imageId });
  }

  private async handleAudioMessage(message: any): Promise<void> {
    const from = message.from;
    const audioId = message.audio.id;
    
    logger.info('Processing audio message:', { from, audioId });
  }

  /**
   * Get WhatsApp Business Profile
   */
  async getBusinessProfile(): Promise<any> {
    try {
      const url = `${this.baseUrl}/${this.config.phoneNumberId}/whatsapp_business_profile`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get business profile');
      }

      return await response.json();

    } catch (error) {
      logger.error('Failed to get business profile:', error);
      return null;
    }
  }

  /**
   * Update WhatsApp Business Profile
   */
  async updateBusinessProfile(profile: any): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${this.config.phoneNumberId}/whatsapp_business_profile`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile)
      });

      return response.ok;

    } catch (error) {
      logger.error('Failed to update business profile:', error);
      return false;
    }
  }
}

// Export singleton instance
export const whatsAppCloudAPI = new WhatsAppCloudAPI();