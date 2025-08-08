// Endpoint de teste simples para Sofia Fixed
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔥 [TEST] Endpoint test-sofia-fixed chamado');
  
  try {
    const { message } = await request.json();
    
    console.log('🔥 [TEST] Importando Sofia Fixed...');
    const { SofiaAgentV3 } = await import('@/lib/ai-agent/sofia-agent-v3');
    
    console.log('🔥 [TEST] Criando instância...');
    const sofia = new SofiaAgentV3('default-tenant');
    
    console.log('🔥 [TEST] Processando mensagem:', message);
    const result = await sofia.processMessage({
      message: message || 'teste',
      clientPhone: '5548999887766',
      tenantId: 'test-tenant',
      metadata: { source: 'test' }
    });
    
    console.log('🔥 [TEST] Resultado:', {
      responseTime: result.responseTime,
      tokensUsed: result.tokensUsed,
      functionsExecuted: result.functionsExecuted.length,
      functions: result.functionsExecuted
    });
    
    return NextResponse.json({
      success: true,
      message: result.reply,
      debug: {
        responseTime: result.responseTime,
        tokensUsed: result.tokensUsed,
        functionsExecuted: result.functionsExecuted,
        hasActions: result.actions?.length || 0
      }
    });
    
  } catch (error: any) {
    console.error('🔥 [TEST] ERRO:', error.message);
    console.error('🔥 [TEST] Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test endpoint for Sofia Fixed - use POST with {"message": "your message"}'
  });
}