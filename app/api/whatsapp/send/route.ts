import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppClient } from '@/lib/whatsapp/whatsapp-client-factory';
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

    const tenantId = user.tenantId || user.uid || 'default';
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
    
    // Create WhatsApp client using factory
    const whatsappClient = createWhatsAppClient(tenantId);
    
    // Check if session is connected
    const status = await whatsappClient.getConnectionStatus();
    if (!status.connected) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp not connected' },
        { status: 400 }
      );
    }

    // Send message
    if (mediaUrl) {
      await whatsappClient.sendImage(phoneNumber, mediaUrl, message);
    } else {
      await whatsappClient.sendText(phoneNumber, message);
    }

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