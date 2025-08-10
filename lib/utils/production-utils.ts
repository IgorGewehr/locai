// production-utils.ts
// UTILITÁRIOS ESTRATÉGICOS PARA PRODUÇÃO NETLIFY

import { logger } from './logger';

export interface ProductionEnvironment {
  isNetlify: boolean;
  isVercel: boolean;
  isServerless: boolean;
  isProduction: boolean;
  platform: string;
  canUseFileSystem: boolean;
  canUseBaileys: boolean;
}

export function detectProductionEnvironment(): ProductionEnvironment {
  const isNetlify = !!process.env.NETLIFY;
  const isVercel = !!process.env.VERCEL;
  const isServerless = !!(
    process.env.NETLIFY ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FUNCTION_NAME ||
    process.env.LAMBDA_RUNTIME_DIR
  );
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  let platform = 'development';
  if (isNetlify) platform = 'netlify';
  else if (isVercel) platform = 'vercel';
  else if (isServerless) platform = 'serverless';
  else if (isProduction) platform = 'production';

  const canUseFileSystem = !isServerless;
  // Allow Baileys to be used everywhere - let it fail gracefully if not available
  const canUseBaileys = true; // Changed to always try Baileys first

  return {
    isNetlify,
    isVercel,
    isServerless,
    isProduction,
    platform,
    canUseFileSystem,
    canUseBaileys,
  };
}

export async function loadWhatsAppDependency(): Promise<{
  available: boolean;
  manager: any;
  error?: string;
}> {
  const env = detectProductionEnvironment();
  
  logger.info('🔍 [ProductionUtils] Carregando dependências WhatsApp', {
    platform: env.platform,
    canUseBaileys: env.canUseBaileys,
    canUseFileSystem: env.canUseFileSystem
  });

  // Always try to load real Baileys first, regardless of environment
  try {
    const { whatsappSessionManager } = await import('@/lib/whatsapp/session-manager');
    
    logger.info('✅ [ProductionUtils] WhatsAppSessionManager completo carregado');
    
    return {
      available: true,
      manager: whatsappSessionManager,
    };
  } catch (error) {
    logger.warn('⚠️ [ProductionUtils] Baileys não disponível, tentando ProductionSessionManager', { 
      error: error instanceof Error ? error.message : 'Unknown',
      platform: env.platform 
    });
    
    // Fallback to ProductionSessionManager which will also try to use real Baileys internally
    try {
      const { productionSessionManager } = await import('@/lib/whatsapp/production-session-manager');
      
      logger.info('✅ [ProductionUtils] ProductionSessionManager carregado como fallback');
      
      return {
        available: true,
        manager: productionSessionManager,
      };
    } catch (fallbackError) {
      logger.error('❌ [ProductionUtils] Todos os fallbacks falharam', { 
        fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown' 
      });
      
      return {
        available: false,
        manager: null,
        error: fallbackError instanceof Error ? fallbackError.message : 'All fallbacks failed'
      };
    }
  }
}

export function createProductionConfig() {
  const env = detectProductionEnvironment();
  
  return {
    // WhatsApp Web configuration
    whatsapp: {
      enabled: !process.env.DISABLE_WHATSAPP_WEB,
      useFallback: false, // Always try real Baileys first
      sessionPath: env.canUseFileSystem ? '.sessions' : null,
      qrCodeMethod: 'canvas', // Always try canvas first, fallback to SVG if needed
    },
    
    // API configuration
    api: {
      timeout: env.isServerless ? 25000 : 30000, // Menor timeout para serverless
      rateLimitWindow: 60000,
      maxRequests: env.isServerless ? 50 : 100,
    },
    
    // Logging configuration
    logging: {
      level: env.isProduction ? 'warn' : 'info',
      enableConsole: !env.isProduction,
      enableFile: env.canUseFileSystem && env.isProduction,
    },
    
    // Environment info
    environment: env,
  };
}

export function getProductionMessage(env: ProductionEnvironment): string {
  if (env.isNetlify) {
    return 'Sistema otimizado para Netlify - QR Code gerado com sucesso! 🚀';
  }
  
  if (env.isVercel) {
    return 'Sistema otimizado para Vercel - Conecte via QR Code! ⚡';
  }
  
  if (env.isServerless) {
    return 'Modo serverless - WhatsApp Web disponível via QR Code! 🌐';
  }
  
  if (env.isProduction) {
    return 'Sistema em produção - Tudo funcionando perfeitamente! ✅';
  }
  
  return 'Ambiente de desenvolvimento - Todas as funcionalidades ativas! 💻';
}

// Export da configuração global
export const PRODUCTION_CONFIG = createProductionConfig();

// Log da configuração no startup
logger.info('🎯 [ProductionUtils] Configuração de produção carregada', {
  config: PRODUCTION_CONFIG,
  message: getProductionMessage(PRODUCTION_CONFIG.environment)
});