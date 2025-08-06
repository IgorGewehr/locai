import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { conversationInsightsService } from '@/lib/services/conversation-insights-service';
import { logger } from '@/lib/utils/logger';

async function handler(req: NextRequest, context: any) {
  const { user } = context;
  const tenantId = user.tenantId;

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Tenant ID not found' },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    logger.info('📊 [API] Fetching conversation insights', {
      tenantId,
      days,
      userId: user.uid
    });

    const insights = await conversationInsightsService.getAggregatedInsights(tenantId, days);

    return NextResponse.json({
      success: true,
      data: insights,
      period: days
    });

  } catch (error) {
    logger.error('❌ [API] Error fetching conversation insights', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch conversation insights' 
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);