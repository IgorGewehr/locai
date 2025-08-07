// app/api/webhook/whatsapp-optimized/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sofiaAgent } from '@/lib/ai-agent/sofia-agent';
import { AgentMonitor } from '@/lib/monitoring/agent-monitor';
import { resolveTenantFromPhone } from '@/lib/utils/tenant-extractor';
import { processWhatsAppLeadMiddleware, enrichSofiaContext } from '@/lib/middleware/whatsapp-lead-middleware';
import { logger } from '@/lib/utils/logger';

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
      logger.warn('⚠️ [WhatsApp] Rate limit excedido', {
        phone: message.from.substring(0, 6) + '***'
      });
      return NextResponse.json({ status: 'rate_limited' });
    }

    // NOVO: Obter tenantId dinamicamente
    const tenantId = await resolveTenantFromPhone(message.from);
    if (!tenantId) {
      logger.error('❌ [WhatsApp] Tenant não encontrado para telefone', {
        phone: message.from.substring(0, 6) + '***'
      });
      return NextResponse.json({ status: 'no_tenant' });
    }

    // MIDDLEWARE CRM: Criar/atualizar lead automaticamente ANTES da Sofia
    logger.info('🎯 [WhatsApp] Executando middleware CRM automático', {
      phone: message.from.substring(0, 6) + '***',
      tenantId
    });

    const leadContext = await processWhatsAppLeadMiddleware({
      from: message.from,
      body: message.text,
      name: undefined, // WhatsApp webhook geralmente não inclui nome
      timestamp: Math.floor(Date.now() / 1000)
    }, tenantId);

    // Processar com Sofia V4 Multi-Tenant com contexto CRM enriquecido
    const enrichedMetadata = enrichSofiaContext({
      source: 'whatsapp',
      priority: 'normal'
    }, leadContext);

    const response = await sofiaAgent.processMessage({
      message: message.text,
      clientPhone: message.from,
      tenantId,
      metadata: enrichedMetadata
    });

    // Enviar resposta via WhatsApp
    await sendWhatsAppMessage({
      to: message.from,
      message: response.reply,
      tenantId
    });

    const processingTime = Date.now() - startTime;
    
    // Registrar métricas Sofia V4 + CRM
    AgentMonitor.recordRequest(
      response.tokensUsed, 
      false, 
      response.responseTime,
      tenantId,
      response.functionsExecuted
    );

    // Registrar sucesso das funções executadas
    response.functionsExecuted.forEach(func => {
      AgentMonitor.recordFunctionSuccess(func);
    });

    // Log Sofia V4 performance metrics com dados CRM
    logger.info('📊 [WhatsApp] Sofia V4 + CRM processamento concluído', {
      responseTime: response.responseTime,
      tokensUsed: response.tokensUsed,
      functionsExecuted: response.functionsExecuted.length,
      functionsNames: response.functionsExecuted,
      stage: response.metadata.stage,
      confidence: Math.round(response.metadata.confidence * 100),
      tenantId,
      phone: message.from.substring(0, 6) + '***',
      totalProcessingTime: processingTime,
      // Métricas CRM
      leadId: leadContext.leadId?.substring(0, 8) + '***',
      isNewLead: leadContext.isNewLead,
      leadScore: leadContext.leadScore,
      leadTemperature: leadContext.leadTemperature,
      totalInteractions: leadContext.totalInteractions
    });

    return NextResponse.json({ 
      status: 'processed',
      agent: 'Sofia V4 Multi-Tenant',
      tokensUsed: response.tokensUsed,
      functionsExecuted: response.functionsExecuted.length,
      functionsNames: response.functionsExecuted,
      stage: response.metadata.stage,
      confidence: Math.round(response.metadata.confidence * 100),
      reasoningUsed: response.metadata.reasoningUsed,
      tenantId,
      processingTime: `${response.responseTime}ms`,
      totalProcessingTime: `${processingTime}ms`
    });

  } catch (error) {
    logger.error('❌ [WhatsApp] Erro no webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
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