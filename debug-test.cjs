// Teste de debug - sem limpar contexto
const fetch = require('node-fetch');

const AGENT_URL = 'http://localhost:3000/api/agent';
const TEST_PHONE = '5511888888888'; // Número diferente para isolamento
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

async function debugTest() {
  console.log('🔍 TESTE DEBUG - SEM LIMPAR CONTEXTO');
  console.log('====================================');
  
  // NÃO limpar contexto - deixar natural
  
  console.log('\n🧪 Teste Direto: Busca com função obrigatória');
  const t1 = await testMessage('buscar apartamento 2 pessoas');
  
  if (t1.data?.functionsExecuted?.includes('search_properties')) {
    console.log('✅ search_properties FUNCIONOU!');
  } else {
    console.log('❌ search_properties ainda não executa');
    
    // Tentar versão ainda mais direta
    console.log('\n🧪 Teste Ultra-Direto');
    const t2 = await testMessage('use search_properties para 2 guests');
    
    if (t2.data?.functionsExecuted?.includes('search_properties')) {
      console.log('✅ Funcionou com comando direto!');
    } else {
      console.log('❌ Nem com comando direto funciona - problema fundamental');
    }
  }
}

debugTest().catch(console.error);