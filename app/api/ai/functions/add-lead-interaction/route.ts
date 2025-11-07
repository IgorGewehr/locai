import { NextRequest, NextResponse } from 'next/server';
import { addLeadInteraction } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `add_interaction_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('💬 [ADD-LEAD-INTERACTION] Iniciando adição de interação', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        hasLeadId: !!args.leadId,
        hasClientPhone: !!args.clientPhone,
        type: args.type,
        hasContent: !!args.content,
        sentiment: args.sentiment,
        updateScore: args.updateScore !== false
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [ADD-LEAD-INTERACTION] TenantId não fornecido', { requestId });
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
      logger.warn('⚠️ [ADD-LEAD-INTERACTION] leadId ou clientPhone obrigatório', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'leadId or clientPhone is required',
          requestId
        },
        { status: 400 }
      );
    }

    if (!args.type || !args.content) {
      logger.warn('⚠️ [ADD-LEAD-INTERACTION] type e content obrigatórios', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'type and content are required',
          requestId
        },
        { status: 400 }
      );
    }

    const result = await addLeadInteraction(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [ADD-LEAD-INTERACTION] Interação adicionada com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        interactionId: result?.interaction?.id,
        leadUpdated: !!result?.leadUpdated,
        newScore: result?.newScore,
        scoreChange: result?.scoreChange,
        newTemperature: result?.newTemperature
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

    logger.error('❌ [ADD-LEAD-INTERACTION] Falha na adição', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'add-lead-interaction failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}