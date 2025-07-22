import { NextRequest, NextResponse } from 'next/server';
import { ProfessionalAgent } from '@/lib/ai-agent/professional-agent';

export async function POST(request: NextRequest) {
  try {
    const { message, phone, tenantId = 'debug-test' } = await request.json();
    
    console.log('🧪 [AGENT DEBUG] Testando agente:', { message, phone, tenantId });
    
    if (!message || !phone) {
      return NextResponse.json({
        success: false,
        error: 'message e phone são obrigatórios',
        example: {
          message: 'Olá, quero alugar um apartamento',
          phone: '5511999999999'
        }
      }, { status: 400 });
    }
    
    // Obter instância do agente
    const agent = ProfessionalAgent.getInstance();
    
    // Testar processamento
    const startTime = Date.now();
    const response = await agent.processMessage({
      message,
      clientPhone: phone,
      tenantId,
      conversationHistory: []
    });
    const processingTime = Date.now() - startTime;
    
    // Obter estatísticas do agente
    const stats = agent.getAgentStats();
    
    return NextResponse.json({
      success: true,
      input: { message, phone, tenantId },
      agent_response: response,
      processing_time_ms: processingTime,
      agent_stats: stats,
      debug_info: {
        singleton_working: true,
        context_preserved: stats.activeConversations > 0,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ [AGENT DEBUG] Erro no teste do agente:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      debug_info: {
        singleton_working: false,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const agent = ProfessionalAgent.getInstance();
    const stats = agent.getAgentStats();
    
    return NextResponse.json({
      success: true,
      agent_status: 'running',
      stats,
      debug_endpoints: {
        'POST /api/debug/agent-test': 'Testar processamento do agente',
        'GET /api/debug/agent-test': 'Ver estatísticas do agente',
        'POST /api/debug/webhook-test': 'Simular webhook do WhatsApp',
        'GET /api/debug/functions-test': 'Testar funções do agente'
      },
      test_examples: [
        {
          endpoint: 'POST /api/debug/agent-test',
          body: {
            message: 'Olá',
            phone: '5511999999999'
          },
          expected: 'greeting intent, 0 tokens'
        },
        {
          endpoint: 'POST /api/debug/agent-test', 
          body: {
            message: 'Quero alugar um apartamento em Florianópolis',
            phone: '5511999999999'
          },
          expected: 'search_properties intent, busca no banco'
        }
      ]
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}