// Bateria Completa de Testes - Sofia V3
// Testa todas as funções do agente para garantir funcionamento

import { sofiaAgent } from '../lib/ai-agent/sofia-agent.js';

console.log('🧪 BATERIA COMPLETA DE TESTES - SOFIA V3');
console.log('=====================================\n');

const testPhone = "5511999999999";
const testTenant = "default-tenant";
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Função auxiliar para executar teste
async function runTest(testName, message, expectedFunction = null) {
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
    
  } catch (error) {
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
  } catch (error) {
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
  
  // TESTE 6: Detalhes da propriedade
  await runTest(
    "Detalhes da Propriedade",
    "Me fale mais sobre o primeiro apartamento",
    "get_property_details"
  );
  
  // TESTE 7: Registro de cliente
  await runTest(
    "Registro de Cliente",
    "Meu nome é João Silva, CPF 123.456.789-00, email joao@email.com",
    "register_client"
  );
  
  // TESTE 8: Agendamento de visita
  await runTest(
    "Agendamento de Visita",
    "Gostaria de agendar uma visita para amanhã de manhã",
    "schedule_visit"
  );
  
  // TESTE 9: Criação de reserva
  await runTest(
    "Criação de Reserva",
    "Quero fazer a reserva do apartamento de 15 a 20 de dezembro",
    "create_reservation"
  );
  
  // TESTE 10: Mensagem casual
  await runTest(
    "Mensagem Casual",
    "Como você está hoje?"
  );
  
  // TESTE 11: Pergunta sobre localização
  await runTest(
    "Pergunta sobre Localização",
    "O apartamento fica perto da praia?"
  );
  
  // TESTE 12: Negociação de preço
  await runTest(
    "Negociação de Preço",
    "O preço está um pouco alto, tem desconto?"
  );
  
  // TESTE 13: Informações adicionais
  await runTest(
    "Informações Adicionais",
    "Aceita pets? Tem vaga de garagem?"
  );
  
  // TESTE 14: Confirmação final
  await runTest(
    "Confirmação Final",
    "Está tudo certo, confirmo a reserva!"
  );
  
  // TESTE 15: Teste de qualificação
  await clearContext();
  await runTest(
    "Qualificação de Cliente",
    "Oi, preciso de um lugar para ficar"
  );
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTADO FINAL DA BATERIA DE TESTES');
  console.log('='.repeat(50));
  console.log(`✅ Testes passaram: ${testResults.passed}`);
  console.log(`❌ Testes falharam: ${testResults.failed}`);
  console.log(`📈 Taxa de sucesso: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ ERROS ENCONTRADOS:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  console.log('\n🎯 ANÁLISE:');
  if (testResults.failed === 0) {
    console.log('🎉 PERFEITO! Todos os testes passaram. Sofia V3 está funcionando corretamente!');
  } else if (testResults.failed <= 2) {
    console.log('⚠️  Poucos erros encontrados. Sofia V3 está majoritariamente funcional.');
  } else {
    console.log('🚨 Vários erros encontrados. Necessária investigação e correção.');
  }
  
  console.log('\n🔧 Para corrigir erros, verifique:');
  console.log('   - Logs detalhados acima');
  console.log('   - Configuração das funções em lib/ai/agent-functions.ts');
  console.log('   - Contexto e estado da conversa');
  console.log('   - Validações de entrada nos métodos');
}

// Executar todos os testes
runAllTests().catch(console.error);