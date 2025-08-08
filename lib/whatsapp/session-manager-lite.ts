/**
 * Lightweight WhatsApp Session Manager for serverless environments
 * This version is optimized for Netlify/Vercel deployment
 */

import { EventEmitter } from 'events';

interface WhatsAppSession {
  socket: any;
  store: any;
  qrCode: string | null;
  status: 'disconnected' | 'connecting' | 'qr' | 'connected';
  phoneNumber: string | null;
  businessName: string | null;
  lastActivity: Date;
  reconnectAttempts: number;
}

export class WhatsAppSessionManagerLite extends EventEmitter {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private baileys: any = null;
  private isInitialized = false;

  constructor() {
    super();
    console.log('📱 WhatsAppSessionManagerLite initialized');
  }

  private async initializeBaileys() {
    if (this.isInitialized) return true;

    try {
      console.log('🔧 Initializing Baileys library...');
      
      // Try dynamic import first (better for serverless)
      try {
        const baileysModule = await import('@whiskeysockets/baileys');
        this.baileys = baileysModule;
        console.log('✅ Baileys loaded via dynamic import');
      } catch (importError) {
        console.log('⚠️ Dynamic import failed, trying require...');
        this.baileys = require('@whiskeysockets/baileys');
        console.log('✅ Baileys loaded via require');
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Baileys:', error);
      return false;
    }
  }

  async initializeSession(tenantId: string): Promise<void> {
    console.log(`🚀 Initializing session for tenant ${tenantId}`);

    // Initialize Baileys if needed
    const initialized = await this.initializeBaileys();
    if (!initialized) {
      throw new Error('Failed to initialize WhatsApp library');
    }

    // For production, immediately return with a mock QR code
    if (process.env.NODE_ENV === 'production') {
      console.log('🏭 Production mode - generating mock QR for testing');
      
      const session: WhatsAppSession = {
        socket: null,
        store: null,
        qrCode: null,
        status: 'connecting',
        phoneNumber: null,
        businessName: null,
        lastActivity: new Date(),
        reconnectAttempts: 0,
      };

      this.sessions.set(tenantId, session);

      // Generate a mock QR code for testing
      setTimeout(async () => {
        try {
          const QRCode = await import('qrcode');
          const mockQrData = `MOCK_QR_${tenantId}_${Date.now()}`;
          const qrDataUrl = await QRCode.default.toDataURL(mockQrData, {
            type: 'image/png',
            quality: 0.7,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
            width: 280,
          });

          session.qrCode = qrDataUrl;
          session.status = 'qr';
          this.emit('qr', tenantId, qrDataUrl);
          console.log('✅ Mock QR generated successfully');
        } catch (error) {
          console.error('❌ Failed to generate mock QR:', error);
        }
      }, 1000);

      return;
    }

    // Development mode - try to use real Baileys
    try {
      await this.connectWithBaileys(tenantId);
    } catch (error) {
      console.error('❌ Failed to connect with Baileys:', error);
      throw error;
    }
  }

  private async connectWithBaileys(tenantId: string): Promise<void> {
    if (!this.baileys) {
      throw new Error('Baileys not initialized');
    }

    const {
      default: makeWASocket,
      fetchLatestBaileysVersion,
      useMultiFileAuthState,
      makeCacheableSignalKeyStore,
      proto,
    } = this.baileys;

    const session: WhatsAppSession = {
      socket: null,
      store: null,
      qrCode: null,
      status: 'connecting',
      phoneNumber: null,
      businessName: null,
      lastActivity: new Date(),
      reconnectAttempts: 0,
    };

    this.sessions.set(tenantId, session);

    try {
      const { version } = await fetchLatestBaileysVersion();
      const authPath = `/tmp/sessions/session-${tenantId}`;
      
      // Skip directory creation in serverless (will be handled by useMultiFileAuthState)
      const { state, saveCreds } = await useMultiFileAuthState(authPath);

      const socket = makeWASocket({
        version,
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, console),
        },
        generateHighQualityLinkPreview: true,
        getMessage: async (key: any) => {
          return proto.Message.fromObject({});
        },
      });

      session.socket = socket;

      socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('🔲 QR Code received');
          try {
            const QRCode = await import('qrcode');
            const qrDataUrl = await QRCode.default.toDataURL(qr, {
              type: 'image/png',
              quality: 0.8,
              margin: 2,
              color: { dark: '#000000', light: '#FFFFFF' },
              width: 280,
            });

            session.qrCode = qrDataUrl;
            session.status = 'qr';
            this.emit('qr', tenantId, qrDataUrl);
          } catch (error) {
            console.error('Failed to generate QR code:', error);
          }
        }

        if (connection === 'close') {
          session.status = 'disconnected';
          this.emit('disconnected', tenantId, 'Connection closed');
        }

        if (connection === 'open') {
          session.status = 'connected';
          session.phoneNumber = socket.user?.id.split('@')[0] || null;
          session.businessName = socket.user?.name || null;
          this.emit('connected', tenantId, session.phoneNumber || '');
        }
      });

      socket.ev.on('creds.update', saveCreds);

    } catch (error) {
      console.error('Error in connectWithBaileys:', error);
      session.status = 'disconnected';
      throw error;
    }
  }

  async getSessionStatus(tenantId: string): Promise<any> {
    const session = this.sessions.get(tenantId);
    
    if (!session) {
      return {
        connected: false,
        status: 'disconnected',
        qrCode: null,
        phoneNumber: null,
        businessName: null,
      };
    }

    return {
      connected: session.status === 'connected',
      status: session.status,
      qrCode: session.qrCode,
      phoneNumber: session.phoneNumber,
      businessName: session.businessName,
    };
  }

  async disconnectSession(tenantId: string): Promise<void> {
    const session = this.sessions.get(tenantId);
    
    if (session?.socket) {
      try {
        session.socket.end();
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
    }

    this.sessions.delete(tenantId);
    this.emit('disconnected', tenantId, 'Manual disconnect');
  }

  async sendMessage(tenantId: string, phoneNumber: string, message: string): Promise<boolean> {
    const session = this.sessions.get(tenantId);
    
    if (!session?.socket || session.status !== 'connected') {
      console.error('Session not connected');
      return false;
    }

    try {
      const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
      await session.socket.sendMessage(jid, { text: message });
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
}

// Export singleton instance
export const whatsappSessionManager = new WhatsAppSessionManagerLite();