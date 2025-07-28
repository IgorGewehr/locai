import { NextRequest, NextResponse } from 'next/server';
import { whatsappSessionManager } from '@/lib/whatsapp/session-manager';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyAuth } from '@/lib/utils/auth';
import { z } from 'zod';

// Simple cache to prevent excessive API calls
const statusCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds

// GET /api/whatsapp/session - Get session status
export async function GET(request: NextRequest) {
  try {
    // For now, skip auth in development
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const tenantId = 'default';
    
    // Check cache first
    const cached = statusCache.get(tenantId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
      });
    }
    
    const status = await whatsappSessionManager.getSessionStatus(tenantId);
    
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
    return NextResponse.json(
      { success: false, error: 'Failed to get session status' },
      { status: 500 }
    );
  }
}

// POST /api/whatsapp/session - Initialize session
export async function POST(request: NextRequest) {
  try {
    // For now, skip auth in development
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const tenantId = 'default';
    
    console.log(`🚀 API: Initializing session for tenant ${tenantId}`);
    
    // Initialize the session
    await whatsappSessionManager.initializeSession(tenantId);

    // Wait longer for QR code generation with polling
    let attempts = 0;
    const maxAttempts = 15; // 15 seconds total
    let status = null;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await whatsappSessionManager.getSessionStatus(tenantId);
      
      console.log(`📊 API: Status check ${attempts + 1}/${maxAttempts}: ${status.status}, QR present: ${!!status.qrCode}`);
      
      if (status.qrCode || status.connected || status.status === 'connected') {
        console.log(`✅ API: Session ready after ${attempts + 1} seconds`);
        break;
      }
      
      attempts++;
    }
    
    if (!status) {
      status = await whatsappSessionManager.getSessionStatus(tenantId);
    }

    console.log(`📤 API: Returning status:`, {
      connected: status.connected,
      status: status.status,
      hasQrCode: !!status.qrCode,
      qrCodeLength: status.qrCode?.length
    });

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('❌ API: Error initializing session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize session' },
      { status: 500 }
    );
  }
}

// DELETE /api/whatsapp/session - Disconnect session
export async function DELETE(request: NextRequest) {
  try {
    // For now, skip auth in development
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const tenantId = 'default';
    
    await whatsappSessionManager.disconnectSession(tenantId);

    return NextResponse.json({
      success: true,
      message: 'Session disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect session' },
      { status: 500 }
    );
  }
}