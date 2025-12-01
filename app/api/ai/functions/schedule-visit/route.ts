import { NextRequest, NextResponse } from 'next/server';
import { scheduleVisit } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { triggerVisitScheduledNotification } from '@/lib/utils/notification-triggers';


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `schedule_visit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('🗓️ [SCHEDULE-VISIT] Iniciando execução', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: args,
      paramsCount: Object.keys(args).length,
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [SCHEDULE-VISIT] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await scheduleVisit(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [SCHEDULE-VISIT] Execução concluída com sucesso', {
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

    // 🔔 NOTIFY TENANT USER about scheduled visit
    if (result?.visitId || result?.eventId) {
      try {
        await triggerVisitScheduledNotification(
          tenantId,
          result.visitId || result.eventId || `visit_${Date.now()}`,
          {
            propertyId: args.propertyId || result.propertyId || '',
            propertyName: args.propertyName || result.propertyName || 'Propriedade',
            clientName: args.clientName || result.clientName,
            clientPhone: args.clientPhone || args.phone || '',
            visitDate: args.date || args.visitDate || result.date || '',
            visitTime: args.time || args.visitTime || result.time || '',
            guests: args.guests || result.guests,
            notes: args.notes || result.notes
          },
          tenantId,
          undefined
        );

        logger.info('🔔 [SCHEDULE-VISIT] Notification sent to tenant', {
          requestId,
          tenantId: tenantId.substring(0, 8) + '***',
          visitId: result.visitId || result.eventId
        });
      } catch (notificationError) {
        logger.warn('⚠️ [SCHEDULE-VISIT] Notification failed (non-critical)', {
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
    
    logger.error('❌ [SCHEDULE-VISIT] Falha na execução', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'schedule-visit failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}
