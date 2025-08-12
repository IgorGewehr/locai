import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { whatsAppCloudAPI } from '@/lib/whatsapp/whatsapp-cloud-api';
import { headers } from 'next/headers';

/**
 * GET /api/webhook/whatsapp-cloud
 * Webhook verification endpoint for WhatsApp Cloud API
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    logger.info('WhatsApp webhook verification request:', { mode, token, challenge });

    // Verify the webhook
    const result = whatsAppCloudAPI.verifyWebhook(mode || '', token || '', challenge || '');

    if (result) {
      return new NextResponse(result, { status: 200 });
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  } catch (error) {
    logger.error('Webhook verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/webhook/whatsapp-cloud
 * Receive messages from WhatsApp Cloud API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logger.info('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    // Process the webhook asynchronously
    whatsAppCloudAPI.processWebhook(body).catch(error => {
      logger.error('Error processing webhook:', error);
    });

    // Always return 200 OK immediately to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    logger.error('Webhook processing error:', error);
    // Still return 200 to prevent WhatsApp from retrying
    return NextResponse.json({ success: true }, { status: 200 });
  }
}