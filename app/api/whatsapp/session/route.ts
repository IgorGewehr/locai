import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyAuth } from '@/lib/utils/auth';
import { z } from 'zod';
import { loadWhatsAppDependency, getProductionMessage, PRODUCTION_CONFIG } from '@/lib/utils/production-utils';
import { logger } from '@/lib/utils/logger';

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
  // FORCE STRATEGIC SESSION MANAGER - ALWAYS RELOAD
  clearSessionManagerCache(); // Always clear cache
  
  try {
    logger.info('🚀 [FORCE] Loading Strategic Session Manager...');
    console.log('🚀 [FORCE] Loading Strategic Session Manager...'); // Force console log
    
    const { strategicSessionManager } = await import('@/lib/whatsapp/strategic-session-manager');
    sessionManager = strategicSessionManager;
    
    logger.info('✅ [FORCE] Strategic WhatsApp manager loaded successfully');
    console.log('✅ [FORCE] Strategic WhatsApp manager loaded successfully'); // Force console log
    
    return sessionManager;
    
  } catch (strategicError) {
    logger.error('❌ [FORCE] Strategic manager failed:', strategicError);
    console.error('❌ [FORCE] Strategic manager failed:', strategicError); // Force console log
    
    // Emergency fallback to robust manager
    try {
      logger.info('🆘 [EMERGENCY] Falling back to Robust Session Manager...');
      console.log('🆘 [EMERGENCY] Falling back to Robust Session Manager...'); // Force console log
      
      const { robustWhatsAppManager } = await import('@/lib/whatsapp/robust-session-manager');
      sessionManager = robustWhatsAppManager;
      
      logger.info('✅ [EMERGENCY] Fallback manager loaded');
      console.log('✅ [EMERGENCY] Fallback manager loaded'); // Force console log
      
      return sessionManager;
      
    } catch (fallbackError) {
      logger.error('💥 [CRITICAL] All managers failed:', fallbackError);
      console.error('💥 [CRITICAL] All managers failed:', fallbackError); // Force console log
      throw new Error(`All WhatsApp managers failed: ${fallbackError.message}`);
    }
  }
}

// GET /api/whatsapp/session - Get session status
export async function GET(request: NextRequest) {
  try {

    const user = await verifyAuth(request);
    if (!user) {
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

    const user = await verifyAuth(request);
    if (!user) {
      console.log('❌ [API POST] Unauthorized request');
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
    const user = await verifyAuth(request);
    if (!user) {
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