#!/usr/bin/env node

/**
 * 🧪 Teste Rápido - Sofia V5 (Testes 6-8)
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '5511999999999';
const TENANT_ID = 'default-tenant';

// Helper para limpar contexto
async function clearContext() {
  try {
    await fetch(`${BASE_URL}/api/agent/clear-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientPhone: TEST_PHONE,
        tenantId: TENANT_ID
      })
    });
    console.log('✅ Contexto limpo');
  } catch (error) {
    console.error('❌ Erro ao limpar contexto:', error.message);
  }
}

// Helper para testar mensagem
async function testMessage(message) {
  console.log(`\n📤 "${message}"`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/agent`, {
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
    
    console.log(`📥 "${(result.message || result.response).substring(0, 150)}..."`);
    
    if (result.data?.functionsExecuted?.length > 0) {
      console.log(`🔧 ${JSON.stringify(result.data.functionsExecuted)}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ ${error.message}`);
    return null;
  }
}

// Executar testes rápidos
async function runQuickTests() {
  console.log('🚀 Teste Rápido - Sofia V5 (Testes 6-8)\n');
  
  // TESTE 6.1: Dados completos
  console.log('👤 TESTE 6.1: Dados Completos');
  await clearContext();
  await testMessage('João Silva, 11987654321, 12345678901, joao@email.com');
  
  // TESTE 6.2: Dados incompletos
  console.log('\n👤 TESTE 6.2: Dados Incompletos');
  await clearContext();
  await testMessage('João Silva, 11987654321');
  
  // TESTE 6.3: CPF inválido
  console.log('\n👤 TESTE 6.3: CPF Inválido');
  await clearContext();
  await testMessage('João Silva, 11987654321, 123');
  
  // TESTE 7.1: Solicitação de visita
  console.log('\n📅 TESTE 7.1: Solicitação de Visita');
  await clearContext();
  await testMessage('Quero alugar um apartamento');
  await testMessage('gostaria de visitar o apartamento');
  
  // TESTE 8.1: Confirmação de reserva
  console.log('\n🏆 TESTE 8.1: Confirmação de Reserva');
  await clearContext();
  await testMessage('Quero alugar um apartamento');
  await testMessage('João Silva, 11987654321, 12345678901');
  await testMessage('quero confirmar a reserva');
  
  console.log('\n✅ Testes concluídos!');
}

// Executar
console.log('🔧 Verificando servidor...');
fetch(`${BASE_URL}/api/health`)
  .then(() => runQuickTests())
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  });