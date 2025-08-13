import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/utils/auth';
import { logger } from '@/lib/utils/logger';

/**
 * Strategic WhatsApp Test Endpoint
 * Tests the new Strategic Session Manager with detailed diagnostics
 */
export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    logger.info('🧪 [Strategic Test] Starting test', { 
      tenant: tenantId?.substring(0, 8) 
    });

    // Load Strategic Manager
    logger.info('🔧 [Strategic Test] Loading Strategic Session Manager...');
    const { strategicSessionManager } = await import('@/lib/whatsapp/strategic-session-manager');
    
    logger.info('✅ [Strategic Test] Manager loaded, testing initialization...');

    // Test session initialization
    const testStart = Date.now();
    
    try {
      await strategicSessionManager.initializeSession(tenantId);
      logger.info('✅ [Strategic Test] Session initialization completed');
      
      // Wait a bit and check status multiple times
      const statusChecks = [];
      
      for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second intervals
        const status = await strategicSessionManager.getSessionStatus(tenantId);
        
        const statusCheck = {
          check: i,
          timestamp: Date.now() - testStart,
          status: status.status,
          connected: status.connected,
          hasQR: !!status.qrCode,
          qrLength: status.qrCode?.length || 0,
          message: status.message
        };
        
        statusChecks.push(statusCheck);
        logger.info(`📊 [Strategic Test] Status Check ${i}:`, statusCheck);
        
        // If we got QR or connected, we can stop
        if (status.qrCode || status.connected) {
          logger.info('🎉 [Strategic Test] Success achieved!');
          break;
        }
      }
      
      const finalStatus = await strategicSessionManager.getSessionStatus(tenantId);
      const testDuration = Date.now() - testStart;
      
      logger.info('🏁 [Strategic Test] Test completed', {
        duration: testDuration,
        finalStatus: finalStatus.status,
        success: !!finalStatus.qrCode || finalStatus.connected
      });

      return NextResponse.json({
        success: true,
        test: {
          duration: testDuration,
          statusChecks,
          finalStatus,
          result: finalStatus.qrCode ? 'QR_GENERATED' : 
                  finalStatus.connected ? 'CONNECTED' : 
                  'NO_QR_OR_CONNECTION'
        },
        message: finalStatus.qrCode ? 
          'Strategic test successful - QR code generated!' :
          finalStatus.connected ?
          'Strategic test successful - Already connected!' :
          'Strategic test completed - No QR generated (check logs for details)'
      });

    } catch (sessionError) {
      logger.error('❌ [Strategic Test] Session error:', sessionError);
      
      return NextResponse.json({
        success: false,
        error: 'Session initialization failed',
        details: sessionError.message,
        test: {
          duration: Date.now() - testStart,
          result: 'SESSION_ERROR'
        }
      }, { status: 500 });
    }

  } catch (error) {
    logger.error('❌ [Strategic Test] Critical error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Strategic test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Strategic WhatsApp Test Endpoint',
    usage: 'POST to this endpoint to run a strategic WhatsApp test',
    note: 'This endpoint tests the Strategic Session Manager with detailed diagnostics'
  });
}