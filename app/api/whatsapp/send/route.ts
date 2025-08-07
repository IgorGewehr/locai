import { NextRequest, NextResponse } from 'next/server';
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
    
    // WhatsApp Web temporarily disabled
    return NextResponse.json(
      { success: false, error: 'WhatsApp Web temporarily disabled - dependency issues being resolved' },
      { status: 503 }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}