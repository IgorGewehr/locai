import { NextRequest, NextResponse } from 'next/server';
import { analyzePerformance } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'TenantId is required' },
        { status: 400 }
      );
    }

    logger.info('📈 [API] Analyze Performance called', {
      tenantId,
      args: JSON.stringify(args)
    });

    const result = await analyzePerformance(args, tenantId);

    logger.info('✅ [API] Analyze Performance completed', {
      tenantId,
      period: args.period
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('❌ [API] Analyze Performance failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}