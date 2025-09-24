import { NextRequest, NextResponse } from 'next/server';
import { getLeadDetails } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `get_lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('📋 [GET-LEAD-DETAILS] Iniciando busca de lead', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        hasLeadId: !!args.leadId,
        hasClientPhone: !!args.clientPhone,
        includeInteractions: args.includeInteractions,
        includeTasks: args.includeTasks,
        includeAnalytics: args.includeAnalytics
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [GET-LEAD-DETAILS] TenantId não fornecido', { requestId });
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
      logger.warn('⚠️ [GET-LEAD-DETAILS] leadId ou clientPhone obrigatório', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'leadId or clientPhone is required',
          requestId
        },
        { status: 400 }
      );
    }

    const result = await getLeadDetails(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [GET-LEAD-DETAILS] Busca concluída com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        hasLead: !!result?.lead,
        leadStatus: result?.lead?.status,
        leadScore: result?.lead?.score,
        interactionsCount: result?.interactions?.length || 0,
        tasksCount: result?.tasks?.length || 0
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

    logger.error('❌ [GET-LEAD-DETAILS] Falha na busca', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'get-lead-details failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}