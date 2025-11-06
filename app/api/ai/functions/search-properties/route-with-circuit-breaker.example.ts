// app/api/ai/functions/search-properties/route-with-circuit-breaker.example.ts
// EXEMPLO DE COMO USAR CIRCUIT BREAKER

import { NextRequest, NextResponse } from 'next/server';
import { searchProperties } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { circuitBreakers } from '@/lib/utils/circuit-breaker';
import { getFallbackMessage } from '@/lib/utils/fallback-messages';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `search_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('🔍 [SEARCH-PROPERTIES] Iniciando busca', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        location: args.location,
        bedrooms: args.bedrooms,
        bathrooms: args.bathrooms,
        minPrice: args.minPrice,
        maxPrice: args.maxPrice,
        hasPool: args.hasPool,
        petFriendly: args.petFriendly,
        totalParams: Object.keys(args).length
      },
      circuitState: circuitBreakers.firebase.getState(),
      userAgent: request.headers.get('user-agent'),
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [SEARCH-PROPERTIES] TenantId não fornecido', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'TenantId is required',
          requestId
        },
        { status: 400 }
      );
    }

    // ✅ USAR CIRCUIT BREAKER PARA PROTEGER FIREBASE
    const result = await circuitBreakers.firebase.execute(
      // Operação principal
      async () => {
        return await searchProperties(args, tenantId);
      },
      // Fallback se circuit estiver OPEN
      () => {
        logger.warn('⚠️ [SEARCH-PROPERTIES] Using fallback due to open circuit', {
          requestId,
          tenantId: tenantId.substring(0, 8) + '***'
        });

        return {
          success: false,
          message: getFallbackMessage('searchProperties', 'unavailable'),
          properties: [],
          fallbackUsed: true,
          reason: 'Service temporarily unavailable - Circuit breaker open'
        };
      }
    );

    const processingTime = Date.now() - startTime;

    // Se usou fallback, retornar 503 (Service Unavailable)
    if (result.fallbackUsed) {
      return NextResponse.json({
        success: false,
        data: result,
        meta: {
          requestId,
          processingTime,
          timestamp: new Date().toISOString(),
          circuitState: circuitBreakers.firebase.getState()
        }
      }, { status: 503 });
    }

    logger.info('✅ [SEARCH-PROPERTIES] Busca concluída', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      results: {
        totalFound: result?.properties?.length || 0,
        hasProperties: !!result?.properties?.length,
        categories: result?.properties?.map(p => p.type).join(', ') || 'none',
        priceRange: result?.properties?.length ?
          `${Math.min(...result.properties.map(p => p.price || 0))} - ${Math.max(...result.properties.map(p => p.price || 0))}` :
          'N/A'
      },
      performance: {
        processingTime: `${processingTime}ms`,
        avgTimePerProperty: result?.properties?.length ?
          `${Math.round(processingTime / result.properties.length)}ms` : 'N/A'
      },
      circuitState: circuitBreakers.firebase.getState()
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

    logger.error('❌ [SEARCH-PROPERTIES] Erro na busca', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      circuitState: circuitBreakers.firebase.getState()
    });

    // Se erro for por circuit breaker, usar mensagem amigável
    const isCir circuitError = error instanceof Error &&
      error.message.includes('Circuit breaker is OPEN');

    return NextResponse.json(
      {
        success: false,
        error: isCircuitError ?
          'Service temporarily unavailable' :
          'Search properties failed',
        message: isCircuitError ?
          getFallbackMessage('searchProperties', 'unavailable') :
          undefined,
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: isCircuitError ? 503 : 500 }
    );
  }
}
