import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/utils/auth';
import { createWhatsAppClient } from '@/lib/whatsapp/whatsapp-client-factory';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
    logger.info('🧪 [Test WhatsApp] Starting connection test', {
      tenantId: tenantId.substring(0, 8) + '***',
      useExternal: process.env.WHATSAPP_USE_EXTERNAL,
      microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL
    });

    // Create client using factory
    const client = await createWhatsAppClient(tenantId);
    
    // Test 1: Get connection status
    let status;
    try {
      status = await client.getConnectionStatus();
      logger.info('✅ [Test] Connection status retrieved', { status });
    } catch (error) {
      logger.error('❌ [Test] Failed to get status', { error: error.message });
      status = { connected: false, status: 'error' };
    }

    // Test 2: Initialize session if not connected
    let qrCode = null;
    if (!status.connected) {
      try {
        const initResult = await client.initializeSession();
        qrCode = initResult.qrCode;
        logger.info('✅ [Test] Session initialized', { hasQR: !!qrCode });
      } catch (error) {
        logger.error('❌ [Test] Failed to initialize', { error: error.message });
      }
    }

    // Test 3: Health check (if external)
    let healthStatus = null;
    if (process.env.WHATSAPP_USE_EXTERNAL === 'true') {
      try {
        healthStatus = await client.healthCheck?.();
        logger.info('✅ [Test] Health check passed', { healthStatus });
      } catch (error) {
        logger.error('❌ [Test] Health check failed', { error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        connectionStatus: status,
        qrCode: qrCode,
        healthCheck: healthStatus,
        config: {
          useExternal: process.env.WHATSAPP_USE_EXTERNAL === 'true',
          microserviceUrl: process.env.WHATSAPP_MICROSERVICE_URL,
          hasApiKey: !!process.env.WHATSAPP_MICROSERVICE_API_KEY
        }
      }
    });

  } catch (error) {
    logger.error('💥 [Test WhatsApp] Unexpected error', { error });
    return NextResponse.json({
      success: false,
      error: error.message || 'Test failed'
    }, { status: 500 });
  }
}