/**
 * Mock WhatsApp Session Manager for production testing
 * This version generates a test QR code without using Baileys
 */

import { EventEmitter } from 'events';

interface WhatsAppSession {
  qrCode: string | null;
  status: 'disconnected' | 'connecting' | 'qr' | 'connected';
  phoneNumber: string | null;
  businessName: string | null;
  lastActivity: Date;
}

export class WhatsAppSessionManagerMock extends EventEmitter {
  private sessions: Map<string, WhatsAppSession> = new Map();

  constructor() {
    super();
    console.log('📱 WhatsAppSessionManagerMock initialized (Production Mode)');
  }

  async initializeSession(tenantId: string): Promise<void> {
    console.log(`🚀 [MOCK] Initializing session for tenant ${tenantId}`);

    const session: WhatsAppSession = {
      qrCode: null,
      status: 'connecting',
      phoneNumber: null,
      businessName: null,
      lastActivity: new Date(),
    };

    this.sessions.set(tenantId, session);

    // Generate a mock QR code after a short delay
    setTimeout(async () => {
      try {
        console.log('🔲 [MOCK] Generating test QR code...');
        
        // Simple QR generation without complex dependencies
        const qrData = `WHATSAPP_MOCK_${tenantId}_${Date.now()}`;
        
        try {
          // Try to use qrcode library if available
          const QRCode = await import('qrcode');
          const qrDataUrl = await QRCode.default.toDataURL(qrData, {
            type: 'image/png',
            quality: 0.7,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
            width: 280,
            errorCorrectionLevel: 'M'
          });

          session.qrCode = qrDataUrl;
          session.status = 'qr';
          console.log('✅ [MOCK] QR code generated successfully');
        } catch (error) {
          // Fallback: Generate a placeholder data URL
          console.log('⚠️ [MOCK] QRCode library not available, using placeholder');
          
          // Create a simple placeholder image as base64
          const placeholderSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
              <rect width="280" height="280" fill="white"/>
              <rect x="10" y="10" width="260" height="260" fill="black" opacity="0.1"/>
              <text x="140" y="130" text-anchor="middle" font-family="Arial" font-size="16" fill="black">
                WhatsApp QR Code
              </text>
              <text x="140" y="150" text-anchor="middle" font-family="Arial" font-size="12" fill="gray">
                (Mock Mode)
              </text>
              <text x="140" y="170" text-anchor="middle" font-family="Arial" font-size="10" fill="gray">
                ${tenantId.substring(0, 8)}
              </text>
            </svg>
          `;
          
          const base64 = Buffer.from(placeholderSvg).toString('base64');
          session.qrCode = `data:image/svg+xml;base64,${base64}`;
          session.status = 'qr';
          console.log('✅ [MOCK] Placeholder QR generated');
        }

        this.emit('qr', tenantId, session.qrCode);
      } catch (error) {
        console.error('❌ [MOCK] Failed to generate QR:', error);
        session.status = 'disconnected';
      }
    }, 1000);

    // Simulate connection after 10 seconds (for testing)
    setTimeout(() => {
      if (session.status === 'qr') {
        session.status = 'connected';
        session.phoneNumber = '5511999999999';
        session.businessName = 'Mock Business';
        this.emit('connected', tenantId, session.phoneNumber);
        console.log('✅ [MOCK] Simulated connection established');
      }
    }, 10000);
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
    console.log(`🔌 [MOCK] Disconnecting session for tenant ${tenantId}`);
    this.sessions.delete(tenantId);
    this.emit('disconnected', tenantId, 'Manual disconnect');
  }

  async sendMessage(tenantId: string, phoneNumber: string, message: string): Promise<boolean> {
    const session = this.sessions.get(tenantId);
    
    if (!session || session.status !== 'connected') {
      console.error('[MOCK] Session not connected');
      return false;
    }

    console.log(`📤 [MOCK] Sending message to ${phoneNumber}: ${message}`);
    // Simulate successful send
    return true;
  }
}

// Export singleton instance
export const whatsappSessionManager = new WhatsAppSessionManagerMock();