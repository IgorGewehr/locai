import { NextRequest, NextResponse } from 'next/server';
import { ProfessionalAgent } from '@/lib/ai-agent/professional-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientPhone } = body;

    if (!clientPhone) {
      return NextResponse.json(
        { success: false, error: 'Client phone is required' },
        { status: 400 }
      );
    }

    // Obter instância singleton do agente
    const agent = ProfessionalAgent.getInstance();
    
    // Limpar contexto do cliente
    agent.clearClientContext(clientPhone);

    return NextResponse.json({
      success: true,
      message: `Context cleared for ${clientPhone}`
    });

  } catch (error) {
    console.error('Error clearing context:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}