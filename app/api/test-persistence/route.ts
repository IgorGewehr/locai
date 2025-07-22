import { NextRequest, NextResponse } from 'next/server';
import { ProfessionalAgent } from '@/lib/ai-agent/professional-agent';
import { conversationContextService } from '@/lib/services/conversation-context-service';

export async function POST(request: NextRequest) {
  try {
    const { test = 'basic' } = await request.json();
    
    console.log(`🧪 [TEST-PERSISTENCE] Iniciando teste: ${test}`);
    
    if (test === 'basic') {
      // Teste básico de persistência
      const testPhone = '5511987654321';
      const tenantId = 'test-persistence';
      
      // Limpar contexto anterior para teste limpo
      const agent = ProfessionalAgent.getInstance();
      agent.clearClientContext(testPhone);
      
      console.log('📞 Primeira mensagem...');
      const response1 = await agent.processMessage({
        message: 'Olá, procuro casa em Florianópolis',
        clientPhone: testPhone,
        tenantId,
        conversationHistory: []
      });
      
      console.log('📞 Segunda mensagem (nova instância)...');
      // Limpar memória para forçar busca do banco
      agent.clearClientContext(testPhone);
      
      const response2 = await agent.processMessage({
        message: 'Quero ver as opções disponíveis',
        clientPhone: testPhone,
        tenantId,
        conversationHistory: []
      });
      
      // Buscar histórico do banco
      const history = await conversationContextService.getMessageHistory(testPhone, tenantId, 10);
      
      // Buscar contexto do banco
      const dbContext = await conversationContextService.getOrCreateContext(testPhone, tenantId);
      
      return NextResponse.json({
        success: true,
        test: 'basic_persistence',
        results: {
          first_message: {
            user: 'Olá, procuro casa em Florianópolis',
            assistant: response1.reply,
            intent: response1.intent
          },
          second_message: {
            user: 'Quero ver as opções disponíveis',
            assistant: response2.reply,
            intent: response2.intent
          },
          context_from_db: {
            city: dbContext.context.clientData.city,
            stage: dbContext.context.stage,
            messageCount: dbContext.messageCount
          },
          history_count: history.length,
          history_messages: history.map(h => ({
            role: h.role,
            content: h.content.substring(0, 50),
            intent: h.intent
          }))
        }
      });
      
    } else if (test === 'history') {
      // Teste do histórico influenciando respostas
      const testPhone = '5511123456789';
      const tenantId = 'test-history';
      
      const agent = ProfessionalAgent.getInstance();
      agent.clearClientContext(testPhone);
      
      // Criar conversa com histórico
      console.log('📞 Criando histórico de conversa...');
      
      await agent.processMessage({
        message: 'Oi, sou João',
        clientPhone: testPhone,
        tenantId,
        conversationHistory: []
      });
      
      await agent.processMessage({
        message: 'Quero alugar em Florianópolis',
        clientPhone: testPhone,
        tenantId,
        conversationHistory: []
      });
      
      await agent.processMessage({
        message: 'Prefiro casa com piscina',
        clientPhone: testPhone,
        tenantId,
        conversationHistory: []
      });
      
      // Limpar memória e fazer pergunta que requer contexto
      agent.clearClientContext(testPhone);
      
      const finalResponse = await agent.processMessage({
        message: 'Qual cidade eu tinha mencionado?',
        clientPhone: testPhone,
        tenantId,
        conversationHistory: [] // Vai buscar do banco
      });
      
      const history = await conversationContextService.getMessageHistory(testPhone, tenantId, 20);
      
      return NextResponse.json({
        success: true,
        test: 'history_influence',
        results: {
          conversation_length: history.length,
          final_question: 'Qual cidade eu tinha mencionado?',
          final_response: finalResponse.reply,
          context_preserved: finalResponse.reply.toLowerCase().includes('florianópolis'),
          full_history: history.map(h => ({
            role: h.role,
            content: h.content,
            timestamp: h.timestamp.toDate().toISOString()
          }))
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Test type not specified',
      available_tests: ['basic', 'history']
    });
    
  } catch (error) {
    console.error('❌ [TEST-PERSISTENCE] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test-persistence',
    description: 'Testa persistência de contexto e histórico',
    usage: {
      method: 'POST',
      body: {
        test: 'basic' // ou 'history'
      }
    },
    tests: {
      basic: 'Testa se contexto é salvo e recuperado do banco',
      history: 'Testa se histórico influencia respostas'
    }
  });
}