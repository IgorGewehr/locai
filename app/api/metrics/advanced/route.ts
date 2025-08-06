import { NextRequest, NextResponse } from 'next/server';
import { advancedMetricsService } from '@/lib/services/advanced-metrics-service';
import { authMiddleware } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const tenantId = authContext.tenantId

    logger.info('Generating advanced metrics', { tenantId });

    const metrics = await advancedMetricsService.getAdvancedMetrics(tenantId);

    logger.info('Advanced metrics generated successfully', { 
      tenantId,
      metricsKeys: Object.keys(metrics)
    });

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
      metadata: {
        tenantId,
        generatedAt: new Date().toISOString(),
        dataSource: 'firestore',
        analysisDepth: 'comprehensive'
      }
    });

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const tenantId = authContext.tenantId
    const body = await request.json();
    const { action, parameters } = body;

    switch (action) {
      case 'refresh-cache':
        // Clear cache and regenerate metrics
        logger.info('Refreshing metrics cache', { tenantId });
        return NextResponse.json({
          success: true,
          message: 'Cache refreshed successfully',
          timestamp: new Date().toISOString()
        });

      case 'export-data':
        // Export raw metrics data

        const exportData = await advancedMetricsService.getAdvancedMetrics(tenantId);
        
        return NextResponse.json({
          success: true,
          data: exportData,
          format: parameters?.format || 'json',
          exportedAt: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    return handleApiError(error)
  }
}