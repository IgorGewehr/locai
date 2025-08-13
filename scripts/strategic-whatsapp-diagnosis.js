#!/usr/bin/env node

/**
 * STRATEGIC WHATSAPP DIAGNOSIS - Investigação Completa Railway
 * Diagnóstica o problema específico: connecting → disconnected sem QR
 */

console.log('🚀 STRATEGIC WHATSAPP DIAGNOSIS - Railway Environment');
console.log('=' .repeat(70));

async function strategicDiagnosis() {
  console.log('\n🔍 ANALYSIS: User Pattern');
  console.log('❌ ISSUE: Status goes connecting → disconnected without QR');
  console.log('❌ ISSUE: QR code always returns null');
  console.log('❌ ISSUE: No errors visible in client logs');
  console.log('\n🎯 HYPOTHESIS: Socket creation succeeds but QR generation fails silently');
  
  // Test 1: Direct RobustWhatsAppManager Test
  console.log('\n📦 TEST 1: RobustWhatsAppManager Direct Test');
  try {
    // Import the exact manager used in production
    console.log('Importing RobustWhatsAppManager...');
    const { RobustWhatsAppManager } = await import('../lib/whatsapp/robust-session-manager.js');
    
    console.log('Creating new manager instance...');
    const manager = new RobustWhatsAppManager();
    
    // Wait for initialization
    console.log('Waiting 3 seconds for dependency initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Testing session initialization...');
    const testTenant = 'test-' + Date.now();
    
    try {
      await manager.initializeSession(testTenant);
      console.log('✅ Session initialization completed');
      
      // Check status immediately
      const status = await manager.getSessionStatus(testTenant);
      console.log('📊 Initial Status:', status);
      
      // Wait and check multiple times
      for (let i = 1; i <= 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const currentStatus = await manager.getSessionStatus(testTenant);
        console.log(`📊 Status Check ${i}:`, {
          status: currentStatus.status,
          hasQR: !!currentStatus.qrCode,
          connected: currentStatus.connected
        });
        
        if (currentStatus.qrCode || currentStatus.connected) {
          console.log('🎉 SUCCESS: QR or Connection achieved!');
          break;
        }
      }
      
    } catch (sessionError) {
      console.error('❌ Session initialization failed:', sessionError.message);
      console.error('Stack:', sessionError.stack);
    }
    
  } catch (importError) {
    console.error('❌ CRITICAL: Could not import RobustWhatsAppManager');
    console.error('Error:', importError.message);
    console.error('Stack:', importError.stack);
    return false;
  }

  // Test 2: Direct Baileys Socket Test
  console.log('\n📦 TEST 2: Direct Baileys Socket Test (Mimicking Production)');
  try {
    const baileys = await import('@whiskeysockets/baileys');
    const { default: makeWASocket, useMultiFileAuthState } = baileys;
    const QRCode = require('qrcode');
    const fs = require('fs');
    const path = require('path');
    
    // Use exact same directory logic as RobustWhatsAppManager
    let baseDir;
    if (process.env.RAILWAY_PROJECT_ID || process.env.NODE_ENV === 'production') {
      try {
        const railwayDir = path.join(process.cwd(), '.sessions');
        fs.mkdirSync(railwayDir, { recursive: true });
        fs.accessSync(railwayDir, fs.constants.W_OK);
        baseDir = process.cwd();
        console.log('🚂 Railway directory detected:', railwayDir);
      } catch (railwayError) {
        console.log('⚠️ Railway directory failed, using /tmp');
        baseDir = '/tmp';
      }
    } else {
      baseDir = '/tmp';
    }
    
    const authDir = path.join(baseDir, '.sessions', 'strategic-test');
    console.log(`📁 Using auth directory: ${authDir}`);
    
    fs.mkdirSync(authDir, { recursive: true, mode: 0o755 });
    
    console.log('🔐 Setting up auth state...');
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    console.log('✅ Auth state ready');
    
    console.log('🔌 Creating socket with EXACT production config...');
    
    let qrReceived = false;
    let connectionUpdate = false;
    
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['LocAI WhatsApp', 'Chrome', '120.0.0'],
      connectTimeoutMs: 60000,
      qrTimeout: 120000,
      defaultQueryTimeoutMs: 30000,
      keepAliveIntervalMs: 25000,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      shouldIgnoreJid: () => false,
      shouldSyncHistoryMessage: () => false,
      logger: {
        fatal: (...args) => console.error('[Baileys FATAL]', ...args),
        error: (...args) => console.error('[Baileys ERROR]', ...args),
        warn: (...args) => console.warn('[Baileys WARN]', ...args),
        info: (...args) => console.log('[Baileys INFO]', ...args),
        debug: (...args) => console.log('[Baileys DEBUG]', ...args),
        trace: (...args) => console.log('[Baileys TRACE]', ...args),
        child: () => ({
          fatal: (...args) => console.error('[Baileys Child FATAL]', ...args),
          error: (...args) => console.error('[Baileys Child ERROR]', ...args),
          warn: (...args) => console.warn('[Baileys Child WARN]', ...args),
          info: (...args) => console.log('[Baileys Child INFO]', ...args),
          debug: (...args) => console.log('[Baileys Child DEBUG]', ...args),
          trace: (...args) => console.log('[Baileys Child TRACE]', ...args),
          level: 'info'
        }),
        level: 'info'
      }
    });
    
    console.log('✅ Socket created, setting up event handlers...');
    
    // Track events
    socket.ev.on('connection.update', async (update) => {
      connectionUpdate = true;
      console.log('📡 CONNECTION UPDATE:', {
        connection: update.connection,
        hasQR: !!update.qr,
        qrLength: update.qr?.length || 0,
        lastDisconnect: update.lastDisconnect?.error?.message
      });
      
      if (update.qr) {
        qrReceived = true;
        console.log('🔲 QR RECEIVED! Converting to data URL...');
        
        try {
          const qrDataUrl = await QRCode.toDataURL(update.qr, {
            type: 'image/png',
            quality: 1.0,
            margin: 4,
            width: 512,
            errorCorrectionLevel: 'H'
          });
          console.log('✅ QR converted to data URL successfully!');
          console.log(`Data URL length: ${qrDataUrl.length}`);
        } catch (qrError) {
          console.error('❌ QR conversion failed:', qrError);
        }
      }
      
      if (update.connection === 'open') {
        console.log('📱 CONNECTION OPEN!');
      }
      
      if (update.connection === 'close') {
        console.log('🔌 CONNECTION CLOSED');
      }
    });
    
    socket.ev.on('creds.update', saveCreds);
    
    // Wait for events
    console.log('⏳ Waiting 30 seconds for QR or connection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log('📊 FINAL RESULTS:');
    console.log(`Connection Update Events: ${connectionUpdate ? 'YES' : 'NO'}`);
    console.log(`QR Code Received: ${qrReceived ? 'YES' : 'NO'}`);
    
    // Close socket
    await socket.end();
    
    // Clean up
    fs.rmSync(authDir, { recursive: true, force: true });
    
    if (!connectionUpdate) {
      console.log('❌ CRITICAL: No connection events received from Baileys!');
      return false;
    }
    
    if (!qrReceived) {
      console.log('❌ ISSUE: Connection events received but no QR code!');
      console.log('💡 This suggests Baileys is working but not generating QR in Railway environment');
      return false;
    }
    
    console.log('✅ Direct Baileys test successful - issue is in integration layer');
    
  } catch (baileysError) {
    console.error('❌ Direct Baileys test failed:', baileysError.message);
    console.error('Stack:', baileysError.stack);
    return false;
  }

  // Test 3: Environment-specific issues
  console.log('\n📦 TEST 3: Railway Environment Analysis');
  
  const envAnalysis = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    railway: !!process.env.RAILWAY_PROJECT_ID,
    production: process.env.NODE_ENV === 'production',
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    cwd: process.cwd(),
    home: process.env.HOME || 'NOT_SET',
    tmpdir: require('os').tmpdir()
  };
  
  console.log('🌐 Environment Analysis:', JSON.stringify(envAnalysis, null, 2));
  
  // Test file system in different locations
  console.log('\n📁 File System Test in Railway:');
  const testPaths = [
    process.cwd() + '/.sessions',
    '/tmp/.sessions',
    '/app/.sessions'
  ];
  
  for (const testPath of testPaths) {
    try {
      const fs = require('fs');
      fs.mkdirSync(testPath, { recursive: true });
      fs.writeFileSync(testPath + '/test.txt', 'test');
      fs.readFileSync(testPath + '/test.txt');
      fs.unlinkSync(testPath + '/test.txt');
      fs.rmdirSync(testPath);
      console.log(`✅ ${testPath}: WORKING`);
    } catch (pathError) {
      console.log(`❌ ${testPath}: FAILED - ${pathError.message}`);
    }
  }

  return true;
}

// Run the strategic diagnosis
strategicDiagnosis()
  .then((success) => {
    console.log('\n' + '=' .repeat(70));
    console.log('🎯 STRATEGIC DIAGNOSIS COMPLETE');
    console.log('=' .repeat(70));
    
    if (!success) {
      console.log('\n💡 RECOMMENDED ACTIONS:');
      console.log('1. Check Railway logs for Baileys errors');
      console.log('2. Verify file system permissions');
      console.log('3. Test network connectivity to WhatsApp servers');
      console.log('4. Check if Railway blocks WebSocket connections');
    }
    
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 STRATEGIC DIAGNOSIS FAILED:', error);
    process.exit(1);
  });