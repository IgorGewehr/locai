import { ExternalClientAdapter } from './external-client-adapter';
import { WhatsAppClient } from './client';
import { logger } from '@/lib/utils/logger';

/**
 * Factory para criar cliente WhatsApp apropriado baseado na configuração
 * Escolhe automaticamente entre serviço externo ou implementação local
 */
export function createWhatsAppClient(tenantId: string = 'default') {
  const useExternal = process.env.WHATSAPP_USE_EXTERNAL === 'true';
  const hasExternalConfig = !!(
    process.env.WHATSAPP_MICROSERVICE_URL && 
    process.env.WHATSAPP_MICROSERVICE_API_KEY
  );

  logger.info('🏭 [WhatsApp Factory] Initializing client creation', {
    tenantId,
    useExternal,
    hasExternalConfig,
    microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL ? '✅ Configured' : '❌ Missing',
    apiKey: process.env.WHATSAPP_MICROSERVICE_API_KEY ? '✅ Configured' : '❌ Missing',
    environment: process.env.NODE_ENV
  });

  // Se configurado para usar serviço externo e tem as configurações necessárias
  if (useExternal && hasExternalConfig) {
    try {
      logger.info('🌐 [WhatsApp Factory] Creating EXTERNAL microservice client', {
        tenantId,
        microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL,
        clientType: 'external_microservice'
      });
      return new ExternalClientAdapter(tenantId);
    } catch (error) {
      logger.error('❌ [WhatsApp Factory] External client creation failed - FALLING BACK to local', {
        tenantId,
        error: error.message,
        fallbackType: 'local_baileys'
      });
      // Fallback para cliente local
    }
  }

  // Fallback para implementação local
  logger.info('🏠 [WhatsApp Factory] Creating LOCAL Baileys client', {
    tenantId,
    reason: useExternal ? 'fallback_from_external' : 'configured_for_local',
    clientType: 'local_baileys'
  });
  return new WhatsAppClient(tenantId);
}

/**
 * Verificar se o serviço externo está disponível
 */
export async function checkExternalServiceHealth(): Promise<boolean> {
  if (!process.env.WHATSAPP_MICROSERVICE_URL) {
    return false;
  }

  try {
    const client = new ExternalClientAdapter('health-check');
    return await client.healthCheck();
  } catch (error) {
    logger.error('❌ External service health check failed:', error);
    return false;
  }
}

/**
 * Migrar sessão de local para externo (utilitário)
 */
export async function migrateToExternalService(tenantId: string): Promise<boolean> {
  try {
    logger.info('🔄 Migrating session to external service', { tenantId });

    // Criar cliente externo
    const externalClient = new ExternalClientAdapter(tenantId);

    // Verificar se o serviço está disponível
    const isHealthy = await externalClient.healthCheck();
    if (!isHealthy) {
      throw new Error('External service is not healthy');
    }

    // Desconectar sessão local se existir
    try {
      const localClient = new WhatsAppClient(tenantId);
      await localClient.disconnect();
      logger.info('✅ Local session disconnected', { tenantId });
    } catch (error) {
      // Ignorar erro se não houver sessão local
      logger.warn('⚠️ No local session to disconnect or error disconnecting:', error.message);
    }

    // Inicializar nova sessão no serviço externo
    const result = await externalClient.initializeSession();
    logger.info('✅ Session migrated to external service', { 
      tenantId, 
      hasQR: !!result.qrCode,
      connected: result.connected 
    });

    return true;

  } catch (error) {
    logger.error('❌ Failed to migrate to external service:', error);
    return false;
  }
}

/**
 * Configuração atual do cliente WhatsApp
 */
export function getWhatsAppClientConfig() {
  const useExternal = process.env.WHATSAPP_USE_EXTERNAL === 'true';
  const hasExternalConfig = !!(
    process.env.WHATSAPP_MICROSERVICE_URL && 
    process.env.WHATSAPP_MICROSERVICE_API_KEY
  );

  return {
    type: useExternal && hasExternalConfig ? 'external' : 'local',
    useExternal,
    hasExternalConfig,
    microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL,
    hasApiKey: !!process.env.WHATSAPP_MICROSERVICE_API_KEY,
    environment: process.env.NODE_ENV,
    fallbackAvailable: true // Sempre pode fazer fallback para local
  };
}