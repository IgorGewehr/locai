import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * WhatsApp Debugging Endpoint - Production Safe
 * Diagnoses WhatsApp Baileys integration issues on Railway
 */
export async function GET(request: NextRequest) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID ? 'SET' : 'NOT_SET',
        platform: process.platform,
        nodeVersion: process.version
      },
      tests: {
        dependencies: null as any,
        fileSystem: null as any,
        directories: null as any,
        sessionManager: null as any,
        baileys: null as any
      },
      errors: [] as string[]
    };

    logger.info('🔍 [WhatsApp Debug] Starting diagnostic...');

    // Test 1: Check if Baileys can be imported
    try {
      const baileys = await import('@whiskeysockets/baileys');
      const QRCode = require('qrcode');
      
      diagnostics.tests.dependencies = {
        baileys: !!baileys,
        baileysModules: {
          makeWASocket: typeof baileys.default,
          useMultiFileAuthState: typeof baileys.useMultiFileAuthState,
          DisconnectReason: typeof baileys.DisconnectReason
        },
        qrCode: typeof QRCode
      };
      
      logger.info('✅ [WhatsApp Debug] Dependencies loaded');
    } catch (error) {
      diagnostics.errors.push(`Dependency load failed: ${error.message}`);
      logger.error('❌ [WhatsApp Debug] Dependency load failed', { error: error.message });
    }

    // Test 2: Check file system permissions
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Test Railway directory creation
      let baseDir: string;
      let canWrite = false;
      
      if (process.env.RAILWAY_PROJECT_ID || process.env.NODE_ENV === 'production') {
        const railwayDir = path.join(process.cwd(), '.sessions');
        try {
          fs.mkdirSync(railwayDir, { recursive: true });
          fs.accessSync(railwayDir, fs.constants.W_OK);
          baseDir = railwayDir;
          canWrite = true;
        } catch (railwayError) {
          baseDir = '/tmp/.sessions';
          fs.mkdirSync(baseDir, { recursive: true });
          canWrite = true;
        }
      } else {
        baseDir = path.join(process.cwd(), '.sessions');
        fs.mkdirSync(baseDir, { recursive: true });
        canWrite = true;
      }
      
      // Test directory creation for a sample tenant
      const testDir = path.join(baseDir, 'test-tenant');
      fs.mkdirSync(testDir, { recursive: true });
      
      // Test file write
      const testFile = path.join(testDir, 'test.json');
      fs.writeFileSync(testFile, JSON.stringify({ test: true }));
      
      // Clean up
      fs.unlinkSync(testFile);
      fs.rmdirSync(testDir);
      
      diagnostics.tests.fileSystem = {
        baseDir,
        canWrite,
        testPassed: true
      };
      
      logger.info('✅ [WhatsApp Debug] File system test passed');
    } catch (error) {
      diagnostics.errors.push(`File system test failed: ${error.message}`);
      logger.error('❌ [WhatsApp Debug] File system test failed', { error: error.message });
    }

    // Test 3: Check session directory structure
    try {
      const fs = require('fs');
      const path = require('path');
      
      const possibleDirs = [
        path.join(process.cwd(), '.sessions'),
        '/tmp/.sessions',
        path.join(require('os').homedir(), '.sessions')
      ];
      
      const directoryStatus = possibleDirs.map(dir => {
        try {
          const exists = fs.existsSync(dir);
          let canWrite = false;
          
          if (exists) {
            fs.accessSync(dir, fs.constants.W_OK);
            canWrite = true;
          } else {
            fs.mkdirSync(dir, { recursive: true });
            canWrite = true;
          }
          
          return { path: dir, exists: true, writable: canWrite };
        } catch (error) {
          return { path: dir, exists: false, writable: false, error: error.message };
        }
      });
      
      diagnostics.tests.directories = directoryStatus;
      logger.info('✅ [WhatsApp Debug] Directory structure checked');
    } catch (error) {
      diagnostics.errors.push(`Directory test failed: ${error.message}`);
      logger.error('❌ [WhatsApp Debug] Directory test failed', { error: error.message });
    }

    // Test 4: Try to create session manager
    try {
      const { RobustWhatsAppManager } = await import('@/lib/whatsapp/robust-session-manager');
      const manager = new RobustWhatsAppManager();
      
      // Wait a bit for initialization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      diagnostics.tests.sessionManager = {
        created: true,
        type: typeof manager
      };
      
      logger.info('✅ [WhatsApp Debug] Session manager created');
    } catch (error) {
      diagnostics.errors.push(`Session manager creation failed: ${error.message}`);
      logger.error('❌ [WhatsApp Debug] Session manager creation failed', { error: error.message });
    }

    // Test 5: Try Baileys socket creation (WITHOUT CONNECTING)
    try {
      const baileys = await import('@whiskeysockets/baileys');
      const { default: makeWASocket, useMultiFileAuthState } = baileys;
      const path = require('path');
      
      // Use temporary directory for test
      const testAuthDir = path.join('/tmp', 'test-auth');
      const { state } = await useMultiFileAuthState(testAuthDir);
      
      // Create socket but don't connect
      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Test', 'Chrome', '120.0.0'],
        connectTimeoutMs: 5000,
      });
      
      // Close immediately
      await socket.end();
      
      diagnostics.tests.baileys = {
        socketCreation: true,
        authState: true
      };
      
      logger.info('✅ [WhatsApp Debug] Baileys socket test passed');
    } catch (error) {
      diagnostics.errors.push(`Baileys socket test failed: ${error.message}`);
      logger.error('❌ [WhatsApp Debug] Baileys socket test failed', { error: error.message });
    }

    // Overall assessment
    const hasErrors = diagnostics.errors.length > 0;
    const readiness = {
      dependencies: diagnostics.tests.dependencies?.baileys,
      fileSystem: diagnostics.tests.fileSystem?.canWrite,
      sessionManager: diagnostics.tests.sessionManager?.created,
      baileys: diagnostics.tests.baileys?.socketCreation,
      overall: !hasErrors && diagnostics.tests.dependencies?.baileys && diagnostics.tests.fileSystem?.canWrite
    };

    logger.info('🔍 [WhatsApp Debug] Diagnostic completed', {
      readiness: readiness.overall ? 'READY' : 'NOT_READY',
      errors: diagnostics.errors.length
    });

    return NextResponse.json({
      success: true,
      diagnostics,
      readiness,
      recommendations: readiness.overall 
        ? ['✅ WhatsApp system is ready!', 'Try initializing a session now']
        : [
            !readiness.dependencies && '❌ Baileys dependencies not loading',
            !readiness.fileSystem && '❌ File system permissions issue',
            !readiness.sessionManager && '❌ Session manager creation failed',
            !readiness.baileys && '❌ Baileys socket creation failed',
            hasErrors && `❌ ${diagnostics.errors.length} error(s) detected`
          ].filter(Boolean)
    });

  } catch (error) {
    logger.error('❌ [WhatsApp Debug] Critical diagnostic error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Diagnostic check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}