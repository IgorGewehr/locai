import { NextRequest, NextResponse } from 'next/server';
import whatsappService from '@/lib/services/whatsapp';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (!mode || !token || !challenge) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  const result = whatsappService.verifyWebhook(mode, token, challenge);
  
  if (result) {
    return new NextResponse(result, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json(
    { error: 'Invalid verification token' },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Parse webhook payload
    const { messages, statuses } = whatsappService.parseWebhookPayload(body);
    
    // Process incoming messages
    for (const message of messages) {
      await processIncomingMessage(message);
    }
    
    // Process message status updates
    for (const status of statuses) {
      await processMessageStatus(status);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processIncomingMessage(message: any) {
  try {
    // Only process text messages for now
    if (message.type !== 'text') {
      // Send a response indicating we only handle text messages
      await whatsappService.sendTextMessage(
        message.from,
        'Desculpe, no momento eu apenas processso mensagens de texto. Por favor, envie sua pergunta em formato de texto.'
      );
      return;
    }

    const messageText = message.text?.body;
    if (!messageText) return;

    // Mark message as read
    await whatsappService.markMessageAsRead(message.id);

    // Send typing indicator (optional)
    // await whatsappService.sendTypingIndicator(message.from);

    // Process message with agent
    const agentResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: messageText,
        clientPhone: message.from,
        whatsappNumber: message.from,
      }),
    });

    const agentResult = await agentResponse.json();

    if (agentResult.success && agentResult.data.response) {
      // Send response back to WhatsApp
      await whatsappService.sendTextMessage(
        message.from,
        agentResult.data.response
      );
    } else {
      // Send error message
      await whatsappService.sendTextMessage(
        message.from,
        'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.'
      );
    }

  } catch (error) {
    console.error('Error processing incoming message:', error);
    
    // Send error response
    try {
      await whatsappService.sendTextMessage(
        message.from,
        'Desculpe, estou com dificuldades técnicas no momento. Tente novamente mais tarde ou entre em contato diretamente conosco.'
      );
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }
}

async function processMessageStatus(status: any) {
  try {
    // Update message status in database if needed
    console.log('Message status update:', status);
    
    // You can implement message status tracking here
    // For example, update the message status in Firestore
    
  } catch (error) {
    console.error('Error processing message status:', error);
  }
}

// Helper function to validate webhook signature (recommended for production)
function validateWebhookSignature(body: string, signature: string): boolean {
  // This would verify the X-Hub-Signature-256 header
  // Implementation depends on your security requirements
  return true; // Simplified for demo
}