import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { triggerLeadCreatedNotification } from '@/lib/utils/notification-triggers';


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `create_lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('🆕 [CREATE-LEAD] Iniciando execução', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: args,
      paramsCount: Object.keys(args).length,
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [CREATE-LEAD] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await createLead(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [CREATE-LEAD] Execução concluída com sucesso', {
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

    // 🔔 NOTIFY TENANT USER about new lead
    if (result?.leadId || result?.id) {
      try {
        await triggerLeadCreatedNotification(
          tenantId,
          result.leadId || result.id || `lead_${Date.now()}`,
          {
            clientName: args.clientName || args.name || result.clientName || result.name,
            clientPhone: args.clientPhone || args.phone || '',
            clientEmail: args.clientEmail || args.email || result.email,
            location: args.location || result.location,
            guests: args.guests || result.guests,
            budget: args.budget || result.budget,
            checkInDate: args.checkInDate || args.checkIn || result.checkInDate,
            interest: args.interest || result.interest
          },
          tenantId,
          undefined
        );

        logger.info('🔔 [CREATE-LEAD] Notification sent to tenant', {
          requestId,
          tenantId: tenantId.substring(0, 8) + '***',
          leadId: result.leadId || result.id
        });
      } catch (notificationError) {
        logger.warn('⚠️ [CREATE-LEAD] Notification failed (non-critical)', {
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
    
    logger.error('❌ [CREATE-LEAD] Falha na execução', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'create-lead failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}
