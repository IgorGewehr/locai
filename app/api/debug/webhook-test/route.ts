import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verificar configurações do webhook
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    
    return NextResponse.json({
      success: true,
      webhook_config: {
        webhook_url: `${baseUrl}/api/webhook/whatsapp`,
        verify_token: process.env.WHATSAPP_VERIFY_TOKEN ? 'SET ✅' : 'NOT_SET ❌',
        access_token: process.env.WHATSAPP_ACCESS_TOKEN ? 'SET ✅' : 'NOT_SET ❌',
        phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'SET ✅' : 'NOT_SET ❌',
      },
      environment: {
        node_env: process.env.NODE_ENV,
        base_url: baseUrl,
        timestamp: new Date().toISOString()
      },
      instructions: [
        '1. Configure o webhook no Meta Developer Console',
        '2. Use a URL: ' + `${baseUrl}/api/webhook/whatsapp`,
        '3. Use o verify_token configurado nas variáveis de ambiente',
        '4. Teste enviando uma mensagem para o número WhatsApp'
      ]
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// Endpoint para simular webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 [DEBUG] Webhook simulado recebido:', JSON.stringify(body, null, 2));
    
    // Simular estrutura de webhook do WhatsApp
    const mockWebhookBody = {
      object: "whatsapp_business_account",
      entry: [{
        id: "test_entry_id",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15551234567",
              phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || "test_phone_id"
            },
            messages: [{
              from: body.from || "5511999999999",
              id: "test_message_id_" + Date.now(),
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: {
                body: body.message || "Teste de mensagem"
              },
              type: "text"
            }]
          },
          field: "messages"
        }]
      }]
    };
    
    // Chamar o webhook real
    const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhookBody)
    });
    
    const webhookResult = await webhookResponse.text();
    
    return NextResponse.json({
      success: true,
      mock_webhook_sent: mockWebhookBody,
      webhook_response: {
        status: webhookResponse.status,
        result: webhookResult
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro no teste de webhook:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}