import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// EMERGENCY DEBUG ENDPOINT - Generate a Mock QR for Production Testing
export async function GET(request: NextRequest) {
  try {
    logger.info('🔧 DEBUG: Emergency QR generation endpoint called');

    // Create a mock QR code for testing
    const QRCode = require('qrcode');
    const mockQRData = 'test-qr-' + Date.now();
    
    const qrDataUrl = await QRCode.toDataURL(mockQRData, {
      type: 'image/png',
      quality: 1.0,
      margin: 4,
      width: 512,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      scale: 8,
      rendererOpts: {
        quality: 1.0
      }
    });

    logger.info('✅ DEBUG: Mock QR generated successfully');

    return NextResponse.json({
      success: true,
      debug: true,
      data: {
        connected: false,
        status: 'qr',
        phoneNumber: null,
        businessName: null,
        qrCode: qrDataUrl,
        message: 'DEBUG: Mock QR generated for testing'
      }
    });

  } catch (error) {
    logger.error('❌ DEBUG: Mock QR generation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Debug QR generation failed',
      data: {
        connected: false,
        status: 'error',
        qrCode: null,
        phoneNumber: null,
        businessName: null,
        message: error.message
      }
    });
  }
}

// POST endpoint to test Baileys initialization step by step
export async function POST(request: NextRequest) {
  try {
    logger.info('🔧 DEBUG: Testing Baileys initialization step by step');

    const steps = [];
    
    // Step 1: Test basic imports
    try {
      const baileys = await import('@whiskeysockets/baileys');
      steps.push({ step: 'baileys_import', success: true, message: 'Baileys imported successfully' });
      logger.info('✅ Step 1: Baileys import successful');
    } catch (error) {
      steps.push({ step: 'baileys_import', success: false, message: error.message });
      logger.error('❌ Step 1: Baileys import failed:', error);
    }

    // Step 2: Test QRCode import
    try {
      const QRCode = require('qrcode');
      steps.push({ step: 'qrcode_import', success: true, message: 'QRCode library imported successfully' });
      logger.info('✅ Step 2: QRCode import successful');
    } catch (error) {
      steps.push({ step: 'qrcode_import', success: false, message: error.message });
      logger.error('❌ Step 2: QRCode import failed:', error);
    }

    // Step 3: Test directory creation
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const testDir = path.join(os.tmpdir(), 'whatsapp-test-' + Date.now());
      fs.mkdirSync(testDir, { recursive: true, mode: 0o755 });
      
      steps.push({ step: 'directory_creation', success: true, message: `Directory created at ${testDir}` });
      logger.info('✅ Step 3: Directory creation successful');
      
      // Cleanup
      fs.rmSync(testDir, { recursive: true });
    } catch (error) {
      steps.push({ step: 'directory_creation', success: false, message: error.message });
      logger.error('❌ Step 3: Directory creation failed:', error);
    }

    // Step 4: Test minimal socket creation (without auth)
    try {
      const { default: makeWASocket } = await import('@whiskeysockets/baileys');
      
      // Try to create a minimal socket just to test if it works
      const testSocket = makeWASocket({
        printQRInTerminal: false,
        browser: ['LocAI Test', 'Chrome', '120.0.0'],
        connectTimeoutMs: 5000, // Short timeout for test
        logger: {
          fatal: () => {},
          error: () => {},
          warn: () => {},
          info: () => {},
          debug: () => {},
          trace: () => {},
          child: () => ({ fatal: () => {}, error: () => {}, warn: () => {}, info: () => {}, debug: () => {}, trace: () => {}, child: () => {} }),
          level: 'info'
        }
      });
      
      steps.push({ step: 'socket_creation', success: true, message: 'Minimal socket created successfully' });
      logger.info('✅ Step 4: Socket creation successful');
      
      // Close socket immediately
      if (testSocket && typeof testSocket.end === 'function') {
        testSocket.end();
      }
      
    } catch (error) {
      steps.push({ step: 'socket_creation', success: false, message: error.message });
      logger.error('❌ Step 4: Socket creation failed:', error);
    }

    return NextResponse.json({
      success: true,
      debug: true,
      steps: steps,
      summary: {
        total: steps.length,
        successful: steps.filter(s => s.success).length,
        failed: steps.filter(s => !s.success).length
      }
    });

  } catch (error) {
    logger.error('❌ DEBUG: Step-by-step test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Debug test failed',
      message: error.message
    });
  }
}