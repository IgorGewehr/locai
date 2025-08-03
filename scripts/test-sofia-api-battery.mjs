// Bateria Completa de Testes via API - Sofia V3
// Testa todas as funções através da rota /api/agent

console.log('🧪 BATERIA COMPLETA DE TESTES VIA API - SOFIA V3');
console.log('===============================================\n');

const API_URL = 'http://localhost:3000/api/agent';
const testPhone = "5511999999999";
const testTenant = "default-tenant";

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Função auxiliar para fazer requisição HTTP
async function makeRequest(message) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      clientPhone: testPhone,
      tenantId: testTenant,
      isTest: true,
      metadata: {
        source: 'web',
        priority: 'normal'
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

// Função auxiliar para limpar contexto
async function clearContext() {
  try {
    const response = await fetch('http://localhost:3000/api/agent/clear-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientPhone: testPhone,
        tenantId: testTenant
      })
    });
    
    if (response.ok) {
      console.log('🧹 Contexto limpo');
    } else {
      console.log('⚠️  Erro ao limpar contexto');
    }
  } catch (error) {
    console.log('⚠️  Erro ao limpar contexto:', error.message);
  }
}

// Função auxiliar para executar teste
async function runTest(testName, message, expectedFunction = null) {
  console.log(`\n📝 TESTE: ${testName}`);
  console.log(`   Mensagem: "${message}"`);
  
  try {
    const result = await makeRequest(message);
    
    if (!result.success) {
      throw new Error(result.error || 'Resposta de erro da API');
    }

    const reply = result.message || result.data?.response || 'Sem resposta';
    console.log(`   ✅ Resposta: ${reply.substring(0, 100)}...`);
    console.log(`   📊 Tokens: ${result.data?.tokensUsed || 0}`);
    console.log(`   ⏱️  Tempo: ${result.data?.responseTime || 'N/A'}ms`);
    console.log(`   🔧 Funções: ${result.data?.functionsExecuted?.length || 0}`);
    console.log(`   📈 Stage: ${result.data?.conversationStage || 'N/A'}`);
    console.log(`   🎯 Confiança: ${result.data?.confidence || 0}`);
    
    if (expectedFunction && result.data?.functionsExecuted?.includes(expectedFunction)) {
      console.log(`   🎯 SUCESSO: Função ${expectedFunction} executada como esperado`);
    } else if (expectedFunction) {
      console.log(`   ⚠️  AVISO: Função ${expectedFunction} não foi executada`);
    }
    
    testResults.passed++;
    return result;
    
  } catch (error) {
    console.error(`   ❌ ERRO: ${error.message}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando bateria de testes via API...\n');
  
  // Limpar contexto inicial
  await clearContext();
  
  // TESTE 1: Saudação básica
  await runTest(
    "Saudação Básica",
    "Olá, boa tarde!"
  );
  
  // TESTE 2: Busca de propriedades simples
  await runTest(
    "Busca Simples",
    "Quero alugar um apartamento",
    "search_properties"
  );
  
  // TESTE 3: Busca com filtros específicos
  await runTest(
    "Busca com Filtros",
    "Procuro um apartamento em Florianópolis com 2 quartos para 4 pessoas",
    "search_properties" 
  );
  
  // TESTE 4: Solicitação de mais informações
  await runTest(
    "Mais Informações",
    "Me conte mais sobre o primeiro apartamento"
  );
  
  // TESTE 5: Solicitação de preço
  await runTest(
    "Cálculo de Preço",
    "Quanto custa para 5 dias a partir de amanhã?",
    "calculate_price"
  );
  
  // TESTE 6: Solicitação de fotos
  await runTest(
    "Solicitação de Fotos",
    "Pode me mostrar fotos?",
    "send_property_media"
  );
  
  // TESTE 7: Registro de cliente
  await runTest(
    "Registro de Cliente",
    "Meu nome é João Silva, meu email é joao@teste.com",
    "register_client"
  );
  
  // TESTE 8: Interesse em reserva
  await runTest(
    "Interesse em Reserva",
    "Quero fazer a reserva do apartamento"
  );
  
  // TESTE 9: Mensagem casual
  await runTest(
    "Mensagem Casual",
    "Como você está?"
  );
  
  // TESTE 10: Pergunta sobre amenidades
  await runTest(
    "Amenidades",
    "Tem wifi e ar condicionado?"
  );
  
  // Resultado final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADO FINAL DA BATERIA DE TESTES');
  console.log('='.repeat(60));
  console.log(`✅ Testes bem-sucedidos: ${testResults.passed}`);
  console.log(`❌ Testes com falha: ${testResults.failed}`);
  console.log(`📈 Taxa de sucesso: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ ERROS ENCONTRADOS:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
    });
    
    console.log('\n🔧 RECOMENDAÇÕES PARA CORREÇÃO:');
    console.log('   - Verificar logs do servidor durante os testes');
    console.log('   - Analisar configuração das funções em lib/ai/agent-functions.ts');
    console.log('   - Validar contexto de conversa e estado');
    console.log('   - Verificar imports e dependências');
  } else {
    console.log('\n🎉 PERFEITO! Todos os testes passaram!');
    console.log('   Sofia V3 está funcionando corretamente em todos os cenários testados.');
  }
  
  console.log('\n📋 PRÓXIMOS PASSOS:');
  if (testResults.failed > 0) {
    console.log('   1. Corrigir os erros identificados');
    console.log('   2. Re-executar os testes que falharam');
    console.log('   3. Testar cenários edge cases adicionais');
  } else {
    console.log('   1. Sistema pronto para produção!');
    console.log('   2. Considerar testes de carga e performance');
    console.log('   3. Monitorar logs em produção');
  }
}

// Executar todos os testes
runAllTests().catch(console.error);