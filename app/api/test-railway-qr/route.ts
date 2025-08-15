// TEST ENDPOINT FOR RAILWAY QR GENERATION
// Simplified test to verify Railway QR Session Manager directly

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🧪 [TEST] Starting Railway QR test...');
    
    // Test 1: Load Railway QR Session Manager
    logger.info('📦 [TEST] Loading Railway QR Session Manager...');
    const { railwayQRSessionManager } = await import('@/lib/whatsapp/railway-qr-session-manager');
    
    if (!railwayQRSessionManager) {
      throw new Error('Railway QR Session Manager not found');
    }
    
    logger.info('✅ [TEST] Railway QR Session Manager loaded successfully');
    
    // Test 2: Initialize session
    const testTenantId = 'test-tenant-' + Date.now();
    logger.info('🚀 [TEST] Initializing test session...', { testTenantId });
    
    try {
      await railwayQRSessionManager.initializeSession(testTenantId);
      logger.info('✅ [TEST] Session initialization started');
    } catch (initError) {
      logger.error('❌ [TEST] Session initialization failed:', initError);
      return NextResponse.json({
        success: false,
        error: 'Session initialization failed',
        details: initError.message,
        step: 'session_init'
      }, { status: 500 });
    }
    
    // Test 3: Check session status multiple times with longer intervals
    logger.info('🔍 [TEST] Checking session status (extended monitoring)...');
    let statusChecks = [];
    
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      try {
        const status = await railwayQRSessionManager.getSessionStatus(testTenantId);
        statusChecks.push({
          check: i + 1,
          timestamp: new Date().toISOString(),
          status: status.status,
          hasQrCode: !!status.qrCode,
          qrCodeLength: status.qrCode?.length || 0,
          connected: status.connected
        });
        
        logger.info(`📊 [TEST] Status check ${i + 1}:`, status.status);
        
        // If we get a QR code, we can break early
        if (status.qrCode) {
          logger.info('✅ [TEST] QR code generated successfully!');
          break;
        }
      } catch (statusError) {
        logger.error(`❌ [TEST] Status check ${i + 1} failed:`, statusError);
        statusChecks.push({
          check: i + 1,
          error: statusError.message
        });
      }
    }
    
    // Test 4: Cleanup
    try {
      logger.info('🧹 [TEST] Cleaning up test session...');
      await railwayQRSessionManager.disconnectSession(testTenantId);
      logger.info('✅ [TEST] Cleanup completed');
    } catch (cleanupError) {
      logger.warn('⚠️ [TEST] Cleanup failed:', cleanupError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Railway QR test completed',
      testResults: {
        managerLoaded: true,
        sessionInitialized: true,
        statusChecks,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isRailway: !!process.env.RAILWAY_PROJECT_ID,
          railwayId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8) || 'none'
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('💥 [TEST] Railway QR test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Railway QR test failed',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}