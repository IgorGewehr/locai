import { NextRequest, NextResponse } from 'next/server';

// PUBLIC diagnostic endpoint for WhatsApp QR generation issues - NO AUTH REQUIRED
// TEMPORARY - Remove after fixing Railway issues
export async function GET(request: NextRequest) {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID ? 'SET' : 'NOT_SET',
        PORT: process.env.PORT || 'NOT_SET',
        nodeVersion: process.version,
        platform: process.platform,
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        isProduction: process.env.NODE_ENV === 'production'
      },
      dependencies: {},
      tests: {}
    };

    // Test 1: QRCode library
    try {
      const QRCode = require('qrcode');
      diagnostics.dependencies.qrcode = {
        loaded: true,
        hasToDataURL: typeof QRCode.toDataURL === 'function',
        hasToBuffer: typeof QRCode.toBuffer === 'function',
        hasToString: typeof QRCode.toString === 'function'
      };

      // Test QR generation
      const testString = 'RAILWAY_TEST_' + Date.now();
      const testQR = await QRCode.toDataURL(testString);
      diagnostics.tests.qrGeneration = {
        success: true,
        inputLength: testString.length,
        outputLength: testQR.length,
        isDataUrl: testQR.startsWith('data:image/png;base64,'),
        sampleOutput: testQR.substring(0, 50) + '...'
      };
    } catch (error: any) {
      diagnostics.dependencies.qrcode = {
        loaded: false,
        error: error.message
      };
      diagnostics.tests.qrGeneration = {
        success: false,
        error: error.message
      };
    }

    // Test 2: Baileys library with both import methods
    try {
      // Try dynamic import first
      const baileysDynamic = await import('@whiskeysockets/baileys');
      
      diagnostics.dependencies.baileysImport = {
        loaded: true,
        hasDefault: !!baileysDynamic.default,
        defaultType: typeof baileysDynamic.default,
        hasMakeWASocket: !!baileysDynamic.makeWASocket,
        makeWASocketType: typeof baileysDynamic.makeWASocket,
        hasAuthState: !!baileysDynamic.useMultiFileAuthState,
        hasDisconnect: !!baileysDynamic.DisconnectReason,
        totalExports: Object.keys(baileysDynamic).length,
        firstTenExports: Object.keys(baileysDynamic).slice(0, 10)
      };

      // Check which pattern works
      const makeWASocket = baileysDynamic.default || baileysDynamic.makeWASocket;
      diagnostics.tests.makeWASocketAccess = {
        found: !!makeWASocket,
        type: typeof makeWASocket,
        isFunction: typeof makeWASocket === 'function',
        source: baileysDynamic.default ? 'default' : 'direct'
      };
    } catch (error: any) {
      diagnostics.dependencies.baileysImport = {
        loaded: false,
        error: error.message
      };
    }

    // Try require as well
    try {
      const baileysRequire = require('@whiskeysockets/baileys');
      diagnostics.dependencies.baileysRequire = {
        loaded: true,
        hasDefault: !!baileysRequire.default,
        defaultType: typeof baileysRequire.default,
        hasMakeWASocket: !!baileysRequire.makeWASocket,
        makeWASocketType: typeof baileysRequire.makeWASocket,
        firstFiveKeys: Object.keys(baileysRequire).slice(0, 5)
      };
    } catch (error: any) {
      diagnostics.dependencies.baileysRequire = {
        loaded: false,
        error: error.message
      };
    }

    // Test 3: File system
    const fs = require('fs');
    const path = require('path');
    
    diagnostics.filesystem = {
      '/tmp': { exists: false, writable: false },
      [process.cwd()]: { exists: false, writable: false },
      [path.join(process.cwd(), '.sessions')]: { exists: false, writable: false }
    };
    
    for (const testPath of Object.keys(diagnostics.filesystem)) {
      try {
        diagnostics.filesystem[testPath].exists = fs.existsSync(testPath);
        if (diagnostics.filesystem[testPath].exists) {
          try {
            fs.accessSync(testPath, fs.constants.W_OK);
            diagnostics.filesystem[testPath].writable = true;
          } catch {
            diagnostics.filesystem[testPath].writable = false;
          }
        }
      } catch (error: any) {
        diagnostics.filesystem[testPath].error = error.message;
      }
    }

    // Test 4: Session manager loading
    try {
      const { strategicSessionManager } = await import('@/lib/whatsapp/strategic-session-manager');
      diagnostics.sessionManager = {
        loaded: true,
        hasInitialize: typeof strategicSessionManager.initializeSession === 'function',
        hasGetStatus: typeof strategicSessionManager.getSessionStatus === 'function',
        hasDisconnect: typeof strategicSessionManager.disconnectSession === 'function'
      };
    } catch (error: any) {
      diagnostics.sessionManager = {
        loaded: false,
        error: error.message
      };
    }

    // Summary
    diagnostics.summary = {
      railwayDetected: !!process.env.RAILWAY_PROJECT_ID,
      productionMode: process.env.NODE_ENV === 'production',
      qrGenerationWorks: diagnostics.tests.qrGeneration?.success || false,
      baileysLoaded: diagnostics.dependencies.baileysImport?.loaded || diagnostics.dependencies.baileysRequire?.loaded || false,
      makeWASocketAvailable: diagnostics.tests.makeWASocketAccess?.isFunction || false,
      fileSystemWritable: Object.values(diagnostics.filesystem).some((fs: any) => fs.writable),
      sessionManagerLoaded: diagnostics.sessionManager?.loaded || false
    };

    // Overall status
    diagnostics.status = {
      ready: diagnostics.summary.qrGenerationWorks && 
             diagnostics.summary.baileysLoaded && 
             diagnostics.summary.makeWASocketAvailable,
      message: ''
    };

    if (!diagnostics.summary.qrGenerationWorks) {
      diagnostics.status.message += 'QR generation failed. ';
    }
    if (!diagnostics.summary.baileysLoaded) {
      diagnostics.status.message += 'Baileys not loaded. ';
    }
    if (!diagnostics.summary.makeWASocketAvailable) {
      diagnostics.status.message += 'makeWASocket not accessible. ';
    }
    if (!diagnostics.summary.fileSystemWritable) {
      diagnostics.status.message += 'No writable filesystem. ';
    }

    if (diagnostics.status.ready) {
      diagnostics.status.message = 'All systems operational for WhatsApp QR generation';
    }

    return NextResponse.json({
      success: true,
      diagnostics
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}