import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientPhone, tenantId } = body;

    if (!clientPhone) {
      return NextResponse.json(
        { success: false, error: 'clientPhone is required' },
        { status: 400 }
      );
    }

    // Import Sofia agent
    const { sofiaAgent } = await import('@/lib/ai-agent/sofia-agent');
    const { conversationContextService } = await import('@/lib/services/conversation-context-service');
    
    // Clear client context from Sofia and conversation service
    await sofiaAgent.clearClientContext(
      clientPhone, 
      tenantId || 'default-tenant'
    );

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