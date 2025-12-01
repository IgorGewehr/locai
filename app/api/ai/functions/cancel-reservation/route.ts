import { NextRequest, NextResponse } from 'next/server';
import { cancelReservation } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { triggerReservationCancelledNotification } from '@/lib/utils/notification-triggers';



export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `cancel_reservation_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('🚫 [CANCEL-RESERVATION] Iniciando execução', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: args,
      paramsCount: Object.keys(args).length,
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [CANCEL-RESERVATION] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await cancelReservation(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [CANCEL-RESERVATION] Execução concluída com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        hasResult: !!result,
        resultType: typeof result,
        resultKeys: result && typeof result === 'object' ? Object.keys(result) : []
      },
      performance: {
        processingTime: `${processingTime}ms`
      }
    });

    // 🔔 NOTIFY TENANT USER about reservation cancellation
    const reservationId = args.reservationId || (result as any)?.reservationId || (result as any)?.id;
    if (reservationId && (result as any)?.success !== false) {
      try {
        const resultData = (result as any)?.data || result;
        await triggerReservationCancelledNotification(
          tenantId,
          reservationId,
          {
            propertyName: args.propertyName || resultData?.propertyName,
            clientName: args.clientName || resultData?.clientName,
            clientPhone: args.clientPhone || resultData?.clientPhone,
            checkIn: resultData?.checkIn || args.checkIn,
            checkOut: resultData?.checkOut || args.checkOut,
            totalPrice: resultData?.totalPrice || args.totalPrice,
            refundAmount: resultData?.refundAmount || args.refundAmount,
            cancelReason: args.reason || args.cancelReason || resultData?.cancelReason,
            cancelledBy: 'sofia_ai'
          },
          tenantId,
          undefined
        );

        logger.info('🔔 [CANCEL-RESERVATION] Notification sent to tenant', {
          requestId,
          tenantId: tenantId.substring(0, 8) + '***',
          reservationId,
          refundAmount: resultData?.refundAmount
        });
      } catch (notificationError) {
        logger.warn('⚠️ [CANCEL-RESERVATION] Notification failed (non-critical)', {
          requestId,
          error: notificationError instanceof Error ? notificationError.message : 'Unknown'
        });
      }
    }

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
    
    logger.error('❌ [CANCEL-RESERVATION] Falha na execução', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'cancel-reservation failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}
