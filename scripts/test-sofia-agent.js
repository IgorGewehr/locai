#!/usr/bin/env node

/**
 * Script para testar o Sofia Agent V3
 */

async function testSofiaAgent() {
  console.log('🧪 Testando Sofia Agent V3...\n');
  
  const testMessage = 'ola quero um apartamento';
  const testPhone = '11999999999';
  const testTenantId = 'default';
  
  try {
    console.log('📤 Enviando mensagem:', testMessage);
    
    const response = await fetch('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        clientPhone: testPhone,
        tenantId: testTenantId,
        isTest: true
      })
    });
    
    const data = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Agente funcionando corretamente!');
      console.log('💬 Resposta:', data.message);
      console.log('📈 Tokens usados:', data.data?.tokensUsed || 'N/A');
      console.log('🔧 Ações executadas:', data.data?.actions || 'N/A');
    } else {
      console.log('❌ Erro na resposta:', data.error);
    }
    
  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
    console.log('🔍 Verifique se o servidor está rodando em http://localhost:3000');
  }
}

console.log('🚀 Iniciando teste do Sofia Agent V3...');
console.log('📍 Certifique-se de que o servidor Next.js está rodando com "npm run dev"\n');

testSofiaAgent();