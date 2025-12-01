import { NextRequest, NextResponse } from 'next/server';
import { scheduleMeeting } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { triggerMeetingScheduledNotification } from '@/lib/utils/notification-triggers';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `schedule_meeting_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  try {
    let body = await request.json();

    // Se recebeu um array, pegue o primeiro objeto
    if (Array.isArray(body)) {
      body = body[0];
    }

    const { tenantId, ...args } = body;

    logger.info('🤝 [SCHEDULE-MEETING] Iniciando execução', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: args,
      paramsCount: Object.keys(args).length,
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [SCHEDULE-MEETING] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await scheduleMeeting(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [SCHEDULE-MEETING] Execução concluída com sucesso', {
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

    // 🔔 NOTIFY TENANT USER about scheduled meeting
    // Note: result may have visitId or data.visitId depending on response structure
    const meetingId = result?.data?.visitId || (result as any)?.meetingId || (result as any)?.eventId || (result as any)?.visitId;
    if (result?.success && meetingId) {
      try {
        const resultData = result?.data || result;
        await triggerMeetingScheduledNotification(
          tenantId,
          meetingId,
          {
            clientName: args.clientName || resultData?.clientName,
            clientPhone: args.clientPhone || args.phone || '',
            meetingDate: args.date || args.meetingDate || resultData?.scheduledDate || '',
            meetingTime: args.time || args.meetingTime || resultData?.scheduledTime || '',
            meetingType: args.type || args.meetingType || 'reunião',
            duration: args.duration,
            location: args.location,
            notes: args.notes
          },
          tenantId,
          undefined
        );

        logger.info('🔔 [SCHEDULE-MEETING] Notification sent to tenant', {
          requestId,
          tenantId: tenantId.substring(0, 8) + '***',
          meetingId
        });
      } catch (notificationError) {
        logger.warn('⚠️ [SCHEDULE-MEETING] Notification failed (non-critical)', {
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
    
    logger.error('❌ [SCHEDULE-MEETING] Falha na execução', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'schedule-meeting failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}