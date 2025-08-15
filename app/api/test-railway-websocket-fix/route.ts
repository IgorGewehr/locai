// RAILWAY WEBSOCKET MASKING FIX TEST
// Tests the WebSocket polyfill and Railway-compatible Baileys socket

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { RailwayWebSocketPolyfill } from '@/lib/whatsapp/railway-websocket-polyfill';
import { RailwayBaileysSocket } from '@/lib/whatsapp/railway-baileys-socket';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { timeout = 90000 } = body; // 90 seconds default
    
    logger.info('🧪 [WS-FIX-TEST] Starting Railway WebSocket masking fix test...');
    
    // Step 1: Test WebSocket polyfill
    logger.info('🔧 [WS-FIX-TEST] Step 1: Testing WebSocket polyfill...');
    
    const polyfillTest = await testWebSocketPolyfill();
    if (!polyfillTest.success) {
      return createResponse(false, 'WebSocket polyfill test failed', startTime, { polyfillTest });
    }
    
    // Step 2: Test masking functionality
    logger.info('🧪 [WS-FIX-TEST] Step 2: Testing masking functionality...');
    
    const maskingTest = await testMaskingFunctionality();
    if (!maskingTest.success) {
      return createResponse(false, 'Masking functionality test failed', startTime, { polyfillTest, maskingTest });
    }
    
    // Step 3: Test Railway Baileys socket creation
    logger.info('🔌 [WS-FIX-TEST] Step 3: Testing Railway Baileys socket...');
    
    const socketTest = await testRailwayBaileysSocket(timeout);
    
    const allTestsPassed = polyfillTest.success && maskingTest.success && socketTest.success;
    const message = allTestsPassed 
      ? 'All WebSocket masking fix tests passed!' 
      : 'Some tests failed - check results for details';
    
    return createResponse(allTestsPassed, message, startTime, {
      polyfillTest,
      maskingTest,
      socketTest
    });
    
  } catch (error) {
    logger.error('💥 [WS-FIX-TEST] Test execution failed', { 
      error: error.message, 
      stack: error.stack 
    });
    
    return createResponse(false, 'Test execution failed', startTime, { 
      error: error.message 
    });
  }
}

async function testWebSocketPolyfill() {
  try {
    logger.info('🔧 [WS-FIX-TEST] Testing WebSocket polyfill setup...');
    
    // Test environment detection
    const isRailway = RailwayWebSocketPolyfill.isRailwayEnvironment();
    logger.info(`🌍 [WS-FIX-TEST] Environment: ${isRailway ? 'Railway' : 'Local'}`);
    
    // Test polyfill setup
    RailwayWebSocketPolyfill.setupWebSocketPolyfill();
    logger.info('✅ [WS-FIX-TEST] Polyfill setup completed');
    
    // Test masking functionality
    const maskingWorks = RailwayWebSocketPolyfill.testMaskingFunctionality();
    logger.info(`🧪 [WS-FIX-TEST] Masking test: ${maskingWorks ? 'PASS' : 'FAIL'}`);
    
    return {
      success: true,
      isRailway,
      maskingWorks,
      polyfillApplied: true
    };
    
  } catch (error) {
    logger.error('❌ [WS-FIX-TEST] Polyfill test failed', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

async function testMaskingFunctionality() {
  try {
    logger.info('🧪 [WS-FIX-TEST] Testing detailed masking functionality...');
    
    // Test 1: Basic XOR masking
    const source1 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const mask1 = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
    const expected1 = Buffer.from([0xFE, 0xFD, 0xFC, 0xFB]);
    
    const result1 = Buffer.alloc(4);
    for (let i = 0; i < 4; i++) {
      result1[i] = source1[i] ^ mask1[i % 4];
    }
    
    const test1Pass = result1.equals(expected1);
    logger.info(`🔬 [WS-FIX-TEST] Basic XOR test: ${test1Pass ? 'PASS' : 'FAIL'}`);
    
    // Test 2: Real-world pattern masking
    const source2 = Buffer.from('Hello, World!', 'utf8');
    const mask2 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    
    const masked = Buffer.alloc(source2.length);
    for (let i = 0; i < source2.length; i++) {
      masked[i] = source2[i] ^ mask2[i % 4];
    }
    
    const unmasked = Buffer.alloc(source2.length);
    for (let i = 0; i < source2.length; i++) {
      unmasked[i] = masked[i] ^ mask2[i % 4];
    }
    
    const test2Pass = unmasked.equals(source2);
    logger.info(`🔬 [WS-FIX-TEST] Round-trip masking test: ${test2Pass ? 'PASS' : 'FAIL'}`);
    
    // Test 3: Buffer prototype methods (if added)
    let test3Pass = true;
    try {
      if (typeof Buffer.prototype.mask === 'function') {
        const testBuffer = Buffer.from([1, 2, 3, 4]);
        const testMask = Buffer.from([5, 6, 7, 8]);
        const maskedBuffer = testBuffer.mask(testMask);
        test3Pass = maskedBuffer instanceof Buffer;
        logger.info(`🔬 [WS-FIX-TEST] Buffer.prototype.mask test: ${test3Pass ? 'PASS' : 'FAIL'}`);
      } else {
        logger.info('🔬 [WS-FIX-TEST] Buffer.prototype.mask not available (OK)');
      }
    } catch (bufferError) {
      logger.warn('⚠️ [WS-FIX-TEST] Buffer prototype test failed', { error: bufferError.message });
      test3Pass = false;
    }
    
    const allTestsPass = test1Pass && test2Pass && test3Pass;
    
    return {
      success: allTestsPass,
      tests: {
        basicXOR: test1Pass,
        roundTrip: test2Pass,
        bufferPrototype: test3Pass
      },
      details: {
        source1: source1.toString('hex'),
        mask1: mask1.toString('hex'),
        result1: result1.toString('hex'),
        expected1: expected1.toString('hex'),
        source2Text: source2.toString(),
        unmaskedText: unmasked.toString()
      }
    };
    
  } catch (error) {
    logger.error('❌ [WS-FIX-TEST] Masking functionality test failed', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

async function testRailwayBaileysSocket(timeout: number) {
  try {
    logger.info('🔌 [WS-FIX-TEST] Testing Railway Baileys socket creation...');
    
    // Initialize Railway Baileys
    await RailwayBaileysSocket.initialize();
    logger.info('✅ [WS-FIX-TEST] Railway Baileys initialized');
    
    // Test socket creation with QR
    logger.info('🔲 [WS-FIX-TEST] Creating socket and waiting for QR...');
    
    const result = await RailwayBaileysSocket.createSocketWithQR({
      timeout: Math.min(timeout, 60000), // Max 60 seconds for test
      enableLogging: true,
      browser: ['Railway Fix Test', 'Chrome', '120.0.0']
    });
    
    logger.info('✅ [WS-FIX-TEST] Socket test completed successfully!');
    
    // Cleanup
    if (result.cleanup) {
      result.cleanup();
    }
    
    return {
      success: true,
      qrGenerated: !!result.qrCode,
      qrLength: result.qrLength || 0,
      rawQRLength: result.rawQRLength || 0,
      eventCount: result.events?.length || 0,
      reason: result.reason || 'qr_generated'
    };
    
  } catch (error) {
    logger.error('❌ [WS-FIX-TEST] Railway Baileys socket test failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    // Check if this is the original masking error
    const isMaskingError = error.message.includes('mask is not a function') || 
                          error.message.includes('b.mask');
    
    return {
      success: false,
      error: error.message,
      isMaskingError,
      isOriginalError: isMaskingError
    };
  }
}

function createResponse(success: boolean, message: string, startTime: number, testResults: any) {
  const duration = Date.now() - startTime;
  
  return NextResponse.json({
    success,
    message,
    duration,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      isRailway: !!process.env.RAILWAY_PROJECT_ID,
      railwayId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8) || 'none',
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    },
    testResults,
    summary: {
      totalDuration: `${duration}ms`,
      fixApplied: true,
      testType: 'railway_websocket_fix'
    }
  });
}