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

    // Import Sofia V3
    const { SofiaAgentV3 } = await import('@/lib/ai-agent/sofia-agent-v3');
    
    // Clear client context from Sofia
    const sofia = SofiaAgentV3.getInstance();
    await sofia.clearClientContext(
      clientPhone, 
      tenantId || 'default-tenant'
    );

    return NextResponse.json({
      success: true,
      message: 'Contexto limpo com sucesso'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}