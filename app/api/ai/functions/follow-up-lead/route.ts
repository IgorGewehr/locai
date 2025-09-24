import { NextRequest, NextResponse } from 'next/server';
import { followUpLead } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `followup_lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('📞 [FOLLOW-UP-LEAD] Iniciando follow-up de lead', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        hasLeadId: !!args.leadId,
        hasClientPhone: !!args.clientPhone,
        followUpType: args.followUpType,
        priority: args.priority || 'medium',
        scheduledFor: args.scheduledFor,
        autoExecute: args.autoExecute !== false
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [FOLLOW-UP-LEAD] TenantId não fornecido', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'TenantId is required',
          requestId
        },
        { status: 400 }
      );
    }

    if (!args.leadId && !args.clientPhone) {
      logger.warn('⚠️ [FOLLOW-UP-LEAD] leadId ou clientPhone obrigatório', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'leadId or clientPhone is required',
          requestId
        },
        { status: 400 }
      );
    }

    const result = await followUpLead(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [FOLLOW-UP-LEAD] Follow-up configurado com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        taskCreated: !!result?.task,
        taskId: result?.task?.id,
        followUpType: result?.followUpType,
        scheduledFor: result?.scheduledFor,
        autoExecuted: result?.autoExecuted,
        messagesSent: result?.messagesSent?.length || 0
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

    logger.error('❌ [FOLLOW-UP-LEAD] Falha no follow-up', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'follow-up-lead failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}