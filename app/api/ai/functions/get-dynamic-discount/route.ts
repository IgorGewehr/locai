import { NextRequest, NextResponse } from 'next/server';
import { getDynamicDiscount } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `discount_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('💰 [GET-DYNAMIC-DISCOUNT] Calculando preço com opções de desconto', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        propertyName: args.propertyName,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        guests: args.guests,
        paymentMethod: args.paymentMethod
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [GET-DYNAMIC-DISCOUNT] TenantId não fornecido', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'TenantId is required',
          requestId
        },
        { status: 400 }
      );
    }

    const result = await getDynamicDiscount(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [GET-DYNAMIC-DISCOUNT] Cálculo concluído', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      pricing: {
        basePrice: result?.pricing?.basePrice || 0,
        totalPrice: result?.pricing?.total || 0,
        discountsAvailable: result?.discountOpportunities?.available?.length || 0
      },
      performance: {
        processingTime: `${processingTime}ms`
      }
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('❌ [GET-DYNAMIC-DISCOUNT] Falha no cálculo', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Get dynamic discount failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}
