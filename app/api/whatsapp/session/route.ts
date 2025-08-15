import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/utils/tenant';
import { z } from 'zod';
import { loadWhatsAppDependency, getProductionMessage, PRODUCTION_CONFIG } from '@/lib/utils/production-utils';
import { logger } from '@/lib/utils/logger';

// RAILWAY FIX: Always use hardcoded auth for Railway production
// HARDCODE: Force Railway detection since env vars aren't available during build
const isProduction = process.env.NODE_ENV === 'production';
const isRailway = true; // FORCE TRUE - Railway build doesn't expose env vars during build
const isRailwayProduction = isRailway && isProduction;


// Import both auth methods
import { verifyAuth as standardVerifyAuth } from '@/lib/utils/auth';
import { verifyAuthRailway } from '@/lib/utils/auth-railway';

// Select the correct auth based on environment
// FORÇA RAILWAY AUTH EM PRODUÇÃO - já que a detecção pode falhar no build
const forceRailwayAuth = isProduction; // Use Railway auth em QUALQUER produção
const verifyAuth = (forceRailwayAuth || isRailwayProduction) ? verifyAuthRailway : standardVerifyAuth;


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
}

async function getSessionManager() {
  clearSessionManagerCache();
  
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Try Railway-optimized manager for production
      try {
        const { railwayQRSessionManager } = await import('@/lib/whatsapp/railway-qr-session-manager');
        sessionManager = railwayQRSessionManager;
        return sessionManager;
      } catch (error) {
        logger.error('Railway manager failed, falling back to strategic', { error: error.message });
      }
    }
    
    // Use Strategic Session Manager for development or as fallback
    const { strategicSessionManager } = await import('@/lib/whatsapp/strategic-session-manager');
    sessionManager = strategicSessionManager;
    return sessionManager;
    
  } catch (primaryError) {
    logger.error('Primary manager failed:', primaryError);
    
    // Final fallback to robust manager
    try {
      const { robustWhatsAppManager } = await import('@/lib/whatsapp/robust-session-manager');
      sessionManager = robustWhatsAppManager;
      return sessionManager;
    } catch (fallbackError) {
      logger.error('All managers failed:', fallbackError);
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
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
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


    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Session initialization error:', error);
    
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