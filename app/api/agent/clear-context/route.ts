import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientPhone, tenantId } = body;

    console.log('🧹 [ClearContext] Limpando contexto:', {
      clientPhone: clientPhone?.substring(0, 6) + '***',
      tenantId: tenantId?.substring(0, 8) + '***'
    });

    if (!clientPhone) {
      return NextResponse.json(
        { success: false, error: 'clientPhone is required' },
        { status: 400 }
      );
    }

    // Import Sofia agent
    const { SofiaAgent } = await import('@/lib/ai-agent/sofia-agent');
    const ConversationStateManager = (await import('@/lib/ai-agent/conversation-state')).default;
    const { loopPrevention } = await import('@/lib/ai-agent/loop-prevention');
    
    // Clear from all services
    const sofiaAgent = SofiaAgent.getInstance();
    
    // Clear conversation state
    ConversationStateManager.clearState(clientPhone, tenantId || 'default-tenant');
    
    // Clear loop prevention
    loopPrevention.clearClientHistory(clientPhone);
    
    // Clear Sofia's summary cache
    if (sofiaAgent.summaryCache) {
      const cacheKey = `${tenantId || 'default-tenant'}:${clientPhone}`;
      sofiaAgent.summaryCache.delete(cacheKey);
    }
    
    console.log('✅ [ClearContext] Contexto limpo com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Contexto limpo com sucesso'
    });

  } catch (error) {
    console.error('Erro ao limpar contexto:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}