// PUBLIC DIAGNOSTIC ENDPOINT FOR WHATSAPP TROUBLESHOOTING
// Access via: GET https://www.alugazap.com/api/public/whatsapp-diagnostic
// No authentication required - safe for production debugging

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🔍 [PUBLIC DIAGNOSTIC] WhatsApp diagnostic endpoint called from production');

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV,
        cwd: process.cwd(),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      packages: {
        baileys: null,
        qrcode: null
      },
      tests: {
        baileysImport: false,
        qrcodeImport: false,
        qrGeneration: false,
        fileSystem: false,
        authSystem: false
      },
      errors: []
    };

    // Test 1: Baileys Import (Railway Production Test)
    try {
      logger.info('🧪 [PUBLIC] Testing Baileys import in Railway...');
      
      const importStrategies = [
        () => import('@whiskeysockets/baileys'),
        () => require('@whiskeysockets/baileys')
      ];
      
      let baileysModule = null;
      for (let i = 0; i < importStrategies.length; i++) {
        try {
          baileysModule = await importStrategies[i]();
          if (baileysModule) break;
        } catch (strategyError) {
          diagnostics.errors.push(`Baileys strategy ${i + 1}: ${strategyError.message}`);
        }
      }
      
      if (baileysModule) {
        diagnostics.packages.baileys = {
          hasDefault: !!baileysModule.default,
          hasMakeWASocket: !!(baileysModule.makeWASocket || baileysModule.default?.makeWASocket),
          hasUseMultiFileAuthState: !!(baileysModule.useMultiFileAuthState || baileysModule.default?.useMultiFileAuthState),
          hasDisconnectReason: !!(baileysModule.DisconnectReason || baileysModule.default?.DisconnectReason),
          importType: typeof baileysModule,
          keysAvailable: Object.keys(baileysModule || {}).length
        };
        diagnostics.tests.baileysImport = true;
        logger.info('✅ [PUBLIC] Baileys import successful in Railway');
      }
    } catch (error) {
      logger.error('❌ [PUBLIC] Baileys import failed in Railway:', error);
      diagnostics.errors.push(`Baileys critical: ${error.message}`);
    }

    // Test 2: QRCode Import (Railway Production Test)
    try {
      logger.info('🧪 [PUBLIC] Testing QRCode import in Railway...');
      
      const qrStrategies = [
        () => require('qrcode'),
        () => import('qrcode').then(m => m.default || m)
      ];
      
      let QRCode = null;
      for (let i = 0; i < qrStrategies.length; i++) {
        try {
          QRCode = await qrStrategies[i]();
          if (QRCode && typeof QRCode.toDataURL === 'function') break;
        } catch (strategyError) {
          diagnostics.errors.push(`QRCode strategy ${i + 1}: ${strategyError.message}`);
        }
      }
      
      if (QRCode) {
        diagnostics.packages.qrcode = {
          hasToDataURL: !!QRCode.toDataURL,
          hasToString: !!QRCode.toString,
          hasToCanvas: !!QRCode.toCanvas,
          type: typeof QRCode,
          functionsAvailable: Object.keys(QRCode).filter(key => typeof QRCode[key] === 'function').length
        };
        diagnostics.tests.qrcodeImport = true;
        logger.info('✅ [PUBLIC] QRCode import successful in Railway');
        
        // Test 3: QR Generation in Railway Production
        try {
          logger.info('🧪 [PUBLIC] Testing QR generation in Railway production...');
          
          const testConfigs = [
            { width: 256, margin: 4, errorCorrectionLevel: 'M' },
            { width: 128, margin: 2 },
            {}
          ];
          
          for (let configIndex = 0; configIndex < testConfigs.length; configIndex++) {
            try {
              const testData = `railway-production-test-${Date.now()}`;
              const testQR = await Promise.race([
                QRCode.toDataURL(testData, testConfigs[configIndex]),
                new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('QR generation timeout')), 10000);
                })
              ]);
              
              if (testQR && testQR.length > 100 && testQR.startsWith('data:image')) {
                diagnostics.tests.qrGeneration = {
                  success: true,
                  config: configIndex + 1,
                  qrLength: testQR.length,
                  qrPrefix: testQR.substring(0, 50),
                  isValidDataUrl: testQR.startsWith('data:image/png;base64,'),
                  generationTime: 'under 10s'
                };
                logger.info('✅ [PUBLIC] QR generation successful in Railway production');
                break;
              }
            } catch (configError) {
              diagnostics.errors.push(`QR config ${configIndex + 1}: ${configError.message}`);
            }
          }
          
          if (!diagnostics.tests.qrGeneration) {
            diagnostics.tests.qrGeneration = { success: false, error: 'All QR configs failed' };
          }
          
        } catch (qrError) {
          diagnostics.errors.push(`QR generation critical: ${qrError.message}`);
          diagnostics.tests.qrGeneration = { success: false, error: qrError.message };
        }
      }
    } catch (error) {
      logger.error('❌ [PUBLIC] QRCode import failed in Railway:', error);
      diagnostics.errors.push(`QRCode critical: ${error.message}`);
    }

    // Test 4: File System (Railway Production Test)
    try {
      logger.info('🧪 [PUBLIC] Testing file system in Railway production...');
      const fs = require('fs');
      const path = require('path');
      
      const testDirs = [
        // Railway volume mount
        process.env.RAILWAY_VOLUME_MOUNT_PATH ? 
          path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, '.diagnostic-test') : null,
        // Project directory
        path.join(process.cwd(), '.diagnostic-test'),
        // /tmp fallback
        path.join('/tmp', '.diagnostic-test')
      ].filter(Boolean);
      
      let workingDir = null;
      for (const testDir of testDirs) {
        try {
          fs.mkdirSync(testDir, { recursive: true, mode: 0o755 });
          fs.writeFileSync(path.join(testDir, 'test.txt'), 'railway-diagnostic');
          const testContent = fs.readFileSync(path.join(testDir, 'test.txt'), 'utf8');
          fs.rmSync(testDir, { recursive: true, force: true });
          
          if (testContent === 'railway-diagnostic') {
            workingDir = testDir;
            break;
          }
        } catch (dirError) {
          diagnostics.errors.push(`File system ${testDir}: ${dirError.message}`);
        }
      }
      
      diagnostics.tests.fileSystem = {
        success: !!workingDir,
        workingDirectory: workingDir,
        testedDirectories: testDirs.length,
        hasRailwayVolume: !!process.env.RAILWAY_VOLUME_MOUNT_PATH,
        volumePath: process.env.RAILWAY_VOLUME_MOUNT_PATH || 'not available'
      };
      
      if (workingDir) {
        logger.info('✅ [PUBLIC] File system test successful in Railway');
      }
      
    } catch (fsError) {
      logger.error('❌ [PUBLIC] File system test failed in Railway:', fsError);
      diagnostics.errors.push(`File system critical: ${fsError.message}`);
      diagnostics.tests.fileSystem = { success: false, error: fsError.message };
    }

    // Test 5: Session Manager Load
    try {
      logger.info('🧪 [PUBLIC] Testing session manager load in Railway...');
      
      // Test session manager in production
      if (process.env.NODE_ENV === 'production') {
        const { RobustWhatsAppManager } = await import('@/lib/whatsapp/robust-session-manager');
        const sessionManager = new RobustWhatsAppManager();
        diagnostics.tests.sessionManagerLoad = {
          success: true,
          manager: 'robust-whatsapp',
          hasManager: !!sessionManager,
          managerType: typeof sessionManager
        };
        logger.info('✅ [PUBLIC] Session manager load successful');
      } else {
        const { RobustWhatsAppManager } = await import('@/lib/whatsapp/robust-session-manager');
        const devSessionManager = new RobustWhatsAppManager();
        diagnostics.tests.sessionManagerLoad = {
          success: true,
          manager: 'robust-whatsapp',
          hasManager: !!devSessionManager,
          managerType: typeof devSessionManager
        };
        logger.info('✅ [PUBLIC] Session manager load successful');
      }
      
    } catch (smError) {
      logger.error('❌ [PUBLIC] Session manager load failed in Railway:', smError);
      diagnostics.errors.push(`Session manager: ${smError.message}`);
      diagnostics.tests.sessionManagerLoad = { success: false, error: smError.message };
    }

    // Test 6: Authentication System
    try {
      logger.info('🧪 [PUBLIC] Testing auth system...');
      const { verifyAuth } = await import('@/lib/utils/auth');
      
      diagnostics.tests.authSystem = {
        success: true,
        hasVerifyAuth: typeof verifyAuth === 'function',
        firebaseConfigured: !!process.env.FIREBASE_PROJECT_ID
      };
      logger.info('✅ [PUBLIC] Auth system test successful');
    } catch (authError) {
      logger.error('❌ [PUBLIC] Auth system test failed:', authError);
      diagnostics.errors.push(`Auth system: ${authError.message}`);
      diagnostics.tests.authSystem = { success: false, error: authError.message };
    }

    const summary = {
      allTestsPassed: diagnostics.errors.length === 0,
      criticalIssues: diagnostics.errors.filter(e => e.includes('critical')),
      totalTests: Object.keys(diagnostics.tests).length,
      passedTests: Object.values(diagnostics.tests).filter(test => 
        test === true || (typeof test === 'object' && test.success)
      ).length,
      recommendations: generateRailwayRecommendations(diagnostics)
    };

    logger.info('🎯 [PUBLIC] Railway diagnostic completed', {
      totalErrors: diagnostics.errors.length,
      successfulTests: summary.passedTests,
      criticalIssues: summary.criticalIssues.length
    });

    return NextResponse.json({
      success: true,
      message: 'Railway WhatsApp Production Diagnostic Complete',
      diagnostics,
      summary
    });

  } catch (error) {
    logger.error('💥 [PUBLIC] Public diagnostic endpoint failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Public diagnostic failed',
      message: error.message,
      isRailway: !!process.env.RAILWAY_PROJECT_ID,
      environment: process.env.NODE_ENV
    }, { status: 500 });
  }
}

function generateRailwayRecommendations(diagnostics: any): string[] {
  const recommendations = [];

  if (!diagnostics.tests.baileysImport) {
    recommendations.push('CRITICAL: Baileys package not loading in Railway - check node_modules and package installation');
  }

  if (!diagnostics.tests.qrcodeImport) {
    recommendations.push('CRITICAL: QRCode package not loading in Railway - check Canvas dependencies');
  }

  if (diagnostics.tests.qrGeneration && !diagnostics.tests.qrGeneration.success) {
    recommendations.push('CRITICAL: QR generation failing - check Canvas/Cairo dependencies in Railway');
  }

  if (!diagnostics.tests.fileSystem || !diagnostics.tests.fileSystem.success) {
    recommendations.push('WARNING: File system issues - check Railway volume mounts and permissions');
  }

  if (!diagnostics.tests.authSystem || !diagnostics.tests.authSystem.success) {
    recommendations.push('WARNING: Authentication system issues - check Firebase configuration');
  }

  if (diagnostics.environment.isRailway && diagnostics.errors.length > 0) {
    recommendations.push('Railway specific: Consider adding build dependencies: canvas, cairo, pango');
  }

  if (diagnostics.environment.isRailway && !diagnostics.environment.hasVolume) {
    recommendations.push('Railway optimization: Enable volume mount for persistent WhatsApp sessions');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All core systems functional - WhatsApp should work correctly');
  }

  return recommendations;
}