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
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
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
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId || user.uid;
    
    console.log(`🚀 API: Initializing session for tenant ${tenantId}`);
    console.log(`🔍 API: Session manager available:`, !!whatsappSessionManager);
    
    // Initialize the session (non-blocking)
    await whatsappSessionManager.initializeSession(tenantId);
    console.log(`✅ API: Session initialization started`);

    // Optimized polling with shorter intervals and adaptive timing
    let attempts = 0;
    const maxAttempts = 20; // More attempts but faster intervals
    let status = null;
    const delays = [100, 200, 300, 500, 500]; // Progressive delays
    
    while (attempts < maxAttempts) {
      const delay = delays[Math.min(attempts, delays.length - 1)];
      await new Promise(resolve => setTimeout(resolve, delay));
      status = await whatsappSessionManager.getSessionStatus(tenantId);
      
      console.log(`📊 API: Check ${attempts + 1}: ${status.status}, QR: ${!!status.qrCode}`);
      
      if (status.qrCode || status.connected) {
        console.log(`✅ API: Ready after ${attempts + 1} checks`);
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
    return NextResponse.json(
      { success: false, error: 'Failed to initialize session' },
      { status: 500 }
    );
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