// app/api/webhook/whatsapp-optimized/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { SofiaAgentV3 } from '@/lib/ai-agent/sofia-agent-v3';
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
// Sofia Agent V4 singleton instance already initialized

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
      return NextResponse.json({ status: 'no_tenant' });
    }

    // Processar com agente Sofia V3
    const sofia = SofiaAgentV3.getInstance();
    const response = await sofia.processMessage({
      message: message.text,
      clientPhone: message.from,
      tenantId,
      metadata: {
        source: 'whatsapp',
        priority: 'normal'
      }
    });

    // Enviar resposta via WhatsApp
    await sendWhatsAppMessage({
      to: message.from,
      message: response.reply,
      tenantId
    });

    const processingTime = Date.now() - startTime;
    
    // Registrar métricas Sofia V4
    AgentMonitor.recordRequest(response.tokensUsed, response.cacheHitRate === 100, response.responseTime);

    // Log Sofia V4 performance metrics
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Sofia V4 Performance:`, {
        responseTime: response.responseTime,
        tokensUsed: response.tokensUsed,
        originalTokens: response.originalTokens,
        compressionRatio: response.compressionRatio,
        cacheHitRate: response.cacheHitRate,
        performanceScore: response.performanceScore,
        functionsExecuted: response.functionsExecuted.length
      });
    }

    return NextResponse.json({ 
      status: 'processed',
      agent: 'Sofia V4',
      tokensUsed: response.tokensUsed,
      originalTokens: response.originalTokens,
      compressionRatio: response.compressionRatio,
      fromCache: response.cacheHitRate === 100,
      cacheHitRate: response.cacheHitRate,
      performanceScore: response.performanceScore,
      functionsExecuted: response.functionsExecuted.length,
      processingTime: `${response.responseTime}ms`
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