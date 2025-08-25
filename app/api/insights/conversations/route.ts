import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { conversationInsightsService } from '@/lib/services/conversation-insights-service';
import { logger } from '@/lib/utils/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await validateFirebaseAuth(req);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const tenantId = auth.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    logger.info('📊 [API] Fetching conversation insights', {
      tenantId,
      days,
      userId: auth.userId
    });

    const insights = await conversationInsightsService.getAggregatedInsights(tenantId, days);

    return NextResponse.json({
      success: true,
      data: insights,
      period: days
    });

  } catch (error) {
    logger.error('❌ [API] Error fetching conversation insights', {
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