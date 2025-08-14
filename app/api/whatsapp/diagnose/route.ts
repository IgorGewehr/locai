import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/utils/auth';
import { logger } from '@/lib/utils/logger';

// Diagnostic endpoint for WhatsApp QR generation issues
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID || 'NOT_SET',
        PORT: process.env.PORT || 'NOT_SET',
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd()
      },
      dependencies: {},
      tests: {}
    };

    // Test 1: QRCode library
    try {
      const QRCode = require('qrcode');
      diagnostics.dependencies.qrcode = {
        loaded: true,
        functions: {
          toDataURL: typeof QRCode.toDataURL === 'function',
          toBuffer: typeof QRCode.toBuffer === 'function',
          toString: typeof QRCode.toString === 'function'
        }
      };

      // Test QR generation
      const testQR = await QRCode.toDataURL('TEST_RAILWAY_' + Date.now());
      diagnostics.tests.qrGeneration = {
        success: true,
        length: testQR.length,
        isDataUrl: testQR.startsWith('data:')
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

    // Test 2: Baileys library
    try {
      const baileys = await import('@whiskeysockets/baileys');
      
      diagnostics.dependencies.baileys = {
        loaded: true,
        hasDefault: !!baileys.default,
        hasMakeWASocket: !!baileys.makeWASocket,
        hasAuthState: !!baileys.useMultiFileAuthState,
        hasDisconnect: !!baileys.DisconnectReason,
        totalExports: Object.keys(baileys).length,
        sampleExports: Object.keys(baileys).slice(0, 10)
      };

      // Check if functions are properly accessible
      const makeWASocket = baileys.default || baileys.makeWASocket;
      diagnostics.tests.baileysFunction = {
        makeWASocketType: typeof makeWASocket,
        isFunction: typeof makeWASocket === 'function'
      };
    } catch (error: any) {
      diagnostics.dependencies.baileys = {
        loaded: false,
        error: error.message
      };
    }

    // Test 3: File system permissions
    const fs = require('fs');
    const path = require('path');
    
    const testPaths = [
      '/tmp',
      process.cwd(),
      path.join(process.cwd(), '.sessions'),
      path.join('/tmp', '.sessions')
    ];

    diagnostics.filesystem = {};
    
    for (const testPath of testPaths) {
      try {
        const exists = fs.existsSync(testPath);
        let writable = false;
        
        if (exists) {
          try {
            fs.accessSync(testPath, fs.constants.W_OK);
            writable = true;
          } catch {}
        }
        
        diagnostics.filesystem[testPath] = { exists, writable };
      } catch (error: any) {
        diagnostics.filesystem[testPath] = { 
          exists: false, 
          writable: false, 
          error: error.message 
        };
      }
    }

    // Test 4: Session manager
    try {
      const { strategicSessionManager } = await import('@/lib/whatsapp/strategic-session-manager');
      
      diagnostics.sessionManager = {
        loaded: true,
        type: 'strategic',
        methods: {
          initializeSession: typeof strategicSessionManager.initializeSession === 'function',
          getSessionStatus: typeof strategicSessionManager.getSessionStatus === 'function',
          disconnectSession: typeof strategicSessionManager.disconnectSession === 'function'
        }
      };
    } catch (error: any) {
      diagnostics.sessionManager = {
        loaded: false,
        error: error.message
      };
    }

    // Test 5: Memory and resources
    diagnostics.resources = {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    // Summary
    diagnostics.summary = {
      isRailway: !!process.env.RAILWAY_PROJECT_ID,
      isProduction: process.env.NODE_ENV === 'production',
      canGenerateQR: diagnostics.tests.qrGeneration?.success || false,
      canLoadBaileys: diagnostics.dependencies.baileys?.loaded || false,
      hasWritePermissions: Object.values(diagnostics.filesystem).some((fs: any) => fs.writable),
      ready: false
    };

    diagnostics.summary.ready = 
      diagnostics.summary.canGenerateQR && 
      diagnostics.summary.canLoadBaileys && 
      diagnostics.summary.hasWritePermissions;

    logger.info('WhatsApp diagnostics completed', diagnostics);

    return NextResponse.json({
      success: true,
      diagnostics
    });

  } catch (error: any) {
    logger.error('Diagnostics failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

// POST endpoint to test actual QR generation
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
    logger.info('Starting QR generation test for tenant:', { tenantId });

    // Direct test without session manager
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState } = baileys;
    
    if (!makeWASocket || typeof makeWASocket !== 'function') {
      throw new Error('makeWASocket not available');
    }

    // Create minimal socket just to get QR
    const fs = require('fs');
    const path = require('path');
    const authDir = path.join('/tmp', 'test-' + Date.now());
    fs.mkdirSync(authDir, { recursive: true });
    
    const { state } = await useMultiFileAuthState(authDir);
    
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['LocAI Test', 'Chrome', '120.0.0'],
      connectTimeoutMs: 10000,
      qrTimeout: 10000,
      logger: {
        fatal: () => {},
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
        trace: () => {},
        child: () => ({ 
          fatal: () => {}, 
          error: () => {}, 
          warn: () => {}, 
          info: () => {}, 
          debug: () => {}, 
          trace: () => {}, 
          child: () => ({}) 
        }),
        level: 'error'
      }
    });

    // Wait for QR
    return new Promise((resolve) => {
      let qrReceived = false;
      
      const timeout = setTimeout(() => {
        if (!qrReceived) {
          socket.end();
          resolve(NextResponse.json({
            success: false,
            message: 'QR timeout after 10 seconds'
          }));
        }
      }, 10000);

      socket.ev.on('connection.update', async (update: any) => {
        if (update.qr && !qrReceived) {
          qrReceived = true;
          clearTimeout(timeout);
          
          try {
            const QRCode = require('qrcode');
            const qrDataUrl = await QRCode.toDataURL(update.qr, { width: 256 });
            
            socket.end();
            
            // Clean up
            fs.rmSync(authDir, { recursive: true, force: true });
            
            resolve(NextResponse.json({
              success: true,
              qr: {
                raw: update.qr.substring(0, 50) + '...',
                dataUrl: qrDataUrl.substring(0, 100) + '...',
                length: qrDataUrl.length
              }
            }));
          } catch (error: any) {
            socket.end();
            resolve(NextResponse.json({
              success: false,
              error: 'QR conversion failed: ' + error.message
            }));
          }
        }
      });
    });

  } catch (error: any) {
    logger.error('QR test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}