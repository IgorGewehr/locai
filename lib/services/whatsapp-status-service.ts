// lib/services/whatsapp-status-service.ts
// Serviço para gerenciar status do WhatsApp via webhooks do microservice

import { logger } from '@/lib/utils/logger';

interface WhatsAppStatus {
  connected: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'qr' | 'microservice_mode';
  phoneNumber?: string;
  businessName?: string;
  qrCode?: string;
  lastUpdated: Date;
}

// Cache em memória para status por tenant
const statusCache = new Map<string, WhatsAppStatus>();

/**
 * Serviço para gerenciar status do WhatsApp via microservice
 */
export class WhatsAppStatusService {
  
  /**
   * Atualizar status via webhook do microservice
   */
  static updateStatusFromWebhook(tenantId: string, data: {
    event: 'message' | 'status_change' | 'qr_code';
    status?: string;
    phoneNumber?: string;
    businessName?: string;
    qrCode?: string;
    connected?: boolean;
  }) {
    try {
      const currentStatus = statusCache.get(tenantId) || {
        connected: false,
        status: 'disconnected' as const,
        lastUpdated: new Date()
      };

      let newStatus: WhatsAppStatus = { ...currentStatus };

      switch (data.event) {
        case 'status_change':
          newStatus = {
            ...currentStatus,
            connected: data.connected ?? false,
            status: data.status as any || 'disconnected',
            phoneNumber: data.phoneNumber || currentStatus.phoneNumber,
            businessName: data.businessName || currentStatus.businessName,
            lastUpdated: new Date()
          };
          break;

        case 'qr_code':
          newStatus = {
            ...currentStatus,
            qrCode: data.qrCode,
            status: 'qr',
            connected: false,
            lastUpdated: new Date()
          };
          break;

        case 'message':
          // Se recebemos uma mensagem, significa que está conectado
          newStatus = {
            ...currentStatus,
            connected: true,
            status: 'connected',
            lastUpdated: new Date()
          };
          break;
      }

      statusCache.set(tenantId, newStatus);

      logger.info('✅ [WhatsApp Status] Status updated via webhook', {
        tenantId: tenantId.substring(0, 8) + '***',
        event: data.event,
        status: newStatus.status,
        connected: newStatus.connected,
        hasQR: !!newStatus.qrCode
      });

      // TODO: Implementar WebSocket para atualizar frontend em tempo real
      // TODO: Implementar notificações push para mudanças importantes

      return newStatus;

    } catch (error) {
      logger.error('❌ [WhatsApp Status] Error updating status from webhook', {
        tenantId: tenantId.substring(0, 8) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Obter status atual para um tenant
   */
  static getStatus(tenantId: string): WhatsAppStatus | null {
    return statusCache.get(tenantId) || null;
  }

  /**
   * Definir status inicial ou fallback
   */
  static setStatus(tenantId: string, status: Partial<WhatsAppStatus>) {
    const currentStatus = statusCache.get(tenantId) || {
      connected: false,
      status: 'disconnected' as const,
      lastUpdated: new Date()
    };

    const newStatus: WhatsAppStatus = {
      ...currentStatus,
      ...status,
      lastUpdated: new Date()
    };

    statusCache.set(tenantId, newStatus);
    return newStatus;
  }

  /**
   * Limpar cache de status para um tenant
   */
  static clearStatus(tenantId: string) {
    statusCache.delete(tenantId);
    logger.info('🗑️ [WhatsApp Status] Status cache cleared', {
      tenantId: tenantId.substring(0, 8) + '***'
    });
  }

  /**
   * Obter todos os status (para debug/admin)
   */
  static getAllStatuses(): Map<string, WhatsAppStatus> {
    return new Map(statusCache);
  }

  /**
   * Verificar se um tenant tem status ativo (conectado ou com QR válido)
   */
  static isActiveSession(tenantId: string): boolean {
    const status = statusCache.get(tenantId);
    if (!status) return false;

    // Considera ativo se conectado ou tem QR code recente (menos de 5 minutos)
    const isConnected = status.connected;
    const hasRecentQR = status.qrCode && 
      (Date.now() - status.lastUpdated.getTime()) < 5 * 60 * 1000;

    return isConnected || hasRecentQR;
  }

  /**
   * Limpar status antigos (cleanup automático)
   */
  static cleanupOldStatuses(maxAgeMinutes: number = 60) {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;
    let cleaned = 0;

    for (const [tenantId, status] of statusCache.entries()) {
      if (now - status.lastUpdated.getTime() > maxAge) {
        statusCache.delete(tenantId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 [WhatsApp Status] Cleaned ${cleaned} old status entries`);
    }

    return cleaned;
  }
}

// Cleanup automático a cada hora
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    WhatsAppStatusService.cleanupOldStatuses(60);
  }, 60 * 60 * 1000); // 1 hora
}

export default WhatsAppStatusService;