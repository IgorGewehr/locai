// Teste rápido para validar correções
const fetch = require('node-fetch');

const AGENT_URL = 'http://localhost:3000/api/agent';
const TEST_PHONE = '5511999999999';
const TENANT_ID = 'default-tenant';

async function testMessage(message) {
  try {
    const response = await fetch(AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        clientPhone: TEST_PHONE,
        tenantId: TENANT_ID,
        isTest: true
      })
    });
    
    const result = await response.json();
    
    console.log(`\n📤 INPUT: "${message}"`);
    console.log(`📥 SOFIA: "${result.message || result.error}"`);
    if (result.data?.functionsExecuted) {
      console.log(`🔧 FUNCTIONS: ${result.data.functionsExecuted.join(', ')}`);
    }
    if (result.data?.responseTime) {
      console.log(`⏱️  TIME: ${result.data.responseTime}ms`);
    }
    console.log('---');
    
    return result;
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    return { success: false, message: error.message };
  }
}

async function clearContext() {
  try {
    const response = await fetch(`${AGENT_URL}/clear-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientPhone: TEST_PHONE,
        tenantId: TENANT_ID
      })
    });
    
    if (response.ok) {
      console.log('🧹 Contexto limpo');
    }
  } catch (error) {
    console.log('⚠️ Erro ao limpar contexto:', error.message);
  }
}

async function testeRapido() {
  console.log('🚀 TESTE RÁPIDO - VALIDAÇÃO DAS CORREÇÕES');
  console.log('==========================================');
  
  await clearContext();
  
  // Teste 1: Busca básica deve funcionar
  console.log('\n🧪 Teste 1: Busca Básica');
  const t1 = await testMessage('Quero alugar um apartamento para 2 pessoas');
  
  if (t1.data?.functionsExecuted?.includes('search_properties')) {
    console.log('✅ search_properties executou corretamente!');
  } else {
    console.log('❌ search_properties NÃO executou');
  }
  
  // Teste 2: Segunda mensagem sobre fotos
  console.log('\n🧪 Teste 2: Solicitar Fotos');
  const t2 = await testMessage('quero ver fotos da primeira opção');
  
  if (t2.data?.functionsExecuted?.includes('send_property_media')) {
    console.log('✅ send_property_media executou corretamente!');
  } else {
    console.log('❌ send_property_media NÃO executou');
  }
  
  // Teste 3: Calcular preço
  console.log('\n🧪 Teste 3: Calcular Preço');
  const t3 = await testMessage('quanto custa para 3 noites?');
  
  if (t3.data?.functionsExecuted?.includes('calculate_price')) {
    console.log('✅ calculate_price executou corretamente!');
  } else {
    console.log('❌ calculate_price NÃO executou');
  }
  
  console.log('\n📊 RESULTADO:');
  let sucessos = 0;
  if (t1.data?.functionsExecuted?.includes('search_properties')) sucessos++;
  if (t2.data?.functionsExecuted?.includes('send_property_media')) sucessos++;
  if (t3.data?.functionsExecuted?.includes('calculate_price')) sucessos++;
  
  console.log(`${sucessos}/3 testes passaram`);
  
  if (sucessos === 3) {
    console.log('🎉 CORREÇÕES FUNCIONARAM! Sofia está executando funções corretamente.');
  } else {
    console.log('⚠️ Ainda há problemas para corrigir.');
  }
}

testeRapido().catch(console.error);