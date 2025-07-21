// app/api/webhook/whatsapp-optimized/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { ProfessionalAgent } from '@/lib/ai-agent/professional-agent';
import { AgentMonitor } from '@/lib/monitoring/agent-monitor';

// Rate limiter simples e eficiente
class SimpleRateLimiter {
  private requests = new Map<string, number[]>();
  private readonly limit = 20; // 20 mensagens por minuto
  private readonly windowMs = 60000; // 1 minuto

  isAllowed(key: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove requests antigas
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.limit) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}

const rateLimiter = new SimpleRateLimiter();
const agent = new ProfessionalAgent();

// Webhook handler otimizado
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Extrair dados do WhatsApp
    const message = extractWhatsAppMessage(body);
    if (!message) {
      return NextResponse.json({ status: 'no_message' });
    }

    // Rate limiting
    if (!rateLimiter.isAllowed(message.from)) {
      console.log(`Rate limit exceeded for ${message.from}`);
      return NextResponse.json({ status: 'rate_limited' });
    }

    // Obter tenantId
    const tenantId = await getTenantFromPhone(message.from);
    if (!tenantId) {
      console.error(`No tenant found for phone ${message.from}`);
      return NextResponse.json({ status: 'no_tenant' });
    }

    // Processar com agente reformulado
    const response = await agent.processMessage({
      message: message.text,
      clientPhone: message.from,
      tenantId
    });

    // Enviar resposta via WhatsApp
    await sendWhatsAppMessage({
      to: message.from,
      message: response.reply,
      tenantId
    });

    const processingTime = Date.now() - startTime;
    
    // Registrar métricas
    AgentMonitor.recordRequest(response.tokensUsed, response.fromCache, processingTime);

    // Log para debugging (opcional)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Agent stats:`, agent.getAgentStats());
    }

    return NextResponse.json({ 
      status: 'processed',
      tokensUsed: response.tokensUsed,
      fromCache: response.fromCache,
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    console.error('Webhook error:', error);
    AgentMonitor.recordError();
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

function extractWhatsAppMessage(body: any): { from: string; text: string } | null {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    
    if (!message?.text?.body) {
      return null;
    }

    return {
      from: message.from,
      text: message.text.body
    };
  } catch {
    return null;
  }
}

async function getTenantFromPhone(phone: string): Promise<string | null> {
  // Integrar com sua lógica existente
  try {
    // Por enquanto, usar tenant padrão
    return process.env.TENANT_ID || 'default';
    
    // TODO: Implementar busca real no Firestore
    // const { firestore } = await import('@/lib/firebase/firestore');
    // const snapshot = await firestore
    //   .collection('tenants')
    //   .where('whatsappNumber', '==', phone)
    //   .limit(1)
    //   .get();
    // return snapshot.empty ? null : snapshot.docs[0].id;
  } catch (error) {
    console.error('Error getting tenant:', error);
    return process.env.TENANT_ID || 'default';
  }
}

async function sendWhatsAppMessage(params: { to: string; message: string; tenantId: string }) {
  try {
    // Integrar com seu serviço WhatsApp existente
    const { sendWhatsAppMessage: sendMessage } = await import('@/lib/whatsapp/message-sender');
    
    return await sendMessage(params.to, params.message);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}