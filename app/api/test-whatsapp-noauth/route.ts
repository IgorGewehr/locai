import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppClient } from '@/lib/whatsapp/whatsapp-client-factory';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Use a test tenant ID for debugging
    const tenantId = 'test-tenant-debug';
    
    logger.info('🧪 [Test WhatsApp NoAuth] Starting connection test', {
      tenantId,
      useExternal: process.env.WHATSAPP_USE_EXTERNAL,
      microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL,
      hasApiKey: !!process.env.WHATSAPP_MICROSERVICE_API_KEY
    });

    // Create client using factory
    const client = createWhatsAppClient(tenantId);
    
    // Test 1: Get connection status
    let status;
    try {
      status = await client.getConnectionStatus();
      logger.info('✅ [Test NoAuth] Connection status retrieved', { status });
    } catch (error) {
      logger.error('❌ [Test NoAuth] Failed to get status', { 
        error: error.message,
        stack: error.stack 
      });
      status = { connected: false, status: 'error', error: error.message };
    }

    // Test 2: Initialize session if not connected
    let qrCode = null;
    let initError = null;
    if (!status.connected && status.status !== 'qr') {
      try {
        logger.info('🚀 [Test NoAuth] Initializing session...');
        const initResult = await client.initializeSession();
        qrCode = initResult.qrCode;
        logger.info('✅ [Test NoAuth] Session initialized', { 
          hasQR: !!qrCode,
          qrLength: qrCode?.length 
        });
      } catch (error) {
        logger.error('❌ [Test NoAuth] Failed to initialize', { 
          error: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        initError = {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        };
      }
    }

    // Test 3: Health check (if external)
    let healthStatus = null;
    if (process.env.WHATSAPP_USE_EXTERNAL === 'true') {
      try {
        if (client.healthCheck) {
          healthStatus = await client.healthCheck();
          logger.info('✅ [Test NoAuth] Health check passed', { healthStatus });
        } else {
          logger.warn('⚠️ [Test NoAuth] Health check method not available');
        }
      } catch (error) {
        logger.error('❌ [Test NoAuth] Health check failed', { 
          error: error.message 
        });
        healthStatus = { healthy: false, error: error.message };
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        connectionStatus: status,
        qrCode: qrCode ? `${qrCode.substring(0, 100)}...` : null,
        qrAvailable: !!qrCode,
        initError,
        healthCheck: healthStatus,
        config: {
          useExternal: process.env.WHATSAPP_USE_EXTERNAL === 'true',
          microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL,
          hasApiKey: !!process.env.WHATSAPP_MICROSERVICE_API_KEY,
          tenantId
        }
      }
    };

    logger.info('📊 [Test NoAuth] Test complete', { result });
    return NextResponse.json(result);

  } catch (error) {
    logger.error('💥 [Test WhatsApp NoAuth] Unexpected error', { 
      error: error.message,
      stack: error.stack 
    });
    return NextResponse.json({
      success: false,
      error: error.message || 'Test failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}