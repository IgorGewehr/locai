import { NextRequest, NextResponse } from 'next/server';
import { generateQuote } from '@/lib/ai/tenant-aware-agent-functions';
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

    logger.info('📋 [API] Generate Quote called', {
      tenantId,
      args: JSON.stringify(args)
    });

    const result = await generateQuote(args, tenantId);

    logger.info('✅ [API] Generate Quote completed', {
      tenantId,
      quoteId: result?.quoteId
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('❌ [API] Generate Quote failed', {
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