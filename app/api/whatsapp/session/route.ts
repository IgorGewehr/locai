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


// Use JWT auth instead of Firebase Admin auth
import { authService } from '@/lib/auth/auth-service';
import { WhatsAppStatusService } from '@/lib/services/whatsapp-status-service';


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

// GET /api/whatsapp/session - Get session status (MICROSERVICE MODE)
export async function GET(request: NextRequest) {
  try {
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed, return error response
    }

    const { user } = authResult;
    const tenantId = user.tenantId;
    
    // MICROSERVICE MODE: Only return cached status or query external service
    // No more polling loops - frontend should use webhooks for real-time updates
    
    if (useExternalService && hasExternalConfig) {
      logger.info('🌐 [Session GET] Using MICROSERVICE mode - checking real-time status', {
        tenantId: tenantId.substring(0, 8) + '***',
        microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL
      });
      
      // Check if we have real-time status from webhooks
      const realtimeStatus = WhatsAppStatusService.getStatus(tenantId);
      
      if (realtimeStatus) {
        logger.info('✅ [Session GET] Returning real-time status from webhooks', {
          tenantId: tenantId.substring(0, 8) + '***',
          status: realtimeStatus.status,
          connected: realtimeStatus.connected,
          hasQR: !!realtimeStatus.qrCode
        });
        
        return NextResponse.json({
          success: true,
          data: {
            connected: realtimeStatus.connected,
            status: realtimeStatus.status,
            phoneNumber: realtimeStatus.phoneNumber || null,
            businessName: realtimeStatus.businessName || null,
            qrCode: realtimeStatus.qrCode || null,
            message: realtimeStatus.connected ? 'Connected via microservice' : 'Status from microservice webhooks'
          },
          microservice: {
            enabled: true,
            realtimeStatus: true,
            lastUpdated: realtimeStatus.lastUpdated
          }
        });
      }
      
      // No real-time status yet - return microservice mode indicator
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          status: 'microservice_mode',
          phoneNumber: null,
          businessName: null,
          qrCode: null,
          message: 'WhatsApp microservice ready. Use POST to initialize session.'
        },
        microservice: {
          enabled: true,
          url: process.env.WHATSAPP_MICROSERVICE_URL,
          webhookEndpoint: '/api/webhook/whatsapp-microservice',
          realtimeStatus: false
        }
      });
    }
    
    // Fallback for local mode (only if external service is not configured)
    logger.warn('⚠️ [Session GET] External service not configured, falling back to local client');
    
    const cached = statusCache.get(tenantId);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return NextResponse.json({
        success: true,
        data: cached.data,
      });
    }
    
    // Only for local fallback - should be rare
    const client = await getWhatsAppClient(tenantId);
    const status = await client.getConnectionStatus();
    
    const formattedStatus = {
      connected: status.connected || false,
      status: status.status || 'disconnected',
      phoneNumber: status.phone || null,
      businessName: status.name || null,
      qrCode: status.qrCode || null,
      message: 'Local fallback mode - consider configuring microservice'
    };
    
    statusCache.set(tenantId, {
      data: formattedStatus,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      data: formattedStatus,
    });
    
  } catch (error) {
    logger.error('Error getting session status:', error);
    
    return NextResponse.json({
      success: false, 
      error: 'Failed to get session status',
      data: {
        connected: false,
        status: 'error',
        qrCode: null,
        phoneNumber: null,
        businessName: null,
        message: 'Service error - check microservice connection'
      }
    }, { status: 200 }); // Return 200 for graceful degradation
  }
}

// POST /api/whatsapp/session - Initialize session (MICROSERVICE OPTIMIZED)
export async function POST(request: NextRequest) {
  try {
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed, return error response
    }

    const { user } = authResult;
    const tenantId = user.tenantId;
    
    if (useExternalService && hasExternalConfig) {
      logger.info('🚀 [Session POST] MICROSERVICE mode - initializing session', {
        tenantId: tenantId.substring(0, 8) + '***',
        microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL,
        action: 'initialize_session'
      });
      
      // Check if there's already an active session or initialization
      const cached = statusCache.get(tenantId);
      if (cached && cached.initInProgress && (Date.now() - cached.timestamp < INIT_COOLDOWN)) {
        logger.warn('⚠️ [Session POST] Initialization already in progress on microservice', {
          tenantId: tenantId.substring(0, 8) + '***',
          timeRemaining: `${Math.round((INIT_COOLDOWN - (Date.now() - cached.timestamp))/1000)}s`
        });
        
        return NextResponse.json({
          success: true,
          data: {
            status: 'initializing',
            message: 'Session initialization in progress on microservice',
            qrCode: cached.data?.qrCode || null
          }
        });
      }
      
      // Mark as initializing
      statusCache.set(tenantId, {
        data: { status: 'initializing' },
        timestamp: Date.now(),
        initInProgress: true
      });
      
      try {
        // Initialize via external microservice
        const client = await getWhatsAppClient(tenantId);
        const initResult = await client.initializeSession();
        
        const status = {
          connected: initResult.connected || false,
          status: initResult.connected ? 'connected' : (initResult.qrCode ? 'qr' : 'initializing'),
          phoneNumber: initResult.phoneNumber || null,
          businessName: initResult.businessName || null,
          qrCode: initResult.qrCode || null,
          message: initResult.connected ? 'Connected to WhatsApp' : 'Session initialized, scan QR code to connect'
        };
        
        // Update cache with result
        statusCache.set(tenantId, {
          data: status,
          timestamp: Date.now(),
          initInProgress: false,
          lastQRGeneration: status.qrCode ? Date.now() : undefined
        });
        
        logger.info('✅ [Session POST] Microservice session initialized', {
          tenantId: tenantId.substring(0, 8) + '***',
          hasQR: !!status.qrCode,
          connected: status.connected,
          status: status.status
        });
        
        return NextResponse.json({
          success: true,
          data: status,
          microservice: {
            enabled: true,
            webhookActive: true
          }
        });
        
      } catch (error) {
        // Clear initialization flag on error
        statusCache.delete(tenantId);
        
        logger.error('❌ [Session POST] Microservice initialization failed', {
          tenantId: tenantId.substring(0, 8) + '***',
          error: error.message
        });
        
        return NextResponse.json({
          success: false,
          error: 'Failed to initialize session with microservice',
          data: {
            connected: false,
            status: 'error',
            qrCode: null,
            message: `Microservice error: ${error.message}`
          }
        }, { status: 200 });
      }
    }
    
    // Fallback to local mode (rare case)
    logger.warn('⚠️ [Session POST] Using local fallback mode');
    
    const client = await getWhatsAppClient(tenantId);
    const initResult = await client.initializeSession();
    
    const status = {
      connected: initResult.connected || false,
      status: initResult.connected ? 'connected' : 'connecting',
      phoneNumber: null,
      businessName: null,
      qrCode: initResult.qrCode || null,
      message: 'Local fallback - consider configuring microservice'
    };
    
    statusCache.set(tenantId, {
      data: status,
      timestamp: Date.now(),
      initInProgress: false
    });
    
    return NextResponse.json({
      success: true,
      data: status,
    });
    
  } catch (error) {
    logger.error('Session initialization error:', error);
    
    return NextResponse.json({
      success: false, 
      error: 'Failed to initialize session',
      data: {
        connected: false,
        status: 'error',
        qrCode: null,
        phoneNumber: null,
        businessName: null,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 200 });
  }
}

// DELETE /api/whatsapp/session - Disconnect session
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed, return error response
    }

    const { user } = authResult;
    const tenantId = user.tenantId;
    
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