import axios from 'axios';
import type { WhatsAppMessage } from '@/lib/types';

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  baseUrl?: string;
}

export interface SendMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'image' | 'video' | 'document';
  text?: { body: string };
  image?: { id?: string; link?: string; caption?: string };
  video?: { id?: string; link?: string; caption?: string };
  document?: { id?: string; link?: string; caption?: string; filename?: string };
}

export interface WebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: 'whatsapp';
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: WhatsAppMessage[];
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private baseUrl: string;

  constructor(config: WhatsAppConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://graph.facebook.com/v18.0';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async sendMessage(payload: SendMessagePayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        payload,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error: any) {

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async sendTextMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    });
  }

  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: imageUrl, caption },
    });
  }

  async sendVideoMessage(
    to: string,
    videoUrl: string,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'video',
      video: { link: videoUrl, caption },
    });
  }

  async sendDocumentMessage(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: { link: documentUrl, filename, caption },
    });
  }

  async markMessageAsRead(messageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.post(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        { headers: this.getHeaders() }
      );

      return { success: true };
    } catch (error: any) {

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async downloadMedia(mediaId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // First, get the media URL
      const mediaResponse = await axios.get(
        `${this.baseUrl}/${mediaId}`,
        { headers: this.getHeaders() }
      );

      const mediaUrl = mediaResponse.data.url;

      // Then download the media
      const downloadResponse = await axios.get(mediaUrl, {
        headers: { 'Authorization': `Bearer ${this.config.accessToken}` },
        responseType: 'blob',
      });

      // Convert blob to base64 or handle as needed
      return {
        success: true,
        url: mediaUrl,
      };
    } catch (error: any) {

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.verifyToken) {
      return challenge;
    }
    return null;
  }

  parseWebhookPayload(body: any): {
    messages: WhatsAppMessage[];
    statuses: Array<{
      id: string;
      status: string;
      timestamp: string;
      recipient_id: string;
    }>;
  } {
    const messages: WhatsAppMessage[] = [];
    const statuses: Array<{
      id: string;
      status: string;
      timestamp: string;
      recipient_id: string;
    }> = [];

    if (body.entry) {
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.value) {
              // Parse incoming messages
              if (change.value.messages) {
                messages.push(...change.value.messages);
              }

              // Parse message statuses
              if (change.value.statuses) {
                statuses.push(...change.value.statuses);
              }
            }
          }
        }
      }
    }

    return { messages, statuses };
  }

  async getBusinessProfile(): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.config.phoneNumberId}/whatsapp_business_profile`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        profile: response.data.data[0],
      };
    } catch (error: any) {

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async updateBusinessProfile(profileData: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    vertical?: string;
    websites?: string[];
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.post(
        `${this.baseUrl}/${this.config.phoneNumberId}/whatsapp_business_profile`,
        profileData,
        { headers: this.getHeaders() }
      );

      return { success: true };
    } catch (error: any) {

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Add country code if not present (assuming Brazil +55)
    if (digits.length === 11 && digits.startsWith('55')) {
      return digits;
    } else if (digits.length === 11) {
      return `55${digits}`;
    } else if (digits.length === 10) {
      return `5511${digits}`;
    }

    return digits;
  }

  isValidPhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    return formatted.length >= 10 && formatted.length <= 15;
  }
}

// Factory function to create WhatsApp service with dynamic credentials
export async function createWhatsAppService(tenantId: string): Promise<WhatsAppService> {
  const { settingsService } = await import('./settings-service');
  const credentials = await settingsService.getWhatsAppCredentials(tenantId);
  
  if (credentials?.accessToken && credentials?.phoneNumberId) {
    return new WhatsAppService({
      accessToken: credentials.accessToken,
      phoneNumberId: credentials.phoneNumberId,
      verifyToken: credentials.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || '',
    });
  }
  
  // Fallback to environment variables for backward compatibility
  return new WhatsAppService({
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  });
}

// Create a default instance for backward compatibility
const whatsappService = new WhatsAppService({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
});

export default whatsappService;