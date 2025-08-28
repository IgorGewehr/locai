import { NextRequest, NextResponse } from 'next/server';
import { createReservation } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `reservation_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('📅 [CREATE-RESERVATION] Criando nova reserva', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      reservationDetails: {
        propertyId: args.propertyId,
        clientPhone: args.clientPhone?.substring(0, 6) + '***',
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        guests: args.guests,
        totalPrice: args.totalPrice,
        hasSpecialRequests: !!args.specialRequests
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [CREATE-RESERVATION] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await createReservation(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [CREATE-RESERVATION] Reserva criada com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        reservationId: result?.reservationId,
        status: result?.status,
        totalAmount: result?.totalPrice,
        propertyName: result?.propertyName,
        created: !!result?.reservationId
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
    
    logger.error('❌ [CREATE-RESERVATION] Falha na criação da reserva', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Create reservation failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}