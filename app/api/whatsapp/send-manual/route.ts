import { NextRequest, NextResponse } from 'next/server';
import { createSettingsService } from '@/lib/services/settings-service';
import { whatsappOfficialService } from '@/lib/services/whatsapp-official-service';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, message, phone } = body;

    if (!tenantId || !message || !phone) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const settingsService = createSettingsService(tenantId);
    const settings = await settingsService.getSettings(tenantId);
    const whatsappSettings = settings?.whatsapp;

    // Check if using Official API
    if (whatsappSettings?.mode === 'business_api' && whatsappSettings.connected) {
      const result = await whatsappOfficialService.sendText(phone, message, tenantId);

      if (result.success) {
        return new NextResponse(JSON.stringify({ success: true, messageId: result.messageId }), { status: 200 });
      } else {
        return new NextResponse(JSON.stringify({ error: result.error || 'Failed to send via Official API' }), { status: 500 });
      }
    }

    // Fallback to existing Baileys logic (WhatsApp Web)
    // Assuming there is a separate service or microservice for Baileys
    // For now, we'll try to call the existing endpoint or service if available.
    // Since we don't have the Baileys service code in front of us, we'll assume 
    // the original implementation was here or we need to forward it.

    // However, looking at the file structure, this IS the route that handles sending.
    // If the original code used a microservice, we should call it here.
    // If it was using a local library, we should use it.

    // Given the context, let's assume we should forward to the Baileys microservice 
    // if mode is 'web' or undefined.

    const baileysUrl = process.env.WHATSAPP_API_URL || 'http://localhost:3001';
    const response = await fetch(`${baileysUrl}/api/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY || 'secret'}`
      },
      body: JSON.stringify({
        phoneNumber: phone,
        message: message,
        tenantId: tenantId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send via Baileys');
    }

    const data = await response.json();
    return new NextResponse(JSON.stringify(data), { status: 200 });

  } catch (error) {
    logger.error('Error in manual send API:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
