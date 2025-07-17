import { NextRequest, NextResponse } from 'next/server';
import { whatsappSessionManager } from '@/lib/whatsapp/session-manager';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyAuth } from '@/lib/utils/auth';
import { z } from 'zod';

const sendMessageSchema = z.object({
  phoneNumber: z.string().regex(/^\d+$/),
  message: z.string().min(1),
  mediaUrl: z.string().url().optional(),
});

// POST /api/whatsapp/send - Send message
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = 'default';
    const body = await request.json();
    
    // Validate input
    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { phoneNumber, message, mediaUrl } = validation.data;
    
    // Check if session is connected
    const status = await whatsappSessionManager.getSessionStatus(tenantId);
    if (!status.connected) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp not connected' },
        { status: 400 }
      );
    }

    // Send message
    await whatsappSessionManager.sendMessage(tenantId, phoneNumber, message, mediaUrl);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}