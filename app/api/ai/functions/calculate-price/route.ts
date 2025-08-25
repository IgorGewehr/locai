import { NextRequest, NextResponse } from 'next/server';
import { calculatePrice } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `price_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('💰 [CALCULATE-PRICE] Calculando preço', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      priceParams: {
        propertyId: args.propertyId,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        guests: args.guests,
        duration: args.checkIn && args.checkOut ? 
          Math.ceil((new Date(args.checkOut).getTime() - new Date(args.checkIn).getTime()) / (1000 * 60 * 60 * 24)) + ' dias' : 'N/A'
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [CALCULATE-PRICE] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await calculatePrice(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [CALCULATE-PRICE] Cálculo concluído', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      pricing: {
        totalPrice: result?.total || 0,
        basePrice: result?.basePrice || 0,
        taxes: result?.taxes || 0,
        fees: result?.fees || 0,
        discounts: result?.discounts || 0,
        currency: result?.currency || 'BRL',
        breakdown: !!result?.breakdown
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
    
    logger.error('❌ [CALCULATE-PRICE] Falha no cálculo de preço', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Calculate price failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}