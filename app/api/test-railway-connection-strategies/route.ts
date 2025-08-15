// RAILWAY CONNECTION STRATEGIES TEST
// Tests different connection approaches to find what works best on Railway

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

interface Strategy {
  name: string;
  description: string;
  config: any;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { timeout = 60000 } = body; // 60 seconds per strategy
    
    logger.info('🧪 [STRATEGIES] Starting Railway connection strategies test...');
    
    const strategies: Strategy[] = [
      {
        name: 'Conservative',
        description: 'Long timeouts, minimal retries',
        config: {
          connectTimeoutMs: 120000, // 2 minutes
          defaultQueryTimeoutMs: 90000, // 1.5 minutes  
          keepAliveIntervalMs: 60000, // 1 minute
          retryRequestDelayMs: 5000, // 5 seconds
          maxMsgRetryCount: 1,
          version: [2, 2412, 54],
          browser: ['Railway Conservative', 'Chrome', '120.0.0']
        }
      },
      {
        name: 'Mobile Emulation',
        description: 'Pretend to be mobile WhatsApp',
        config: {
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 45000,
          keepAliveIntervalMs: 30000,
          retryRequestDelayMs: 2000,
          maxMsgRetryCount: 2,
          version: [2, 2412, 54],
          browser: ['Railway Mobile', 'Chrome', '120.0.0'],
          mobile: true // Enable mobile mode
        }
      },
      {
        name: 'Minimal Config',
        description: 'Bare minimum configuration',
        config: {
          printQRInTerminal: false,
          browser: ['Railway Minimal', 'Chrome', '120.0.0']
          // Only essential configs
        }
      },
      {
        name: 'Legacy Compatible',
        description: 'Use older WhatsApp version',
        config: {
          connectTimeoutMs: 90000,
          defaultQueryTimeoutMs: 60000,
          keepAliveIntervalMs: 45000,
          retryRequestDelayMs: 3000,
          maxMsgRetryCount: 1,
          version: [2, 2407, 3], // Older stable version
          browser: ['Railway Legacy', 'Chrome', '119.0.0']
        }
      }
    ];
    
    const results = [];
    
    for (const strategy of strategies) {
      logger.info(`🧪 [STRATEGIES] Testing strategy: ${strategy.name}`);
      
      const strategyResult = await testStrategy(strategy, timeout);
      results.push({
        strategy: strategy.name,
        description: strategy.description,
        ...strategyResult
      });
      
      logger.info(`📊 [STRATEGIES] Strategy ${strategy.name}: ${strategyResult.success ? 'SUCCESS' : 'FAILED'}`);
      
      // If a strategy succeeds, we can stop testing
      if (strategyResult.success) {
        logger.info(`✅ [STRATEGIES] Found working strategy: ${strategy.name}`);
        break;
      }
    }
    
    const workingStrategies = results.filter(r => r.success);
    const allFailed = workingStrategies.length === 0;
    
    return NextResponse.json({
      success: !allFailed,
      message: allFailed 
        ? 'All connection strategies failed' 
        : `Found ${workingStrategies.length} working strategy(ies)`,
      duration: Date.now() - startTime,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        railwayId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8) || 'none',
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString()
      },
      results,
      summary: {
        totalStrategies: strategies.length,
        workingStrategies: workingStrategies.length,
        failedStrategies: results.length - workingStrategies.length,
        bestStrategy: workingStrategies[0]?.strategy || null
      }
    });
    
  } catch (error) {
    logger.error('💥 [STRATEGIES] Test execution failed', { 
      error: error.message, 
      stack: error.stack 
    });
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    });
  }
}

async function testStrategy(strategy: Strategy, timeout: number) {
  try {
    logger.info(`🔧 [STRATEGY-${strategy.name}] Creating socket with strategy config...`);
    
    // Load dependencies
    const baileys = await import('@whiskeysockets/baileys');
    const { makeWASocket, useMultiFileAuthState } = baileys;
    const QRCode = await import('qrcode');
    
    // Setup auth state
    const fs = require('fs');
    const path = require('path');
    const authDir = path.join('/tmp', `strategy-${strategy.name.toLowerCase()}-${Date.now()}`);
    fs.mkdirSync(authDir, { recursive: true });
    
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    // Create socket with strategy config
    const socketConfig = {
      auth: state,
      printQRInTerminal: false,
      ...strategy.config,
      logger: {
        level: 'debug',
        debug: (...args: any[]) => logger.debug(`🐛 [${strategy.name}]`, ...args),
        info: (...args: any[]) => logger.info(`ℹ️ [${strategy.name}]`, ...args),
        warn: (...args: any[]) => logger.warn(`⚠️ [${strategy.name}]`, ...args),
        error: (...args: any[]) => logger.error(`❌ [${strategy.name}]`, ...args),
        fatal: (...args: any[]) => logger.error(`🚨 [${strategy.name}]`, ...args),
        trace: (...args: any[]) => logger.debug(`🔍 [${strategy.name}]`, ...args),
        child: () => this
      }
    };
    
    const socket = makeWASocket(socketConfig);
    logger.info(`✅ [STRATEGY-${strategy.name}] Socket created`);
    
    // Promise to handle connection
    const connectionPromise = new Promise((resolve, reject) => {
      let qrReceived = false;
      let connected = false;
      const events: any[] = [];
      
      const strategyTimeout = setTimeout(() => {
        if (!qrReceived && !connected) {
          reject(new Error(`Strategy timeout after ${timeout}ms`));
        }
      }, timeout);
      
      socket.ev.on('connection.update', async (update) => {
        const eventData = {
          timestamp: new Date().toISOString(),
          connection: update.connection,
          hasQR: !!update.qr,
          qrLength: update.qr?.length,
          isOnline: update.isOnline,
          lastDisconnect: update.lastDisconnect?.error?.output?.statusCode
        };
        
        events.push(eventData);
        logger.info(`📡 [STRATEGY-${strategy.name}] Connection update`, eventData);
        
        // Handle QR code
        if (update.qr && !qrReceived) {
          qrReceived = true;
          clearTimeout(strategyTimeout);
          
          try {
            logger.info(`🔲 [STRATEGY-${strategy.name}] QR received, generating image...`);
            
            const qrDataUrl = await QRCode.toDataURL(update.qr, {
              width: 256,
              margin: 2,
              errorCorrectionLevel: 'M'
            });
            
            logger.info(`✅ [STRATEGY-${strategy.name}] QR generated successfully!`);
            
            resolve({
              success: true,
              qrCode: qrDataUrl,
              qrLength: qrDataUrl.length,
              rawQRLength: update.qr.length,
              events,
              strategyConfig: strategy.config
            });
            
          } catch (qrError) {
            logger.error(`❌ [STRATEGY-${strategy.name}] QR generation failed`, { error: qrError.message });
            reject(new Error(`QR generation failed: ${qrError.message}`));
          }
        }
        
        // Handle successful connection
        if (update.connection === 'open') {
          connected = true;
          if (!qrReceived) {
            clearTimeout(strategyTimeout);
            logger.info(`✅ [STRATEGY-${strategy.name}] Connected without QR (already authenticated)`);
            resolve({
              success: true,
              reason: 'already_authenticated',
              events,
              strategyConfig: strategy.config
            });
          }
        }
        
        // Handle connection close
        if (update.connection === 'close') {
          const reason = update.lastDisconnect?.error?.output?.statusCode;
          logger.info(`🔌 [STRATEGY-${strategy.name}] Connection closed`, { reason });
          
          if (!qrReceived && !connected) {
            clearTimeout(strategyTimeout);
            reject(new Error(`Connection closed before QR: ${reason}`));
          }
        }
      });
      
      socket.ev.on('creds.update', () => {
        logger.debug(`🔐 [STRATEGY-${strategy.name}] Credentials updated`);
        saveCreds();
      });
    });
    
    const result = await connectionPromise;
    
    // Cleanup
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
      logger.debug(`🧹 [STRATEGY-${strategy.name}] Cleanup completed`);
    } catch (cleanupError) {
      logger.warn(`⚠️ [STRATEGY-${strategy.name}] Cleanup failed`, { error: cleanupError.message });
    }
    
    return result;
    
  } catch (error) {
    logger.error(`❌ [STRATEGY-${strategy.name}] Strategy test failed`, { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      success: false,
      error: error.message,
      strategyConfig: strategy.config
    };
  }
}