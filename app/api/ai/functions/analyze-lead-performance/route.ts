import { NextRequest, NextResponse } from 'next/server';
import { analyzeLeadPerformance } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `analyze_lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('📈 [ANALYZE-LEAD-PERFORMANCE] Iniciando análise de performance', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        hasLeadId: !!args.leadId,
        hasClientPhone: !!args.clientPhone,
        includeRecommendations: args.includeRecommendations !== false,
        includePredictions: args.includePredictions !== false,
        timeRange: args.timeRange || '30d'
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [ANALYZE-LEAD-PERFORMANCE] TenantId não fornecido', { requestId });
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
      logger.warn('⚠️ [ANALYZE-LEAD-PERFORMANCE] leadId ou clientPhone obrigatório', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'leadId or clientPhone is required',
          requestId
        },
        { status: 400 }
      );
    }

    const result = await analyzeLeadPerformance(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [ANALYZE-LEAD-PERFORMANCE] Análise concluída com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        hasLead: !!result?.lead,
        currentScore: result?.analysis?.currentScore,
        conversionProbability: result?.analysis?.conversionProbability,
        recommendationsCount: result?.recommendations?.length || 0,
        predictionsCount: result?.predictions?.length || 0,
        nextBestAction: result?.nextBestAction?.action
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

    logger.error('❌ [ANALYZE-LEAD-PERFORMANCE] Falha na análise', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'analyze-lead-performance failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}