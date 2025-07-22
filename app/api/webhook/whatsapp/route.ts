import { NextRequest, NextResponse } from 'next/server';
import { ProfessionalAgent } from '@/lib/ai-agent/professional-agent';

// ===== WEBHOOK WHATSAPP BUSINESS API - VERSÃO MELHORADA =====

export async function GET(request: NextRequest) {
  // Webhook verification (Meta requirement)
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  console.log('🔐 [WEBHOOK] Verificação recebida:', { mode, token: token ? 'PROVIDED' : 'MISSING' });
  
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ [WEBHOOK] Verificação bem-sucedida');
    return new Response(challenge, { status: 200 });
  } else {
    console.log('❌ [WEBHOOK] Verificação falhou');
    return new Response('Forbidden', { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Date.now().toString();
  
  try {
    console.log(`📨 [WEBHOOK-${requestId}] Nova mensagem recebida`);
    
    // 1. Parse do body com error handling
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error(`❌ [WEBHOOK-${requestId}] Erro ao fazer parse do JSON:`, error);
      return NextResponse.json({ status: 'invalid_json' }, { status: 400 });
    }
    
    console.log(`🔍 [WEBHOOK-${requestId}] Body completo:`, JSON.stringify(body, null, 2));
    
    // 2. Extrair mensagem do WhatsApp
    const message = extractWhatsAppMessage(body);
    if (!message) {
      console.log(`ℹ️ [WEBHOOK-${requestId}] Nenhuma mensagem de texto encontrada (pode ser status update)`);
      return NextResponse.json({ status: 'no_text_message' });
    }
    
    console.log(`📱 [WEBHOOK-${requestId}] Mensagem extraída:`, message);
    
    // 3. Rate limiting simples
    const rateLimitKey = message.from;
    if (!checkRateLimit(rateLimitKey)) {
      console.log(`🚫 [WEBHOOK-${requestId}] Rate limit excedido para ${message.from}`);
      
      // Enviar mensagem de rate limit
      try {
        await sendWhatsAppMessage(message.from, 'Muitas mensagens enviadas. Por favor, aguarde um momento antes de enviar outra mensagem. ⏰');
      } catch (error) {
        console.error('Erro ao enviar mensagem de rate limit:', error);
      }
      
      return NextResponse.json({ 
        status: 'rate_limited',
        message: 'Rate limit exceeded' 
      }, { status: 429 });
    }
    
    // 4. Obter tenant ID (por enquanto padrão)
    const tenantId = getTenantId();
    
    // 5. Processar com Professional Agent
    console.log(`🤖 [WEBHOOK-${requestId}] Processando com Professional Agent...`);
    
    const agent = ProfessionalAgent.getInstance();
    const agentResponse = await agent.processMessage({
      message: message.text,
      clientPhone: message.from,
      tenantId,
      conversationHistory: [] // TODO: implementar histórico
    });
    
    console.log(`🎯 [WEBHOOK-${requestId}] Resposta do agente:`, {
      intent: agentResponse.intent,
      confidence: agentResponse.confidence,
      tokensUsed: agentResponse.tokensUsed,
      fromCache: agentResponse.fromCache,
      replyLength: agentResponse.reply.length
    });
    
    // 6. Enviar resposta via WhatsApp
    try {
      await sendWhatsAppMessage(message.from, agentResponse.reply);
      console.log(`📤 [WEBHOOK-${requestId}] Resposta enviada com sucesso`);
    } catch (error) {
      console.error(`❌ [WEBHOOK-${requestId}] Erro ao enviar resposta WhatsApp:`, error);
      // Não falhar a requisição por erro de envio
    }
    
    const totalTime = Date.now() - startTime;
    
    // 7. Log de métricas
    console.log(`📊 [WEBHOOK-${requestId}] Processamento concluído:`, {
      totalTime: `${totalTime}ms`,
      intent: agentResponse.intent,
      tokensUsed: agentResponse.tokensUsed,
      fromCache: agentResponse.fromCache,
      agentStats: agent.getAgentStats()
    });
    
    return NextResponse.json({
      status: 'processed',
      requestId,
      data: {
        intent: agentResponse.intent,
        confidence: agentResponse.confidence,
        tokensUsed: agentResponse.tokensUsed,
        fromCache: agentResponse.fromCache,
        processingTime: `${totalTime}ms`
      }
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`💥 [WEBHOOK-${requestId}] Erro geral:`, error);
    
    return NextResponse.json({
      status: 'error',
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${totalTime}ms`
    }, { status: 500 });
  }
}

// ===== FUNÇÕES AUXILIARES =====

function extractWhatsAppMessage(body: any): { from: string; text: string; messageId: string } | null {
  try {
    // Estrutura típica do webhook do WhatsApp Business API
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    
    if (!messages || messages.length === 0) {
      console.log('🔍 [EXTRACT] Nenhuma mensagem encontrada no payload');
      return null;
    }
    
    const message = messages[0];
    
    // Verificar se é mensagem de texto
    if (message.type !== 'text' || !message.text?.body) {
      console.log('🔍 [EXTRACT] Mensagem não é do tipo texto:', message.type);
      return null;
    }
    
    const result = {
      from: message.from,
      text: message.text.body.trim(),
      messageId: message.id
    };
    
    console.log('✅ [EXTRACT] Mensagem extraída com sucesso:', result);
    return result;
    
  } catch (error) {
    console.error('❌ [EXTRACT] Erro ao extrair mensagem:', error);
    return null;
  }
}

// Rate limiting simples em memória
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT = 20; // mensagens por minuto
const RATE_WINDOW = 60000; // 1 minuto

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const requests = rateLimitStore.get(key) || [];
  
  // Remove requests antigas
  const validRequests = requests.filter(time => now - time < RATE_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitStore.set(key, validRequests);
  return true;
}

function getTenantId(): string {
  return process.env.TENANT_ID || 'default';
}

async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  try {
    // Dinamicamente importar o message sender
    const { sendWhatsAppMessage: sender } = await import('@/lib/whatsapp/message-sender');
    await sender(to, message);
  } catch (error) {
    console.error('Erro ao importar/usar message sender:', error);
    
    // Fallback: tentar enviar diretamente via API
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp credentials não configuradas');
    }
    
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${errorData}`);
    }
  }
}