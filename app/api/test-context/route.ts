import { NextRequest, NextResponse } from 'next/server';
import { ProfessionalAgent } from '@/lib/ai-agent/professional-agent';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [TEST-CONTEXT] Iniciando teste do singleton...');
    
    // Teste 1: Verificar se getInstance retorna a mesma instância
    const agent1 = ProfessionalAgent.getInstance();
    const agent2 = ProfessionalAgent.getInstance();
    const sameInstance = agent1 === agent2;
    
    console.log(`🔍 [TEST-CONTEXT] Mesma instância: ${sameInstance}`);
    
    // Teste 2: Testar persistência de contexto
    const testPhone = '5511999999999';
    
    // Primeira chamada para criar contexto
    console.log('📞 [TEST-CONTEXT] Primeira mensagem...');
    const response1 = await agent1.processMessage({
      message: 'Olá, quero alugar em Florianópolis',
      clientPhone: testPhone,
      tenantId: 'test-context',
      conversationHistory: []
    });
    
    const stats1 = agent1.getAgentStats();
    console.log('📊 [TEST-CONTEXT] Stats após primeira mensagem:', stats1);
    
    // Segunda chamada para verificar se contexto persiste
    console.log('📞 [TEST-CONTEXT] Segunda mensagem...');
    const response2 = await agent2.processMessage({
      message: 'Quero ver opções',
      clientPhone: testPhone,
      tenantId: 'test-context', 
      conversationHistory: []
    });
    
    const stats2 = agent2.getAgentStats();
    console.log('📊 [TEST-CONTEXT] Stats após segunda mensagem:', stats2);
    
    // Verificar se contexto foi mantido
    const contextPersisted = stats1.activeConversations > 0 && stats2.activeConversations > 0;
    
    const testResults = {
      singleton_working: sameInstance,
      context_persisted: contextPersisted,
      first_response: {
        intent: response1.intent,
        tokens: response1.tokensUsed,
        reply_preview: response1.reply.substring(0, 100)
      },
      second_response: {
        intent: response2.intent,
        tokens: response2.tokensUsed,
        reply_preview: response2.reply.substring(0, 100)
      },
      stats_comparison: {
        after_first_message: stats1.activeConversations,
        after_second_message: stats2.activeConversations
      },
      overall_status: sameInstance && contextPersisted ? 'WORKING' : 'ISSUES_FOUND'
    };
    
    console.log('🎯 [TEST-CONTEXT] Resultados finais:', testResults);
    
    return NextResponse.json({
      success: true,
      test_results: testResults,
      detailed_logs: 'Check server console for detailed logs',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TEST-CONTEXT] Erro durante teste:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      test_results: {
        singleton_working: false,
        context_persisted: false,
        overall_status: 'ERROR'
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phone = '5511999999999', message1 = 'Olá', message2 = 'Continuar' } = await request.json();
    
    console.log(`🧪 [TEST-CONTEXT] Teste customizado para ${phone}`);
    
    const agent1 = ProfessionalAgent.getInstance();
    const agent2 = ProfessionalAgent.getInstance();
    
    // Limpar contexto anterior do telefone para teste limpo
    agent1.clearClientContext(phone);
    
    // Primeira mensagem
    const response1 = await agent1.processMessage({
      message: message1,
      clientPhone: phone,
      tenantId: 'custom-test',
      conversationHistory: []
    });
    
    // Segunda mensagem imediatamente após
    const response2 = await agent2.processMessage({
      message: message2,
      clientPhone: phone,
      tenantId: 'custom-test',
      conversationHistory: []
    });
    
    const finalStats = agent2.getAgentStats();
    
    return NextResponse.json({
      success: true,
      custom_test: {
        input: { phone, message1, message2 },
        responses: [
          {
            message: message1,
            intent: response1.intent,
            tokens: response1.tokensUsed,
            reply: response1.reply
          },
          {
            message: message2,
            intent: response2.intent,
            tokens: response2.tokensUsed,
            reply: response2.reply
          }
        ],
        singleton_check: agent1 === agent2,
        final_stats: finalStats
      }
    });
    
  } catch (error) {
    console.error('❌ [TEST-CONTEXT] Erro no teste customizado:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}