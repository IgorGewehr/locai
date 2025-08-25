// WhatsApp Message Sender - APENAS Baileys via Microservice
// Integração EXCLUSIVA com WhatsApp Microservice na DigitalOcean usando Baileys

import { logger } from '@/lib/utils/logger';
import { whatsappMicroserviceClient } from './microservice-client';

// APENAS Baileys via microservice (DigitalOcean)
const USE_MICROSERVICE = true; // Sempre true, é o único método suportado

/**
 * Send WhatsApp message using WhatsApp Web API (Baileys)
 * Integrates with tenant-specific session management
 */
export async function sendWhatsAppMessage(
  phoneNumber: string, 
  message: string, 
  mediaUrl?: string,
  tenantId?: string
): Promise<boolean> {
  try {
    // Get tenant from environment or parameter
    const resolvedTenantId = tenantId || process.env.DEFAULT_TENANT_ID || 'default';
    
    logger.info('📤 [WhatsAppSender] Enviando mensagem', {
      phoneNumber: phoneNumber.substring(0, 6) + '***',
      messageLength: message.length,
      hasMedia: !!mediaUrl,
      tenantId: resolvedTenantId.substring(0, 8) + '***',
      usesMicroservice: USE_MICROSERVICE
    });

    // ÚNICO MÉTODO: Use microservice Baileys (DigitalOcean)
    logger.info('🚀 Using WhatsApp Microservice with Baileys (DigitalOcean)');
    
    const success = await whatsappMicroserviceClient.sendMessage(
      resolvedTenantId,
      phoneNumber,
      message,
      mediaUrl
    );
    
    if (success) {
      logger.info('✅ [WhatsAppSender] Mensagem enviada via microservice Baileys', {
        phoneNumber: phoneNumber.substring(0, 6) + '***',
        tenantId: resolvedTenantId.substring(0, 8) + '***'
      });
      return true;
    } else {
      logger.error('❌ [WhatsAppSender] Microservice Baileys falhou ao enviar mensagem');
      return false;
    }

    
  } catch (error) {
    logger.error('❌ [WhatsAppSender] Erro crítico ao enviar mensagem', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      phoneNumber: phoneNumber.substring(0, 6) + '***',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

/**
 * Send WhatsApp media message using WhatsApp Web API
 * Supports images, videos, and documents
 */
export async function sendWhatsAppMedia(
  phoneNumber: string,
  mediaUrl: string,
  caption?: string,
  tenantId?: string
): Promise<boolean> {
  try {
    // Get tenant from environment or parameter
    const resolvedTenantId = tenantId || process.env.DEFAULT_TENANT_ID || 'default';
    
    logger.info('📤 [WhatsAppSender] Enviando mídia', {
      phoneNumber: phoneNumber.substring(0, 6) + '***',
      mediaUrl: mediaUrl.substring(0, 50) + '...',
      hasCaption: !!caption,
      tenantId: resolvedTenantId.substring(0, 8) + '***'
    });

    // Use session manager directly for media sending
    const { whatsappSessionManager } = await import('./session-manager');
    
    const success = await whatsappSessionManager.sendMessage(
      resolvedTenantId,
      phoneNumber,
      caption || '',
      mediaUrl
    );

    if (success) {
      logger.info('✅ [WhatsAppSender] Mídia enviada com sucesso', {
        phoneNumber: phoneNumber.substring(0, 6) + '***',
        mediaType: mediaUrl.includes('.jpg') || mediaUrl.includes('.png') ? 'image' : 'media',
        tenantId: resolvedTenantId.substring(0, 8) + '***'
      });
    } else {
      logger.error('❌ [WhatsAppSender] Falha ao enviar mídia', {
        phoneNumber: phoneNumber.substring(0, 6) + '***',
        tenantId: resolvedTenantId.substring(0, 8) + '***'
      });
    }

    return success;
    
  } catch (error) {
    logger.error('❌ [WhatsAppSender] Erro crítico ao enviar mídia', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      phoneNumber: phoneNumber.substring(0, 6) + '***',
      mediaUrl: mediaUrl.substring(0, 50) + '...'
    });
    return false;
  }
}

/**
 * Get WhatsApp connection status for a tenant
 */
export async function getWhatsAppStatus(tenantId?: string): Promise<{
  connected: boolean;
  status: string;
  phoneNumber: string | null;
  businessName: string | null;
  message?: string;
}> {
  try {
    const resolvedTenantId = tenantId || process.env.DEFAULT_TENANT_ID || 'default';
    
    // Check production session manager first
    const { productionSessionManager } = await import('./production-session-manager');
    const status = await productionSessionManager.getSessionStatus(resolvedTenantId);
    
    return status;
    
  } catch (error) {
    logger.error('❌ [WhatsAppSender] Erro ao verificar status', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId?.substring(0, 8) + '***' || 'default'
    });
    
    return {
      connected: false,
      status: 'error',
      phoneNumber: null,
      businessName: null,
      message: 'Erro ao verificar status'
    };
  }
}

/**
 * Initialize WhatsApp session for a tenant
 */
export async function initializeWhatsAppSession(tenantId: string): Promise<boolean> {
  try {
    logger.info('🚀 [WhatsAppSender] Inicializando sessão WhatsApp', {
      tenantId: tenantId.substring(0, 8) + '***'
    });
    
    const { productionSessionManager } = await import('./production-session-manager');
    await productionSessionManager.initializeSession(tenantId);
    
    logger.info('✅ [WhatsAppSender] Sessão inicializada');
    return true;
    
  } catch (error) {
    logger.error('❌ [WhatsAppSender] Erro ao inicializar sessão', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***'
    });
    return false;
  }
}

/**
 * Disconnect WhatsApp session for a tenant
 */
export async function disconnectWhatsAppSession(tenantId: string): Promise<boolean> {
  try {
    logger.info('🔌 [WhatsAppSender] Desconectando sessão WhatsApp', {
      tenantId: tenantId.substring(0, 8) + '***'
    });
    
    const { productionSessionManager } = await import('./production-session-manager');
    await productionSessionManager.disconnectSession(tenantId);
    
    logger.info('✅ [WhatsAppSender] Sessão desconectada');
    return true;
    
  } catch (error) {
    logger.error('❌ [WhatsAppSender] Erro ao desconectar sessão', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***'
    });
    return false;
  }
}

/**
 * Send message with tenant resolution from phone number
 * Used by Sofia Agent when tenantId needs to be resolved
 */
export async function sendWhatsAppMessageWithTenantResolution(
  phoneNumber: string,
  message: string,
  mediaUrl?: string
): Promise<boolean> {
  try {
    // Try to resolve tenant from phone number
    const { whatsappSessionManager } = await import('./session-manager');
    const tenantId = await whatsappSessionManager.getTenantByPhoneNumber(phoneNumber);
    
    if (!tenantId) {
      logger.warn('⚠️ [WhatsAppSender] Tenant não encontrado para telefone', {
        phoneNumber: phoneNumber.substring(0, 6) + '***'
      });
      
      // Fallback to default tenant
      return await sendWhatsAppMessage(phoneNumber, message, mediaUrl, 'default');
    }
    
    return await sendWhatsAppMessage(phoneNumber, message, mediaUrl, tenantId);
    
  } catch (error) {
    logger.error('❌ [WhatsAppSender] Erro na resolução de tenant', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      phoneNumber: phoneNumber.substring(0, 6) + '***'
    });
    
    // Ultimate fallback
    return await sendWhatsAppMessage(phoneNumber, message, mediaUrl, 'default');
  }
}