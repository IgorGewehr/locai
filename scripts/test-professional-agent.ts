// scripts/test-professional-agent.ts
// @ts-nocheck - script file, suppress all type checking

import { ProfessionalAgent } from '../lib/ai-agent/professional-agent';
import { AgentMonitor } from '../lib/monitoring/agent-monitor';

export async function testProfessionalAgent() {
  console.log('🧪 Testando ProfessionalAgent reformulado...\n');

  const agent = new ProfessionalAgent();
  
  const testCases = [
    {
      message: "Oi, tudo bem?",
      expected: "greeting",
      description: "Teste de saudação"
    },
    {
      message: "Procuro apartamento 2 quartos no Rio de Janeiro",
      expected: "search_properties", 
      description: "Teste de busca de propriedades"
    },
    {
      message: "Quanto custa 3 noites?",
      expected: "price_inquiry",
      description: "Teste de consulta de preço"
    },
    {
      message: "Quero reservar esse apartamento",
      expected: "booking_intent",
      description: "Teste de intenção de reserva"
    },
    {
      message: "Preciso de mais informações sobre localização",
      expected: "general",
      description: "Teste de pergunta geral"
    }
  ];

  console.log(`📊 Executando ${testCases.length} casos de teste...\n`);

  let totalTokens = 0;
  let cacheHits = 0;
  let totalTime = 0;

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    const startTime = Date.now();
    
    try {
      // @ts-ignore - suppress type checking for test possibly undefined
      console.log(`${i + 1}. ${test.description}`);
      // @ts-ignore - suppress type checking for test possibly undefined
      console.log(`   Input: "${test.message}"`);
      
      const response = await agent.processMessage({
        // @ts-ignore - suppress type checking for test possibly undefined
        message: test.message,
        clientPhone: '+5511999999999',
        tenantId: 'test_tenant'
      });

      const responseTime = Date.now() - startTime;
      totalTime += responseTime;
      totalTokens += response.tokensUsed;
      
      if (response.fromCache) {
        cacheHits++;
      }

      // @ts-ignore - suppress type checking for test possibly undefined
      console.log(`   Intent: ${response.intent} ${response.intent === test.expected ? '✅' : '❌'}`);
      console.log(`   Response: ${response.reply.substring(0, 100)}...`);
      console.log(`   Tokens: ${response.tokensUsed}, Cache: ${response.fromCache ? 'HIT' : 'MISS'}, Time: ${responseTime}ms`);
      console.log(`   Confidence: ${response.confidence}\n`);

    } catch (error) {
      console.log(`   ❌ Error: ${error}\n`);
    }
  }

  // Teste de cache - repetir primeira mensagem
  console.log('🔄 Testando cache (repetindo primeira mensagem)...');
  const cacheTest = await agent.processMessage({
    // @ts-ignore - suppress type checking for testCases possibly undefined
    message: testCases[0]?.message || 'test message',
    clientPhone: '+5511999999999',
    tenantId: 'test_tenant'
  });
  
  console.log(`Cache test - FromCache: ${cacheTest.fromCache ? 'HIT ✅' : 'MISS ❌'}`);
  console.log(`Tokens used: ${cacheTest.tokensUsed}\n`);

  // Estatísticas finais
  console.log('📈 ESTATÍSTICAS FINAIS:');
  console.log(`Total de tokens usados: ${totalTokens}`);
  console.log(`Cache hit rate: ${((cacheHits / testCases.length) * 100).toFixed(1)}%`);
  console.log(`Tempo médio de resposta: ${(totalTime / testCases.length).toFixed(0)}ms`);
  console.log(`Custo estimado: $${((totalTokens / 1000) * 0.0015).toFixed(4)}`);
  
  console.log('\n🏆 Stats do agente:');
  console.log(JSON.stringify(agent.getAgentStats(), null, 2));
  
  console.log('\n📊 Métricas do monitor:');
  console.log(JSON.stringify(AgentMonitor.getMetrics(), null, 2));
}

// Função para teste de API
export async function testAPIEndpoint() {
  console.log('\n🌐 Testando endpoint da API...');
  
  const testData = {
    message: "Procuro apartamento em Copacabana",
    clientPhone: "+5511999999999",
    tenantId: "test_tenant"
  };

  try {
    const response = await fetch('http://localhost:3000/api/agent-professional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.log('❌ Erro ao testar API:', error);
  }
}

// Executar testes se o script for chamado diretamente
if (require.main === module) {
  testProfessionalAgent()
    .then(() => testAPIEndpoint())
    .catch(console.error);
}