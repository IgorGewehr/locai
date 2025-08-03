// app/api/agent-professional/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sofiaAgent } from '@/lib/ai-agent/sofia-agent';
// import { AgentMonitor } from '@/lib/monitoring/agent-monitor';

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

    // Processar mensagem com Sofia MVP
    const response = await sofiaAgent.processMessage({
      message,
      clientPhone,
      tenantId,
      metadata: {
        source: 'api',
        priority: 'normal'
      }
    });

    const processingTime = Date.now() - startTime;

    // Métricas simples (sem AgentMonitor)
    console.log(`[Agent Professional] Response time: ${processingTime}ms, tokens: ${response.tokensUsed}`);

    return NextResponse.json({
      success: true,
      response: response.reply,
      intent: response.metadata.stage,
      confidence: 0.8, // Fixed confidence for MVP
      metadata: {
        tokensUsed: response.tokensUsed,
        fromCache: false, // No cache in MVP
        processingTime: `${processingTime}ms`,
        actions: response.actions?.length || 0,
        functionsExecuted: response.functionsExecuted.length
      }
    });

  } catch (error) {
    console.error('Agent error:', error);
    
    return NextResponse.json({
      success: false,
      response: "Desculpe, tive um problema técnico. Pode repetir sua mensagem? 😅",
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = sofiaAgent;
    // const metrics = AgentMonitor.getMetrics();
    
    return NextResponse.json({
      success: true,
      data: {
        agentStats: stats ? 'available' : 'unavailable',
        // performanceMetrics: metrics,
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