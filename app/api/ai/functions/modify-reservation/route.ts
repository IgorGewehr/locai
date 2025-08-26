import { NextRequest, NextResponse } from 'next/server';
import { modifyReservation } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';



export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `modify_reservation_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('🔄 [MODIFY-RESERVATION] Iniciando execução', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: args,
      paramsCount: Object.keys(args).length,
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [MODIFY-RESERVATION] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await modifyReservation(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [MODIFY-RESERVATION] Execução concluída com sucesso', {
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
    
    logger.error('❌ [MODIFY-RESERVATION] Falha na execução', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'modify-reservation failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}
