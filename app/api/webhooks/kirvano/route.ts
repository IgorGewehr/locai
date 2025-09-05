import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { KirvanoWebhookEvent } from '@/lib/types/subscription';
import { logger } from '@/lib/utils/logger';

// Force Node.js runtime para usar todas as funcionalidades
export const runtime = 'nodejs';

/**
 * Webhook endpoint para receber notificações do Kirvano
 * Rota: POST /api/webhooks/kirvano
 */
export async function POST(request: NextRequest) {
  try {
    // Log da requisição recebida
    logger.info('🔔 [Kirvano Webhook] Requisição recebida', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    });
    
    // Extrair body da requisição
    const body = await request.json() as KirvanoWebhookEvent;
    
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
  logger.info('ℹ️ [Kirvano Webhook] Verificação de endpoint', {
    url: request.url,
    userAgent: request.headers.get('user-agent')
  });
  
  return NextResponse.json({
    service: 'Kirvano Webhook Handler',
    status: 'active',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
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