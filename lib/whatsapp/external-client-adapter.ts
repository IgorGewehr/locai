import { ExternalWhatsAppClient } from './external-whatsapp-client';
import { logger } from '@/lib/utils/logger';
import { WhatsAppMessage, WhatsAppTemplate, WhatsAppMediaResponse, WhatsAppMediaDetails, WhatsAppError } from '@/lib/types/whatsapp';

/**
 * Adapter para integrar ExternalWhatsAppClient com a interface existente do LocAI
 * Mantém compatibilidade com o código atual enquanto usa o microserviço externo
 */
export class ExternalClientAdapter {
  private client: ExternalWhatsAppClient;
  private tenantId: string;

  constructor(tenantId: string = 'default') {
    this.tenantId = tenantId;
    
    // Configurar cliente externo
    const config = {
      baseUrl: process.env.WHATSAPP_MICROSERVICE_URL || 'http://localhost:3000',
      apiKey: process.env.WHATSAPP_MICROSERVICE_API_KEY || 'default-key',
      tenantId: tenantId,
      timeout: 30000
    };

    this.client = new ExternalWhatsAppClient(config);

    logger.info('🔗 [External Adapter] WhatsApp client adapter initialized', {
      tenantId,
      baseUrl: config.baseUrl,
      hasApiKey: !!config.apiKey,
      timeout: config.timeout,
      adapterId: `adapter_${tenantId.substring(0, 8)}`
    });
  }

  /**
   * Send message via external WhatsApp service (compatible with existing interface)
   */
  async sendMessage(to: string, message: WhatsAppMessage): Promise<any> {
    try {
      let messageData: any = {
        to: this.formatPhoneNumber(to),
        message: '',
        type: 'text'
      };

      // Processar diferentes tipos de mensagem
      if (message.type === 'text' && message.text) {
        messageData.message = message.text.body;
        messageData.type = 'text';
      } else if (message.type === 'image' && message.image) {
        messageData.message = message.image.caption || '';
        messageData.type = 'image';
        messageData.mediaUrl = message.image.link;
        messageData.caption = message.image.caption;
      } else if (message.type === 'video' && message.video) {
        messageData.message = message.video.caption || '';
        messageData.type = 'video';
        messageData.mediaUrl = message.video.link;
        messageData.caption = message.video.caption;
      } else if (message.type === 'document' && message.document) {
        messageData.message = message.document.filename || 'Document';
        messageData.type = 'document';
        messageData.mediaUrl = message.document.link;
        messageData.fileName = message.document.filename;
      } else {
        throw new Error(`Unsupported message type: ${message.type}`);
      }

      const result = await this.client.sendMessage(messageData);
      
      if (result.success) {
        return { success: true, messageId: result.messageId };
      } else {
        throw new WhatsAppError(500, result.error || 'Failed to send message');
      }

    } catch (error) {
      logger.error('❌ [External Adapter] Message send failed', {
        tenantId: this.tenantId,
        to: to.substring(0, 6) + '***',
        messageType: message.type,
        error: error.message,
        adapterStep: 'send_message'
      });
      throw new WhatsAppError(500, `Failed to send message: ${error.message}`);
    }
  }

  /**
   * Send text message (simplified interface)
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
   * Send template message (convert to text for external service)
   */
  async sendTemplate(to: string, templateName: string, parameters: string[] = []): Promise<any> {
    // Para o serviço externo, convertemos templates em mensagens de texto
    let templateText = `Template: ${templateName}`;
    if (parameters.length > 0) {
      templateText += `\nParameters: ${parameters.join(', ')}`;
    }
    
    return this.sendText(to, templateText);
  }

  /**
   * Get connection status with QR code support
   */
  async getConnectionStatus(): Promise<{ connected: boolean; phone?: string; name?: string; status?: string; qrCode?: string }> {
    try {
      const status = await this.client.getSessionStatus();
      
      logger.info('🔍 [External Adapter] Session status retrieved', {
        tenantId: this.tenantId.substring(0, 8) + '***',
        connected: status.connected,
        status: status.status,
        hasQR: !!status.qrCode,
        phoneNumber: status.phoneNumber ? '✅ Set' : '❌ Missing',
        businessName: status.businessName ? '✅ Set' : '❌ Missing'
      });
      
      return {
        connected: status.connected,
        phone: status.phoneNumber,
        name: status.businessName,
        status: status.status,
        qrCode: status.qrCode
      };

    } catch (error) {
      logger.error('❌ [External Adapter] Failed to get connection status', {
        tenantId: this.tenantId.substring(0, 8) + '***',
        error: error.message,
        step: 'get_connection_status_error'
      });
      return { connected: false };
    }
  }

  /**
   * Initialize WhatsApp session
   */
  async initializeSession(): Promise<{ qrCode?: string; connected: boolean }> {
    try {
      logger.info('🔄 [External Adapter] Starting session initialization', {
        tenantId: this.tenantId,
        baseUrl: this.client.getConfig().baseUrl,
        step: 'initialize_session'
      });
      
      const result = await this.client.initializeSession();
      
      return {
        qrCode: result.qrCode,
        connected: result.connected
      };

    } catch (error) {
      logger.error('❌ [External Adapter] Session initialization failed', {
        tenantId: this.tenantId,
        error: error.message,
        step: 'initialize_session_error'
      });
      return { connected: false };
    }
  }

  /**
   * Disconnect session
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('✅ [External Adapter] Session disconnected successfully', {
        tenantId: this.tenantId,
        step: 'disconnect_complete'
      });
    } catch (error) {
      logger.error('❌ Failed to disconnect session:', error);
    }
  }

  /**
   * Restart session
   */
  async restart(): Promise<{ qrCode?: string; connected: boolean }> {
    try {
      logger.info('🔄 Restarting session via external service', { tenantId: this.tenantId });
      
      const result = await this.client.restart();
      
      return {
        qrCode: result.qrCode,
        connected: result.connected
      };

    } catch (error) {
      logger.error('❌ Failed to restart session:', error);
      return { connected: false };
    }
  }

  /**
   * Mark message as read (compatibility method)
   */
  async markAsRead(messageId: string): Promise<void> {
    // External service handles message reading automatically
    logger.info('📖 Message marked as read (external service)', { 
      messageId: messageId.substring(0, 8) + '***',
      tenantId: this.tenantId 
    });
  }

  /**
   * Get media details (not supported by external service)
   */
  async getMediaDetails(mediaId: string): Promise<WhatsAppMediaDetails> {
    throw new WhatsAppError(501, 'Media details not supported by external WhatsApp service');
  }

  /**
   * Send audio message (not supported yet)
   */
  async sendAudio(to: string, audioBuffer: Buffer): Promise<any> {
    throw new WhatsAppError(501, 'Audio sending not supported by external WhatsApp service yet');
  }

  /**
   * Health check for external service
   */
  async healthCheck(): Promise<boolean> {
    return await this.client.healthCheck();
  }

  /**
   * Register webhook for receiving messages
   */
  async registerWebhook(webhookUrl: string, secret?: string): Promise<boolean> {
    return await this.client.registerWebhook(webhookUrl, secret);
  }

  /**
   * Wait for status change (polling)
   */
  async waitForStatusChange(timeout: number = 30000): Promise<any> {
    return await this.client.waitForStatusChange(timeout);
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<any> {
    return await this.client.getStats();
  }

  /**
   * Update tenant configuration
   */
  updateTenant(newTenantId: string): void {
    this.tenantId = newTenantId;
    this.client.updateConfig({ tenantId: newTenantId });
  }

  /**
   * Format phone number for external service
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let formatted = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assumes Brazil +55)
    if (formatted.length === 11 && !formatted.startsWith('55')) {
      formatted = '55' + formatted;
    } else if (formatted.length === 10 && !formatted.startsWith('55')) {
      formatted = '55' + formatted;
    }
    
    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }

    return formatted;
  }

  /**
   * Get current configuration
   */
  getConfig(): any {
    return {
      tenantId: this.tenantId,
      client: this.client.getConfig(),
      type: 'external'
    };
  }
}