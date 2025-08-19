// Cliente para integração com WhatsApp Microservice
// Conecta o LocAI ao microservice WhatsApp na DigitalOcean

import { logger } from '@/lib/utils/logger';

const MICROSERVICE_BASE_URL = process.env.WHATSAPP_MICROSERVICE_URL || 'http://167.172.116.195:3000';
const MICROSERVICE_API_KEY = process.env.WHATSAPP_MICROSERVICE_API_KEY || 'tTmMQE3Rdgu1UpwEwTBow4GmBU9XstTaGva2kIqGjCU=';

interface MicroserviceResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

interface SessionStatus {
  connected: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_available';
  qrCode?: string;
  phone?: string;
  businessName?: string;
}

export class WhatsAppMicroserviceClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = MICROSERVICE_BASE_URL;
    this.apiKey = MICROSERVICE_API_KEY;
  }

  /**
   * Envia mensagem via microservice
   */
  async sendMessage(
    tenantId: string,
    phoneNumber: string,
    message: string,
    mediaUrl?: string
  ): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/v1/messages/${tenantId}/send`;
      
      logger.info('📤 [MicroserviceClient] Enviando mensagem via microservice', {
        tenantId: tenantId.substring(0, 8) + '***',
        phoneNumber: phoneNumber.substring(0, 6) + '***',
        messageLength: message.length,
        hasMedia: !!mediaUrl
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Tenant-ID': tenantId
        },
        body: JSON.stringify({
          to: phoneNumber,
          message,
          type: mediaUrl ? 'image' : 'text',
          mediaUrl
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ [MicroserviceClient] Erro HTTP ao enviar mensagem', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        return false;
      }

      const result: MicroserviceResponse = await response.json();

      if (result.success) {
        logger.info('✅ [MicroserviceClient] Mensagem enviada com sucesso', {
          messageId: result.messageId,
          tenantId: tenantId.substring(0, 8) + '***'
        });
        return true;
      } else {
        logger.error('❌ [MicroserviceClient] Falha ao enviar mensagem', {
          error: result.error,
          status: result.status
        });
        return false;
      }

    } catch (error) {
      logger.error('❌ [MicroserviceClient] Erro crítico ao enviar mensagem', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        tenantId: tenantId.substring(0, 8) + '***'
      });
      return false;
    }
  }

  /**
   * Verifica status da sessão WhatsApp
   */
  async getSessionStatus(tenantId: string): Promise<SessionStatus> {
    try {
      const url = `${this.baseUrl}/api/v1/sessions/${tenantId}/status`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Tenant-ID': tenantId
        }
      });

      if (!response.ok) {
        logger.error('❌ [MicroserviceClient] Erro ao verificar status', {
          status: response.status,
          statusText: response.statusText
        });
        return {
          connected: false,
          status: 'disconnected'
        };
      }

      const status: SessionStatus = await response.json();
      
      logger.info('📊 [MicroserviceClient] Status da sessão', {
        tenantId: tenantId.substring(0, 8) + '***',
        connected: status.connected,
        status: status.status,
        hasQrCode: !!status.qrCode
      });

      return status;

    } catch (error) {
      logger.error('❌ [MicroserviceClient] Erro ao verificar status', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        connected: false,
        status: 'disconnected'
      };
    }
  }

  /**
   * Inicia sessão WhatsApp
   */
  async startSession(tenantId: string): Promise<{ success: boolean; qrCode?: string }> {
    try {
      const url = `${this.baseUrl}/api/v1/sessions/${tenantId}/start`;
      
      logger.info('🚀 [MicroserviceClient] Iniciando sessão WhatsApp', {
        tenantId: tenantId.substring(0, 8) + '***'
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Tenant-ID': tenantId
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ [MicroserviceClient] Erro ao iniciar sessão', {
          status: response.status,
          error: errorText
        });
        return { success: false };
      }

      const result = await response.json();
      
      logger.info('✅ [MicroserviceClient] Sessão iniciada', {
        hasQrCode: !!result.qrCode,
        status: result.status
      });

      return {
        success: true,
        qrCode: result.qrCode
      };

    } catch (error) {
      logger.error('❌ [MicroserviceClient] Erro ao iniciar sessão', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: false };
    }
  }

  /**
   * Desconecta sessão WhatsApp
   */
  async disconnectSession(tenantId: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/v1/sessions/${tenantId}`;
      
      logger.info('🔌 [MicroserviceClient] Desconectando sessão', {
        tenantId: tenantId.substring(0, 8) + '***'
      });

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Tenant-ID': tenantId
        }
      });

      if (!response.ok) {
        logger.error('❌ [MicroserviceClient] Erro ao desconectar sessão', {
          status: response.status
        });
        return false;
      }

      logger.info('✅ [MicroserviceClient] Sessão desconectada');
      return true;

    } catch (error) {
      logger.error('❌ [MicroserviceClient] Erro ao desconectar', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// Singleton instance
export const whatsappMicroserviceClient = new WhatsAppMicroserviceClient();