import { WhatsAppMessage, WhatsAppTemplate, WhatsAppMediaResponse, WhatsAppMediaDetails, WhatsAppError } from '@/lib/types/whatsapp'
import { withTimeout } from '@/lib/utils/async'
import { whatsappSessionManager } from './session-manager'

export class WhatsAppClient {
  private tenantId: string

  constructor(tenantId: string = 'default') {
    this.tenantId = tenantId
  }

  /**
   * Send message via WhatsApp Web (Baileys)
   */
  async sendMessage(to: string, message: WhatsAppMessage): Promise<any> {
    try {
      let text = '';
      let mediaUrl: string | undefined;
      
      if (message.type === 'text' && message.text) {
        text = message.text.body;
      } else if (message.type === 'image' && message.image) {
        text = message.image.caption || '';
        mediaUrl = message.image.link;
      } else if (message.type === 'video' && message.video) {
        text = message.video.caption || '';
        mediaUrl = message.video.link;
      } else if (message.type === 'document' && message.document) {
        text = message.document.filename || 'Document';
        mediaUrl = message.document.link;
      }
      
      await whatsappSessionManager.sendMessage(this.tenantId, to, text, mediaUrl);
      return { success: true };
    } catch (error) {
      console.error('WhatsApp send error:', error);
      throw new WhatsAppError(500, `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send text message
   */
  async sendText(to: string, text: string): Promise<any> {
    return this.sendMessage(to, {
      type: 'text',
      text: { body: text }
    });
  }

  /**
   * Send image message
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<any> {
    return this.sendMessage(to, {
      type: 'image',
      image: {
        link: imageUrl,
        caption: caption
      }
    });
  }

  /**
   * Send video message
   */
  async sendVideo(to: string, videoUrl: string, caption?: string): Promise<any> {
    return this.sendMessage(to, {
      type: 'video',
      video: {
        link: videoUrl,
        caption: caption
      }
    });
  }

  /**
   * Send document message
   */
  async sendDocument(to: string, documentUrl: string, filename?: string): Promise<any> {
    return this.sendMessage(to, {
      type: 'document',
      document: {
        link: documentUrl,
        filename: filename || 'Document'
      }
    });
  }

  /**
   * Send template message (simplified for Web API)
   */
  async sendTemplate(to: string, templateName: string, parameters: string[] = []): Promise<any> {
    // For WhatsApp Web, we'll send as regular text with template formatting
    let templateText = `Template: ${templateName}`;
    if (parameters.length > 0) {
      templateText += `\nParameters: ${parameters.join(', ')}`;
    }
    
    return this.sendText(to, templateText);
  }

  /**
   * Get connection status (WhatsApp Web only)
   */
  async getConnectionStatus(): Promise<{ connected: boolean; phone?: string; name?: string }> {
    try {
      const session = await whatsappSessionManager.getSessionStatus(this.tenantId);
      return {
        connected: session?.connected || false,
        phone: session?.phoneNumber,
        name: session?.businessName
      };
    } catch (error) {
      return { connected: false };
    }
  }

  /**
   * Initialize WhatsApp Web session
   */
  async initializeSession(): Promise<{ qrCode?: string; connected: boolean }> {
    try {
      await whatsappSessionManager.initializeSession(this.tenantId);
      const status = await whatsappSessionManager.getSessionStatus(this.tenantId);
      return {
        qrCode: status.qrCode || undefined,
        connected: status.connected
      };
    } catch (error) {
      console.error('Session initialization error:', error);
      return { connected: false };
    }
  }

  /**
   * Disconnect WhatsApp Web session
   */
  async disconnect(): Promise<void> {
    try {
      await whatsappSessionManager.disconnectSession(this.tenantId);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  /**
   * Restart WhatsApp Web session
   */
  async restart(): Promise<{ qrCode?: string; connected: boolean }> {
    try {
      await this.disconnect();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return await this.initializeSession();
    } catch (error) {
      console.error('Restart error:', error);
      return { connected: false };
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      // For WhatsApp Web via Baileys, message reading is handled automatically
      // This is a placeholder for compatibility with WhatsApp Business API
      console.log(`Marking message ${messageId} as read (WhatsApp Web)`);
    } catch (error) {
      console.error('Mark as read error:', error);
      throw new WhatsAppError(500, `Failed to mark message as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get media details
   */
  async getMediaDetails(mediaId: string): Promise<WhatsAppMediaDetails> {
    try {
      // For WhatsApp Web, media is typically handled differently
      // This is a compatibility method for Business API-style media handling
      throw new WhatsAppError(501, 'Media details not implemented for WhatsApp Web');
    } catch (error) {
      console.error('Get media details error:', error);
      throw new WhatsAppError(500, `Failed to get media details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send audio message
   */
  async sendAudio(to: string, audioBuffer: Buffer): Promise<any> {
    try {
      // For WhatsApp Web, we would need to handle audio differently
      // This is a placeholder implementation
      throw new WhatsAppError(501, 'Audio sending not implemented for WhatsApp Web');
    } catch (error) {
      console.error('Send audio error:', error);
      throw new WhatsAppError(500, `Failed to send audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}