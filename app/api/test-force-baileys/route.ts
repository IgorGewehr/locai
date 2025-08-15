// FORCE BAILEYS CONFIGURATION FOR RAILWAY
// Tests with specific configurations that might work better on Railway

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('💪 [FORCE] Starting forced Baileys configuration test...');
    
    // Load dependencies
    const baileys = await import('@whiskeysockets/baileys');
    const { makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;
    const QRCode = await import('qrcode');
    
    // Setup auth state
    const fs = require('fs');
    const path = require('path');
    
    const authDir = path.join('/tmp', 'force-baileys-' + Date.now());
    fs.mkdirSync(authDir, { recursive: true });
    
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    logger.info('💪 [FORCE] Creating socket with forced Railway config...');
    
    // FORCE CONFIGURATION FOR RAILWAY
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      
      // FORCE SPECIFIC BROWSER
      browser: ['Railway Chrome', 'Chrome', '120.0.6099.109'],
      
      // FORCE NETWORK SETTINGS
      connectTimeoutMs: 30000, // 30 seconds
      defaultQueryTimeoutMs: 20000, // 20 seconds  
      keepAliveIntervalMs: 25000, // 25 seconds
      qrTimeout: 60000, // 1 minute for QR
      
      // FORCE CONNECTION SETTINGS
      retryRequestDelayMs: 1000,
      maxMsgRetryCount: 3,
      
      // FORCE PROTOCOL SETTINGS
      markOnlineOnConnect: false, // Don't mark online immediately
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      
      // FORCE MOBILE SETTINGS (sometimes works better)
      mobile: false,
      
      // CUSTOM LOGGER FOR DETAILED DEBUGGING
      logger: {
        level: 'trace',
        fatal: (...args) => {
          logger.error('🚨 [FORCE/Baileys FATAL]', ...args);
        },
        error: (...args) => {
          logger.error('❌ [FORCE/Baileys ERROR]', ...args);
        },
        warn: (...args) => {
          logger.warn('⚠️ [FORCE/Baileys WARN]', ...args);
        },
        info: (...args) => {
          logger.info('ℹ️ [FORCE/Baileys INFO]', ...args);
        },
        debug: (...args) => {
          logger.info('🐛 [FORCE/Baileys DEBUG]', ...args);
        },
        trace: (...args) => {
          logger.info('🔍 [FORCE/Baileys TRACE]', ...args);
        },
        child: () => this
      },
      
      // FORCE USER AGENT AND VERSION
      version: [2, 2413, 1],
      
      // ADDITIONAL RAILWAY-SPECIFIC SETTINGS
      shouldIgnoreJid: () => false,
      shouldSyncHistoryMessage: () => false,
      
      // FORCE CACHE SETTINGS
      msgRetryCounterCache: new Map(),
      userDevicesCache: new Map()
    });
    
    logger.info('✅ [FORCE] Socket created, waiting for events...');
    
    // Promise to capture detailed connection flow
    const connectionPromise = new Promise((resolve, reject) => {
      let eventLog = [];
      let qrReceived = false;
      let connectionClosed = false;
      
      const timeout = setTimeout(() => {
        if (!qrReceived && !connectionClosed) {
          logger.warn('⏰ [FORCE] Test timeout after 90 seconds');
          resolve({
            success: false,
            reason: 'timeout',
            eventLog,
            duration: 90000
          });
        }
      }, 90000); // 90 second timeout
      
      // Enhanced connection update handler
      socket.ev.on('connection.update', async (update) => {
        const timestamp = new Date().toISOString();
        
        logger.info('📡 [FORCE] Connection update:', {
          timestamp,
          connection: update.connection,
          lastDisconnect: update.lastDisconnect,
          hasQR: !!update.qr,
          qrLength: update.qr?.length,
          receivedPendingNotifications: update.receivedPendingNotifications,
          isOnline: update.isOnline,
          isNewLogin: update.isNewLogin
        });
        
        eventLog.push({
          timestamp,
          type: 'connection.update',
          data: {
            connection: update.connection,
            hasQR: !!update.qr,
            qrLength: update.qr?.length || 0,
            lastDisconnectReason: update.lastDisconnect?.error?.output?.statusCode,
            isOnline: update.isOnline,
            receivedPendingNotifications: update.receivedPendingNotifications
          }
        });
        
        // Handle QR code
        if (update.qr && !qrReceived) {
          qrReceived = true;
          clearTimeout(timeout);
          
          logger.info('🔲 [FORCE] QR received! Generating image...', {
            qrLength: update.qr.length,
            qrPrefix: update.qr.substring(0, 20)
          });
          
          try {
            const qrDataUrl = await QRCode.toDataURL(update.qr, {
              width: 256,
              margin: 2,
              errorCorrectionLevel: 'M'
            });
            
            logger.info('✅ [FORCE] QR generated successfully!');
            
            resolve({
              success: true,
              qrCode: qrDataUrl,
              qrLength: qrDataUrl.length,
              rawQRLength: update.qr.length,
              eventLog
            });
            
          } catch (qrError) {
            logger.error('❌ [FORCE] QR generation failed:', qrError);
            resolve({
              success: false,
              reason: 'qr_generation_failed',
              error: qrError.message,
              eventLog
            });
          }
        }
        
        // Handle connection events
        if (update.connection === 'open') {
          if (!qrReceived) {
            clearTimeout(timeout);
            logger.info('✅ [FORCE] Connected without QR (already authenticated)');
            resolve({
              success: true,
              reason: 'already_authenticated',
              eventLog
            });
          }
        }
        
        if (update.connection === 'close') {
          connectionClosed = true;
          const reason = update.lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = reason !== DisconnectReason.loggedOut;
          
          logger.info('🔌 [FORCE] Connection closed:', {
            reason,
            shouldReconnect,
            loggedOut: reason === DisconnectReason.loggedOut
          });
          
          if (!qrReceived) {
            clearTimeout(timeout);
            resolve({
              success: false,
              reason: 'connection_closed',
              disconnectReason: reason,
              shouldReconnect,
              eventLog
            });
          }
        }
      });
      
      // Handle credential updates
      socket.ev.on('creds.update', (creds) => {
        logger.info('🔐 [FORCE] Credentials updated');
        eventLog.push({
          timestamp: new Date().toISOString(),
          type: 'creds.update',
          data: { updated: true }
        });
        saveCreds();
      });
      
    });
    
    const result = await connectionPromise;
    
    // Cleanup
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.warn('⚠️ [FORCE] Cleanup failed:', cleanupError);
    }
    
    return NextResponse.json({
      success: result.success,
      message: 'Forced Baileys configuration test completed',
      result,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        railwayId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8) || 'none',
        nodeVersion: process.version,
        platform: process.platform
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('💥 [FORCE] Forced Baileys test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}