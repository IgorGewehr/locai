import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { advancedAIInsightsService } from '@/lib/services/advanced-ai-insights';
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
    const type = searchParams.get('type') || 'insights';
    const days = parseInt(searchParams.get('days') || '30');
    
    logger.info('🤖 [API] Fetching advanced AI insights', {
      tenantId,
      type,
      days,
      userId: auth.userId
    });

    let data;
    
    switch (type) {
      case 'insights':
        data = await advancedAIInsightsService.generateAIInsights(tenantId, days);
        break;
        
      case 'predictions':
        data = await advancedAIInsightsService.generatePredictiveAnalysis(tenantId);
        break;
        
      case 'recommendations':
        data = await advancedAIInsightsService.generateSmartRecommendations(tenantId);
        break;
        
      case 'alerts':
        data = await advancedAIInsightsService.generateRealTimeAlerts(tenantId);
        break;
        
      case 'all':
        const [insights, predictions, recommendations, alerts] = await Promise.all([
          advancedAIInsightsService.generateAIInsights(tenantId, days),
          advancedAIInsightsService.generatePredictiveAnalysis(tenantId),
          advancedAIInsightsService.generateSmartRecommendations(tenantId),
          advancedAIInsightsService.generateRealTimeAlerts(tenantId),
        ]);
        
        data = {
          insights,
          predictions,
          recommendations,
          alerts
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data,
      type,
      period: type === 'insights' ? days : undefined,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ [API] Error fetching advanced insights', {
      tenantId: auth?.tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate advanced insights' 
      },
      { status: 500 }
    );
  }
}