// app/api/admin/cache/stats/route.ts
// Endpoint para monitorar estatísticas do cache de propriedades

import { NextRequest, NextResponse } from 'next/server';
import { propertyCache } from '@/lib/cache/property-cache-manager';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { logger } from '@/lib/utils/logger';

// GET /api/admin/cache/stats - Obter estatísticas do cache
export async function GET(request: NextRequest) {
  try {
    // Validar autenticação de admin
    const authResult = await verifyAdminAccess(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Obter estatísticas do cache
    const stats = propertyCache.getStats();

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        recommendations: generateRecommendations(stats)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[CacheStats] Error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cache stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/cache/stats - Limpar cache ou resetar stats
export async function POST(request: NextRequest) {
  try {
    // Validar autenticação de admin
    const authResult = await verifyAdminAccess(request);
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, tenantId } = body;

    let result: string;

    switch (action) {
      case 'clear_all':
        propertyCache.clear();
        result = 'All cache cleared successfully';
        break;

      case 'clear_tenant':
        if (!tenantId) {
          return NextResponse.json(
            { error: 'tenantId is required for clear_tenant action' },
            { status: 400 }
          );
        }
        propertyCache.invalidateTenant(tenantId);
        result = `Cache cleared for tenant: ${tenantId.substring(0, 8)}***`;
        break;

      case 'reset_stats':
        propertyCache.resetStats();
        result = 'Cache statistics reset successfully';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: clear_all, clear_tenant, or reset_stats' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[CacheStats] Error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform cache action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Função auxiliar para gerar recomendações baseadas nas estatísticas
function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  // Análise do hit rate
  if (stats.hitRate < 50) {
    recommendations.push('⚠️ Hit rate baixo (<50%). Considere aumentar o TTL do cache.');
  } else if (stats.hitRate > 90) {
    recommendations.push('✅ Hit rate excelente (>90%). Cache está funcionando muito bem!');
  } else if (stats.hitRate >= 70) {
    recommendations.push('✅ Hit rate bom (70-90%). Cache está eficiente.');
  }

  // Análise do tamanho do cache
  if (stats.size === 0) {
    recommendations.push('⚠️ Cache vazio. Primeiro acesso ainda não ocorreu.');
  } else if (stats.size > 800) {
    recommendations.push('⚠️ Cache está próximo do limite (800/1000). Considere aumentar MAX_CACHE_SIZE ou revisar lógica de eviction.');
  }

  // Análise de evictions
  if (stats.evictions > stats.hits / 2) {
    recommendations.push('⚠️ Muitas evictions. Cache pode estar muito pequeno ou TTL muito longo.');
  }

  // Análise geral
  const totalRequests = stats.hits + stats.misses;
  if (totalRequests > 1000 && stats.hitRate > 70) {
    const savedReads = Math.floor(stats.hits * 1000); // Assuming avg 1000 reads per search
    recommendations.push(`💰 Cache economizou aproximadamente ${savedReads.toLocaleString()} reads do Firebase!`);
  }

  if (recommendations.length === 0) {
    recommendations.push('ℹ️ Estatísticas normais. Nenhuma ação necessária.');
  }

  return recommendations;
}
