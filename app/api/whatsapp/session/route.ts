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
import { EmergencyAuth } from '@/lib/utils/emergency-auth';


// ANTI-LOOP: Cache agressivo para prevenir chamadas excessivas
const statusCache = new Map<string, { data: any; timestamp: number; lastQRGeneration?: number; initInProgress?: boolean }>();
const CACHE_DURATION = 30000; // 30s cache para ambos os modos
const QR_CACHE_DURATION = 300000; // QR codes cached for 5 minutos
const INIT_COOLDOWN = 60000; // 1 minuto cooldown entre inicializações
const RATE_LIMIT = new Map<string, number>(); // Rate limiting por tenant

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
    
    // RATE LIMITING: Prevenir chamadas excessivas por tenant
    const lastCall = RATE_LIMIT.get(tenantId) || 0;
    const now = Date.now();
    if (now - lastCall < 5000) { // 5s entre chamadas por tenant
      const cached = statusCache.get(tenantId);
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached.data,
          cached: true,
          rateLimited: true
        });
      }
    }
    RATE_LIMIT.set(tenantId, now);
    
    if (useExternalService && hasExternalConfig) {
      // Log reduzido - apenas em debug
      if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
        logger.info('🌐 [Session GET] MICROSERVICE mode', {
          tenantId: tenantId.substring(0, 8) + '***'
        });
      }
      
      // Check if we have real-time status from webhooks
      const realtimeStatus = WhatsAppStatusService.getStatus(tenantId);
      
      if (realtimeStatus) {
        // Log apenas quando necessário
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          logger.info('✅ [Session GET] Webhook status', {
            tenantId: tenantId.substring(0, 8) + '***',
            status: realtimeStatus.status
          });
        }
        
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
    
    // Fallback para modo local - log apenas uma vez por sessão
    if (!statusCache.has(`${tenantId}_fallback_warned`)) {
      logger.warn('⚠️ [Session GET] Fallback to local client', { tenantId: tenantId.substring(0, 8) + '***' });
      statusCache.set(`${tenantId}_fallback_warned`, { data: true, timestamp: now });
    }
    
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

// POST /api/whatsapp/session - Initialize session (ANTI-LOOP)
export async function POST(request: NextRequest) {
  try {
    // Auth simplificado
    const authResult = await authService.requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const tenantId = user.tenantId;
    
    // PREVENIR LOOPS: Verificar cooldown de inicialização
    const cached = statusCache.get(tenantId);
    if (cached?.initInProgress) {
      return NextResponse.json({
        success: false,
        error: 'Initialization already in progress',
        data: {
          connected: false,
          status: 'initializing',
          message: 'Please wait, initialization in progress'
        }
      });
    }
    
    // Verificar cooldown
    if (cached?.timestamp && (Date.now() - cached.timestamp < INIT_COOLDOWN)) {
      return NextResponse.json({
        success: false,
        error: 'Too many initialization attempts',
        data: {
          connected: false,
          status: 'rate_limited', 
          message: 'Please wait before trying again'
        }
      });
    }
    
    // Marcar como em progresso
    statusCache.set(tenantId, {
      data: { status: 'initializing' },
      timestamp: Date.now(),
      initInProgress: true
    });
    
    if (useExternalService && hasExternalConfig) {
      try {
        const microserviceUrl = `${process.env.WHATSAPP_MICROSERVICE_URL}/api/v1/sessions/${tenantId}/start`;
        const apiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY;
        
        const response = await fetch(microserviceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Tenant-ID': tenantId
          },
          timeout: 30000 // 30 second timeout
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Microservice HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        // Start session usually doesn't return QR immediately - check status endpoint
        // Aguardar 2s para QR code aparecer
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusUrl = `${process.env.WHATSAPP_MICROSERVICE_URL}/api/v1/sessions/${tenantId}/status`;
        const statusResponse = await fetch(statusUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        let resultData = result.data || result;
        
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          if (statusResult.data) {
            resultData = statusResult.data;
          }
        }
        
        const status = {
          connected: resultData.connected || false,
          status: resultData.connected ? 'connected' : (resultData.qrCode ? 'qr' : 'initializing'),
          phoneNumber: resultData.phoneNumber || null,
          businessName: resultData.businessName || null,
          qrCode: resultData.qrCode || null,
          message: resultData.connected ? 'Connected to WhatsApp via microservice' : (resultData.qrCode ? 'Scan QR code to connect' : 'Initializing session...')
        };
        
        // Update cache
        statusCache.set(tenantId, {
          data: status,
          timestamp: Date.now(),
          initInProgress: false,
          lastQRGeneration: status.qrCode ? Date.now() : undefined
        });
        
        // Log apenas em debug
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          logger.info('✅ [Session POST] Initialized', { 
            tenantId: tenantId.substring(0, 8) + '***',
            hasQR: !!status.qrCode 
          });
        }
        
        return NextResponse.json({
          success: true,
          data: status,
          microservice: {
            enabled: true,
            directCall: true,
            webhookActive: true,
            url: process.env.WHATSAPP_MICROSERVICE_URL
          }
        });
        
      } catch (error) {
        logger.error('❌ [Session POST] Direct microservice call failed', {
          tenantId: tenantId.substring(0, 8) + '***',
          error: error instanceof Error ? error.message : 'Unknown error',
          microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL
        });
        
        return NextResponse.json({
          success: false,
          error: 'Failed to initialize session with microservice',
          data: {
            connected: false,
            status: 'error',
            qrCode: null,
            message: `Microservice error: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          microservice: {
            enabled: true,
            error: true,
            url: process.env.WHATSAPP_MICROSERVICE_URL
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