// Debug da resposta da API
console.log('🔍 Testando resposta da API...\n');

const API_URL = 'http://localhost:3000/api/agent';

async function testApiResponse() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Olá, boa tarde!",
        clientPhone: "5511999999999",
        tenantId: "default-tenant",
        isTest: true,
        metadata: {
          source: 'web',
          priority: 'normal'
        }
      })
    });
    
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('\n📦 Resposta completa:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n🔍 Análise:');
    console.log('- success:', data.success);
    console.log('- reply:', typeof data.reply, data.reply ? 'EXISTS' : 'UNDEFINED');
    console.log('- data:', typeof data.data);
    console.log('- error:', data.error);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testApiResponse();