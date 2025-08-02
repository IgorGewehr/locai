#!/usr/bin/env node

/**
 * 🧪 Script de Teste Simples - Sofia V5
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
  console.log(`\n📤 Enviando: "${message}"`);
  
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
    
    console.log(`📥 Sofia: "${result.message || result.response}"`);
    
    if (result.data?.functionsExecuted?.length > 0) {
      console.log(`🔧 Funções: ${JSON.stringify(result.data.functionsExecuted)}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    return null;
  }
}

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando Teste Simples - Sofia V5\n');
  console.log('=' .repeat(50));
  
  // Teste 1: Saudação
  console.log('\n📋 TESTE 1: SAUDAÇÃO');
  await clearContext();
  await testMessage('Oi Sofia!');
  
  // Teste 2: Intenção de negócio
  console.log('\n📋 TESTE 2: BUSCA DE PROPRIEDADES');
  await clearContext();
  await testMessage('Quero alugar um apartamento');
  
  // Teste 3: Com contexto específico
  console.log('\n📋 TESTE 3: BUSCA COM DETALHES');
  await clearContext();
  await testMessage('Procuro um apartamento para 2 pessoas em Copacabana');
  
  // Teste 4: Pergunta de preço
  console.log('\n📋 TESTE 4: CÁLCULO DE PREÇO');
  await testMessage('quanto custa para 3 noites?');
  
  // Teste 5: Fotos
  console.log('\n📋 TESTE 5: SOLICITAÇÃO DE FOTOS');
  await testMessage('quero ver fotos');
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Testes concluídos!');
}

// Verificar servidor e executar
console.log('🔧 Verificando servidor...');
fetch(`${BASE_URL}/api/health`)
  .then(response => {
    if (!response.ok) throw new Error('Servidor não está respondendo');
    console.log('✅ Servidor online!\n');
    return runTests();
  })
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`❌ Erro: ${error.message}`);
    console.log('\n⚠️  Certifique-se de que o servidor está rodando na porta 3000');
    process.exit(1);
  });