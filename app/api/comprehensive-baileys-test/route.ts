// COMPREHENSIVE BAILEYS TEST API
// Complete test with detailed logging for Railway vs Local comparison

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

interface TestLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

class TestLogger {
  private logs: TestLog[] = [];
  
  info(message: string, data?: any) {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'info' as const,
      message,
      data
    };
    this.logs.push(log);
    logger.info(`[COMP-TEST] ${message}`, data);
    console.log(`[COMP-TEST] ${message}`, data);
  }
  
  warn(message: string, data?: any) {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'warn' as const,
      message,
      data
    };
    this.logs.push(log);
    logger.warn(`[COMP-TEST] ${message}`, data);
    console.warn(`[COMP-TEST] ${message}`, data);
  }
  
  error(message: string, data?: any) {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'error' as const,
      message,
      data
    };
    this.logs.push(log);
    logger.error(`[COMP-TEST] ${message}`, data);
    console.error(`[COMP-TEST] ${message}`, data);
  }
  
  debug(message: string, data?: any) {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'debug' as const,
      message,
      data
    };
    this.logs.push(log);
    logger.info(`[COMP-TEST DEBUG] ${message}`, data);
    console.log(`[COMP-TEST DEBUG] ${message}`, data);
  }
  
  getLogs() {
    return this.logs;
  }
  
  clear() {
    this.logs = [];
  }
}

export async function POST(request: NextRequest) {
  const testLogger = new TestLogger();
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { testType = 'full', timeout = 120000 } = body; // 2 minutes default
    
    testLogger.info('🧪 COMPREHENSIVE BAILEYS TEST STARTED', {
      testType,
      timeout,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        railwayId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
        tmpdir: require('os').tmpdir(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    });
    
    // Step 1: Environment & Dependency Tests
    testLogger.info('📋 Step 1: Environment & Dependencies');
    
    const envTests = await runEnvironmentTests(testLogger);
    if (!envTests.success) {
      return createTestResponse(false, 'Environment tests failed', testLogger, startTime);
    }
    
    // Step 2: Network Connectivity Tests
    testLogger.info('🌐 Step 2: Network Connectivity');
    
    const networkTests = await runNetworkTests(testLogger);
    
    // Step 3: Baileys Import & Validation Tests
    testLogger.info('📦 Step 3: Baileys Import & Validation');
    
    const importTests = await runImportTests(testLogger);
    if (!importTests.success) {
      return createTestResponse(false, 'Import tests failed', testLogger, startTime);
    }
    
    // Step 4: QRCode Library Tests
    testLogger.info('🔲 Step 4: QRCode Library Tests');
    
    const qrTests = await runQRCodeTests(testLogger);
    if (!qrTests.success) {
      return createTestResponse(false, 'QRCode tests failed', testLogger, startTime);
    }
    
    // Step 5: File System & Auth State Tests
    testLogger.info('💾 Step 5: File System & Auth State');
    
    const fsTests = await runFileSystemTests(testLogger);
    if (!fsTests.success) {
      return createTestResponse(false, 'File system tests failed', testLogger, startTime);
    }
    
    // Step 6: Baileys Socket Creation & Connection Test
    testLogger.info('🔌 Step 6: Baileys Socket Creation & Connection');
    
    const socketTests = await runSocketTests(testLogger, timeout);
    
    return createTestResponse(
      socketTests.success, 
      socketTests.success ? 'All tests completed successfully' : 'Socket tests failed',
      testLogger, 
      startTime,
      {
        envTests,
        networkTests,
        importTests,
        qrTests,
        fsTests,
        socketTests
      }
    );
    
  } catch (error) {
    testLogger.error('💥 COMPREHENSIVE TEST FAILED', {
      error: error.message,
      stack: error.stack
    });
    
    return createTestResponse(false, 'Test execution failed', testLogger, startTime);
  }
}

async function runEnvironmentTests(testLogger: TestLogger) {
  try {
    testLogger.debug('Checking Node.js environment...');
    
    const env = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV,
      isRailway: !!process.env.RAILWAY_PROJECT_ID,
      hasWebSocket: typeof WebSocket !== 'undefined',
      hasBuffer: typeof Buffer !== 'undefined',
      hasSetTimeout: typeof setTimeout !== 'undefined',
      hasRequire: typeof require !== 'undefined',
      hasProcess: typeof process !== 'undefined',
      hasGlobal: typeof global !== 'undefined',
      cwd: process.cwd(),
      execPath: process.execPath,
      argv: process.argv,
      env_keys: Object.keys(process.env).filter(k => k.startsWith('RAILWAY') || k.startsWith('NODE')),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime()
    };
    
    testLogger.info('✅ Environment check completed', env);
    
    return { success: true, data: env };
  } catch (error) {
    testLogger.error('❌ Environment check failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

async function runNetworkTests(testLogger: TestLogger) {
  const tests = [];
  
  // Test basic internet
  try {
    testLogger.debug('Testing basic internet connectivity...');
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    });
    tests.push({
      name: 'Basic Internet',
      success: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    });
    testLogger.info('✅ Basic internet: OK');
  } catch (error) {
    tests.push({
      name: 'Basic Internet',
      success: false,
      error: error.message
    });
    testLogger.warn('⚠️ Basic internet failed', { error: error.message });
  }
  
  // Test WhatsApp Web
  try {
    testLogger.debug('Testing WhatsApp Web connectivity...');
    const response = await fetch('https://web.whatsapp.com', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    });
    tests.push({
      name: 'WhatsApp Web',
      success: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    });
    testLogger.info('✅ WhatsApp Web: OK');
  } catch (error) {
    tests.push({
      name: 'WhatsApp Web',
      success: false,
      error: error.message
    });
    testLogger.warn('⚠️ WhatsApp Web failed', { error: error.message });
  }
  
  // Test DNS resolution
  try {
    testLogger.debug('Testing DNS resolution...');
    const dns = require('dns').promises;
    const addresses = await dns.resolve4('web.whatsapp.com');
    tests.push({
      name: 'DNS Resolution',
      success: true,
      addresses
    });
    testLogger.info('✅ DNS resolution: OK', { addresses });
  } catch (error) {
    tests.push({
      name: 'DNS Resolution',
      success: false,
      error: error.message
    });
    testLogger.warn('⚠️ DNS resolution failed', { error: error.message });
  }
  
  return { success: true, tests };
}

async function runImportTests(testLogger: TestLogger) {
  try {
    testLogger.debug('Testing Baileys import...');
    
    const baileys = await import('@whiskeysockets/baileys');
    
    const validation = {
      hasDefault: !!baileys.default,
      hasMakeWASocket: !!baileys.makeWASocket,
      hasUseMultiFileAuthState: !!baileys.useMultiFileAuthState,
      hasDisconnectReason: !!baileys.DisconnectReason,
      hasConnectionState: !!baileys.ConnectionState,
      exports: Object.keys(baileys).sort()
    };
    
    testLogger.info('✅ Baileys import successful', validation);
    
    // Test function types
    const types = {
      makeWASocket: typeof baileys.makeWASocket,
      useMultiFileAuthState: typeof baileys.useMultiFileAuthState,
      DisconnectReason: typeof baileys.DisconnectReason
    };
    
    testLogger.debug('Function types check', types);
    
    const requiredFunctions = ['makeWASocket', 'useMultiFileAuthState', 'DisconnectReason'];
    const missingFunctions = requiredFunctions.filter(fn => !baileys[fn]);
    
    if (missingFunctions.length > 0) {
      throw new Error(`Missing required Baileys functions: ${missingFunctions.join(', ')}`);
    }
    
    return { success: true, data: { validation, types } };
  } catch (error) {
    testLogger.error('❌ Baileys import failed', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
}

async function runQRCodeTests(testLogger: TestLogger) {
  try {
    testLogger.debug('Testing QRCode import...');
    
    const QRCode = await import('qrcode');
    
    const validation = {
      hasDefault: !!QRCode.default,
      hasToDataURL: !!QRCode.toDataURL,
      hasToString: !!QRCode.toString,
      hasToCanvas: !!QRCode.toCanvas,
      exports: Object.keys(QRCode).sort()
    };
    
    testLogger.info('✅ QRCode import successful', validation);
    
    // Test QR generation
    testLogger.debug('Testing QR code generation...');
    
    const testData = `test-qr-${Date.now()}`;
    const configs = [
      { width: 256, margin: 2 },
      { width: 512, margin: 4, errorCorrectionLevel: 'H' },
      { type: 'image/png', quality: 1.0 }
    ];
    
    const qrTests = [];
    for (let i = 0; i < configs.length; i++) {
      try {
        const qrDataUrl = await QRCode.toDataURL(testData, configs[i]);
        qrTests.push({
          config: configs[i],
          success: true,
          length: qrDataUrl.length,
          prefix: qrDataUrl.substring(0, 30)
        });
        testLogger.debug(`✅ QR test config ${i + 1}: OK`);
      } catch (qrError) {
        qrTests.push({
          config: configs[i],
          success: false,
          error: qrError.message
        });
        testLogger.warn(`⚠️ QR test config ${i + 1}: Failed`, { error: qrError.message });
      }
    }
    
    return { success: true, data: { validation, qrTests } };
  } catch (error) {
    testLogger.error('❌ QRCode tests failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

async function runFileSystemTests(testLogger: TestLogger) {
  try {
    testLogger.debug('Testing file system access...');
    
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Test temp directory
    const tempDir = os.tmpdir();
    testLogger.debug('Temp directory', { tempDir });
    
    // Test directory creation
    const testDir = path.join(tempDir, `baileys-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    testLogger.debug('✅ Directory creation: OK', { testDir });
    
    // Test file write/read
    const testFile = path.join(testDir, 'test.json');
    const testData = { test: true, timestamp: Date.now() };
    fs.writeFileSync(testFile, JSON.stringify(testData));
    const readData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    testLogger.debug('✅ File write/read: OK', { testData, readData });
    
    // Test Baileys auth state directory structure
    const baileys = await import('@whiskeysockets/baileys');
    const { useMultiFileAuthState } = baileys;
    
    const authDir = path.join(testDir, 'auth-state');
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    testLogger.debug('✅ Auth state creation: OK', { 
      authDir,
      hasState: !!state,
      hasSaveCreds: typeof saveCreds === 'function',
      stateKeys: Object.keys(state || {})
    });
    
    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
    testLogger.debug('✅ Cleanup: OK');
    
    return { 
      success: true, 
      data: { 
        tempDir, 
        testDir, 
        authStateSupport: true 
      } 
    };
  } catch (error) {
    testLogger.error('❌ File system tests failed', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
}

async function runSocketTests(testLogger: TestLogger, timeout: number) {
  try {
    testLogger.info('🔌 Starting socket creation and connection test...');
    
    const baileys = await import('@whiskeysockets/baileys');
    const { makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;
    const QRCode = await import('qrcode');
    
    // Setup auth state
    const fs = require('fs');
    const path = require('path');
    const authDir = path.join(require('os').tmpdir(), `socket-test-${Date.now()}`);
    fs.mkdirSync(authDir, { recursive: true });
    
    testLogger.debug('Auth directory created', { authDir });
    
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    testLogger.debug('Auth state created');
    
    // Create detailed Baileys logger
    const baileysLogger = {
      level: 'trace',
      fatal: (...args: any[]) => testLogger.error('🚨 Baileys FATAL', args),
      error: (...args: any[]) => testLogger.error('❌ Baileys ERROR', args),
      warn: (...args: any[]) => testLogger.warn('⚠️ Baileys WARN', args),
      info: (...args: any[]) => testLogger.info('ℹ️ Baileys INFO', args),
      debug: (...args: any[]) => testLogger.debug('🐛 Baileys DEBUG', args),
      trace: (...args: any[]) => testLogger.debug('🔍 Baileys TRACE', args),
      child: () => baileysLogger
    };
    
    // Create socket with comprehensive config
    testLogger.info('Creating WhatsApp socket...');
    
    const socketConfig = {
      auth: state,
      printQRInTerminal: false,
      browser: ['CompTest', 'Chrome', '120.0.6099.109'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 30000,
      keepAliveIntervalMs: 25000,
      qrTimeout: timeout,
      retryRequestDelayMs: 1000,
      maxMsgRetryCount: 3,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      logger: baileysLogger
    };
    
    testLogger.debug('Socket config', socketConfig);
    
    const socket = makeWASocket(socketConfig);
    testLogger.info('✅ Socket created successfully');
    
    // Promise to handle socket events
    const socketPromise = new Promise((resolve, reject) => {
      const events: any[] = [];
      let qrReceived = false;
      let connected = false;
      
      const timeoutId = setTimeout(() => {
        if (!qrReceived && !connected) {
          testLogger.warn(`⏰ Socket test timeout after ${timeout}ms`);
          resolve({
            success: false,
            reason: 'timeout',
            events,
            duration: timeout
          });
        }
      }, timeout);
      
      socket.ev.on('connection.update', async (update) => {
        const timestamp = new Date().toISOString();
        const eventData = {
          timestamp,
          connection: update.connection,
          lastDisconnect: update.lastDisconnect?.error?.output?.statusCode,
          hasQR: !!update.qr,
          qrLength: update.qr?.length,
          isOnline: update.isOnline,
          receivedPendingNotifications: update.receivedPendingNotifications,
          isNewLogin: update.isNewLogin
        };
        
        events.push(eventData);
        testLogger.info('📡 Connection update', eventData);
        
        // Handle QR code
        if (update.qr && !qrReceived) {
          qrReceived = true;
          clearTimeout(timeoutId);
          
          testLogger.info('🔲 QR code received! Generating image...', {
            qrLength: update.qr.length,
            qrPrefix: update.qr.substring(0, 20) + '...'
          });
          
          try {
            const qrDataUrl = await QRCode.toDataURL(update.qr, {
              width: 256,
              margin: 2,
              errorCorrectionLevel: 'M'
            });
            
            testLogger.info('✅ QR code generated successfully!', {
              qrDataUrlLength: qrDataUrl.length,
              qrDataUrlPrefix: qrDataUrl.substring(0, 50) + '...'
            });
            
            resolve({
              success: true,
              qrCode: qrDataUrl,
              qrLength: qrDataUrl.length,
              rawQRLength: update.qr.length,
              events
            });
          } catch (qrError) {
            testLogger.error('❌ QR generation failed', { error: qrError.message });
            resolve({
              success: false,
              reason: 'qr_generation_failed',
              error: qrError.message,
              events
            });
          }
        }
        
        // Handle successful connection
        if (update.connection === 'open') {
          connected = true;
          if (!qrReceived) {
            clearTimeout(timeoutId);
            testLogger.info('✅ Connected without QR (already authenticated)');
            resolve({
              success: true,
              reason: 'already_authenticated',
              events
            });
          }
        }
        
        // Handle connection close
        if (update.connection === 'close') {
          const reason = update.lastDisconnect?.error?.output?.statusCode;
          testLogger.info('🔌 Connection closed', { reason });
          
          if (!qrReceived && !connected) {
            clearTimeout(timeoutId);
            resolve({
              success: false,
              reason: 'connection_closed',
              disconnectReason: reason,
              events
            });
          }
        }
      });
      
      socket.ev.on('creds.update', () => {
        testLogger.debug('🔐 Credentials updated');
        saveCreds();
      });
    });
    
    const result = await socketPromise;
    
    // Cleanup
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
      testLogger.debug('✅ Cleanup completed');
    } catch (cleanupError) {
      testLogger.warn('⚠️ Cleanup failed', { error: cleanupError.message });
    }
    
    return result;
    
  } catch (error) {
    testLogger.error('💥 Socket test failed', { error: error.message, stack: error.stack });
    return { success: false, error: error.message };
  }
}

function createTestResponse(success: boolean, message: string, testLogger: TestLogger, startTime: number, testResults?: any) {
  const duration = Date.now() - startTime;
  const logs = testLogger.getLogs();
  
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
    logs,
    logCount: logs.length,
    summary: {
      totalDuration: `${duration}ms`,
      logsByLevel: {
        info: logs.filter(l => l.level === 'info').length,
        warn: logs.filter(l => l.level === 'warn').length,
        error: logs.filter(l => l.level === 'error').length,
        debug: logs.filter(l => l.level === 'debug').length
      }
    }
  });
}