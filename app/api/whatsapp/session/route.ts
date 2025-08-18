import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/utils/tenant';
import { z } from 'zod';
import { loadWhatsAppDependency, getProductionMessage, PRODUCTION_CONFIG } from '@/lib/utils/production-utils';
import { logger } from '@/lib/utils/logger';
import { createWhatsAppClient, getWhatsAppClientConfig, checkExternalServiceHealth } from '@/lib/whatsapp/whatsapp-client-factory';

// MICROSERVICE FIX: Use external microservice if configured, fallback to local
const isProduction = process.env.NODE_ENV === 'production';
const useExternalService = process.env.WHATSAPP_USE_EXTERNAL === 'true';
const hasExternalConfig = !!(process.env.WHATSAPP_MICROSERVICE_URL && process.env.WHATSAPP_MICROSERVICE_API_KEY);


// Import both auth methods
import { verifyAuth as standardVerifyAuth } from '@/lib/utils/auth';
import { verifyAuthRailway } from '@/lib/utils/auth-railway';

// Select the correct auth based on environment
// FORÇA RAILWAY AUTH EM PRODUÇÃO - já que a detecção pode falhar no build
const forceRailwayAuth = isProduction; // Use Railway auth em QUALQUER produção
const isRailwayProduction = !!process.env.RAILWAY_PROJECT_ID && isProduction;
const verifyAuth = (forceRailwayAuth || isRailwayProduction) ? verifyAuthRailway : standardVerifyAuth;


// OPTIMIZED: Cache to prevent excessive API calls with intelligent duration
const statusCache = new Map<string, { data: any; timestamp: number; lastQRGeneration?: number; initInProgress?: boolean }>();
const CACHE_DURATION = useExternalService ? 10000 : 5000; // 10s for external, 5s for local
const QR_CACHE_DURATION = 60000; // QR codes cached for 60s to prevent regeneration loops
const INIT_COOLDOWN = 30000; // 30s cooldown between session initializations

// WhatsApp Web is always enabled now - either via external microservice or local
const WHATSAPP_WEB_DISABLED = false;


// MICROSERVICE CLIENT - USE FACTORY FOR AUTOMATIC SELECTION
let whatsappClient: any = null;
const clientCache = new Map<string, any>();

// Get WhatsApp client using the factory (external microservice or local)
async function getWhatsAppClient(tenantId: string) {
  // Cache clients per tenant
  if (clientCache.has(tenantId)) {
    return clientCache.get(tenantId);
  }
  
  try {
    // Only log client creation in debug mode
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      logger.info('🏭 [API Session] Creating WhatsApp client', {
        tenantId: tenantId.substring(0, 8) + '***',
        useExternal: useExternalService,
        hasExternalConfig,
        microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL ? '✅ Set' : '❌ Missing',
        endpoint: 'GET /api/whatsapp/session',
        clientSelection: 'via_factory'
      });
    }
    
    const client = createWhatsAppClient(tenantId);
    clientCache.set(tenantId, client);
    
    // Only log client creation success in debug mode
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      logger.info('✅ [API Session] WhatsApp client created', {
        tenantId: tenantId.substring(0, 8) + '***',
        clientType: getWhatsAppClientConfig().type,
        factoryResult: 'success',
        nextStep: 'get_connection_status'
      });
    }
    
    return client;
    
  } catch (error) {
    logger.error('❌ Failed to create WhatsApp client:', error);
    throw new Error(`Failed to create WhatsApp client: ${error.message}`);
  }
}

// Clear client cache
function clearClientCache() {
  clientCache.clear();
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
    
    // OPTIMIZED: Intelligent cache with QR-aware duration
    const cached = statusCache.get(tenantId);
    if (cached) {
      const cacheAge = Date.now() - cached.timestamp;
      const isQRPresent = !!cached.data.qrCode;
      const effectiveDuration = isQRPresent ? QR_CACHE_DURATION : CACHE_DURATION;
      
      if (cacheAge < effectiveDuration) {
        // Only log cache hits in debug mode
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          logger.info('✅ [Cache Hit] Returning cached status', {
            tenantId: tenantId.substring(0, 8) + '***',
            cacheAge: `${Math.round(cacheAge/1000)}s`,
            hasQR: isQRPresent,
            effectiveDuration: `${effectiveDuration/1000}s`
          });
        }
        
        return NextResponse.json({
          success: true,
          data: cached.data,
        });
      }
    }
    
    const client = await getWhatsAppClient(tenantId);
    
    let status;
    try {
      // Try getConnectionStatus first (for external client)
      status = await client.getConnectionStatus();
    } catch (error) {
      // Fallback for clients that don't have this method
      logger.warn('⚠️ [API Session] Client missing getConnectionStatus method', {
        tenantId: tenantId.substring(0, 8) + '***',
        clientType: getWhatsAppClientConfig().type,
        fallback: 'basic_status'
      });
      status = { connected: false };
    }
    
    // Convert to expected format
    const formattedStatus = {
      connected: status.connected || false,
      status: status.status || (status.connected ? 'connected' : 'disconnected'),
      phoneNumber: status.phone || status.phoneNumber || null,
      businessName: status.name || status.businessName || null,
      qrCode: status.qrCode || null,
      message: status.connected ? 'Connected successfully' : useExternalService ? 'External microservice ready' : 'Local client ready'
    };
    
    // OPTIMIZED: Cache with QR generation tracking
    statusCache.set(tenantId, {
      data: formattedStatus,
      timestamp: Date.now(),
      lastQRGeneration: formattedStatus.qrCode ? Date.now() : cached?.lastQRGeneration
    });
    
    // Only log cache updates in debug mode
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      logger.info('📦 [Cache Update] Status cached', {
        tenantId: tenantId.substring(0, 8) + '***',
        status: formattedStatus.status,
        hasQR: !!formattedStatus.qrCode,
        cacheStrategy: formattedStatus.qrCode ? 'QR_EXTENDED' : 'STANDARD'
      });
    }

    return NextResponse.json({
      success: true,
      data: formattedStatus,
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
    
    // Check if there's a recent QR or initialization in progress
    const cached = statusCache.get(tenantId);
    if (cached) {
      // If QR was generated recently, return it instead of generating new one
      if (cached.data?.qrCode && (Date.now() - cached.timestamp < QR_CACHE_DURATION)) {
        logger.info('🔄 [Session POST] Returning existing QR to prevent regeneration', {
          tenantId: tenantId.substring(0, 8) + '***',
          qrAge: `${Math.round((Date.now() - cached.timestamp)/1000)}s`
        });
        return NextResponse.json({
          success: true,
          data: cached.data,
        });
      }
      
      // If initialization is in progress, wait and return cached data
      if (cached.initInProgress && (Date.now() - cached.timestamp < INIT_COOLDOWN)) {
        logger.warn('⚠️ [Session POST] Initialization already in progress', {
          tenantId: tenantId.substring(0, 8) + '***',
          cooldownRemaining: `${Math.round((INIT_COOLDOWN - (Date.now() - cached.timestamp))/1000)}s`
        });
        return NextResponse.json({
          success: true,
          data: cached.data || { status: 'initializing', message: 'Session initialization in progress' },
        });
      }
    }
    
    // Mark initialization as in progress
    statusCache.set(tenantId, {
      data: cached?.data || { status: 'initializing' },
      timestamp: Date.now(),
      initInProgress: true,
      lastQRGeneration: cached?.lastQRGeneration
    });
    
    // WhatsApp Web SEMPRE HABILITADO - NUNCA RETORNAR DISABLED
    // Este check foi removido para garantir funcionamento em produção
    
    logger.info('🚀 [API Session POST] Starting session initialization', { 
      tenantId: tenantId?.substring(0, 8) + '***',
      environment: process.env.NODE_ENV,
      useExternal: useExternalService,
      hasExternalConfig,
      clientType: getWhatsAppClientConfig().type,
      endpoint: 'POST /api/whatsapp/session',
      microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL
    });
    
    // Get WhatsApp client via factory
    const client = await getWhatsAppClient(tenantId);
    logger.info('✅ [API POST] WhatsApp client loaded successfully');
    
    // Initialize the session
    logger.info(`🔥 [API POST] Starting session initialization for ${tenantId.substring(0, 8)}***`);
    
    const initResult = await client.initializeSession();
    
    logger.info('✅ [API POST] Session initialization completed');

    // Handle different responses based on client type
    let status;
    
    if (useExternalService && hasExternalConfig) {
      // External microservice - format response
      status = {
        connected: initResult.connected,
        status: initResult.connected ? 'connected' : (initResult.qrCode ? 'qr' : 'connecting'),
        phoneNumber: null,
        businessName: null,
        qrCode: initResult.qrCode || null
      };
      
      // If no QR immediately, try polling the microservice
      if (!initResult.qrCode && !initResult.connected) {
        logger.info('🔄 [External] Polling for QR code...');
        
        try {
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const pollStatus = await client.getConnectionStatus();
            
            if (pollStatus.qrCode || pollStatus.connected) {
              status.qrCode = pollStatus.qrCode;
              status.connected = pollStatus.connected;
              status.status = pollStatus.connected ? 'connected' : 'qr';
              break;
            }
          }
        } catch (pollError) {
          logger.warn('Polling failed:', pollError);
        }
      }
    } else {
      // Local client - get status
      try {
        const connectionStatus = await client.getConnectionStatus();
        status = {
          connected: connectionStatus.connected,
          status: connectionStatus.connected ? 'connected' : 'connecting',
          phoneNumber: connectionStatus.phone,
          businessName: connectionStatus.name,
          qrCode: initResult.qrCode || null
        };
      } catch (error) {
        logger.warn('Local client getConnectionStatus failed, using basic status');
        status = {
          connected: false,
          status: 'connecting',
          phoneNumber: null,
          businessName: null,
          qrCode: initResult.qrCode || null
        };
      }
    }


    // Update cache with the new status and clear init flag
    statusCache.set(tenantId, {
      data: status,
      timestamp: Date.now(),
      lastQRGeneration: status.qrCode ? Date.now() : cached?.lastQRGeneration,
      initInProgress: false
    });
    
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
    
    const client = await getWhatsAppClient(tenantId);
    await client.disconnect();
    
    // Clear from cache
    clientCache.delete(tenantId);

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