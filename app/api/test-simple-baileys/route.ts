// SIMPLE BAILEYS TEST FOR RAILWAY
// Test basic Baileys connection without all the optimizations

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🧪 [SIMPLE] Starting simple Baileys test...');
    
    // Test 1: Load dependencies
    logger.info('📦 [SIMPLE] Loading Baileys...');
    const baileys = await import('@whiskeysockets/baileys');
    const { makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;
    
    logger.info('📦 [SIMPLE] Loading QRCode...');
    const QRCode = await import('qrcode');
    
    logger.info('✅ [SIMPLE] Dependencies loaded');
    
    // Test 2: Create simple auth state
    const fs = require('fs');
    const path = require('path');
    
    const authDir = path.join('/tmp', 'simple-baileys-test-' + Date.now());
    fs.mkdirSync(authDir, { recursive: true });
    
    logger.info('🔐 [SIMPLE] Creating auth state...', { authDir });
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    // Test 3: Create minimal socket
    logger.info('🔌 [SIMPLE] Creating minimal socket...');
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Simple Test', 'Chrome', '120.0.0']
      // NO OTHER CONFIG - keep it simple
    });
    
    logger.info('✅ [SIMPLE] Socket created, waiting for QR...');
    
    // Test 4: Wait for QR with timeout
    const qrPromise = new Promise((resolve, reject) => {
      let qrReceived = false;
      
      const timeout = setTimeout(() => {
        if (!qrReceived) {
          reject(new Error('QR timeout after 60 seconds'));
        }
      }, 60000);
      
      socket.ev.on('connection.update', async (update) => {
        logger.info('📡 [SIMPLE] Connection update:', {
          connection: update.connection,
          hasQR: !!update.qr,
          qrLength: update.qr?.length
        });
        
        if (update.qr && !qrReceived) {
          qrReceived = true;
          clearTimeout(timeout);
          
          try {
            logger.info('🔲 [SIMPLE] QR received, generating image...');
            const qrDataUrl = await QRCode.toDataURL(update.qr, {
              width: 256,
              margin: 2
            });
            
            resolve({
              success: true,
              qrCode: qrDataUrl,
              qrLength: qrDataUrl.length,
              rawQRLength: update.qr.length
            });
          } catch (qrError) {
            reject(new Error(`QR generation failed: ${qrError.message}`));
          }
        }
        
        if (update.connection === 'close') {
          const reason = (update.lastDisconnect?.error as any)?.output?.statusCode;
          logger.info('🔌 [SIMPLE] Connection closed:', { reason });
          
          if (!qrReceived) {
            reject(new Error(`Connection closed before QR: ${reason}`));
          }
        }
      });
    });
    
    try {
      const result = await qrPromise;
      
      // Cleanup
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.warn('⚠️ [SIMPLE] Cleanup failed:', cleanupError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Simple Baileys test successful!',
        result,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isRailway: !!process.env.RAILWAY_PROJECT_ID,
          nodeVersion: process.version,
          platform: process.platform
        }
      });
      
    } catch (testError) {
      logger.error('❌ [SIMPLE] Test failed:', testError);
      
      // Cleanup on error
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.warn('⚠️ [SIMPLE] Cleanup failed:', cleanupError);
      }
      
      return NextResponse.json({
        success: false,
        error: testError.message,
        step: 'qr_generation'
      }, { status: 500 });
    }
    
  } catch (error) {
    logger.error('💥 [SIMPLE] Simple Baileys test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}