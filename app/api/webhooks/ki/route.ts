import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { KirvanoWebhookEvent } from '@/lib/types/subscription';
import { logger } from '@/lib/utils/logger';

// Force Node.js runtime para usar todas as funcionalidades
export const runtime = 'nodejs';

/**
 * Verifica a assinatura HMAC-SHA256 do webhook da Kirvano.
 *
 * Falha fechado: rejeita se o secret não estiver configurado, se a assinatura
 * faltar, ou se ela não bater com o corpo CRU da requisição.
 *
 * @returns true se a assinatura for válida; false caso contrário.
 */
function verifyKirvanoSignature(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.KIRVANO_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('❌ [Kirvano Webhook] KIRVANO_WEBHOOK_SECRET não configurado — rejeitando');
    return false;
  }

  // TODO: confirmar nome do header com a documentação Kirvano
  const signature =
    request.headers.get('x-kirvano-signature') ||
    request.headers.get('x-webhook-signature');

  if (!signature) {
    logger.error('❌ [Kirvano Webhook] Assinatura ausente no header — rejeitando');
    return false;
  }

  // Assinatura esperada = HMAC-SHA256(corpo cru) em hex.
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  // A Kirvano pode enviar a assinatura com prefixo "sha256=" — normaliza.
  const received = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  // timingSafeEqual lança se os buffers tiverem tamanhos diferentes — falha fechado.
  try {
    const ok = crypto.timingSafeEqual(
      Buffer.from(received, 'hex'),
      Buffer.from(expected, 'hex')
    );
    if (!ok) {
      logger.error('❌ [Kirvano Webhook] Assinatura inválida — rejeitando');
    }
    return ok;
  } catch {
    logger.error('❌ [Kirvano Webhook] Assinatura malformada — rejeitando');
    return false;
  }
}

/**
 * Webhook endpoint ALTERNATIVO para Kirvano (URL curta)
 * Rota: POST /api/webhooks/ki
 *
 * NOTA: Esta é uma rota alternativa devido ao limite de caracteres no Kirvano
 */
export async function POST(request: NextRequest) {
  try {
    // Log da requisição recebida
    logger.info('🔔 [Kirvano Webhook SHORT URL] Requisição recebida em /api/webhooks/ki', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    });

    // Ler o corpo CRU primeiro para validar a assinatura HMAC.
    const rawBody = await request.text();

    // 🔐 Verificação de assinatura — falha fechado (401) se inválida/ausente.
    if (!verifyKirvanoSignature(request, rawBody)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não autorizado',
          details: 'Assinatura do webhook inválida ou ausente'
        },
        { status: 401 }
      );
    }

    // Extrair body da requisição (parse do corpo cru já verificado)
    const body = JSON.parse(rawBody) as KirvanoWebhookEvent;

    // Validar estrutura básica do webhook
    if (!body.event || !body.sale_id || !body.customer?.email) {
      logger.error('❌ [Kirvano Webhook] Payload inválido', { body });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payload inválido',
          details: 'Campos obrigatórios: event, sale_id, customer.email'
        },
        { status: 400 }
      );
    }
    
    // Log do evento recebido
    logger.info('📥 [Kirvano Webhook] Evento recebido', {
      event: body.event,
      eventDescription: body.event_description,
      saleId: body.sale_id,
      checkoutId: body.checkout_id,
      customerEmail: body.customer.email,
      customerDocument: body.customer.document,
      paymentMethod: body.payment_method,
      totalPrice: body.total_price,
      type: body.type,
      status: body.status,
      createdAt: body.created_at
    });
    
    // Processar webhook através do SubscriptionService
    const result = await SubscriptionService.processKirvanoWebhook(body);
    
    if (result.success) {
      logger.info('✅ [Kirvano Webhook] Processado com sucesso', {
        event: body.event,
        saleId: body.sale_id,
        message: result.message
      });
      
      return NextResponse.json({
        success: true,
        message: result.message,
        event: body.event,
        saleId: body.sale_id,
        processedAt: new Date().toISOString()
      });
    } else {
      logger.warn('⚠️ [Kirvano Webhook] Processamento falhou', {
        event: body.event,
        saleId: body.sale_id,
        error: result.message
      });
      
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          event: body.event,
          saleId: body.sale_id,
          processedAt: new Date().toISOString()
        },
        { status: 422 } // Unprocessable Entity
      );
    }
    
  } catch (error) {
    // Log erro crítico
    logger.error('❌ [Kirvano Webhook] Erro crítico no processamento', error as Error, {
      url: request.url,
      method: request.method
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno no servidor',
        details: 'Erro no processamento do webhook',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests - endpoint de verificação
 */
export async function GET(request: NextRequest) {
  logger.info('ℹ️ [Kirvano Webhook SHORT] Verificação de endpoint', {
    url: request.url,
    userAgent: request.headers.get('user-agent')
  });
  
  return NextResponse.json({
    service: 'Kirvano Webhook Handler (Short URL)',
    status: 'active',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    note: 'Esta é a URL curta devido ao limite de caracteres no Kirvano',
    fullUrl: '/api/webhooks/kirvano',
    shortUrl: '/api/webhooks/ki',
    supportedEvents: [
      'BANK_SLIP_GENERATED',
      'BANK_SLIP_EXPIRED', 
      'PIX_GENERATED',
      'PIX_EXPIRED',
      'SALE_REFUSED',
      'SALE_CHARGEBACK',
      'SALE_APPROVED',
      'SALE_REFUNDED',
      'ABANDONED_CART',
      'SUBSCRIPTION_CANCELED',
      'SUBSCRIPTION_EXPIRED',
      'SUBSCRIPTION_RENEWED'
    ]
  });
}

/**
 * Handle outros métodos HTTP
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}