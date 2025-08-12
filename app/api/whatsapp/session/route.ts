import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyAuth } from '@/lib/utils/auth';
import { z } from 'zod';
import { loadWhatsAppDependency, getProductionMessage, PRODUCTION_CONFIG } from '@/lib/utils/production-utils';
import { logger } from '@/lib/utils/logger';

// Simple cache to prevent excessive API calls
const statusCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds

// Check if WhatsApp Web is disabled (controlled by environment variable only)
// FORÇAR HABILITADO PARA PRODUÇÃO - OVERRIDE DEFINITIVO
const WHATSAPP_WEB_DISABLED = false; // SEMPRE HABILITADO - NUNCA MAIS DISABLED!


// PRODUCTION-GRADE SESSION MANAGER - UNIFIED FOR ALL ENVIRONMENTS
let sessionManager: any = null;

async function getSessionManager() {
  // ALWAYS USE ROBUST SESSION MANAGER - NO FALLBACKS, NO ENVIRONMENT DETECTION
  
  if (!sessionManager) {
    try {
      const { robustWhatsAppManager } = await import('@/lib/whatsapp/robust-session-manager');
      sessionManager = robustWhatsAppManager;
      logger.info('✅ [API] Production-grade WhatsApp manager loaded');
    } catch (error) {
      logger.error('❌ [API] CRITICAL: Production manager failed to load:', error);
      throw new Error(`Production WhatsApp manager failed: ${error.message}`);
    }
  }
  
  return sessionManager;
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
    
    logger.info(`🚀 API: Initializing session for tenant ${tenantId}`, {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NETLIFY: !!process.env.NETLIFY,
        LAMBDA_TASK_ROOT: !!process.env.LAMBDA_TASK_ROOT,
        cwd: process.cwd(),
        tmpDir: require('os').tmpdir()
      }
    });
    
    const manager = await getSessionManager();
    logger.info(`🔍 API: ProductionSessionManager loaded successfully`);
    
    // Initialize the session (optimized for production)
    await manager.initializeSession(tenantId);
    logger.info(`✅ API: Session initialization started`);

    // Optimized polling with shorter intervals and adaptive timing
    let attempts = 0;
    const maxAttempts = 20; // More attempts but faster intervals
    let status = null;
    const delays = [100, 200, 300, 500, 500]; // Progressive delays
    
    while (attempts < maxAttempts) {
      const delay = delays[Math.min(attempts, delays.length - 1)];
      await new Promise(resolve => setTimeout(resolve, delay));
      status = await manager.getSessionStatus(tenantId);
      
      logger.info(`📊 API: Check ${attempts + 1}: ${status.status}, QR: ${!!status.qrCode}`);
      
      if (status.qrCode || status.connected) {
        logger.info(`✅ API: Ready after ${attempts + 1} checks`);
        break;
      }
      
      attempts++;
    }
    
    if (!status) {
      status = await manager.getSessionStatus(tenantId);
    }

    logger.info(`📤 API: Returning status:`, {
      connected: status.connected,
      status: status.status,
      hasQrCode: !!status.qrCode,
      qrCodeLength: status.qrCode?.length,
      qrCodePrefix: status.qrCode?.substring(0, 30),
      phoneNumber: status.phoneNumber,
      businessName: status.businessName
    });

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('❌ API: Error initializing session:', error);
    
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