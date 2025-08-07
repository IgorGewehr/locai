// Wrapper condicional para session-manager que evita imports problemáticos durante build
import { logger } from '@/lib/utils/logger';

// Mock interface para desenvolvimento
interface MockSessionManager {
  getSessionStatus: (tenantId: string) => Promise<{ status: 'disconnected'; message: string }>;
  connectSession: (tenantId: string) => Promise<{ success: false; message: string }>;
  disconnectSession: (tenantId: string) => Promise<{ success: true; message: string }>;
  sendMessage: (tenantId: string, to: string, message: string) => Promise<{ success: false; error: string }>;
  getQRCode: (tenantId: string) => Promise<null>;
}

// Mock implementation
const mockSessionManager: MockSessionManager = {
  async getSessionStatus(tenantId: string) {
    logger.info('WhatsApp Web não disponível - usando mock', { tenantId });
    return {
      status: 'disconnected' as const,
      message: 'WhatsApp Web desabilitado durante build/desenvolvimento'
    };
  },

  async connectSession(tenantId: string) {
    logger.info('WhatsApp Web conectar - mock', { tenantId });
    return {
      success: false,
      message: 'WhatsApp Web não disponível'
    };
  },

  async disconnectSession(tenantId: string) {
    logger.info('WhatsApp Web desconectar - mock', { tenantId });
    return {
      success: true,
      message: 'Sessão mock desconectada'
    };
  },

  async sendMessage(tenantId: string, to: string, message: string) {
    logger.info('WhatsApp Web enviar mensagem - mock', { tenantId, to: to.substring(0, 4) + '***' });
    return {
      success: false,
      error: 'WhatsApp Web não disponível'
    };
  },

  async getQRCode(tenantId: string) {
    logger.info('WhatsApp Web QR Code - mock', { tenantId });
    return null;
  }
};

// Função para carregar o session manager - SEMPRE retorna mock para evitar dependências Baileys
async function loadSessionManager() {
  logger.warn('WhatsApp Web temporariamente desabilitado - usando implementação mock');
  return mockSessionManager;
}

// Cache do session manager
let sessionManagerInstance: any = null;

export async function getWhatsappSessionManager() {
  if (!sessionManagerInstance) {
    sessionManagerInstance = await loadSessionManager();
  }
  return sessionManagerInstance;
}

// Export para compatibilidade com código existente
export const whatsappSessionManager = {
  async getSessionStatus(tenantId: string) {
    const manager = await getWhatsappSessionManager();
    return manager.getSessionStatus(tenantId);
  },

  async connectSession(tenantId: string) {
    const manager = await getWhatsappSessionManager();
    return manager.connectSession(tenantId);
  },

  async disconnectSession(tenantId: string) {
    const manager = await getWhatsappSessionManager();
    return manager.disconnectSession(tenantId);
  },

  async sendMessage(tenantId: string, to: string, message: string) {
    const manager = await getWhatsappSessionManager();
    return manager.sendMessage(tenantId, to, message);
  },

  async getQRCode(tenantId: string) {
    const manager = await getWhatsappSessionManager();
    return manager.getQRCode(tenantId);
  }
};