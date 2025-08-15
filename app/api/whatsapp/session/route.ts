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

// Log the environment for debugging
logger.info('🌍 [WhatsApp Session] Environment check:', {
  isRailway,
  isProduction,
  isRailwayProduction,
  railwayProjectId: process.env.RAILWAY_PROJECT_ID ? 'present' : 'missing',
  railwayEnvironment: process.env.RAILWAY_ENVIRONMENT ? 'present' : 'missing',
  railwayDomain: process.env.RAILWAY_PUBLIC_DOMAIN ? 'present' : 'missing'
});

// Force console logging for Railway
console.log('🌍 [WhatsApp Session] Environment check:', {
  isRailway,
  isProduction,
  isRailwayProduction,
  railwayProjectId: process.env.RAILWAY_PROJECT_ID ? 'present' : 'missing',
  railwayEnvironment: process.env.RAILWAY_ENVIRONMENT ? 'present' : 'missing',
  railwayDomain: process.env.RAILWAY_PUBLIC_DOMAIN ? 'present' : 'missing'
});

// Import both auth methods
import { verifyAuth as standardVerifyAuth } from '@/lib/utils/auth';
import { verifyAuthRailway } from '@/lib/utils/auth-railway';

// Select the correct auth based on environment
// FORÇA RAILWAY AUTH EM PRODUÇÃO - já que a detecção pode falhar no build
const forceRailwayAuth = isProduction; // Use Railway auth em QUALQUER produção
const verifyAuth = (forceRailwayAuth || isRailwayProduction) ? verifyAuthRailway : standardVerifyAuth;

// Log which auth method was selected
if (forceRailwayAuth || isRailwayProduction) {
  logger.info('🚂 [INIT] Using Railway hardcoded auth for production');
  console.log('🚂 [INIT] Using Railway hardcoded auth for production');
} else {
  logger.info('🔐 [INIT] Using standard auth for development');
  console.log('🔐 [INIT] Using standard auth for development');
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
  // PRODUCTION OPTIMIZATION: Use Railway-compatible Baileys socket for production
  clearSessionManagerCache(); // Always clear cache
  
  try {
    // FORCE Railway compatibility in production
    const isProduction = process.env.NODE_ENV === 'production';
    const isRailwayProduction = isProduction; // FORCE: Always use Railway manager in production
    
    if (isRailwayProduction) {
      logger.info('🚂 [RAILWAY] Loading Railway-compatible Baileys socket for production...');
      console.log('🚂 [RAILWAY] Loading Railway-compatible Baileys socket for production...'); // Force console log
      
      // Try the new Railway 428 fix first, then fallback to other solutions
      try {
        const { Railway428Fix } = await import('@/lib/whatsapp/railway-428-fix');
        
        // Create a session manager wrapper for the Railway 428 fix
        sessionManager = {
          getQRCode: async () => {
            try {
              logger.info('🚨 [RAILWAY-428] Attempting QR generation with 428 fix...');
              console.log('🚨 [RAILWAY-428] Attempting QR generation with 428 fix...');
              
              const result = await Railway428Fix.testConnection();
              
              if (result.success && result.qrCode) {
                logger.info('✅ [RAILWAY-428] QR generated successfully with 428 fix!');
                console.log('✅ [RAILWAY-428] QR generated successfully with 428 fix!');
                
                return {
                  success: true,
                  qrCode: result.qrCode,
                  message: 'QR code generated successfully with Railway 428 fix'
                };
              } else {
                throw new Error(result.reason || 'QR generation failed with 428 fix');
              }
            } catch (error) {
              logger.error('❌ [RAILWAY-428] 428 fix failed', { error: error.message });
              console.error('❌ [RAILWAY-428] 428 fix failed', { error: error.message });
              
              // If it's a 428 error, don't fallback - we need to fix this specifically
              if (error.message.includes('428')) {
                throw new Error(`428 Precondition Required error: ${error.message}`);
              }
              
              throw error;
            }
          },
          
          getStatus: async () => {
            return {
              connected: false,
              qr: null,
              message: 'Railway 428 fix manager active'
            };
          }
        };
        
        logger.info('✅ [RAILWAY] Railway 428 fix loaded successfully');
        console.log('✅ [RAILWAY] Railway 428 fix loaded successfully'); // Force console log
        
        return sessionManager;
        
      } catch (railway428Error) {
        logger.warn('⚠️ [RAILWAY] 428 fix failed, falling back to Railway socket', { 
          error: railway428Error.message 
        });
        console.warn('⚠️ [RAILWAY] 428 fix failed, falling back to Railway socket', { 
          error: railway428Error.message 
        });
        
        // Fallback to Railway-compatible socket
        try {
          const { RailwayBaileysSocket } = await import('@/lib/whatsapp/railway-baileys-socket');
          await RailwayBaileysSocket.initialize();
          
          // Create a session manager wrapper for the Railway socket
          sessionManager = {
            getQRCode: async () => {
              try {
                const result = await RailwayBaileysSocket.createSocketWithQR({
                  timeout: 180000, // 3 minutes
                  enableLogging: true,
                  browser: ['Railway Production', 'Chrome', '120.0.6099.109']
                });
                
                if (result.success && result.qrCode) {
                  return {
                    success: true,
                    qrCode: result.qrCode,
                    message: 'QR code generated successfully with Railway-compatible socket'
                  };
                } else {
                  throw new Error(result.reason || 'QR generation failed');
                }
              } catch (error) {
                logger.error('❌ [RAILWAY-SOCKET] QR generation failed', { error: error.message });
                throw error;
              }
            },
            
            getStatus: async () => {
              return {
                connected: false,
                qr: null,
                message: 'Railway-compatible socket manager active'
              };
            }
          };
          
          logger.info('✅ [RAILWAY] Railway-compatible Baileys socket loaded as fallback');
          console.log('✅ [RAILWAY] Railway-compatible Baileys socket loaded as fallback'); // Force console log
          
          return sessionManager;
        
      } catch (railwaySocketError) {
        logger.warn('⚠️ [RAILWAY] Railway socket failed, falling back to Railway QR manager', { 
          error: railwaySocketError.message 
        });
        console.warn('⚠️ [RAILWAY] Railway socket failed, falling back to Railway QR manager', { 
          error: railwaySocketError.message 
        });
        
        // Fallback to original Railway QR manager
        const { railwayQRSessionManager } = await import('@/lib/whatsapp/railway-qr-session-manager');
        sessionManager = railwayQRSessionManager;
        
        logger.info('✅ [RAILWAY] Railway QR manager fallback loaded');
        console.log('✅ [RAILWAY] Railway QR manager fallback loaded'); // Force console log
        
        return sessionManager;
        }
      }
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
    logger.info('📥 [GET] WhatsApp session status request received');
    logger.info('🔐 [GET] Using auth method:', isRailwayProduction ? 'Railway Hardcoded' : 'Standard');
    
    const user = await verifyAuth(request);
    if (!user) {
      logger.warn('🚫 [GET] User authentication failed', {
        hasAuthHeader: !!request.headers.get('authorization'),
        isRailway: isRailwayProduction
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    logger.info('✅ [GET] User authenticated:', {
      uid: user.uid,
      email: user.email,
      tenantId: user.tenantId
    });

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
    logger.info('🔐 [POST] Using auth method:', isRailwayProduction ? 'Railway Hardcoded' : 'Standard');

    const user = await verifyAuth(request);
    if (!user) {
      console.log('❌ [API POST] Unauthorized request');
      logger.warn('🚫 [POST] User authentication failed', {
        hasAuthHeader: !!request.headers.get('authorization'),
        isRailway: isRailwayProduction
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    logger.info('✅ [POST] User authenticated:', {
      uid: user.uid,
      email: user.email,
      tenantId: user.tenantId
    });

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
    logger.info('🗑️ [DELETE] WhatsApp session disconnect requested');
    logger.info('🔐 [DELETE] Using auth method:', isRailwayProduction ? 'Railway Hardcoded' : 'Standard');
    
    const user = await verifyAuth(request);
    if (!user) {
      logger.warn('🚫 [DELETE] User authentication failed', {
        hasAuthHeader: !!request.headers.get('authorization'),
        isRailway: isRailwayProduction
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    logger.info('✅ [DELETE] User authenticated:', {
      uid: user.uid,
      email: user.email,
      tenantId: user.tenantId
    });

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