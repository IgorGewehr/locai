// app/api/ai/functions/search-properties-cached/route.example.ts
// EXEMPLO: API route com cache implementado

import { NextRequest, NextResponse } from 'next/server';
import { searchPropertiesCached } from '@/lib/ai/tenant-aware-agent-functions-cached.example';
import { logger } from '@/lib/utils/logger';
import { circuitBreakers } from '@/lib/utils/circuit-breaker';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `search_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('🔍 [SEARCH-PROPERTIES-CACHED] Iniciando busca otimizada', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: args,
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'TenantId is required', requestId },
        { status: 400 }
      );
    }

    // ✅ USAR CIRCUIT BREAKER + CACHE
    const result = await circuitBreakers.firebase.execute(
      async () => {
        return await searchPropertiesCached(args, tenantId);
      }
    );

    const processingTime = Date.now() - startTime;

    logger.info('✅ [SEARCH-PROPERTIES-CACHED] Busca concluída', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      results: {
        totalFound: result.properties.length,
        fromCache: result.fromCache
      },
      performance: {
        processingTime: `${processingTime}ms`,
        avgTimePerProperty: result.properties.length ?
          `${Math.round(processingTime / result.properties.length)}ms` : 'N/A'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        properties: result.properties,
        totalCount: result.properties.length
      },
      meta: {
        requestId,
        processingTime,
        fromCache: result.fromCache,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('❌ [SEARCH-PROPERTIES-CACHED] Erro na busca', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Search properties failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}
