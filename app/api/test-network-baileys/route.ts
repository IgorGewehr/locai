// NETWORK CONNECTIVITY TEST FOR BAILEYS ON RAILWAY
// Tests different network configurations and settings

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🌐 [NETWORK] Starting network connectivity test...');
    
    const tests = [];
    
    // Test 1: Basic network connectivity
    try {
      logger.info('🔍 [NETWORK] Testing basic internet connectivity...');
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        timeout: 10000 
      });
      tests.push({
        test: 'Basic Internet',
        success: response.ok,
        status: response.status
      });
    } catch (error) {
      tests.push({
        test: 'Basic Internet',
        success: false,
        error: error.message
      });
    }
    
    // Test 2: WhatsApp Web connectivity
    try {
      logger.info('🔍 [NETWORK] Testing WhatsApp Web connectivity...');
      const response = await fetch('https://web.whatsapp.com', { 
        method: 'HEAD',
        timeout: 10000 
      });
      tests.push({
        test: 'WhatsApp Web',
        success: response.ok,
        status: response.status
      });
    } catch (error) {
      tests.push({
        test: 'WhatsApp Web',
        success: false,
        error: error.message
      });
    }
    
    // Test 3: WhatsApp socket endpoints
    try {
      logger.info('🔍 [NETWORK] Testing WhatsApp socket endpoints...');
      const response = await fetch('https://web.whatsapp.com/ws', { 
        method: 'HEAD',
        timeout: 10000 
      });
      tests.push({
        test: 'WhatsApp WebSocket',
        success: response.ok,
        status: response.status
      });
    } catch (error) {
      tests.push({
        test: 'WhatsApp WebSocket',
        success: false,
        error: error.message
      });
    }
    
    // Test 4: Load Baileys and test basic imports
    let baileysInfo = {};
    try {
      logger.info('📦 [NETWORK] Testing Baileys imports...');
      const baileys = await import('@whiskeysockets/baileys');
      
      baileysInfo = {
        hasDefault: !!baileys.default,
        hasMakeWASocket: !!baileys.makeWASocket,
        hasUseMultiFileAuthState: !!baileys.useMultiFileAuthState,
        hasDisconnectReason: !!baileys.DisconnectReason,
        version: baileys.default?.version || 'unknown'
      };
      
      tests.push({
        test: 'Baileys Import',
        success: true,
        info: baileysInfo
      });
    } catch (error) {
      tests.push({
        test: 'Baileys Import',
        success: false,
        error: error.message
      });
    }
    
    // Test 5: Try minimal socket with detailed logging
    let socketTest = {};
    try {
      logger.info('🔌 [NETWORK] Testing minimal socket creation...');
      const baileys = await import('@whiskeysockets/baileys');
      const { makeWASocket, useMultiFileAuthState } = baileys;
      
      const fs = require('fs');
      const path = require('path');
      
      const authDir = path.join('/tmp', 'network-test-' + Date.now());
      fs.mkdirSync(authDir, { recursive: true });
      
      const { state } = await useMultiFileAuthState(authDir);
      
      // Create socket but don't wait for connection
      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Railway Test', 'Chrome', '120.0.0'],
        connectTimeoutMs: 5000, // Short timeout for test
        logger: {
          level: 'debug',
          debug: (...args) => logger.info('[Baileys Debug]', ...args),
          info: (...args) => logger.info('[Baileys Info]', ...args),
          warn: (...args) => logger.warn('[Baileys Warn]', ...args),
          error: (...args) => logger.error('[Baileys Error]', ...args),
          fatal: (...args) => logger.error('[Baileys Fatal]', ...args),
          trace: () => {},
          child: () => this,
        }
      });
      
      // Just test if socket creates without error
      socketTest = {
        created: true,
        hasSocket: !!socket,
        hasEv: !!socket?.ev
      };
      
      // Cleanup immediately
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.warn('⚠️ [NETWORK] Cleanup failed:', cleanupError);
      }
      
      tests.push({
        test: 'Socket Creation',
        success: true,
        info: socketTest
      });
      
    } catch (error) {
      tests.push({
        test: 'Socket Creation',
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
    
    // Test 6: Environment info
    const envInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV,
      isRailway: !!process.env.RAILWAY_PROJECT_ID,
      railwayId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8) || 'none',
      hasTimeout: typeof setTimeout !== 'undefined',
      hasWebSocket: typeof WebSocket !== 'undefined',
      hasBuffer: typeof Buffer !== 'undefined',
      hasProcess: typeof process !== 'undefined',
      cwd: process.cwd(),
      tmpdir: require('os').tmpdir()
    };
    
    tests.push({
      test: 'Environment',
      success: true,
      info: envInfo
    });
    
    return NextResponse.json({
      success: true,
      message: 'Network connectivity test completed',
      tests,
      summary: {
        totalTests: tests.length,
        passedTests: tests.filter(t => t.success).length,
        failedTests: tests.filter(t => !t.success).length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('💥 [NETWORK] Network test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}