// scripts/test-context-simple.ts
// Teste do contexto do Sofia Agent Simplificado

require('dotenv').config({ path: '.env.local' });

import { simpleSofiaAgent } from '../lib/ai-agent/sofia-agent-simple';

async function testContext() {
  console.log('🧪 Testando Contexto do Sofia Agent Simplificado...\n');

  const clientPhone = '+5511999999999';
  const tenantId = 'test-tenant';

  // Simular conversa sequencial
  const conversation = [
    'olá sofia, quero alugar um apto',
    'primeira semana de setembro, apenas eu e minha esposa, sem outras preferências'
  ];

  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
    console.log(`\n📝 Mensagem ${i + 1}: "${message}"`);
    
    try {
      const startTime = Date.now();
      const result = await simpleSofiaAgent.processMessage({
        message,
        clientPhone,
        tenantId
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Resposta em ${duration}ms`);
      console.log(`💬 Sofia: ${result.reply}`);
      console.log(`🔄 Fallback: ${result.metadata.fallbackUsed ? 'Sim' : 'Não'}`);
      
      // Pequeno delay entre mensagens
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`❌ Erro: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('---');
  }

  // Limpar contexto para próximos testes
  simpleSofiaAgent.clearContext(clientPhone, tenantId);
  console.log('🧹 Contexto limpo para próximos testes');
}

testContext().catch(console.error);