import { NextRequest, NextResponse } from 'next/server';
import { getLeadsList } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `list_leads_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('📊 [GET-LEADS-LIST] Iniciando listagem de leads', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        status: args.status,
        source: args.source,
        temperature: args.temperature,
        minScore: args.minScore,
        maxScore: args.maxScore,
        assignedTo: args.assignedTo,
        limit: args.limit || 50,
        sortBy: args.sortBy || 'lastContactDate',
        sortOrder: args.sortOrder || 'desc'
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [GET-LEADS-LIST] TenantId não fornecido', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'TenantId is required',
          requestId
        },
        { status: 400 }
      );
    }

    const result = await getLeadsList(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [GET-LEADS-LIST] Listagem concluída com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        totalLeads: result?.leads?.length || 0,
        statusDistribution: result?.summary?.statusDistribution,
        averageScore: result?.summary?.averageScore,
        hotLeads: result?.summary?.hotLeads || 0
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

    logger.error('❌ [GET-LEADS-LIST] Falha na listagem', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'get-leads-list failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}