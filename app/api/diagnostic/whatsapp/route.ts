// DIAGNOSTIC ENDPOINT FOR PRODUCTION WHATSAPP QR DEBUGGING
// Access via: GET /api/diagnostic/whatsapp
// This endpoint helps debug QR generation issues in production

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/utils/auth';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🔍 [DIAGNOSTIC] WhatsApp diagnostic endpoint called');

    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
    // Diagnostic information
    const diagnostics = {
      timestamp: new Date().toISOString(),
      tenantId: tenantId?.substring(0, 8) + '***',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        railwayProjectId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8) + '***',
        cwd: process.cwd(),
        tmpDir: '/tmp'
      },
      packages: {
        baileys: null,
        qrcode: null
      },
      tests: {
        baileysImport: false,
        qrcodeImport: false,
        qrGeneration: false,
        fileSystem: false
      },
      errors: []
    };

    // Test 1: Baileys Import
    try {
      logger.info('🧪 [DIAGNOSTIC] Testing Baileys import...');
      const baileys = await import('@whiskeysockets/baileys');
      diagnostics.packages.baileys = {
        hasDefault: !!baileys.default,
        hasMakeWASocket: !!baileys.makeWASocket,
        hasUseMultiFileAuthState: !!baileys.useMultiFileAuthState,
        hasDisconnectReason: !!baileys.DisconnectReason,
        importType: typeof baileys
      };
      diagnostics.tests.baileysImport = true;
      logger.info('✅ [DIAGNOSTIC] Baileys import successful');
    } catch (error) {
      logger.error('❌ [DIAGNOSTIC] Baileys import failed:', error);
      diagnostics.errors.push(`Baileys import: ${error.message}`);
    }

    // Test 2: QRCode Import
    try {
      logger.info('🧪 [DIAGNOSTIC] Testing QRCode import...');
      const QRCode = require('qrcode');
      diagnostics.packages.qrcode = {
        hasToDataURL: !!QRCode.toDataURL,
        hasToString: !!QRCode.toString,
        hasToCanvas: !!QRCode.toCanvas,
        type: typeof QRCode
      };
      diagnostics.tests.qrcodeImport = true;
      logger.info('✅ [DIAGNOSTIC] QRCode import successful');
      
      // Test 3: QR Generation
      try {
        logger.info('🧪 [DIAGNOSTIC] Testing QR generation...');
        const testQR = await QRCode.toDataURL('diagnostic-test-qr-code', {
          width: 256,
          margin: 4,
          errorCorrectionLevel: 'M'
        });
        
        diagnostics.tests.qrGeneration = {
          success: true,
          qrLength: testQR?.length || 0,
          qrPrefix: testQR?.substring(0, 50) || '',
          isDataUrl: testQR?.startsWith('data:image/png') || false
        };
        logger.info('✅ [DIAGNOSTIC] QR generation successful');
      } catch (qrError) {
        logger.error('❌ [DIAGNOSTIC] QR generation failed:', qrError);
        diagnostics.errors.push(`QR generation: ${qrError.message}`);
        diagnostics.tests.qrGeneration = { success: false, error: qrError.message };
      }
      
    } catch (error) {
      logger.error('❌ [DIAGNOSTIC] QRCode import failed:', error);
      diagnostics.errors.push(`QRCode import: ${error.message}`);
    }

    // Test 4: File System
    try {
      logger.info('🧪 [DIAGNOSTIC] Testing file system access...');
      const fs = require('fs');
      const path = require('path');
      
      const testDir = path.join('/tmp', '.diagnostic-test');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'diagnostic test');
      const testContent = fs.readFileSync(path.join(testDir, 'test.txt'), 'utf8');
      fs.rmSync(testDir, { recursive: true, force: true });
      
      diagnostics.tests.fileSystem = {
        success: true,
        canWrite: testContent === 'diagnostic test',
        testDir,
        cwdWritable: true
      };
      logger.info('✅ [DIAGNOSTIC] File system test successful');
    } catch (fsError) {
      logger.error('❌ [DIAGNOSTIC] File system test failed:', fsError);
      diagnostics.errors.push(`File system: ${fsError.message}`);
      diagnostics.tests.fileSystem = { success: false, error: fsError.message };
    }

    // Test 5: Session Manager Load
    try {
      logger.info('🧪 [DIAGNOSTIC] Testing session manager load...');
      const { strategicSessionManager } = await import('@/lib/whatsapp/strategic-session-manager');
      
      diagnostics.tests.sessionManagerLoad = {
        success: true,
        hasManager: !!strategicSessionManager,
        managerType: typeof strategicSessionManager
      };
      logger.info('✅ [DIAGNOSTIC] Session manager load successful');
    } catch (smError) {
      logger.error('❌ [DIAGNOSTIC] Session manager load failed:', smError);
      diagnostics.errors.push(`Session manager: ${smError.message}`);
      diagnostics.tests.sessionManagerLoad = { success: false, error: smError.message };
    }

    logger.info('🎯 [DIAGNOSTIC] All tests completed', {
      totalErrors: diagnostics.errors.length,
      successfulTests: Object.values(diagnostics.tests).filter(t => t === true || (typeof t === 'object' && t.success)).length
    });

    return NextResponse.json({
      success: true,
      diagnostics,
      summary: {
        allTestsPassed: diagnostics.errors.length === 0,
        criticalIssues: diagnostics.errors.filter(e => 
          e.includes('Baileys') || e.includes('QRCode') || e.includes('generation')
        ),
        recommendations: generateRecommendations(diagnostics)
      }
    });

  } catch (error) {
    logger.error('💥 [DIAGNOSTIC] Diagnostic endpoint failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Diagnostic failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

function generateRecommendations(diagnostics: any): string[] {
  const recommendations = [];

  if (!diagnostics.tests.baileysImport) {
    recommendations.push('Reinstall @whiskeysockets/baileys package');
  }

  if (!diagnostics.tests.qrcodeImport) {
    recommendations.push('Reinstall qrcode package');
  }

  if (diagnostics.tests.qrGeneration && !diagnostics.tests.qrGeneration.success) {
    recommendations.push('Check QRCode library configuration and Canvas dependencies');
  }

  if (!diagnostics.tests.fileSystem || !diagnostics.tests.fileSystem.success) {
    recommendations.push('Check file system permissions and available disk space');
  }

  if (diagnostics.environment.isRailway && diagnostics.errors.length > 0) {
    recommendations.push('Consider Railway-specific fixes for Node.js modules');
  }

  if (recommendations.length === 0) {
    recommendations.push('All core components appear functional - check specific session flow');
  }

  return recommendations;
}

// POST method for testing specific scenarios
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const tenantId = user.tenantId || user.uid;

    logger.info('🧪 [DIAGNOSTIC POST] Running specific test scenario');

    // Test full session initialization flow
    if (body.test === 'full-session-init') {
      try {
        const { strategicSessionManager } = await import('@/lib/whatsapp/strategic-session-manager');
        
        // Just test the initialization without actually connecting
        const manager = strategicSessionManager;
        const status = await manager.getSessionStatus(tenantId);
        
        return NextResponse.json({
          success: true,
          test: 'full-session-init',
          status,
          message: 'Session manager is functional'
        });
        
      } catch (error) {
        return NextResponse.json({
          success: false,
          test: 'full-session-init',
          error: error.message,
          message: 'Session initialization test failed'
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown test type',
      availableTests: ['full-session-init']
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Diagnostic POST failed',
      message: error.message
    }, { status: 500 });
  }
}