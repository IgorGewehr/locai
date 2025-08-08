import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyAuth } from '@/lib/utils/auth';
import { z } from 'zod';

// Simple cache to prevent excessive API calls
const statusCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds

// Check if WhatsApp Web is disabled (controlled by environment variable only)
// Force enable for development - override any environment variable
const WHATSAPP_WEB_DISABLED = process.env.NODE_ENV === 'production' ? process.env.DISABLE_WHATSAPP_WEB === 'true' : false;

console.log('🔧 [WhatsApp Session API] Configuration:', {
  DISABLE_WHATSAPP_WEB: process.env.DISABLE_WHATSAPP_WEB,
  WHATSAPP_WEB_DISABLED,
  NODE_ENV: process.env.NODE_ENV
});

// Lazy import WhatsApp session manager (only when needed and available)
let whatsappSessionManager: any = null;

async function getWhatsappSessionManager() {
  if (WHATSAPP_WEB_DISABLED) {
    throw new Error('WhatsApp Web is disabled by configuration');
  }
  
  if (!whatsappSessionManager) {
    try {
      const { whatsappSessionManager: manager } = await import('@/lib/whatsapp/session-manager');
      whatsappSessionManager = manager;
    } catch (error) {
      console.error('Failed to load WhatsApp session manager:', error);
      throw new Error('WhatsApp Web functionality is not available in this environment');
    }
  }
  
  return whatsappSessionManager;
}

// GET /api/whatsapp/session - Get session status
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API GET] Environment check:', {
      DISABLE_WHATSAPP_WEB: process.env.DISABLE_WHATSAPP_WEB,
      WHATSAPP_WEB_DISABLED,
      NODE_ENV: process.env.NODE_ENV
    });

    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
    // Return disabled status if WhatsApp Web is disabled
    if (WHATSAPP_WEB_DISABLED) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          status: 'disabled',
          qrCode: null,
          phoneNumber: null,
          businessName: null,
          message: 'WhatsApp Web is disabled by configuration.'
        },
      });
    }
    
    // Check cache first
    const cached = statusCache.get(tenantId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
      });
    }
    
    const manager = await getWhatsappSessionManager();
    const status = await manager.getSessionStatus(tenantId);
    
    // Cache the result
    statusCache.set(tenantId, {
      data: status,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    
    // Return graceful error response
    const errorMessage = WHATSAPP_WEB_DISABLED 
      ? 'WhatsApp Web is disabled by configuration'
      : 'Failed to get session status';
      
    return NextResponse.json({
      success: false, 
      error: errorMessage,
      data: {
        connected: false,
        status: 'error',
        qrCode: null,
        phoneNumber: null,
        businessName: null,
        message: errorMessage
      }
    }, { status: 200 }); // Return 200 for graceful degradation
  }
}

// POST /api/whatsapp/session - Initialize session
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API POST] Environment check:', {
      DISABLE_WHATSAPP_WEB: process.env.DISABLE_WHATSAPP_WEB,
      WHATSAPP_WEB_DISABLED,
      NODE_ENV: process.env.NODE_ENV
    });

    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
    // Return disabled response if WhatsApp Web is disabled
    if (WHATSAPP_WEB_DISABLED) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp Web is disabled by configuration',
        data: {
          connected: false,
          status: 'disabled',
          qrCode: null,
          phoneNumber: null,
          businessName: null,
          message: 'WhatsApp Web functionality is disabled by configuration.'
        }
      }, { status: 200 }); // Return 200 for graceful degradation
    }
    
    console.log(`🚀 API: Initializing session for tenant ${tenantId}`);
    
    const manager = await getWhatsappSessionManager();
    console.log(`🔍 API: Session manager loaded successfully`);
    
    // Initialize the session (non-blocking)
    await manager.initializeSession(tenantId);
    console.log(`✅ API: Session initialization started`);

    // Optimized polling with shorter intervals and adaptive timing
    let attempts = 0;
    const maxAttempts = 20; // More attempts but faster intervals
    let status = null;
    const delays = [100, 200, 300, 500, 500]; // Progressive delays
    
    while (attempts < maxAttempts) {
      const delay = delays[Math.min(attempts, delays.length - 1)];
      await new Promise(resolve => setTimeout(resolve, delay));
      status = await manager.getSessionStatus(tenantId);
      
      console.log(`📊 API: Check ${attempts + 1}: ${status.status}, QR: ${!!status.qrCode}`);
      
      if (status.qrCode || status.connected) {
        console.log(`✅ API: Ready after ${attempts + 1} checks`);
        break;
      }
      
      attempts++;
    }
    
    if (!status) {
      status = await manager.getSessionStatus(tenantId);
    }

    console.log(`📤 API: Returning status:`, {
      connected: status.connected,
      status: status.status,
      hasQrCode: !!status.qrCode,
      qrCodeLength: status.qrCode?.length,
      qrCodePrefix: status.qrCode?.substring(0, 30),
      phoneNumber: status.phoneNumber,
      businessName: status.businessName
    });

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('❌ API: Error initializing session:', error);
    
    const errorMessage = WHATSAPP_WEB_DISABLED 
      ? 'WhatsApp Web is disabled by configuration'
      : 'Failed to initialize session';
    
    return NextResponse.json({
      success: false, 
      error: errorMessage,
      data: {
        connected: false,
        status: 'error',
        qrCode: null,
        phoneNumber: null,
        businessName: null,
        message: error instanceof Error ? error.message : errorMessage
      }
    }, { status: 200 }); // Return 200 for graceful degradation
  }
}

// DELETE /api/whatsapp/session - Disconnect session
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
    if (WHATSAPP_WEB_DISABLED) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp Web is disabled by configuration - no active session to disconnect',
      });
    }
    
    const manager = await getWhatsappSessionManager();
    await manager.disconnectSession(tenantId);

    return NextResponse.json({
      success: true,
      message: 'Session disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting session:', error);
    return NextResponse.json({
      success: true, // Still return success for graceful degradation
      message: 'Session disconnect attempted',
    });
  }
}