// app/api/agent-professional/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ProfessionalAgent } from '@/lib/ai-agent/professional-agent';
import { AgentMonitor } from '@/lib/monitoring/agent-monitor';

const agent = new ProfessionalAgent();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { message, clientPhone, tenantId } = body;

    // Validação básica
    if (!message || !clientPhone || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, clientPhone, tenantId' },
        { status: 400 }
      );
    }

    // Processar mensagem
    const response = await agent.processMessage({
      message,
      clientPhone,
      tenantId
    });

    const processingTime = Date.now() - startTime;

    // Registrar métricas
    AgentMonitor.recordRequest(response.tokensUsed, response.fromCache, processingTime);

    return NextResponse.json({
      success: true,
      response: response.reply,
      intent: response.intent,
      confidence: response.confidence,
      metadata: {
        tokensUsed: response.tokensUsed,
        fromCache: response.fromCache,
        processingTime: `${processingTime}ms`,
        actions: response.actions?.length || 0
      }
    });

  } catch (error) {
    console.error('Agent error:', error);
    
    AgentMonitor.recordError();
    
    return NextResponse.json({
      success: false,
      response: "Desculpe, tive um problema técnico. Pode repetir sua mensagem? 😅",
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = agent.getAgentStats();
    const metrics = AgentMonitor.getMetrics();
    
    return NextResponse.json({
      success: true,
      data: {
        agentStats: stats,
        performanceMetrics: metrics,
        status: 'healthy',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get agent stats' },
      { status: 500 }
    );
  }
}