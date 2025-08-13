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
    logger.info('🔧 [Strategic] Initializing dependencies...');
    
    try {
      // Load Baileys with timeout
      logger.info('📦 [Strategic] Loading Baileys...');
      const baileysPromise = import('@whiskeysockets/baileys');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Baileys import timeout')), 10000)
      );
      
      this.baileys = await Promise.race([baileysPromise, timeoutPromise]);
      
      // Verify critical functions
      if (!this.baileys.default || !this.baileys.useMultiFileAuthState || !this.baileys.DisconnectReason) {
        throw new Error('Baileys modules incomplete after import');
      }
      
      logger.info('✅ [Strategic] Baileys loaded successfully');
      
      // Load QRCode
      logger.info('📦 [Strategic] Loading QRCode...');
      this.QRCode = require('qrcode');
      
      if (typeof this.QRCode.toDataURL !== 'function') {
        throw new Error('QRCode toDataURL function not available');
      }
      
      logger.info('✅ [Strategic] QRCode loaded successfully');
      
      // Test QR generation
      const testQR = await this.QRCode.toDataURL('test', { width: 256, margin: 4 });
      if (!testQR || testQR.length < 100) {
        throw new Error('QR generation test failed');
      }
      
      logger.info('✅ [Strategic] QR generation test passed');
      
      this.isReady = true;
      logger.info('🎉 [Strategic] All dependencies ready!');
      
    } catch (error) {
      logger.error('❌ [Strategic] Dependency initialization failed:', {
        error: error.message,
        stack: error.stack
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
    
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = this.baileys;
    
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
        logger.info('🔲 [Strategic] QR received, processing...');
        
        session.connectionAttempts++;
        
        try {
          const qrDataUrl = await this.QRCode.toDataURL(update.qr, {
            type: 'image/png',
            quality: 1.0,
            margin: 4,
            width: 512,
            errorCorrectionLevel: 'H',
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });

          session.qrCode = qrDataUrl;
          session.status = 'qr';
          session.lastActivity = new Date();

          this.emit('qr', tenantId, qrDataUrl);
          this.emit('status', tenantId, 'qr');

          logger.info('✅ [Strategic] QR ready!', {
            tenantId: tenantId?.substring(0, 8),
            attempt: session.connectionAttempts,
            qrLength: qrDataUrl.length
          });

        } catch (qrError) {
          logger.error('❌ [Strategic] QR conversion failed:', qrError);
          // Use raw QR as fallback
          session.qrCode = update.qr;
          session.status = 'qr';
          this.emit('qr', tenantId, update.qr);
          this.emit('status', tenantId, 'qr');
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