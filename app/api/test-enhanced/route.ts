import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    logger.info('🧪 [Test Enhanced] Iniciando teste forçado', { message });
    
    // Import e teste direto
    const { enhancedIntentDetector } = await import('@/lib/ai-agent/enhanced-intent-detector');
    
    const result = await enhancedIntentDetector.detectIntent({
      message,
      conversationContext: {},
      tenantId: 'test-tenant',
      clientPhone: 'test-phone'
    });
    
    logger.info('✅ [Test Enhanced] Resultado', {
      function: result.function,
      confidence: result.confidence,
      hasParameters: Object.keys(result.parameters).length > 0
    });
    
    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ [Test Enhanced] Erro', { error });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}