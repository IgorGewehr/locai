import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// RAILWAY DEBUGGING ENDPOINT - PRODUCTION SAFE
export async function GET(request: NextRequest) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Collect Railway environment information
    const diagnostics = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID ? 'SET' : 'NOT_SET',
        PORT: process.env.PORT || 'NOT_SET',
        ENABLE_WHATSAPP_INTEGRATION: process.env.ENABLE_WHATSAPP_INTEGRATION,
        DISABLE_WHATSAPP_WEB: process.env.DISABLE_WHATSAPP_WEB,
        cwd: process.cwd(),
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
      },
      
      directories: {
        sessionsDir: {
          path: path.join(process.cwd(), '.sessions'),
          exists: false,
          writable: false,
          contents: []
        },
        tmpDir: {
          path: '/tmp',
          exists: false,
          writable: false
        }
      },
      
      dependencies: {
        baileys: false,
        qrcode: false,
        firebase: false
      },
      
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    // Test session directory
    try {
      const sessionsPath = path.join(process.cwd(), '.sessions');
      diagnostics.directories.sessionsDir.exists = fs.existsSync(sessionsPath);
      
      if (diagnostics.directories.sessionsDir.exists) {
        try {
          fs.accessSync(sessionsPath, fs.constants.W_OK);
          diagnostics.directories.sessionsDir.writable = true;
          
          const contents = fs.readdirSync(sessionsPath);
          diagnostics.directories.sessionsDir.contents = contents;
        } catch (writeError) {
          logger.warn('Sessions directory not writable:', writeError.message);
        }
      }
    } catch (sessionError) {
      logger.warn('Sessions directory check failed:', sessionError.message);
    }
    
    // Test /tmp directory
    try {
      diagnostics.directories.tmpDir.exists = fs.existsSync('/tmp');
      if (diagnostics.directories.tmpDir.exists) {
        fs.accessSync('/tmp', fs.constants.W_OK);
        diagnostics.directories.tmpDir.writable = true;
      }
    } catch (tmpError) {
      logger.warn('Tmp directory check failed:', tmpError.message);
    }
    
    // Test dependencies (safe loading)
    try {
      await import('@whiskeysockets/baileys');
      diagnostics.dependencies.baileys = true;
    } catch (baileysError) {
      logger.warn('Baileys load test failed:', baileysError.message);
    }
    
    try {
      require('qrcode');
      diagnostics.dependencies.qrcode = true;
    } catch (qrError) {
      logger.warn('QRCode load test failed:', qrError.message);
    }
    
    try {
      await import('@/lib/firebase/admin');
      diagnostics.dependencies.firebase = true;
    } catch (firebaseError) {
      logger.warn('Firebase load test failed:', firebaseError.message);
    }
    
    // Determine readiness
    const isRailway = !!process.env.RAILWAY_PROJECT_ID;
    const isProduction = process.env.NODE_ENV === 'production';
    const hasWriteAccess = diagnostics.directories.sessionsDir.writable || diagnostics.directories.tmpDir.writable;
    const hasDependencies = diagnostics.dependencies.baileys && diagnostics.dependencies.qrcode;
    
    const readiness = {
      railway: isRailway,
      production: isProduction,
      writeAccess: hasWriteAccess,
      dependencies: hasDependencies,
      overall: isRailway && isProduction && hasWriteAccess && hasDependencies
    };
    
    logger.info('🔍 [Railway Debug] Environment check completed', {
      readiness: readiness.overall ? 'READY' : 'NOT_READY',
      railway: isRailway,
      writeAccess: hasWriteAccess,
      dependencies: hasDependencies
    });
    
    return NextResponse.json({
      success: true,
      diagnostics,
      readiness,
      recommendations: readiness.overall 
        ? ['✅ Railway environment is ready for Baileys!', 'Test QR generation through /api/whatsapp/session']
        : [
            !isRailway && '⚠️ RAILWAY_PROJECT_ID not detected - are we running on Railway?',
            !isProduction && '⚠️ NODE_ENV should be "production"',
            !hasWriteAccess && '❌ No write access to session directories',
            !hasDependencies && '❌ Missing critical dependencies'
          ].filter(Boolean)
    });
    
  } catch (error) {
    logger.error('❌ [Railway Debug] Diagnostic error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Diagnostic check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}