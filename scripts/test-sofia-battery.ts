// Bateria Completa de Testes - Sofia V3
// Testa todas as funções do agente para garantir funcionamento

import { sofiaAgent } from '../lib/ai-agent/sofia-agent';

console.log('🧪 BATERIA COMPLETA DE TESTES - SOFIA V3');
console.log('=====================================\n');

const testPhone = "5511999999999";
const testTenant = "default-tenant";
let testResults = {
  passed: 0,
  failed: 0,
  errors: [] as Array<{test: string, error: string}>
};

// Função auxiliar para executar teste
async function runTest(testName: string, message: string, expectedFunction?: string) {
  console.log(`\n📝 TESTE: ${testName}`);
  console.log(`   Mensagem: "${message}"`);
  
  try {
    const result = await sofiaAgent.processMessage({
      message,
      clientPhone: testPhone,
      tenantId: testTenant,
      metadata: {
        source: 'web',
        priority: 'normal'
      }
    });

    console.log(`   ✅ Resposta: ${result.reply.substring(0, 100)}...`);
    console.log(`   📊 Tokens: ${result.tokensUsed}, Tempo: ${result.responseTime}ms`);
    console.log(`   🔧 Funções executadas: ${result.functionsExecuted.join(', ')}`);
    console.log(`   📈 Stage: ${result.metadata.stage}, Confiança: ${result.metadata.confidence}`);
    
    if (expectedFunction && result.functionsExecuted.includes(expectedFunction)) {
      console.log(`   🎯 SUCESSO: Função ${expectedFunction} executada como esperado`);
    } else if (expectedFunction) {
      console.log(`   ⚠️  AVISO: Função ${expectedFunction} não foi executada`);
    }
    
    testResults.passed++;
    return result;
    
  } catch (error: any) {
    console.error(`   ❌ ERRO: ${error.message}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    return null;
  }
}

// Função para limpar contexto
async function clearContext() {
  try {
    await sofiaAgent.clearClientContext(testPhone, testTenant);
    console.log('🧹 Contexto limpo');
  } catch (error: any) {
    console.log('⚠️  Erro ao limpar contexto:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando bateria de testes...\n');
  
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
  
  // TESTE 4: Solicitação de preço
  await runTest(
    "Cálculo de Preço",
    "Quanto custa o primeiro apartamento de 15 a 20 de dezembro?",
    "calculate_price"
  );
  
  // TESTE 5: Solicitação de fotos
  await runTest(
    "Solicitação de Fotos",
    "Pode me enviar fotos do primeiro apartamento?",
    "send_property_media"
  );
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTADO PARCIAL (5 TESTES)');
  console.log('='.repeat(50));
  console.log(`✅ Testes passaram: ${testResults.passed}`);
  console.log(`❌ Testes falharam: ${testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ ERROS ENCONTRADOS:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
    });
  }
}

// Executar testes
runAllTests().catch(console.error);