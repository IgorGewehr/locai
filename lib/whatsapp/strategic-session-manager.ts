// STRATEGIC SESSION MANAGER - Railway Production Fix
// SOLUÇÃO DEFINITIVA: Inicialização garantida e logs completos

import { EventEmitter } from 'events';
import { logger } from '@/lib/utils/logger';

interface StrategicSession {
  status: 'disconnected' | 'connecting' | 'qr' | 'connected';
  qrCode: string | null;
  phoneNumber: string | null;
  businessName: string | null;
  lastActivity: Date;
  retryCount: number;
  connectionAttempts: number;
}

export class StrategicSessionManager extends EventEmitter {
  private sessions: Map<string, StrategicSession> = new Map();
  private baileys: any = null;
  private QRCode: any = null;
  private isReady: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    super();
    logger.info('🚀 [Strategic] Session manager created');
    // Don't start initialization in constructor - wait for first use
  }

  // GUARANTEED INITIALIZATION - Only initialize when needed
  private async ensureDependencies(): Promise<void> {
    if (this.isReady) {
      return;
    }

    // If already initializing, wait for it
    if (this.initializationPromise) {
      logger.info('⏳ [Strategic] Waiting for existing initialization...');
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this.initializeDependencies();
    return this.initializationPromise;
  }

  private async initializeDependencies(): Promise<void> {
    logger.info('🔧 [Strategic] Initializing dependencies...', {
      nodeVersion: process.version,
      platform: process.platform,
      isRailway: !!process.env.RAILWAY_PROJECT_ID,
      env: process.env.NODE_ENV
    });
    
    try {
      // Load Baileys with timeout
      logger.info('📦 [Strategic] Loading Baileys...');
      const baileysPromise = import('@whiskeysockets/baileys');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Baileys import timeout')), 10000)
      );
      
      this.baileys = await Promise.race([baileysPromise, timeoutPromise]);
      
      // Verify critical functions - handle both import and require patterns
      const hasDirectExports = this.baileys.makeWASocket && this.baileys.useMultiFileAuthState;
      const hasDefaultExports = this.baileys.default && typeof this.baileys.default === 'function';
      
      if (!hasDirectExports && !hasDefaultExports) {
        throw new Error('Baileys modules incomplete after import');
      }
      
      // Normalize exports for consistent usage
      if (hasDirectExports) {
        // Direct exports from dynamic import
        this.baileys.default = this.baileys.makeWASocket;
      }
      
      logger.info('✅ [Strategic] Baileys loaded successfully', {
        hasDefault: !!this.baileys.default,
        hasAuthState: !!this.baileys.useMultiFileAuthState,
        hasDisconnect: !!this.baileys.DisconnectReason
      });
      
      // Load QRCode with multiple strategies
      logger.info('📦 [Strategic] Loading QRCode...');
      
      try {
        // Strategy 1: Normal require
        this.QRCode = require('qrcode');
      } catch (requireError) {
        logger.warn('⚠️ [Strategic] Normal require failed, trying import...', requireError.message);
        
        // Strategy 2: Dynamic import
        const qrModule = await import('qrcode');
        this.QRCode = qrModule.default || qrModule;
      }
      
      // Verify QRCode functions
      const requiredFunctions = ['toDataURL', 'toString', 'toCanvas'];
      const availableFunctions = requiredFunctions.filter(fn => typeof this.QRCode[fn] === 'function');
      
      logger.info('📊 [Strategic] QRCode functions available:', {
        required: requiredFunctions,
        available: availableFunctions,
        hasAll: availableFunctions.length === requiredFunctions.length
      });
      
      if (!this.QRCode || typeof this.QRCode.toDataURL !== 'function') {
        throw new Error(`QRCode toDataURL function not available. Available: ${availableFunctions.join(', ')}`);
      }
      
      logger.info('✅ [Strategic] QRCode loaded successfully');
      
      // Test QR generation with multiple configurations
      logger.info('🧪 [Strategic] Testing QR generation...');
      
      const testConfigs = [
        { width: 256, margin: 4 },
        { width: 128 },
        {}
      ];
      
      let testQR = null;
      for (let i = 0; i < testConfigs.length; i++) {
        try {
          testQR = await this.QRCode.toDataURL('test-qr-railway', testConfigs[i]);
          if (testQR && testQR.length > 100) {
            logger.info(`✅ [Strategic] QR test passed with config ${i + 1}`, {
              configUsed: testConfigs[i],
              qrLength: testQR.length,
              qrPrefix: testQR.substring(0, 50)
            });
            break;
          }
        } catch (testError) {
          logger.warn(`⚠️ [Strategic] QR test config ${i + 1} failed:`, testError.message);
        }
      }
      
      if (!testQR || testQR.length < 100) {
        throw new Error('QR generation test failed with all configurations');
      }
      
      logger.info('✅ [Strategic] QR generation test passed');
      
      this.isReady = true;
      logger.info('🎉 [Strategic] All dependencies ready!');
      
    } catch (error) {
      logger.error('❌ [Strategic] Dependency initialization failed:', {
        error: error.message,
        stack: error.stack,
        nodeVersion: process.version,
        isRailway: !!process.env.RAILWAY_PROJECT_ID
      });
      this.isReady = false;
      this.initializationPromise = null; // Reset to allow retry
      throw error;
    }
  }

  async initializeSession(tenantId: string): Promise<void> {
    logger.info('🚀 [Strategic] Starting session initialization', {
      tenantId: tenantId?.substring(0, 8),
      dependenciesReady: this.isReady
    });

    // GUARANTEED: Ensure dependencies are ready
    await this.ensureDependencies();

    if (!this.isReady) {
      throw new Error('Dependencies failed to initialize after multiple attempts');
    }

    logger.info('✅ [Strategic] Dependencies confirmed ready, proceeding...');

    // Create session
    const session: StrategicSession = {
      status: 'connecting',
      qrCode: null,
      phoneNumber: null,
      businessName: null,
      lastActivity: new Date(),
      retryCount: 0,
      connectionAttempts: 0
    };

    this.sessions.set(tenantId, session);
    this.emit('status', tenantId, 'connecting');

    try {
      // Use strategic connection with full error handling
      await this.createStrategicConnection(tenantId);
    } catch (error) {
      logger.error('❌ [Strategic] Session initialization failed:', error);
      session.status = 'disconnected';
      this.emit('status', tenantId, 'disconnected');
      throw error;
    }
  }

  private async createStrategicConnection(tenantId: string): Promise<void> {
    logger.info('🔌 [Strategic] Creating WhatsApp connection...');
    
    // Handle both import patterns
    const makeWASocket = this.baileys.default || this.baileys.makeWASocket;
    const useMultiFileAuthState = this.baileys.useMultiFileAuthState;
    const DisconnectReason = this.baileys.DisconnectReason;
    
    // Strategic directory setup for Railway
    const fs = require('fs');
    const path = require('path');
    
    let authDir: string;
    
    if (process.env.RAILWAY_PROJECT_ID) {
      // Railway persistent storage
      const railwayDir = path.join(process.cwd(), '.sessions', `strategic-${tenantId}`);
      try {
        fs.mkdirSync(railwayDir, { recursive: true, mode: 0o755 });
        authDir = railwayDir;
        logger.info('🚂 [Strategic] Using Railway persistent storage:', authDir);
      } catch (railwayError) {
        // Fallback to /tmp
        authDir = path.join('/tmp', '.sessions', `strategic-${tenantId}`);
        fs.mkdirSync(authDir, { recursive: true, mode: 0o755 });
        logger.warn('⚠️ [Strategic] Railway fallback to /tmp:', authDir);
      }
    } else {
      // Development or other environments
      authDir = path.join('/tmp', '.sessions', `strategic-${tenantId}`);
      fs.mkdirSync(authDir, { recursive: true, mode: 0o755 });
      logger.info('💻 [Strategic] Using tmp storage:', authDir);
    }

    logger.info('🔐 [Strategic] Setting up auth state...');
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    logger.info('✅ [Strategic] Auth state ready, creating socket...');
    
    let socket;
    try {
      socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['LocAI Strategic', 'Chrome', '120.0.0'],
        connectTimeoutMs: 45000,    // 45 seconds for Railway
        qrTimeout: 90000,           // 90 seconds QR timeout
        defaultQueryTimeoutMs: 25000,
        keepAliveIntervalMs: 20000,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        logger: this.createStrategicLogger()
      });
    } catch (socketError) {
      logger.error('❌ [Strategic] Socket creation failed:', socketError);
      throw new Error(`Socket creation failed: ${socketError.message}`);
    }

    logger.info('✅ [Strategic] Socket created, setting up handlers...');

    // QR timeout handler
    const qrTimeoutId = setTimeout(() => {
      const session = this.sessions.get(tenantId);
      if (session && session.status === 'connecting' && !session.qrCode) {
        logger.warn('⏰ [Strategic] QR timeout - forcing disconnect');
        session.status = 'disconnected';
        this.emit('status', tenantId, 'disconnected');
      }
    }, 60000); // 1 minute timeout

    // Connection update handler
    socket.ev.on('connection.update', async (update) => {
      const session = this.sessions.get(tenantId);
      if (!session) return;

      logger.info('📡 [Strategic] Connection update:', {
        tenantId: tenantId?.substring(0, 8),
        connection: update.connection,
        hasQR: !!update.qr,
        qrLength: update.qr?.length,
        disconnectReason: update.lastDisconnect?.error?.message
      });

      if (update.qr) {
        clearTimeout(qrTimeoutId);
        logger.info('🔲 [Strategic] QR received, processing...', {
          qrType: typeof update.qr,
          qrLength: update.qr?.length,
          qrSample: update.qr?.substring(0, 50),
          isRailway: !!process.env.RAILWAY_PROJECT_ID
        });
        
        session.connectionAttempts++;
        
        try {
          // Ensure QRCode is loaded
          if (!this.QRCode || typeof this.QRCode.toDataURL !== 'function') {
            logger.warn('⚠️ [Strategic] QRCode not loaded, reloading...');
            this.QRCode = require('qrcode');
          }

          // Multiple attempts with different configurations
          let qrDataUrl = null;
          const qrConfigs = [
            // Config 1: High quality with error correction
            {
              type: 'image/png',
              quality: 1.0,
              margin: 4,
              width: 512,
              errorCorrectionLevel: 'H',
              color: { dark: '#000000', light: '#FFFFFF' }
            },
            // Config 2: Standard quality
            {
              type: 'image/png',
              quality: 0.92,
              margin: 2,
              width: 256,
              errorCorrectionLevel: 'M'
            },
            // Config 3: Minimal config
            { width: 256, margin: 4 }
          ];

          for (let i = 0; i < qrConfigs.length; i++) {
            try {
              logger.info(`🔧 [Strategic] Trying QR config ${i + 1}...`);
              qrDataUrl = await this.QRCode.toDataURL(update.qr, qrConfigs[i]);
              
              if (qrDataUrl && qrDataUrl.length > 100) {
                logger.info(`✅ [Strategic] QR generated with config ${i + 1}`);
                break;
              }
            } catch (configError) {
              logger.warn(`⚠️ [Strategic] Config ${i + 1} failed:`, configError.message);
            }
          }

          // Final fallback: convert manually if all configs fail
          if (!qrDataUrl || qrDataUrl.length < 100) {
            logger.warn('⚠️ [Strategic] All QR configs failed, using manual conversion');
            
            // Try terminal format as last resort
            const terminalQR = await this.QRCode.toString(update.qr, { type: 'terminal' });
            logger.info('📱 [Strategic] Terminal QR generated:', {
              terminalLength: terminalQR?.length
            });
            
            // Create a basic data URL manually
            const canvas = await this.QRCode.toCanvas(update.qr, { width: 256 });
            if (canvas) {
              qrDataUrl = canvas.toDataURL('image/png');
            } else {
              // Ultimate fallback: use raw QR string
              qrDataUrl = `data:text/plain;base64,${Buffer.from(update.qr).toString('base64')}`;
            }
          }

          session.qrCode = qrDataUrl;
          session.status = 'qr';
          session.lastActivity = new Date();

          this.emit('qr', tenantId, qrDataUrl);
          this.emit('status', tenantId, 'qr');

          logger.info('✅ [Strategic] QR ready!', {
            tenantId: tenantId?.substring(0, 8),
            attempt: session.connectionAttempts,
            qrLength: qrDataUrl?.length || 0,
            qrPrefix: qrDataUrl?.substring(0, 30),
            isDataUrl: qrDataUrl?.startsWith('data:')
          });

        } catch (qrError) {
          logger.error('❌ [Strategic] QR conversion failed:', {
            error: qrError.message,
            stack: qrError.stack,
            qrType: typeof update.qr,
            qrLength: update.qr?.length
          });
          
          // Use raw QR as absolute fallback
          session.qrCode = update.qr;
          session.status = 'qr';
          this.emit('qr', tenantId, update.qr);
          this.emit('status', tenantId, 'qr');
          
          logger.warn('⚠️ [Strategic] Using raw QR as fallback');
        }
      }

      if (update.connection === 'open') {
        clearTimeout(qrTimeoutId);
        session.status = 'connected';
        session.qrCode = null;
        session.phoneNumber = socket.user?.id?.split(':')[0] || null;
        session.businessName = socket.user?.name || 'WhatsApp';
        session.retryCount = 0;

        this.emit('connected', tenantId, session.phoneNumber);
        this.emit('status', tenantId, 'connected');

        logger.info('✅ [Strategic] Connected successfully!', {
          tenantId: tenantId?.substring(0, 8),
          phone: session.phoneNumber?.substring(0, 6) + '***'
        });
      }

      if (update.connection === 'close') {
        clearTimeout(qrTimeoutId);
        const disconnectReason = (update.lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = disconnectReason !== DisconnectReason.loggedOut;

        logger.info('🔌 [Strategic] Connection closed:', {
          tenantId: tenantId?.substring(0, 8),
          reason: disconnectReason,
          shouldReconnect
        });

        if (shouldReconnect && session.retryCount < 3) {
          session.retryCount++;
          const delay = 5000 * session.retryCount;
          
          logger.info(`🔄 [Strategic] Reconnecting... (${session.retryCount}/3) in ${delay}ms`);
          setTimeout(() => this.createStrategicConnection(tenantId), delay);
        } else {
          session.status = 'disconnected';
          this.emit('status', tenantId, 'disconnected');
        }
      }
    });

    // Credentials update handler
    socket.ev.on('creds.update', () => {
      logger.info('🔑 [Strategic] Credentials updated');
      saveCreds();
    });

    logger.info('✅ [Strategic] All handlers ready, connection active');
  }

  private createStrategicLogger() {
    return {
      fatal: (...args: any[]) => {
        logger.error('[Baileys FATAL]', ...args);
        console.error('[Baileys FATAL]', ...args);
      },
      error: (...args: any[]) => {
        logger.error('[Baileys ERROR]', ...args);
        console.error('[Baileys ERROR]', ...args);
      },
      warn: (...args: any[]) => {
        logger.warn('[Baileys WARN]', ...args);
        console.warn('[Baileys WARN]', ...args);
      },
      info: (...args: any[]) => {
        logger.info('[Baileys INFO]', ...args);
        console.log('[Baileys INFO]', ...args);
      },
      debug: (...args: any[]) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Baileys DEBUG]', ...args);
        }
      },
      trace: () => {}, // Silent trace
      child: () => this.createStrategicLogger(),
      level: 'info'
    };
  }

  async getSessionStatus(tenantId: string): Promise<{
    connected: boolean;
    status: string;
    phoneNumber: string | null;
    businessName: string | null;
    qrCode: string | null;
    message?: string;
  }> {
    const session = this.sessions.get(tenantId);
    
    logger.info('📊 [Strategic] Status check:', {
      tenantId: tenantId?.substring(0, 8),
      hasSession: !!session,
      status: session?.status,
      hasQR: !!session?.qrCode,
      dependenciesReady: this.isReady
    });

    if (!session) {
      return {
        connected: false,
        status: 'disconnected',
        phoneNumber: null,
        businessName: null,
        qrCode: null,
        message: 'Session not found'
      };
    }

    return {
      connected: session.status === 'connected',
      status: session.status,
      phoneNumber: session.phoneNumber,
      businessName: session.businessName,
      qrCode: session.qrCode,
    };
  }

  async disconnectSession(tenantId: string): Promise<void> {
    const session = this.sessions.get(tenantId);
    if (session) {
      session.status = 'disconnected';
      session.qrCode = null;
      this.sessions.delete(tenantId);
      this.emit('status', tenantId, 'disconnected');
      logger.info('🔌 [Strategic] Session disconnected');
    }
  }
}

// Create singleton with guaranteed initialization
export const strategicSessionManager = new StrategicSessionManager();