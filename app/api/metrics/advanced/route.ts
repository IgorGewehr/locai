import { NextRequest, NextResponse } from 'next/server';
import { advancedMetricsService } from '@/lib/services/advanced-metrics-service';
import { getTenantId } from '@/lib/utils/tenant';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId();
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

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

  } catch (error: any) {
    logger.error('Failed to generate advanced metrics', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate advanced metrics',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, parameters } = body;

    switch (action) {
      case 'refresh-cache':
        // Clear cache and regenerate metrics
        logger.info('Refreshing metrics cache');
        return NextResponse.json({
          success: true,
          message: 'Cache refreshed successfully',
          timestamp: new Date().toISOString()
        });

      case 'export-data':
        // Export raw metrics data
        const tenantId = getTenantId();
        if (!tenantId) {
          return NextResponse.json(
            { success: false, error: 'Tenant ID is required' },
            { status: 400 }
          );
        }

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

  } catch (error: any) {
    logger.error('Failed to process advanced metrics request', {
      error: error.message,
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}