// RAILWAY QR SESSION MANAGER - PRODUCTION OPTIMIZED
// SOLUÇÃO DEFINITIVA PARA QR CODE EM PRODUÇÃO
// Otimizado especificamente para Railway com timeouts aumentados e fallbacks múltiplos

import { EventEmitter } from 'events';
import { logger } from '@/lib/utils/logger';

interface RailwaySession {
  status: 'disconnected' | 'connecting' | 'initializing' | 'qr' | 'connected';
  qrCode: string | null;
  phoneNumber: string | null;
  businessName: string | null;
  lastActivity: Date;
  retryCount: number;
  connectionAttempts: number;
  initializationStarted: Date | null;
  qrGenerationStarted: Date | null;
}

export class RailwayQRSessionManager extends EventEmitter {
  private sessions: Map<string, RailwaySession> = new Map();
  private baileys: any = null;
  private QRCode: any = null;
  private isReady: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // RAILWAY OPTIMIZED TIMEOUTS - INCREASED FOR BETTER QR GENERATION
  private readonly INITIALIZATION_TIMEOUT = 180000; // 3 minutes for Railway
  private readonly QR_TIMEOUT = 300000; // 5 minutes for QR generation
  private readonly CONNECTION_TIMEOUT = 90000; // 1.5 minutes for connection
  private readonly RETRY_DELAY = 15000; // 15 seconds between retries
  private readonly MAX_RETRIES = 5; // More retries for Railway

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  // GUARANTEED INITIALIZATION WITH RAILWAY OPTIMIZATIONS
  private async ensureDependencies(): Promise<void> {
    if (this.isReady) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeDependenciesWithTimeout();
    return this.initializationPromise;
  }

  private async initializeDependenciesWithTimeout(): Promise<void> {
    const startTime = Date.now();
    
    const initPromise = this.initializeDependencies();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Dependency initialization timeout after ${this.INITIALIZATION_TIMEOUT}ms`));
      }, this.INITIALIZATION_TIMEOUT);
    });

    try {
      await Promise.race([initPromise, timeoutPromise]);
      logger.info('✅ [Railway QR] Dependencies initialized successfully', {
        duration: Date.now() - startTime
      });
    } catch (error) {
      logger.error('❌ [Railway QR] Dependency initialization failed:', error);
      this.isReady = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  private async initializeDependencies(): Promise<void> {
    try {
      // STRATEGY 1: Load Baileys with multiple import strategies
      logger.info('📦 [Railway QR] Loading Baileys with multiple strategies...');
      
      let baileysModule = null;
      const strategies = [
        () => import('@whiskeysockets/baileys'),
        () => require('@whiskeysockets/baileys'),
        async () => {
          // Dynamic require with path resolution
          const path = require.resolve('@whiskeysockets/baileys');
          delete require.cache[path];
          return require(path);
        }
      ];

      for (let i = 0; i < strategies.length; i++) {
        try {
          logger.info(`🔄 [Railway QR] Trying Baileys strategy ${i + 1}...`);
          baileysModule = await strategies[i]();
          if (baileysModule) {
            logger.info(`✅ [Railway QR] Baileys loaded with strategy ${i + 1}`);
            break;
          }
        } catch (strategyError) {
          logger.warn(`⚠️ [Railway QR] Strategy ${i + 1} failed:`, strategyError.message);
        }
      }

      if (!baileysModule) {
        throw new Error('All Baileys import strategies failed');
      }

      // Normalize Baileys exports
      this.baileys = baileysModule.default || baileysModule;
      if (baileysModule.makeWASocket) {
        this.baileys.makeWASocket = baileysModule.makeWASocket;
        this.baileys.useMultiFileAuthState = baileysModule.useMultiFileAuthState;
        this.baileys.DisconnectReason = baileysModule.DisconnectReason;
      }

      // Validate required functions
      const requiredFunctions = ['makeWASocket', 'useMultiFileAuthState', 'DisconnectReason'];
      const missingFunctions = requiredFunctions.filter(fn => !this.baileys[fn]);
      
      if (missingFunctions.length > 0) {
        throw new Error(`Missing Baileys functions: ${missingFunctions.join(', ')}`);
      }

      logger.info('📦 [Railway QR] Loading QRCode with multiple strategies...');
      
      const qrStrategies = [
        () => require('qrcode'),
        () => import('qrcode').then(m => m.default || m),
        async () => {
          const path = require.resolve('qrcode');
          delete require.cache[path];
          return require(path);
        }
      ];

      for (let i = 0; i < qrStrategies.length; i++) {
        try {
          logger.info(`🔄 [Railway QR] Trying QRCode strategy ${i + 1}...`);
          this.QRCode = await qrStrategies[i]();
          
          if (this.QRCode && typeof this.QRCode.toDataURL === 'function') {
            logger.info(`✅ [Railway QR] QRCode loaded with strategy ${i + 1}`);
            break;
          }
        } catch (strategyError) {
          logger.warn(`⚠️ [Railway QR] QRCode strategy ${i + 1} failed:`, strategyError.message);
        }
      }

      if (!this.QRCode || typeof this.QRCode.toDataURL !== 'function') {
        throw new Error('QRCode library failed to load with all strategies');
      }

      // COMPREHENSIVE QR TESTING - Multiple configurations for Railway
      logger.info('🧪 [Railway QR] Running comprehensive QR generation tests...');
      
      const testConfigs = [
        // High quality for Railway production
        {
          type: 'image/png',
          quality: 1.0,
          margin: 4,
          width: 512,
          errorCorrectionLevel: 'H',
          color: { dark: '#000000', light: '#FFFFFF' }
        },
        // Medium quality fallback
        {
          type: 'image/png',
          quality: 0.9,
          margin: 2,
          width: 256,
          errorCorrectionLevel: 'M'
        },
        // Minimal configuration
        { width: 256, margin: 2 },
        // Ultra minimal
        {}
      ];

      let testPassed = false;
      for (let i = 0; i < testConfigs.length; i++) {
        try {
          const testData = `railway-qr-test-${Date.now()}-${i}`;
          const testQR = await this.QRCode.toDataURL(testData, testConfigs[i]);
          
          if (testQR && testQR.length > 100 && testQR.startsWith('data:image/png')) {
            logger.info(`✅ [Railway QR] QR test passed with config ${i + 1}`, {
              config: testConfigs[i],
              qrLength: testQR.length,
              hasCorrectPrefix: testQR.startsWith('data:image/png;base64,')
            });
            testPassed = true;
            break;
          }
        } catch (testError) {
          logger.warn(`⚠️ [Railway QR] Test config ${i + 1} failed:`, testError.message);
        }
      }

      if (!testPassed) {
        throw new Error('All QR generation test configurations failed');
      }

      // Test additional QRCode functions
      try {
        const terminalTest = await this.QRCode.toString('test-terminal', { type: 'terminal' });
        logger.info('✅ [Railway QR] Terminal QR generation available');
      } catch (terminalError) {
        logger.warn('⚠️ [Railway QR] Terminal QR not available:', terminalError.message);
      }

      this.isReady = true;
      logger.info('🎉 [Railway QR] All dependencies ready for production!');
      
    } catch (error) {
      logger.error('❌ [Railway QR] Dependency initialization failed:', {
        error: error.message,
        stack: error.stack,
        nodeVersion: process.version,
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        railwayId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8)
      });
      this.isReady = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  async initializeSession(tenantId: string): Promise<void> {
    const startTime = Date.now();
    logger.info('🚀 [Railway QR] Starting session initialization for production', {
      tenantId: tenantId?.substring(0, 8),
      dependenciesReady: this.isReady,
      isRailway: !!process.env.RAILWAY_PROJECT_ID
    });

    // Ensure dependencies with timeout
    await this.ensureDependencies();

    if (!this.isReady) {
      throw new Error('Dependencies failed to initialize for Railway');
    }

    // Create Railway-optimized session
    const session: RailwaySession = {
      status: 'initializing',
      qrCode: null,
      phoneNumber: null,
      businessName: null,
      lastActivity: new Date(),
      retryCount: 0,
      connectionAttempts: 0,
      initializationStarted: new Date(),
      qrGenerationStarted: null
    };

    this.sessions.set(tenantId, session);
    this.emit('status', tenantId, 'initializing');

    try {
      await this.createRailwayOptimizedConnection(tenantId);
      
      logger.info('✅ [Railway QR] Session initialization completed', {
        tenantId: tenantId?.substring(0, 8),
        duration: Date.now() - startTime
      });
      
    } catch (error) {
      logger.error('❌ [Railway QR] Session initialization failed:', error);
      session.status = 'disconnected';
      this.emit('status', tenantId, 'disconnected');
      throw error;
    }
  }

  private async createRailwayOptimizedConnection(tenantId: string): Promise<void> {
    logger.info('🔌 [Railway QR] Creating Railway-optimized WhatsApp connection...');
    
    const makeWASocket = this.baileys.makeWASocket;
    const useMultiFileAuthState = this.baileys.useMultiFileAuthState;
    const DisconnectReason = this.baileys.DisconnectReason;

    // RAILWAY FILE SYSTEM OPTIMIZATION
    const fs = require('fs');
    const path = require('path');
    
    // Multiple storage strategies for Railway
    const storageStrategies = [
      // Strategy 1: Railway persistent volume
      () => {
        if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
          return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, '.whatsapp-sessions', `railway-${tenantId}`);
        }
        throw new Error('No Railway volume mount path');
      },
      // Strategy 2: Project directory with Railway permissions
      () => {
        const projectDir = path.join(process.cwd(), '.railway-sessions', `session-${tenantId}`);
        return projectDir;
      },
      // Strategy 3: /tmp fallback
      () => path.join('/tmp', '.railway-whatsapp', `session-${tenantId}`)
    ];

    let authDir: string | null = null;
    for (let i = 0; i < storageStrategies.length; i++) {
      try {
        const testDir = storageStrategies[i]();
        fs.mkdirSync(testDir, { recursive: true, mode: 0o755 });
        
        // Test write permissions
        const testFile = path.join(testDir, 'test-write.txt');
        fs.writeFileSync(testFile, 'railway-test');
        fs.unlinkSync(testFile);
        
        authDir = testDir;
        logger.info(`✅ [Railway QR] Using storage strategy ${i + 1}: ${authDir}`);
        break;
        
      } catch (storageError) {
        logger.warn(`⚠️ [Railway QR] Storage strategy ${i + 1} failed:`, storageError.message);
      }
    }

    if (!authDir) {
      throw new Error('All Railway storage strategies failed');
    }

    logger.info('🔐 [Railway QR] Setting up Railway auth state...', { authDir });
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    logger.info('✅ [Railway QR] Creating Railway-optimized socket...');
    
    logger.info('🔌 [Railway QR] Creating socket with optimized config...');
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false, // CRITICAL: Don't print to terminal
      browser: ['LocAI Railway', 'Chrome', '120.0.0'],
      // RAILWAY OPTIMIZED TIMEOUTS - INCREASED
      connectTimeoutMs: this.CONNECTION_TIMEOUT,
      qrTimeout: this.QR_TIMEOUT,
      defaultQueryTimeoutMs: 45000, // Increased
      keepAliveIntervalMs: 30000, // Increased
      markOnlineOnConnect: true,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      // Additional Railway optimizations
      retryRequestDelayMs: 2000, // Increased
      maxMsgRetryCount: 5, // Increased
      // FORCE QR GENERATION
      shouldIgnoreJid: () => false,
      shouldSyncHistoryMessage: () => false,
      logger: this.createRailwayLogger()
    });
    logger.info('✅ [Railway QR] Socket created successfully');

    const session = this.sessions.get(tenantId)!;
    session.status = 'connecting';
    this.emit('status', tenantId, 'connecting');

    // RAILWAY QR TIMEOUT with longer duration
    const qrTimeoutId = setTimeout(() => {
      if (session && session.status === 'connecting' && !session.qrCode) {
        logger.warn('⏰ [Railway QR] QR timeout after 3 minutes - retrying');
        session.status = 'disconnected';
        this.emit('status', tenantId, 'disconnected');
        
        // Auto-retry for Railway
        if (session.retryCount < this.MAX_RETRIES) {
          setTimeout(() => {
            logger.info('🔄 [Railway QR] Auto-retrying after timeout...');
            this.initializeSession(tenantId).catch(error => {
              logger.error('❌ [Railway QR] Auto-retry failed:', error);
            });
          }, this.RETRY_DELAY);
        }
      }
    }, this.QR_TIMEOUT);

    // ENHANCED CONNECTION UPDATE HANDLER FOR RAILWAY
    socket.ev.on('connection.update', async (update) => {
      const currentSession = this.sessions.get(tenantId);
      if (!currentSession) return;

      logger.info('📡 [Railway QR] Connection update:', {
        tenantId: tenantId?.substring(0, 8),
        connection: update.connection,
        hasQR: !!update.qr,
        qrLength: update.qr?.length,
        qrType: typeof update.qr,
        status: currentSession.status,
        isRailway: !!process.env.RAILWAY_PROJECT_ID
      });

      if (update.qr) {
        clearTimeout(qrTimeoutId);
        currentSession.qrGenerationStarted = new Date();
        currentSession.connectionAttempts++;
        
        logger.info('🔲 [Railway QR] QR received - starting Railway processing...', {
          attempt: currentSession.connectionAttempts,
          qrLength: update.qr?.length,
          qrSample: update.qr?.substring(0, 30)
        });
        
        try {
          let qrDataUrl = null;
          
          // RAILWAY OPTIMIZED QR GENERATION WITH MULTIPLE FALLBACKS
          const railwayConfigs = [
            // Config 1: Railway production quality
            {
              type: 'image/png',
              quality: 1.0,
              margin: 4,
              width: 512,
              errorCorrectionLevel: 'H',
              color: { dark: '#000000', light: '#FFFFFF' }
            },
            // Config 2: Railway standard
            {
              type: 'image/png',
              quality: 0.9,
              margin: 3,
              width: 256,
              errorCorrectionLevel: 'M'
            },
            // Config 3: Railway minimal
            { width: 256, margin: 2 },
            // Config 4: Ultra minimal for Railway
            { width: 128 }
          ];

          for (let configIndex = 0; configIndex < railwayConfigs.length; configIndex++) {
            try {
              logger.info(`🔧 [Railway QR] Trying Railway config ${configIndex + 1}...`);
              
              qrDataUrl = await Promise.race([
                this.QRCode.toDataURL(update.qr, railwayConfigs[configIndex]),
                new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('QR generation timeout')), 15000);
                })
              ]);
              
              if (qrDataUrl && qrDataUrl.length > 100 && qrDataUrl.startsWith('data:image')) {
                logger.info(`✅ [Railway QR] Generated with config ${configIndex + 1}`, {
                  configUsed: configIndex + 1,
                  qrLength: qrDataUrl.length,
                  isValidDataUrl: qrDataUrl.startsWith('data:image/png;base64,')
                });
                break;
              }
              
            } catch (configError) {
              logger.warn(`⚠️ [Railway QR] Config ${configIndex + 1} failed:`, configError.message);
            }
          }

          // RAILWAY ULTIMATE FALLBACK STRATEGIES
          if (!qrDataUrl || qrDataUrl.length < 100) {
            logger.warn('⚠️ [Railway QR] All configs failed, trying Railway fallbacks...');
            
            try {
              // Fallback 1: Terminal format conversion
              const terminalQR = await this.QRCode.toString(update.qr, { type: 'terminal' });
              if (terminalQR && terminalQR.length > 50) {
                // Convert terminal to base64 for transport
                qrDataUrl = `data:text/plain;base64,${Buffer.from(terminalQR).toString('base64')}`;
                logger.info('✅ [Railway QR] Using terminal fallback');
              }
            } catch (terminalError) {
              logger.warn('⚠️ [Railway QR] Terminal fallback failed:', terminalError.message);
            }
            
            // Fallback 2: Raw QR string
            if (!qrDataUrl) {
              qrDataUrl = `data:text/plain;base64,${Buffer.from(update.qr).toString('base64')}`;
              logger.info('✅ [Railway QR] Using raw QR fallback');
            }
          }

          if (qrDataUrl) {
            currentSession.qrCode = qrDataUrl;
            currentSession.status = 'qr';
            currentSession.lastActivity = new Date();

            this.emit('qr', tenantId, qrDataUrl);
            this.emit('status', tenantId, 'qr');

            const generationTime = currentSession.qrGenerationStarted 
              ? Date.now() - currentSession.qrGenerationStarted.getTime()
              : 0;

            logger.info('🎉 [Railway QR] QR READY FOR PRODUCTION!', {
              tenantId: tenantId?.substring(0, 8),
              attempt: currentSession.connectionAttempts,
              generationTimeMs: generationTime,
              qrLength: qrDataUrl.length,
              qrPrefix: qrDataUrl.substring(0, 40),
              isRailway: !!process.env.RAILWAY_PROJECT_ID
            });
          } else {
            throw new Error('All Railway QR generation strategies failed');
          }

        } catch (qrError) {
          logger.error('❌ [Railway QR] QR processing failed completely:', {
            error: qrError.message,
            stack: qrError.stack,
            tenantId: tenantId?.substring(0, 8),
            attempt: currentSession.connectionAttempts
          });
          
          // Even in error, provide fallback
          currentSession.qrCode = update.qr; // Raw QR as absolute last resort
          currentSession.status = 'qr';
          this.emit('qr', tenantId, update.qr);
          this.emit('status', tenantId, 'qr');
          
          logger.warn('⚠️ [Railway QR] Using raw QR as final fallback');
        }
      }

      // Connection success
      if (update.connection === 'open') {
        clearTimeout(qrTimeoutId);
        currentSession.status = 'connected';
        currentSession.qrCode = null;
        currentSession.phoneNumber = socket.user?.id?.split(':')[0] || null;
        currentSession.businessName = socket.user?.name || 'WhatsApp Railway';
        currentSession.retryCount = 0;

        this.emit('connected', tenantId, currentSession.phoneNumber);
        this.emit('status', tenantId, 'connected');

        const totalTime = currentSession.initializationStarted 
          ? Date.now() - currentSession.initializationStarted.getTime()
          : 0;

        logger.info('🎉 [Railway QR] CONNECTED SUCCESSFULLY IN PRODUCTION!', {
          tenantId: tenantId?.substring(0, 8),
          phone: currentSession.phoneNumber?.substring(0, 6) + '***',
          totalTimeMs: totalTime,
          attempts: currentSession.connectionAttempts
        });
      }

      // Connection closed - Railway retry logic
      if (update.connection === 'close') {
        clearTimeout(qrTimeoutId);
        const disconnectReason = (update.lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = disconnectReason !== DisconnectReason.loggedOut;

        logger.info('🔌 [Railway QR] Connection closed:', {
          tenantId: tenantId?.substring(0, 8),
          reason: disconnectReason,
          shouldReconnect,
          retryCount: currentSession.retryCount
        });

        if (shouldReconnect && currentSession.retryCount < this.MAX_RETRIES) {
          currentSession.retryCount++;
          const delay = this.RETRY_DELAY * currentSession.retryCount;
          
          logger.info(`🔄 [Railway QR] Reconnecting... (${currentSession.retryCount}/${this.MAX_RETRIES}) in ${delay}ms`);
          
          setTimeout(async () => {
            try {
              await this.createRailwayOptimizedConnection(tenantId);
            } catch (retryError) {
              logger.error('❌ [Railway QR] Retry connection failed:', retryError);
              currentSession.status = 'disconnected';
              this.emit('status', tenantId, 'disconnected');
            }
          }, delay);
        } else {
          currentSession.status = 'disconnected';
          this.emit('status', tenantId, 'disconnected');
        }
      }
    });

    // Credentials handler
    socket.ev.on('creds.update', () => {
      logger.info('🔑 [Railway QR] Credentials updated - saving...');
      saveCreds().catch(error => {
        logger.error('❌ [Railway QR] Failed to save credentials:', error);
      });
    });

    logger.info('✅ [Railway QR] All Railway handlers ready, connection active');
  }

  private createRailwayLogger() {
    return {
      fatal: (...args: any[]) => {
        logger.error('[Railway Baileys FATAL]', ...args);
      },
      error: (...args: any[]) => {
        logger.error('[Railway Baileys ERROR]', ...args);
      },
      warn: (...args: any[]) => {
        logger.warn('[Railway Baileys WARN]', ...args);
      },
      info: (...args: any[]) => {
        logger.info('[Railway Baileys INFO]', ...args);
      },
      debug: (...args: any[]) => {
        // Enable debug in production for QR troubleshooting
        logger.info('[Railway Baileys DEBUG]', ...args);
      },
      trace: () => {}, // Silent for Railway
      child: () => this.createRailwayLogger(),
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
    
    logger.info('📊 [Railway QR] Status check for production:', {
      tenantId: tenantId?.substring(0, 8),
      hasSession: !!session,
      status: session?.status,
      hasQR: !!session?.qrCode,
      qrLength: session?.qrCode?.length,
      dependenciesReady: this.isReady,
      isRailway: !!process.env.RAILWAY_PROJECT_ID
    });

    if (!session) {
      return {
        connected: false,
        status: 'disconnected',
        phoneNumber: null,
        businessName: null,
        qrCode: null,
        message: 'Railway session not found'
      };
    }

    return {
      connected: session.status === 'connected',
      status: session.status,
      phoneNumber: session.phoneNumber,
      businessName: session.businessName,
      qrCode: session.qrCode,
      message: session.status === 'qr' ? 'QR Code ready for Railway production' : undefined
    };
  }

  async disconnectSession(tenantId: string): Promise<void> {
    const session = this.sessions.get(tenantId);
    if (session) {
      session.status = 'disconnected';
      session.qrCode = null;
      this.sessions.delete(tenantId);
      this.emit('status', tenantId, 'disconnected');
      logger.info('🔌 [Railway QR] Session disconnected from production');
    }
  }
}

// Railway singleton
export const railwayQRSessionManager = new RailwayQRSessionManager();