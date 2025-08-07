import { NextRequest, NextResponse } from 'next/server';
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
    
    // WhatsApp Web temporarily disabled due to dependency issues
    const status = {
      status: 'disabled',
      connected: false,
      message: 'WhatsApp Web temporarily disabled - dependency issues being resolved'
    };
    
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
    
    console.log(`🚀 API: Session initialization requested for tenant ${tenantId}`);
    
    // WhatsApp Web temporarily disabled
    const status = {
      status: 'disabled',
      connected: false,
      message: 'WhatsApp Web temporarily disabled - dependency issues being resolved'
    };

    return NextResponse.json({
      success: false,
      message: 'WhatsApp Web temporarily disabled',
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
    
    // WhatsApp Web temporarily disabled
    return NextResponse.json({
      success: true,
      message: 'WhatsApp Web temporarily disabled - no active session to disconnect',
    });
  } catch (error) {
    console.error('Error disconnecting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect session' },
      { status: 500 }
    );
  }
}