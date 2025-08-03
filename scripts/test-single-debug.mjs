// Teste único com debug detalhado
console.log('🔍 Teste único para debug...\n');

const API_URL = 'http://localhost:3000/api/agent';

async function testSingle() {
  console.log('📝 Testando: "Procuro um apartamento em Florianópolis"');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Procuro um apartamento em Florianópolis",
        clientPhone: "5511999999999",
        tenantId: "default-tenant",
        isTest: true,
        metadata: {
          source: 'web',
          priority: 'normal'
        }
      })
    });
    
    const data = await response.json();
    
    console.log('📦 Resposta:');
    console.log('- Success:', data.success);
    console.log('- Message:', data.message);
    console.log('- Stage:', data.data?.conversationStage);
    console.log('- Tokens:', data.data?.tokensUsed);
    console.log('- Functions:', data.data?.functionsExecuted);
    console.log('- Error details:', data.data?.error);
    
    if (data.data?.conversationStage === 'error') {
      console.log('\n🚨 ERRO DETECTADO!');
      console.log('Possíveis causas:');
      console.log('1. Erro no processamento do OpenAI');
      console.log('2. Problema na execução de funções');
      console.log('3. Erro no contexto de conversa');
      console.log('4. Timeout ou rate limiting');
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testSingle();