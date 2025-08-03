// Script de teste para verificar correções da Sofia V3
import { sofiaAgent } from '../lib/ai-agent/sofia-agent.js';

console.log('🧪 Testando Sofia V3 após correções...\n');

async function testSofia() {
  try {
    console.log('📝 Teste 1: Mensagem simples de busca');
    const result = await sofiaAgent.processMessage({
      message: "olá, gostaria de um apto para mim e minha esposa",
      clientPhone: "5511999999999",
      tenantId: "default-tenant",
      metadata: {
        source: 'web',
        priority: 'normal'
      }
    });

    console.log('✅ Resposta recebida:');
    console.log('Reply:', result.reply);
    console.log('Stage:', result.metadata.stage);
    console.log('Functions executed:', result.functionsExecuted);
    console.log('Tokens used:', result.tokensUsed);
    console.log('\n---\n');

    // Teste 2: Limpeza de contexto
    console.log('📝 Teste 2: Limpeza de contexto');
    await sofiaAgent.clearClientContext("5511999999999", "default-tenant");
    console.log('✅ Contexto limpo com sucesso\n');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSofia();