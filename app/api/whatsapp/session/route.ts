import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyAuth as verifyAuthDefault } from '@/lib/utils/auth';
import { verifyAuthRailway } from '@/lib/utils/auth-railway';
import { z } from 'zod';
import { loadWhatsAppDependency, getProductionMessage, PRODUCTION_CONFIG } from '@/lib/utils/production-utils';
import { logger } from '@/lib/utils/logger';

// RAILWAY FIX: Use hardcoded auth for Railway production
async function getAuthVerifier() {
  const isRailwayProduction = !!process.env.RAILWAY_PROJECT_ID && process.env.NODE_ENV === 'production';
  
  if (isRailwayProduction) {
    logger.info('🚂 [Railway Auth] Using hardcoded Firebase Admin auth for Railway production');
    return verifyAuthRailway;
  }
  
  return verifyAuthDefault;
}

// Simple cache to prevent excessive API calls - RAILWAY OPTIMIZED
const statusCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000; // 1 second only (Railway can handle more requests)

// Check if WhatsApp Web is disabled (controlled by environment variable only)
// FORÇAR HABILITADO PARA PRODUÇÃO - OVERRIDE DEFINITIVO
const WHATSAPP_WEB_DISABLED = false; // SEMPRE HABILITADO - NUNCA MAIS DISABLED!


// STRATEGIC SESSION MANAGER - ALWAYS FRESH LOAD
let sessionManager: any = null;

// Clear session manager cache to force reload
function clearSessionManagerCache() {
  sessionManager = null;
  logger.info('🧹 [CACHE] Session manager cache cleared');
  console.log('🧹 [CACHE] Session manager cache cleared');
}

async function getSessionManager() {
  // PRODUCTION OPTIMIZATION: Use Railway QR Manager for production
  clearSessionManagerCache(); // Always clear cache
  
  try {
    // Check if we're in Railway production environment
    const isRailwayProduction = !!process.env.RAILWAY_PROJECT_ID && process.env.NODE_ENV === 'production';
    
    if (isRailwayProduction) {
      logger.info('🚂 [RAILWAY] Loading Railway QR Session Manager for production...');
      console.log('🚂 [RAILWAY] Loading Railway QR Session Manager for production...'); // Force console log
      
      const { railwayQRSessionManager } = await import('@/lib/whatsapp/railway-qr-session-manager');
      sessionManager = railwayQRSessionManager;
      
      logger.info('✅ [RAILWAY] Railway QR manager loaded successfully for production');
      console.log('✅ [RAILWAY] Railway QR manager loaded successfully for production'); // Force console log
      
      return sessionManager;
    } else {
      // Use Strategic Session Manager for development/staging
      logger.info('🚀 [STRATEGIC] Loading Strategic Session Manager for development...');
      console.log('🚀 [STRATEGIC] Loading Strategic Session Manager for development...'); // Force console log
      
      const { strategicSessionManager } = await import('@/lib/whatsapp/strategic-session-manager');
      sessionManager = strategicSessionManager;
      
      logger.info('✅ [STRATEGIC] Strategic WhatsApp manager loaded successfully');
      console.log('✅ [STRATEGIC] Strategic WhatsApp manager loaded successfully'); // Force console log
      
      return sessionManager;
    }
    
  } catch (primaryError) {
    logger.error('❌ [PRIMARY] Primary manager failed:', primaryError);
    console.error('❌ [PRIMARY] Primary manager failed:', primaryError); // Force console log
    
    // Emergency fallback to strategic manager
    try {
      logger.info('🆘 [EMERGENCY] Falling back to Strategic Session Manager...');
      console.log('🆘 [EMERGENCY] Falling back to Strategic Session Manager...'); // Force console log
      
      const { strategicSessionManager } = await import('@/lib/whatsapp/strategic-session-manager');
      sessionManager = strategicSessionManager;
      
      logger.info('✅ [EMERGENCY] Strategic fallback loaded');
      console.log('✅ [EMERGENCY] Strategic fallback loaded'); // Force console log
      
      return sessionManager;
      
    } catch (strategicError) {
      // Final fallback to robust manager
      try {
        logger.info('🚨 [FINAL] Falling back to Robust Session Manager...');
        console.log('🚨 [FINAL] Falling back to Robust Session Manager...'); // Force console log
        
        const { robustWhatsAppManager } = await import('@/lib/whatsapp/robust-session-manager');
        sessionManager = robustWhatsAppManager;
        
        logger.info('✅ [FINAL] Robust fallback loaded');
        console.log('✅ [FINAL] Robust fallback loaded'); // Force console log
        
        return sessionManager;
        
      } catch (fallbackError) {
        logger.error('💥 [CRITICAL] All managers failed:', fallbackError);
        console.error('💥 [CRITICAL] All managers failed:', fallbackError); // Force console log
        throw new Error(`All WhatsApp managers failed: ${fallbackError.message}`);
      }
    }
  }
}

// GET /api/whatsapp/session - Get session status
export async function GET(request: NextRequest) {
  try {
    // Use Railway-specific auth if in Railway production
    const verifyAuth = await getAuthVerifier();
    const user = await verifyAuth(request);
    if (!user) {
      logger.warn('🚫 [GET] User authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
    // WhatsApp Web SEMPRE HABILITADO - NUNCA RETORNAR DISABLED
    // Este check foi removido para garantir funcionamento em produção
    
    // Check cache first
    const cached = statusCache.get(tenantId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
      });
    }
    
    const manager = await getSessionManager();
    const status = await manager.getSessionStatus(tenantId);
    
    // Cache the result
    statusCache.set(tenantId, {
      data: status,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error getting session status:', error);
    
    // Return graceful error response
    const errorMessage = WHATSAPP_WEB_DISABLED 
      ? 'WhatsApp Web is disabled by configuration'
      : 'Failed to get session status';
      
    return NextResponse.json({
      success: false, 
      error: errorMessage,
      data: {
        connected: false,
        status: 'error',
        qrCode: null,
        phoneNumber: null,
        businessName: null,
        message: errorMessage
      }
    }, { status: 200 }); // Return 200 for graceful degradation
  }
}

// POST /api/whatsapp/session - Initialize session
export async function POST(request: NextRequest) {
  try {
    console.log('🔥 [API POST] WhatsApp session initialization requested');
    logger.info('🔥 [API POST] WhatsApp session initialization requested');

    // Use Railway-specific auth if in Railway production
    const verifyAuth = await getAuthVerifier();
    const user = await verifyAuth(request);
    if (!user) {
      console.log('❌ [API POST] Unauthorized request');
      logger.warn('🚫 [POST] User authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    console.log('👤 [API POST] User authenticated:', { 
      tenant: tenantId?.substring(0, 8) + '***' 
    });
    logger.info('👤 [API POST] User authenticated:', { 
      tenant: tenantId?.substring(0, 8) + '***' 
    });
    
    // WhatsApp Web SEMPRE HABILITADO - NUNCA RETORNAR DISABLED
    // Este check foi removido para garantir funcionamento em produção
    
    console.log('🚀 [API POST] Starting session initialization process');
    logger.info(`🚀 [API POST] Initializing WhatsApp session`, { 
      tenant: tenantId?.substring(0, 8),
      env: process.env.NODE_ENV,
      railway: !!process.env.RAILWAY_PROJECT_ID
    });
    
    console.log('📦 [API POST] Loading session manager...');
    const manager = await getSessionManager();
    console.log('✅ [API POST] Session manager loaded successfully');
    logger.info(`✅ [API POST] SessionManager loaded`);
    
    // Initialize the session (optimized for production)
    console.log(`🔥 [API POST] STARTING SESSION INITIALIZATION FOR ${tenantId?.substring(0, 8)}***`);
    logger.info(`🔥 [API POST] STARTING SESSION INITIALIZATION FOR ${tenantId}`);
    
    await manager.initializeSession(tenantId);
    
    console.log(`✅ [API POST] Session initialization completed successfully`);
    logger.info(`✅ [API POST] Session initialization completed successfully`);

    // RAILWAY OPTIMIZED: Faster polling with more frequent checks
    let attempts = 0;
    const maxAttempts = 30; // More attempts for Railway
    let status = null;
    const delays = [50, 100, 200, 300, 500]; // Faster initial delays for Railway
    
    while (attempts < maxAttempts) {
      const delay = delays[Math.min(attempts, delays.length - 1)];
      await new Promise(resolve => setTimeout(resolve, delay));
      status = await manager.getSessionStatus(tenantId);
      
      // Log more frequently for debugging in production
      if (attempts % 3 === 0) {
        logger.info(`🔍 [Railway] Status check ${attempts + 1}: ${status.status}, QR: ${!!status.qrCode}`);
      }
      
      if (status.qrCode || status.connected) {
        logger.info(`✅ [Railway] Ready after ${attempts + 1} checks (${delay * attempts}ms)`);
        break;
      }
      
      attempts++;
    }
    
    if (!status) {
      status = await manager.getSessionStatus(tenantId);
    }

    logger.info(`📤 Returning session status`, {
      status: status.status,
      hasQrCode: !!status.qrCode,
      connected: status.connected
    });

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('🚨 CRITICAL ERROR IN SESSION INITIALIZATION:', {
      error: error.message,
      stack: error.stack,
      tenantId,
      errorType: error.constructor.name,
      timestamp: new Date().toISOString()
    });
    
    const errorMessage = WHATSAPP_WEB_DISABLED 
      ? 'WhatsApp Web is disabled by configuration'
      : 'Failed to initialize session';
    
    return NextResponse.json({
      success: false, 
      error: errorMessage,
      data: {
        connected: false,
        status: 'error',
        qrCode: null,
        phoneNumber: null,
        businessName: null,
        message: error instanceof Error ? error.message : errorMessage
      }
    }, { status: 200 }); // Return 200 for graceful degradation
  }
}

// DELETE /api/whatsapp/session - Disconnect session
export async function DELETE(request: NextRequest) {
  try {
    // Use Railway-specific auth if in Railway production
    const verifyAuth = await getAuthVerifier();
    const user = await verifyAuth(request);
    if (!user) {
      logger.warn('🚫 [DELETE] User authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
    // WhatsApp Web SEMPRE HABILITADO - NUNCA RETORNAR DISABLED
    
    const manager = await getSessionManager();
    await manager.disconnectSession(tenantId);

    return NextResponse.json({
      success: true,
      message: 'Session disconnected successfully',
    });
  } catch (error) {
    logger.error('Error disconnecting session:', error);
    return NextResponse.json({
      success: true, // Still return success for graceful degradation
      message: 'Session disconnect attempted',
    });
  }
}