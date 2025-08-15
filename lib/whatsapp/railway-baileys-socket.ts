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

      // Railway-optimized socket configuration with connection stability
      const socketConfig = {
        auth: state,
        printQRInTerminal: false,
        browser: config.browser || ['Railway Production', 'Chrome', '120.0.6099.109'],
        
        // Extended timeouts for Railway stability
        connectTimeoutMs: 90000, // 90 seconds - Railway needs more time
        defaultQueryTimeoutMs: 60000, // 60 seconds
        keepAliveIntervalMs: 45000, // 45 seconds
        qrTimeout: config.timeout || 180000, // 3 minutes default
        
        // Connection settings optimized for Railway
        retryRequestDelayMs: 3000, // 3 seconds - slower but more stable
        maxMsgRetryCount: 1, // Minimal retries to avoid issues
        
        // Performance settings for Railway server environment
        markOnlineOnConnect: false,
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        shouldSyncHistoryMessage: () => false,
        shouldIgnoreJid: () => false,
        
        // WhatsApp version - use stable version
        version: [2, 2412, 54], // Stable version for Railway
        
        // Connection options for Railway
        options: {
          hostname: 'web.whatsapp.com',
          origin: 'https://web.whatsapp.com',
          agent: undefined, // Let Railway handle agent
        },
        
        // Cache settings
        msgRetryCounterCache: new Map(),
        userDevicesCache: new Map(),
        
        // Add logger if enabled
        ...(socketLogger && { logger: socketLogger }),

        // Railway-specific connection options
        makeSocket: (config: any) => {
          // Use Railway-compatible WebSocket creation
          return RailwayWebSocketPolyfill.createCompatibleWebSocket(
            config.url || 'wss://web.whatsapp.com/ws/chat',
            config.protocols,
            {
              followRedirects: true,
              handshakeTimeout: 60000, // 1 minute handshake
              perMessageDeflate: false,
              skipUTF8Validation: true,
              maxPayload: 100 * 1024 * 1024, // 100MB
              headers: {
                'User-Agent': 'WhatsApp/2.2412.54 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.109 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits'
              }
            }
          );
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
            reject(new Error(`QR timeout after ${config.timeout || 180000}ms`));
          }
        }, config.timeout || 180000);

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

          // Handle connection close - be more resilient
          if (update.connection === 'close') {
            const reason = update.lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = reason !== 401 && reason !== 403; // Don't reconnect on auth errors
            
            logger.info('🔌 [RAILWAY-BAILEYS] Connection closed', { 
              reason, 
              shouldReconnect,
              qrReceived,
              connected 
            });

            // Only fail if we haven't received QR and it's not a temporary disconnect
            if (!qrReceived && !connected && !shouldReconnect) {
              clearTimeout(timeout);
              cleanup();
              reject(new Error(`Connection closed before QR: ${reason} (Auth error)`));
            } else if (!qrReceived && !connected && shouldReconnect) {
              // For temporary disconnects, log but don't fail immediately
              logger.warn('⚠️ [RAILWAY-BAILEYS] Temporary disconnect, waiting for reconnection...', { reason });
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