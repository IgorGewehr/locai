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
    
    // Initialize the session
    await whatsappSessionManager.initializeSession(tenantId);

    // Wait a bit for QR code generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const status = await whatsappSessionManager.getSessionStatus(tenantId);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error initializing session:', error);
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