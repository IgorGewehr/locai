import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  useMultiFileAuthState,
  WAMessageContent,
  WAMessageKey,
} from '@whiskeysockets/baileys';

// Fallback import for makeInMemoryStore
let makeInMemoryStore: any;
try {
  const baileys = require('@whiskeysockets/baileys');
  makeInMemoryStore = baileys.makeInMemoryStore;
} catch (error) {
  console.warn('makeInMemoryStore not available, using fallback');
  makeInMemoryStore = null;
}
import { Boom } from '@hapi/boom';
import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';
import { settingsService } from '@/lib/services/settings-service';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { EventEmitter } from 'events';

interface WhatsAppSession {
  socket: ReturnType<typeof makeWASocket> | null;
  store: ReturnType<typeof makeInMemoryStore> | null;
  qrCode: string | null;
  status: 'disconnected' | 'connecting' | 'qr' | 'connected';
  phoneNumber: string | null;
  businessName: string | null;
  lastActivity: Date;
  reconnectAttempts: number;
}

interface SessionEvents {
  'qr': (tenantId: string, qr: string) => void;
  'connected': (tenantId: string, phoneNumber: string) => void;
  'disconnected': (tenantId: string, reason: string) => void;
  'message': (tenantId: string, message: any) => void;
  'status': (tenantId: string, status: WhatsAppSession['status']) => void;
}

export class WhatsAppSessionManager extends EventEmitter {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private logger = pino({ level: 'info' });
  private sessionDir = path.join(process.cwd(), '.sessions');
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private statusListeners: Map<string, () => void> = new Map();

  constructor() {
    super();
    this.ensureSessionDirectory();
    this.startCleanupInterval();
  }

  private ensureSessionDirectory() {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  private startCleanupInterval() {
    // Clean up inactive sessions every 30 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [tenantId, session] of this.sessions.entries()) {
        const inactiveTime = now - session.lastActivity.getTime();
        if (inactiveTime > 60 * 60 * 1000 && session.status === 'disconnected') {
          this.logger.info(`Cleaning up inactive session for tenant ${tenantId}`);
          this.destroySession(tenantId);
        }
      }
    }, 30 * 60 * 1000);
  }

  async initializeSession(tenantId: string): Promise<void> {
    this.logger.info(`🚀 Initializing WhatsApp session for tenant ${tenantId}`);
    
    // Always destroy existing session before creating new one to ensure clean state
    if (this.sessions.has(tenantId)) {
      const existingSession = this.sessions.get(tenantId)!;
      if (existingSession.status === 'connected') {
        this.logger.info(`✅ Session already connected for tenant ${tenantId}`);
        return;
      }
      // Destroy existing session to get fresh QR code
      this.logger.info(`🔄 Destroying existing session for tenant ${tenantId}`);
      await this.destroySession(tenantId);
    }

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
    this.emit('status', tenantId, 'connecting');
    await this.updateSessionStatus(tenantId, 'connecting');

    try {
      await this.connectSession(tenantId);
      this.logger.info(`✅ Session initialization completed for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize session for tenant ${tenantId}:`, error);
      session.status = 'disconnected';
      this.emit('status', tenantId, 'disconnected');
      await this.updateSessionStatus(tenantId, 'disconnected');
      throw error;
    }
  }

  private async connectSession(tenantId: string): Promise<void> {
    const session = this.sessions.get(tenantId);
    if (!session) {
      throw new Error(`No session found for tenant ${tenantId}`);
    }

    const { version } = await fetchLatestBaileysVersion();
    const sessionPath = path.join(this.sessionDir, `session-${tenantId}`);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    let store: any = null;
    if (makeInMemoryStore) {
      try {
        store = makeInMemoryStore({
          logger: this.logger.child({ stream: 'store' }),
        });
      } catch (error) {
        this.logger.warn('Failed to create in-memory store, proceeding without store');
        store = null;
      }
    } else {
      this.logger.warn('makeInMemoryStore not available, proceeding without store');
    }
    
    session.store = store;

    const socket = makeWASocket({
      version,
      logger: this.logger.child({ stream: 'socket' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger),
      },
      generateHighQualityLinkPreview: true,
      getMessage: async (key: WAMessageKey) => {
        if (store) {
          const msg = await store.loadMessage(key.remoteJid!, key.id!);
          return msg?.message || undefined;
        }
        return proto.Message.fromObject({});
      },
    });

    session.socket = socket;
    if (store) {
      store.bind(socket.ev);
    }

    // Handle connection updates
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        this.logger.info(`🔲 QR Code generated for tenant ${tenantId}`);
        this.logger.info(`📄 QR Code length: ${qr.length} characters`);
        
        try {
          // Import QRCode library dynamically
          const QRCode = require('qrcode');
          
          // Generate QR code as data URL
          const qrDataUrl = await QRCode.toDataURL(qr, {
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            width: 256
          });
          
          this.logger.info(`🎨 QR Code data URL generated successfully`);
          
          session.qrCode = qrDataUrl;
          session.status = 'qr';
          session.lastActivity = new Date();
          
          this.emit('qr', tenantId, qrDataUrl);
          this.emit('status', tenantId, 'qr');
          await this.updateSessionStatus(tenantId, 'qr', qrDataUrl);
          
          this.logger.info(`✅ QR Code saved and emitted for tenant ${tenantId}`);
        } catch (error) {
          this.logger.error(`❌ Error generating QR code data URL:`, error);
          
          // Fallback: save raw QR string
          session.qrCode = qr;
          session.status = 'qr';
          session.lastActivity = new Date();
          
          this.emit('qr', tenantId, qr);
          this.emit('status', tenantId, 'qr');
          await this.updateSessionStatus(tenantId, 'qr', qr);
        }
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect && session.reconnectAttempts < 5) {
          session.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, session.reconnectAttempts), 30000);
          
          this.logger.info(`Reconnecting session for tenant ${tenantId} in ${delay}ms (attempt ${session.reconnectAttempts})`);
          
          const timer = setTimeout(() => {
            this.connectSession(tenantId);
          }, delay);
          
          this.reconnectTimers.set(tenantId, timer);
        } else {
          session.status = 'disconnected';
          this.emit('disconnected', tenantId, 'Connection closed');
          this.emit('status', tenantId, 'disconnected');
          await this.updateSessionStatus(tenantId, 'disconnected');
          
          if ((lastDisconnect?.error as Boom)?.output?.statusCode === DisconnectReason.loggedOut) {
            // Clear session data if logged out
            await this.clearSessionData(tenantId);
          }
        }
      } else if (connection === 'open') {
        session.reconnectAttempts = 0;
        session.status = 'connected';
        session.qrCode = null;
        
        // Get phone number and business info
        const phoneNumber = socket.user?.id.split(':')[0] || '';
        const businessName = socket.user?.name || '';
        
        session.phoneNumber = phoneNumber;
        session.businessName = businessName;
        
        this.emit('connected', tenantId, phoneNumber);
        this.emit('status', tenantId, 'connected');
        await this.updateSessionStatus(tenantId, 'connected', null, phoneNumber, businessName);
        
        this.logger.info(`WhatsApp connected for tenant ${tenantId}: ${phoneNumber} (${businessName})`);
        
        // Clear any reconnect timers
        const timer = this.reconnectTimers.get(tenantId);
        if (timer) {
          clearTimeout(timer);
          this.reconnectTimers.delete(tenantId);
        }
      }
    });

    // Handle credentials update
    socket.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const msg of messages) {
          if (!msg.key.fromMe && msg.message) {
            session.lastActivity = new Date();
            this.emit('message', tenantId, msg);
            
            // Process the message through our existing handler
            await this.processIncomingMessage(tenantId, msg);
          }
        }
      }
    });

    // Handle message updates (receipts, etc.)
    socket.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        this.logger.debug(`Message ${update.key.id} updated:`, update.update);
      }
    });

    // Handle group updates
    socket.ev.on('groups.update', (updates) => {
      for (const update of updates) {
        this.logger.debug(`Group ${update.id} updated`);
      }
    });
  }

  private async processIncomingMessage(tenantId: string, message: proto.IWebMessageInfo) {
    try {
      this.logger.info(`📨 Processing incoming message for tenant ${tenantId}`);
      this.logger.info(`Message from: ${message.key.remoteJid}`);
      this.logger.info(`Message content: ${message.message?.conversation || message.message?.extendedTextMessage?.text || 'No text content'}`);
      
      // Check if message should be processed (not from groups)
      const { shouldProcessMessage } = await import('@/lib/utils/whatsapp-utils');
      
      if (!shouldProcessMessage(message.key.remoteJid || '')) {
        this.logger.info(`🚫 Ignoring message from: ${message.key.remoteJid} (group or invalid)`);
        return;
      }
      
      // Import our existing message handler
      const { WhatsAppMessageHandler } = await import('./message-handler');
      const handler = new WhatsAppMessageHandler(tenantId);
      
      // Convert Baileys message format to our expected format
      const formattedMessage = {
        object: 'whatsapp_business_account',
        entry: [{
          id: tenantId,
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: this.sessions.get(tenantId)?.phoneNumber || '',
                phone_number_id: tenantId,
              },
              messages: [{
                from: message.key.remoteJid?.replace('@s.whatsapp.net', '') || '',
                id: message.key.id || '',
                timestamp: String(message.messageTimestamp || Date.now() / 1000),
                text: {
                  body: message.message?.conversation || 
                        message.message?.extendedTextMessage?.text || 
                        '',
                },
                type: 'text',
              }],
            },
            field: 'messages',
          }],
        }],
      };
      
      this.logger.info(`🔄 Calling message handler with formatted message`);
      await handler.handleWebhook(formattedMessage);
      this.logger.info(`✅ Message processed successfully`);
    } catch (error) {
      this.logger.error(`❌ Error processing message for tenant ${tenantId}:`, error);
      this.logger.error(`Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    }
  }

  async sendMessage(tenantId: string, phoneNumber: string, message: string, mediaUrl?: string): Promise<boolean> {
    this.logger.info(`📤 Attempting to send message for tenant ${tenantId} to ${phoneNumber}`);
    
    const session = this.sessions.get(tenantId);
    if (!session || !session.socket || session.status !== 'connected') {
      this.logger.error(`❌ WhatsApp not connected for tenant ${tenantId}. Status: ${session?.status}`);
      throw new Error('WhatsApp not connected');
    }

    try {
      const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
      this.logger.info(`📱 Sending to JID: ${jid}`);
      
      let content: WAMessageContent;
      
      if (mediaUrl) {
        // Handle media messages
        this.logger.info(`📥 Fetching media from: ${mediaUrl}`);
        const response = await fetch(mediaUrl);
        
        if (!response.ok) {
          this.logger.error(`❌ Failed to fetch media: ${response.status} ${response.statusText}`);
          throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        this.logger.info(`📁 Downloaded media size: ${buffer.byteLength} bytes`);
        
        if (mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || mediaUrl.includes('.png') || mediaUrl.includes('.webp')) {
          this.logger.info(`📸 Sending as image`);
          content = {
            image: Buffer.from(buffer),
            caption: message,
          } as any;
        } else if (mediaUrl.includes('.mp4') || mediaUrl.includes('.mov')) {
          this.logger.info(`🎥 Sending as video`);
          content = {
            video: Buffer.from(buffer),
            caption: message,
          } as any;
        } else {
          this.logger.info(`📄 Sending as document`);
          content = {
            document: Buffer.from(buffer),
            caption: message,
            fileName: path.basename(mediaUrl),
          } as any;
        }
      } else {
        content = { 
          text: message 
        } as any;
      }
      
      this.logger.info(`📨 Sending message content:`, content);
      await session.socket.sendMessage(jid, content as any);
      session.lastActivity = new Date();
      this.logger.info(`✅ Message sent successfully!`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send message for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  async getSessionStatus(tenantId: string): Promise<{
    connected: boolean;
    status: WhatsAppSession['status'];
    phoneNumber: string | null;
    businessName: string | null;
    qrCode: string | null;
  }> {
    const session = this.sessions.get(tenantId);
    
    if (!session) {
      return {
        connected: false,
        status: 'disconnected',
        phoneNumber: null,
        businessName: null,
        qrCode: null,
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
    if (!session) return;

    try {
      if (session.socket) {
        await session.socket.logout();
      }
    } catch (error) {
      this.logger.error(`Error disconnecting session for tenant ${tenantId}:`, error);
    }

    await this.clearSessionData(tenantId);
    this.destroySession(tenantId);
  }

  private async clearSessionData(tenantId: string) {
    const sessionPath = path.join(this.sessionDir, `session-${tenantId}`);
    
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.error(`Error clearing session data for tenant ${tenantId}:`, error);
    }
  }

  private async destroySession(tenantId: string) {
    const session = this.sessions.get(tenantId);
    if (!session) return;

    // Close socket
    if (session.socket) {
      try {
        session.socket.ev.removeAllListeners('connection.update');
        session.socket.ws.close();
      } catch (error) {
        this.logger.error(`Error closing socket for tenant ${tenantId}:`, error);
      }
    }

    // Clear timers
    const timer = this.reconnectTimers.get(tenantId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(tenantId);
    }

    // Remove session
    this.sessions.delete(tenantId);
    
    // Remove status listener
    const listener = this.statusListeners.get(tenantId);
    if (listener) {
      listener();
      this.statusListeners.delete(tenantId);
    }
    
    // Clear session files
    await this.clearSessionData(tenantId);
  }

  private async updateSessionStatus(
    tenantId: string, 
    status: WhatsAppSession['status'],
    qrCode?: string | null,
    phoneNumber?: string,
    businessName?: string
  ) {
    try {
      const settingsRef = doc(db, 'settings', tenantId);
      const settingsDoc = await getDoc(settingsRef);
      
      const currentSettings = settingsDoc.exists() ? settingsDoc.data() : {};
      
      const whatsappSettings = {
        ...currentSettings.whatsapp,
        connected: status === 'connected',
        status,
        lastSync: new Date(),
        qrCode: qrCode || null,
      };
      
      if (phoneNumber) {
        whatsappSettings.phoneNumber = phoneNumber;
      }
      
      if (businessName) {
        whatsappSettings.businessName = businessName;
      }
      
      if (status === 'disconnected') {
        whatsappSettings.qrCode = null;
      }
      
      await setDoc(settingsRef, {
        ...currentSettings,
        whatsapp: whatsappSettings,
      }, { merge: true });
      
    } catch (error) {
      this.logger.error(`Error updating session status for tenant ${tenantId}:`, error);
    }
  }

  // Listen to status changes for a specific tenant
  onStatusChange(tenantId: string, callback: (status: any) => void): () => void {
    const settingsRef = doc(db, 'settings', tenantId);
    
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback(data.whatsapp || {});
      }
    });
    
    this.statusListeners.set(tenantId, unsubscribe);
    return unsubscribe;
  }

  // Get tenant ID by phone number
  async getTenantByPhoneNumber(phoneNumber: string): Promise<string | null> {
    try {
      for (const [tenantId, session] of this.sessions.entries()) {
        if (session.phoneNumber === phoneNumber) {
          return tenantId;
        }
      }
      
      // If not in memory, check Firestore  
      // @ts-ignore - suppress type checking for collection.get method
      const settingsSnapshot = await collection(db, 'settings').get();
      
      for (const doc of settingsSnapshot.docs) {
        const data = doc.data();
        if (data.whatsapp?.phoneNumber === phoneNumber) {
          return doc.id;
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error getting tenant by phone number ${phoneNumber}:`, error);
      return null;
    }
  }
}

// Singleton instance
export const whatsappSessionManager = new WhatsAppSessionManager();