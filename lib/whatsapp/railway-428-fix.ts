// RAILWAY 428 ERROR FIX
// Fixes "Connection closed before QR: 428" error in Railway
// Error 428 = Precondition Required - missing headers/conditions

import { logger } from '@/lib/utils/logger';

export class Railway428Fix {
  static getOptimizedHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.109 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    };
  }

  static getWebSocketHeaders() {
    return {
      'Origin': 'https://web.whatsapp.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.109 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
      'Sec-WebSocket-Key': this.generateWebSocketKey(),
      'Sec-WebSocket-Version': '13'
    };
  }

  static generateWebSocketKey(): string {
    // Generate RFC 6455 compliant WebSocket key
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      // Fallback for Node.js
      const crypto = require('crypto');
      const buffer = crypto.randomBytes(16);
      bytes.set(buffer);
    }
    return Buffer.from(bytes).toString('base64');
  }

  static getOptimizedSocketConfig(originalConfig: any) {
    logger.info('🔧 [428-FIX] Applying 428 error fix to socket config...');

    return {
      ...originalConfig,
      
      // Use specific version that works with current WhatsApp Web
      version: [2, 2413, 1], // Latest stable
      
      // Browser that matches headers
      browser: ['Chrome', 'Chrome', '120.0.6099.109'],
      
      // Extended timeouts for Railway
      connectTimeoutMs: 120000, // 2 minutes
      defaultQueryTimeoutMs: 90000, // 1.5 minutes
      keepAliveIntervalMs: 60000, // 1 minute
      qrTimeout: 300000, // 5 minutes
      
      // Minimal retries to avoid triggering rate limits
      retryRequestDelayMs: 5000, // 5 seconds
      maxMsgRetryCount: 1,
      
      // Performance optimizations
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      
      // Disable features that might trigger 428
      shouldSyncHistoryMessage: () => false,
      shouldIgnoreJid: () => false,
      
      // Note: Custom socket creation removed due to Baileys compatibility issues

      // Auth state configuration
      auth: {
        ...originalConfig.auth,
        // Ensure proper auth state structure
        creds: originalConfig.auth?.creds || {},
        keys: originalConfig.auth?.keys || {}
      },

      // Message retry cache to avoid triggering limits
      msgRetryCounterCache: new Map(),
      userDevicesCache: new Map(),
      
      // Logger with 428 debugging
      logger: {
        level: 'debug',
        fatal: (...args: any[]) => logger.error('🚨 [428-FIX/FATAL]', ...args),
        error: (...args: any[]) => {
          logger.error('❌ [428-FIX/ERROR]', ...args);
          // Log 428 specific errors
          if (args.some(arg => String(arg).includes('428'))) {
            logger.error('🚨 [428-FIX] 428 Precondition Required detected!', ...args);
          }
        },
        warn: (...args: any[]) => {
          logger.warn('⚠️ [428-FIX/WARN]', ...args);
          if (args.some(arg => String(arg).includes('428'))) {
            logger.warn('⚠️ [428-FIX] 428 warning detected', ...args);
          }
        },
        info: (...args: any[]) => logger.info('ℹ️ [428-FIX/INFO]', ...args),
        debug: (...args: any[]) => logger.debug('🐛 [428-FIX/DEBUG]', ...args),
        trace: (...args: any[]) => logger.debug('🔍 [428-FIX/TRACE]', ...args),
        child: () => this
      }
    };
  }

  static async create428CompatibleSocket(config: any = {}) {
    try {
      logger.info('🔧 [428-FIX] Creating 428-compatible Baileys socket...');

      // Load Baileys
      const baileys = await import('@whiskeysockets/baileys');
      const { makeWASocket, useMultiFileAuthState } = baileys;

      // Setup auth state
      const fs = require('fs');
      const path = require('path');
      const authDir = config.authDir || path.join('/tmp', `fix428-${Date.now()}`);
      fs.mkdirSync(authDir, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      // Apply 428 fix to config
      const socketConfig = this.getOptimizedSocketConfig({
        auth: state,
        printQRInTerminal: false,
        ...config
      });

      logger.info('✅ [428-FIX] Creating socket with 428 fix applied...');
      const socket = makeWASocket(socketConfig);

      return {
        socket,
        authDir,
        saveCreds,
        cleanup: () => {
          try {
            fs.rmSync(authDir, { recursive: true, force: true });
            logger.debug('🧹 [428-FIX] Cleanup completed');
          } catch (cleanupError) {
            logger.warn('⚠️ [428-FIX] Cleanup failed', { error: cleanupError.message });
          }
        }
      };

    } catch (error) {
      logger.error('❌ [428-FIX] Failed to create 428-compatible socket', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  static async testConnection() {
    try {
      logger.info('🧪 [428-FIX] Testing connection with 428 fix...');

      const { socket, cleanup } = await this.create428CompatibleSocket({
        timeout: 180000 // 3 minutes
      });

      const QRCode = await import('qrcode');

      return new Promise((resolve, reject) => {
        let qrReceived = false;
        let connected = false;
        const events: any[] = [];

        const timeout = setTimeout(() => {
          if (!qrReceived && !connected) {
            cleanup();
            reject(new Error('428 fix test timeout after 3 minutes'));
          }
        }, 180000);

        socket.ev.on('connection.update', async (update) => {
          const eventData = {
            timestamp: new Date().toISOString(),
            connection: update.connection,
            hasQR: !!update.qr,
            qrLength: update.qr?.length,
            lastDisconnect: update.lastDisconnect?.error?.output?.statusCode
          };

          events.push(eventData);
          logger.info('📡 [428-FIX] Connection update', eventData);

          // Handle QR code
          if (update.qr && !qrReceived) {
            qrReceived = true;
            clearTimeout(timeout);

            try {
              logger.info('🔲 [428-FIX] QR received! Generating image...');
              
              const qrDataUrl = await QRCode.toDataURL(update.qr, {
                width: 256,
                margin: 2,
                errorCorrectionLevel: 'M'
              });

              logger.info('✅ [428-FIX] QR generated successfully with 428 fix!');

              resolve({
                success: true,
                qrCode: qrDataUrl,
                qrLength: qrDataUrl.length,
                rawQRLength: update.qr.length,
                events
              });

            } catch (qrError) {
              logger.error('❌ [428-FIX] QR generation failed', { error: qrError.message });
              cleanup();
              reject(new Error(`QR generation failed: ${qrError.message}`));
            }
          }

          // Handle successful connection
          if (update.connection === 'open') {
            connected = true;
            if (!qrReceived) {
              clearTimeout(timeout);
              logger.info('✅ [428-FIX] Connected without QR (already authenticated)');
              resolve({
                success: true,
                reason: 'already_authenticated',
                events
              });
            }
          }

          // Handle connection close - check for 428
          if (update.connection === 'close') {
            const reason = update.lastDisconnect?.error?.output?.statusCode;
            logger.info('🔌 [428-FIX] Connection closed', { reason });

            if (reason === 428) {
              logger.error('🚨 [428-FIX] 428 error still occurring despite fix!');
            }

            if (!qrReceived && !connected) {
              clearTimeout(timeout);
              cleanup();
              reject(new Error(`Connection closed before QR: ${reason} (428 fix failed)`));
            }
          }
        });

        socket.ev.on('creds.update', () => {
          logger.debug('🔐 [428-FIX] Credentials updated');
          // Don't call saveCreds here to avoid auth state conflicts
        });
      });

    } catch (error) {
      logger.error('❌ [428-FIX] 428 fix test failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}