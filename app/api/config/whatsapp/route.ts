import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromCookie } from '@/lib/utils/auth-cookie';
import { logger } from '@/lib/utils/logger';

// GET /api/config/whatsapp - Get WhatsApp Web session status
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId || 'default-tenant';
    logger.info('Fetching WhatsApp Web session status', { tenantId });

    // WhatsApp Web is temporarily disabled due to dependency issues
    // This will be re-enabled once Baileys dependencies are resolved
    return NextResponse.json({
      success: true,
      data: {
        mode: 'whatsapp_web',
        status: 'disabled',
        message: 'WhatsApp Web temporarily disabled - dependency issues resolved',
        lastUpdate: new Date().toISOString(),
      }
    });

  } catch (error) {
    logger.error('Error fetching WhatsApp configuration', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch WhatsApp Web status' },
      { status: 500 }
    );
  }
}

// POST /api/config/whatsapp - Connect WhatsApp Web session
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId || 'default-tenant';
    logger.info('Connecting WhatsApp Web session', { tenantId });

    // WhatsApp Web connection temporarily disabled
    return NextResponse.json({
      success: false,
      message: 'WhatsApp Web temporarily disabled - dependency issues being resolved',
    });

  } catch (error) {
    logger.error('Error connecting WhatsApp Web session', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { success: false, error: 'Failed to connect WhatsApp Web session' },
      { status: 500 }
    );
  }
}

// DELETE /api/config/whatsapp - Disconnect WhatsApp Web session
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId || 'default-tenant';
    logger.info('Disconnecting WhatsApp Web session', { tenantId });

    // WhatsApp Web disconnection temporarily disabled
    return NextResponse.json({
      success: true,
      message: 'WhatsApp Web temporarily disabled - no active session to disconnect',
    });

  } catch (error) {
    logger.error('Error disconnecting WhatsApp Web session', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect WhatsApp Web session' },
      { status: 500 }
    );
  }
}