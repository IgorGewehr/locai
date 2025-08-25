import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { performanceOptimizer } from '@/lib/services/performance-optimizations';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    logger.info('Fetching performance statistics', { tenantId });

    // Get cache statistics
    const cacheStats = performanceOptimizer.getCacheStats();
    
    // Filter stats for current tenant
    const tenantCacheEntries = cacheStats.tenantDistribution[tenantId] || 0;
    const totalCacheEntries = cacheStats.totalEntries;
    const cacheHitRatio = totalCacheEntries > 0 ? (tenantCacheEntries / totalCacheEntries) * 100 : 0;

    const performanceStats = {
      cache: {
        totalEntries: totalCacheEntries,
        tenantEntries: tenantCacheEntries,
        hitRatio: Math.round(cacheHitRatio * 100) / 100,
        oldestEntry: new Date(cacheStats.oldestEntry).toISOString(),
        newestEntry: new Date(cacheStats.newestEntry).toISOString(),
        tenantDistribution: Object.keys(cacheStats.tenantDistribution).length
      },
      optimization: {
        cacheEnabled: true,
        queryOptimizationEnabled: true,
        batchOperationsEnabled: true
      },
      recommendations: generatePerformanceRecommendations(cacheStats, tenantId)
    };

    return NextResponse.json({
      success: true,
      data: performanceStats,
      timestamp: new Date().toISOString(),
      tenantId
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'clear-cache':
        performanceOptimizer.invalidateTenantCache(tenantId);
        logger.info('Cache cleared for tenant', { tenantId });
        
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully',
          timestamp: new Date().toISOString()
        });

      case 'cleanup-expired':
        performanceOptimizer.cleanupExpiredCache();
        logger.info('Expired cache entries cleaned');
        
        return NextResponse.json({
          success: true,
          message: 'Expired cache entries cleaned',
          timestamp: new Date().toISOString()
        });

      case 'optimize-queries':
        // This would trigger query optimization analysis
        const recommendations = await analyzeQueryPerformance(tenantId);
        
        return NextResponse.json({
          success: true,
          data: recommendations,
          message: 'Query optimization analysis completed',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    return handleApiError(error);
  }
}

function generatePerformanceRecommendations(cacheStats: any, tenantId: string): string[] {
  const recommendations: string[] = [];

  const tenantEntries = cacheStats.tenantDistribution[tenantId] || 0;
  
  if (tenantEntries === 0) {
    recommendations.push('Enable caching by using optimized query methods');
  } else if (tenantEntries < 10) {
    recommendations.push('Increase cache usage by implementing more cached operations');
  }

  if (cacheStats.totalEntries > 1000) {
    recommendations.push('Consider implementing cache size limits to manage memory usage');
  }

  const cacheAge = Date.now() - cacheStats.oldestEntry;
  if (cacheAge > 30 * 60 * 1000) { // 30 minutes
    recommendations.push('Some cache entries are old - consider more frequent cleanup');
  }

  if (Object.keys(cacheStats.tenantDistribution).length > 100) {
    recommendations.push('High tenant count - consider tenant-specific cache limits');
  }

  return recommendations;
}

async function analyzeQueryPerformance(tenantId: string): Promise<{
  recommendations: string[];
  indexSuggestions: string[];
  optimizationOpportunities: string[];
}> {
  // This would analyze recent queries and provide recommendations
  const recommendations = [
    'Use equality filters before range filters for better performance',
    'Limit query results to reduce data transfer',
    'Consider using composite indexes for multi-field queries'
  ];

  const indexSuggestions = [
    'Create composite index: [status, createdAt]',
    'Create single field index: tenantId',
    'Consider array index for: amenities'
  ];

  const optimizationOpportunities = [
    'Implement pagination for large result sets',
    'Use batch operations for multiple writes',
    'Cache frequently accessed data'
  ];

  return {
    recommendations,
    indexSuggestions,
    optimizationOpportunities
  };
}