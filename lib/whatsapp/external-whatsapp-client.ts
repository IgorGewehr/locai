import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '@/lib/utils/logger';
import { withTimeout } from '@/lib/utils/async';

export interface ExternalWhatsAppConfig {
  baseUrl: string;
  apiKey: string;
  tenantId: string;
  timeout?: number;
}

export interface SessionStatus {
  connected: boolean;
  status: 'disconnected' | 'connecting' | 'qr' | 'connected' | 'not_found';
  phoneNumber?: string;
  businessName?: string;
  qrCode?: string;
  sessionId?: string;
  lastActivity?: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MessageData {
  to: string;
  message: string;
  type?: 'text' | 'image' | 'video' | 'document';
  mediaUrl?: string;
  caption?: string;
  fileName?: string;
}

/**
 * Cliente para comunicação com o microserviço WhatsApp no DigitalOcean
 * Substitui a implementação local do Baileys por chamadas REST
 */
export class ExternalWhatsAppClient {
  private client: AxiosInstance;
  private config: ExternalWhatsAppConfig;

  constructor(config: ExternalWhatsAppConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/v1`,
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
        'User-Agent': 'LocAI/1.0.0'
      }
    });

    // Interceptor para logging
    this.client.interceptors.request.use((config) => {
      logger.info('🌐 External WhatsApp API request', {
        method: config.method?.toUpperCase(),
        url: config.url,
        tenantId: this.config.tenantId
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        logger.info('✅ External WhatsApp API success', {
          status: response.status,
          url: response.config.url,
          tenantId: this.config.tenantId
        });
        return response;
      },
      (error) => {
        logger.error('❌ External WhatsApp API error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
          tenantId: this.config.tenantId
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Inicializar sessão WhatsApp e obter QR code
   */
  async initializeSession(): Promise<{ qrCode?: string; connected: boolean; sessionId?: string }> {
    try {
      logger.info('🚀 Initializing WhatsApp session via external service', {
        tenantId: this.config.tenantId,
        baseUrl: this.config.baseUrl
      });

      const response = await this.client.post(`/sessions/${this.config.tenantId}/start`);
      
      if (response.data.success) {
        const { sessionId, qrCode } = response.data.data;
        
        // Se não tiver QR imediatamente, tentar buscar via polling
        if (!qrCode) {
          const pollingResult = await this.pollForQR();
          return {
            connected: false,
            sessionId,
            qrCode: pollingResult.qrCode
          };
        }

        return {
          connected: false,
          sessionId,
          qrCode
        };
      }

      throw new Error(response.data.message || 'Failed to start session');

    } catch (error) {
      logger.error('❌ Failed to initialize external WhatsApp session:', error);
      throw new Error(`Session initialization failed: ${error.message}`);
    }
  }

  /**
   * Obter status da sessão atual
   */
  async getSessionStatus(): Promise<SessionStatus> {
    try {
      const response = await this.client.get(`/sessions/${this.config.tenantId}/status`);
      
      if (response.data.success) {
        return response.data.data;
      }

      return {
        connected: false,
        status: 'disconnected'
      };

    } catch (error) {
      logger.error('❌ Failed to get session status:', error);
      return {
        connected: false,
        status: 'disconnected'
      };
    }
  }

  /**
   * Desconectar sessão WhatsApp
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.delete(`/sessions/${this.config.tenantId}`);
      logger.info('✅ WhatsApp session disconnected via external service');
    } catch (error) {
      logger.error('❌ Failed to disconnect session:', error);
      throw error;
    }
  }

  /**
   * Reiniciar sessão WhatsApp
   */
  async restart(): Promise<{ qrCode?: string; connected: boolean }> {
    try {
      logger.info('🔄 Restarting WhatsApp session via external service');
      
      const response = await this.client.post(`/sessions/${this.config.tenantId}/restart`);
      
      if (response.data.success) {
        const { qrCode } = response.data.data;
        return {
          connected: false,
          qrCode
        };
      }

      throw new Error(response.data.message || 'Failed to restart session');

    } catch (error) {
      logger.error('❌ Failed to restart session:', error);
      throw error;
    }
  }

  /**
   * Enviar mensagem de texto
   */
  async sendText(to: string, text: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      message: text,
      type: 'text'
    });
  }

  /**
   * Enviar mensagem com mídia
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      message: caption || '',
      type: 'image',
      mediaUrl: imageUrl,
      caption
    });
  }

  /**
   * Enviar vídeo
   */
  async sendVideo(to: string, videoUrl: string, caption?: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      message: caption || '',
      type: 'video',
      mediaUrl: videoUrl,
      caption
    });
  }

  /**
   * Enviar documento
   */
  async sendDocument(to: string, documentUrl: string, fileName?: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      message: fileName || 'Document',
      type: 'document',
      mediaUrl: documentUrl,
      fileName
    });
  }

  /**
   * Enviar mensagem (método genérico)
   */
  async sendMessage(messageData: MessageData): Promise<SendMessageResponse> {
    try {
      logger.info('📤 Sending message via external WhatsApp service', {
        to: messageData.to.substring(0, 6) + '***',
        type: messageData.type || 'text',
        tenantId: this.config.tenantId
      });

      const response = await this.client.post(`/messages/${this.config.tenantId}/send`, messageData);
      
      if (response.data.success) {
        return {
          success: true,
          messageId: response.data.data.messageId
        };
      }

      return {
        success: false,
        error: response.data.error || 'Unknown error'
      };

    } catch (error) {
      logger.error('❌ Failed to send message via external service:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Polling para aguardar QR code (usado após inicialização)
   */
  private async pollForQR(maxWaitTime: number = 60000): Promise<{ qrCode?: string }> {
    const startTime = Date.now();
    const pollInterval = 3000; // 3 segundos

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await this.client.get(`/sessions/${this.config.tenantId}/qr`);
        
        if (response.data.success && response.data.data.qrCode) {
          return {
            qrCode: response.data.data.qrCode
          };
        }

      } catch (error) {
        logger.warn('❌ Error during QR polling:', error.message);
      }

      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    logger.warn('⏰ QR polling timeout reached');
    return {};
  }

  /**
   * Usar polling otimizado do servidor (mais eficiente)
   */
  async waitForStatusChange(timeout: number = 30000): Promise<SessionStatus> {
    try {
      const response = await this.client.get(
        `/sessions/${this.config.tenantId}/poll?timeout=${timeout}`
      );
      
      if (response.data.success) {
        return response.data.data;
      }

      return await this.getSessionStatus();

    } catch (error) {
      logger.error('❌ Error during status polling:', error);
      return await this.getSessionStatus();
    }
  }

  /**
   * Verificar conectividade com o microserviço
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/../../health', {
        timeout: 5000
      });
      
      return response.status === 200 && response.data.status === 'healthy';

    } catch (error) {
      logger.error('❌ External WhatsApp service health check failed:', error);
      return false;
    }
  }

  /**
   * Registrar webhook para receber mensagens
   */
  async registerWebhook(webhookUrl: string, secret?: string): Promise<boolean> {
    try {
      const response = await this.client.post(`/webhooks/register/${this.config.tenantId}`, {
        url: webhookUrl,
        secret,
        events: ['message', 'status']
      });

      return response.data.success;

    } catch (error) {
      logger.error('❌ Failed to register webhook:', error);
      return false;
    }
  }

  /**
   * Obter estatísticas da conexão
   */
  async getStats(): Promise<any> {
    try {
      const response = await this.client.get(`/webhooks/stats/${this.config.tenantId}`);
      return response.data.data;
    } catch (error) {
      logger.error('❌ Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Atualizar configuração
   */
  updateConfig(newConfig: Partial<ExternalWhatsAppConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Atualizar headers do client
    if (newConfig.apiKey) {
      this.client.defaults.headers['Authorization'] = `Bearer ${newConfig.apiKey}`;
    }
    
    if (newConfig.tenantId) {
      this.client.defaults.headers['X-Tenant-ID'] = newConfig.tenantId;
    }
  }

  /**
   * Obter configuração atual
   */
  getConfig(): ExternalWhatsAppConfig {
    return { ...this.config };
  }
}