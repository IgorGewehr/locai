// RAILWAY-COMPATIBLE BAILEYS SOCKET CREATOR
// Creates Baileys sockets with Railway WebSocket masking compatibility

import { logger } from '@/lib/utils/logger';
import { RailwayWebSocketPolyfill } from './railway-websocket-polyfill';

export interface RailwayBaileysConfig {
  authDir?: string;
  timeout?: number;
  browser?: [string, string, string];
  enableLogging?: boolean;
  retryOnFailure?: boolean;
}

export class RailwayBaileysSocket {
  private static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) {
      return;
    }

    logger.info('🚀 [RAILWAY-BAILEYS] Initializing Railway-compatible Baileys socket...');

    try {
      // Apply WebSocket polyfill first
      RailwayWebSocketPolyfill.setupWebSocketPolyfill();

      // Test masking functionality
      const maskingWorks = RailwayWebSocketPolyfill.testMaskingFunctionality();
      if (!maskingWorks) {
        throw new Error('WebSocket masking functionality test failed');
      }

      this.isInitialized = true;
      logger.info('✅ [RAILWAY-BAILEYS] Railway Baileys socket initialized successfully');

    } catch (error) {
      logger.error('❌ [RAILWAY-BAILEYS] Initialization failed', { error: error.message });
      throw error;
    }
  }

  static async createSocket(config: RailwayBaileysConfig = {}) {
    try {
      // Ensure initialization
      await this.initialize();

      logger.info('🔌 [RAILWAY-BAILEYS] Creating Railway-compatible socket...');

      // Load Baileys
      const baileys = await import('@whiskeysockets/baileys');
      const { makeWASocket, useMultiFileAuthState } = baileys;

      // Setup auth state
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      const authDir = config.authDir || path.join(os.tmpdir(), `railway-baileys-${Date.now()}`);
      fs.mkdirSync(authDir, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      // Create Railway-optimized logger
      const socketLogger = config.enableLogging ? {
        level: 'debug',
        fatal: (...args: any[]) => logger.error('🚨 [BAILEYS/FATAL]', ...args),
        error: (...args: any[]) => logger.error('❌ [BAILEYS/ERROR]', ...args),
        warn: (...args: any[]) => logger.warn('⚠️ [BAILEYS/WARN]', ...args),
        info: (...args: any[]) => logger.info('ℹ️ [BAILEYS/INFO]', ...args),
        debug: (...args: any[]) => logger.debug('🐛 [BAILEYS/DEBUG]', ...args),
        trace: (...args: any[]) => logger.debug('🔍 [BAILEYS/TRACE]', ...args),
        child: () => socketLogger
      } : undefined;

      // Railway-optimized socket configuration
      const socketConfig = {
        auth: state,
        printQRInTerminal: false,
        browser: config.browser || ['Railway App', 'Chrome', '120.0.6099.109'],
        
        // Network timeouts optimized for Railway
        connectTimeoutMs: 45000, // 45 seconds
        defaultQueryTimeoutMs: 25000, // 25 seconds
        keepAliveIntervalMs: 30000, // 30 seconds
        qrTimeout: config.timeout || 120000, // 2 minutes default
        
        // Connection settings for Railway stability
        retryRequestDelayMs: 2000, // 2 seconds
        maxMsgRetryCount: 2, // Reduce retries
        
        // Performance settings for server environment
        markOnlineOnConnect: false,
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        shouldSyncHistoryMessage: () => false,
        shouldIgnoreJid: () => false,
        
        // Version and cache settings
        version: [2, 2413, 1],
        msgRetryCounterCache: new Map(),
        userDevicesCache: new Map(),
        
        // Add logger if enabled
        ...(socketLogger && { logger: socketLogger }),

        // Railway-specific WebSocket options
        websocket: {
          compress: false, // Disable compression to avoid masking issues
          perMessageDeflate: false,
          followRedirects: true,
          handshakeTimeout: 30000,
          skipUTF8Validation: true
        }
      };

      logger.debug('🔧 [RAILWAY-BAILEYS] Socket config prepared', {
        authDir,
        browser: socketConfig.browser,
        timeouts: {
          connect: socketConfig.connectTimeoutMs,
          query: socketConfig.defaultQueryTimeoutMs,
          qr: socketConfig.qrTimeout
        }
      });

      // Create the socket with polyfill support
      const socket = makeWASocket(socketConfig);

      logger.info('✅ [RAILWAY-BAILEYS] Socket created successfully');

      return {
        socket,
        authDir,
        saveCreds,
        cleanup: () => {
          try {
            fs.rmSync(authDir, { recursive: true, force: true });
            logger.debug('🧹 [RAILWAY-BAILEYS] Cleanup completed');
          } catch (cleanupError) {
            logger.warn('⚠️ [RAILWAY-BAILEYS] Cleanup failed', { error: cleanupError.message });
          }
        }
      };

    } catch (error) {
      logger.error('❌ [RAILWAY-BAILEYS] Socket creation failed', { 
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    }
  }

  static async createSocketWithQR(config: RailwayBaileysConfig = {}) {
    try {
      const { socket, authDir, saveCreds, cleanup } = await this.createSocket(config);
      const QRCode = await import('qrcode');

      logger.info('🔲 [RAILWAY-BAILEYS] Waiting for QR code...');

      return new Promise((resolve, reject) => {
        let qrReceived = false;
        let connected = false;
        const events: any[] = [];

        const timeout = setTimeout(() => {
          if (!qrReceived && !connected) {
            cleanup();
            reject(new Error(`QR timeout after ${config.timeout || 120000}ms`));
          }
        }, config.timeout || 120000);

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
          logger.info('📡 [RAILWAY-BAILEYS] Connection update', eventData);

          // Handle QR code
          if (update.qr && !qrReceived) {
            qrReceived = true;
            clearTimeout(timeout);

            try {
              logger.info('🔲 [RAILWAY-BAILEYS] QR received, generating image...');
              
              const qrDataUrl = await QRCode.toDataURL(update.qr, {
                width: 256,
                margin: 2,
                errorCorrectionLevel: 'M'
              });

              logger.info('✅ [RAILWAY-BAILEYS] QR generated successfully!');

              resolve({
                success: true,
                qrCode: qrDataUrl,
                qrLength: qrDataUrl.length,
                rawQRLength: update.qr.length,
                events,
                cleanup
              });

            } catch (qrError) {
              logger.error('❌ [RAILWAY-BAILEYS] QR generation failed', { error: qrError.message });
              cleanup();
              reject(new Error(`QR generation failed: ${qrError.message}`));
            }
          }

          // Handle successful connection
          if (update.connection === 'open') {
            connected = true;
            if (!qrReceived) {
              clearTimeout(timeout);
              logger.info('✅ [RAILWAY-BAILEYS] Connected without QR (already authenticated)');
              resolve({
                success: true,
                reason: 'already_authenticated',
                events,
                cleanup
              });
            }
          }

          // Handle connection close
          if (update.connection === 'close') {
            const reason = update.lastDisconnect?.error?.output?.statusCode;
            logger.info('🔌 [RAILWAY-BAILEYS] Connection closed', { reason });

            if (!qrReceived && !connected) {
              clearTimeout(timeout);
              cleanup();
              reject(new Error(`Connection closed before QR: ${reason}`));
            }
          }
        });

        socket.ev.on('creds.update', () => {
          logger.debug('🔐 [RAILWAY-BAILEYS] Credentials updated');
          saveCreds();
        });
      });

    } catch (error) {
      logger.error('❌ [RAILWAY-BAILEYS] QR socket creation failed', { error: error.message });
      throw error;
    }
  }
}