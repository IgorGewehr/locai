import { NextRequest, NextResponse } from 'next/server';
import { leadPipelineMovement } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `pipeline_move_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('🔄 [LEAD-PIPELINE-MOVEMENT] Iniciando movimento no pipeline', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        hasLeadId: !!args.leadId,
        hasClientPhone: !!args.clientPhone,
        currentStatus: args.currentStatus,
        newStatus: args.newStatus,
        reason: args.reason,
        autoAdvance: args.autoAdvance,
        createTasks: args.createTasks !== false
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [LEAD-PIPELINE-MOVEMENT] TenantId não fornecido', { requestId });
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
      logger.warn('⚠️ [LEAD-PIPELINE-MOVEMENT] leadId ou clientPhone obrigatório', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'leadId or clientPhone is required',
          requestId
        },
        { status: 400 }
      );
    }

    const result = await leadPipelineMovement(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [LEAD-PIPELINE-MOVEMENT] Movimento concluído com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        moved: !!result?.moved,
        fromStatus: result?.fromStatus,
        toStatus: result?.toStatus,
        scoreChange: result?.scoreChange,
        tasksCreated: result?.tasksCreated?.length || 0,
        nextActions: result?.nextActions?.length || 0
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

    logger.error('❌ [LEAD-PIPELINE-MOVEMENT] Falha no movimento', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'lead-pipeline-movement failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}