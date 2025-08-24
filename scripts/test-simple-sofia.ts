// scripts/test-simple-sofia.ts
// Teste rápido do Sofia Agent Simplificado

// Carregar .env ANTES de qualquer import
require('dotenv').config({ path: '.env.local' });

// Debug: verificar se a API key foi carregada
console.log('🔑 OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Carregada ✅' : 'Não encontrada ❌');

import { simpleSofiaAgent } from '../lib/ai-agent/sofia-agent-simple';

async function testSimpleSofia() {
  console.log('🧪 Testando Sofia Agent Simplificado...\n');

  const testCases = [
    {
      message: 'olá, quero um apartamento',
      expected: 'search_properties'
    },
    {
      message: 'para 2 pessoas, primeira semana de setembro',
      expected: 'search_properties'
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`📝 Teste ${i + 1}: "${test.message}"`);
    
    try {
      const startTime = Date.now();
      const result = await simpleSofiaAgent.processMessage({
        message: test.message,
        clientPhone: '+5511999999999',
        tenantId: 'test-tenant'
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Sucesso em ${duration}ms`);
      console.log(`📋 Função executada: ${result.functionsExecuted.join(', ') || 'nenhuma'}`);
      console.log(`💬 Resposta: ${result.reply.substring(0, 100)}...`);
      console.log(`🎯 Confiança: ${(result.metadata.confidence * 100).toFixed(1)}%`);
      console.log(`🔄 Fallback usado: ${result.metadata.fallbackUsed ? 'Sim' : 'Não'}`);
      
    } catch (error) {
      console.log(`❌ Erro: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('---');
  }

  // Estatísticas
  const stats = simpleSofiaAgent.getStats();
  console.log('📊 Estatísticas:');
  console.log(`   Contextos ativos: ${stats.activeContexts}`);
  console.log(`   Memória usada: ${stats.memoryUsage.toFixed(1)}MB`);
}

testSimpleSofia().catch(console.error);