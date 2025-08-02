#!/usr/bin/env node

/**
 * 🧪 Testes Avançados - Sofia V5 (Testes 6-8)
 * Focado em register_client, schedule_visit, create_reservation
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
async function testMessage(message, expectations = {}) {
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
      console.log(`🔧 Funções executadas: ${JSON.stringify(result.data.functionsExecuted)}`);
    }

    // Validar expectativas
    if (expectations.shouldExecute) {
      const executed = result.data?.functionsExecuted || [];
      const hasFunction = executed.includes(expectations.shouldExecute);
      console.log(hasFunction ? '✅ Função executada corretamente' : `❌ Deveria executar: ${expectations.shouldExecute}`);
    }

    if (expectations.shouldContain) {
      const contains = (result.message || result.response || '').toLowerCase().includes(expectations.shouldContain.toLowerCase());
      console.log(contains ? `✅ Contém: "${expectations.shouldContain}"` : `❌ Deveria conter: "${expectations.shouldContain}"`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    return null;
  }
}

// Executar testes avançados
async function runAdvancedTests() {
  console.log('🚀 Iniciando Testes Avançados - Sofia V5 (Testes 6-8)\n');
  console.log('=' .repeat(60));
  
  // ===========================================
  // TESTE 6: FUNÇÃO register_client
  // ===========================================
  console.log('\n👤 TESTE 6: FUNÇÃO register_client');
  console.log('-'.repeat(40));
  
  // Teste 6.1: Cadastro Completo
  console.log('\n📋 TESTE 6.1: Cadastro Completo');
  await clearContext();
  await testMessage('Quero alugar um apartamento'); // Buscar propriedades primeiro
  await testMessage('João Silva, 11987654321, 12345678901, joao@email.com', {
    shouldExecute: 'register_client',
    shouldContain: 'cadastro'
  });
  
  // Teste 6.2: Dados Incompletos
  console.log('\n📋 TESTE 6.2: Dados Incompletos (sem CPF)');
  await clearContext();
  await testMessage('João Silva, 11987654321', {
    shouldContain: 'CPF'
  });
  
  // Teste 6.3: CPF Inválido
  console.log('\n📋 TESTE 6.3: CPF Inválido');
  await clearContext();
  await testMessage('João Silva, 11987654321, 123', {
    shouldContain: 'CPF'
  });

  // ===========================================
  // TESTE 7: FUNÇÃO schedule_visit
  // ===========================================
  console.log('\n📅 TESTE 7: FUNÇÃO schedule_visit');
  console.log('-'.repeat(40));
  
  // Teste 7.1: Disponibilidade
  console.log('\n📋 TESTE 7.1: Solicitação de Visita');
  await clearContext();
  await testMessage('Quero alugar um apartamento'); // Buscar propriedades primeiro
  await testMessage('gostaria de visitar o apartamento', {
    shouldContain: 'visita'
  });
  
  // Teste 7.2: Agendamento com data/hora
  console.log('\n📋 TESTE 7.2: Agendamento com Data/Hora');
  await testMessage('quero agendar para amanhã às 14h', {
    shouldContain: 'agendado'
  });
  
  // Teste 7.3: Horário Inválido
  console.log('\n📋 TESTE 7.3: Horário Inválido');
  await testMessage('pode ser às 3h da madrugada?', {
    shouldContain: 'horário'
  });

  // ===========================================
  // TESTE 8: FUNÇÃO create_reservation
  // ===========================================
  console.log('\n🏆 TESTE 8: FUNÇÃO create_reservation');
  console.log('-'.repeat(40));
  
  // Teste 8.1: Fluxo Completo
  console.log('\n📋 TESTE 8.1: Fluxo Completo de Reserva');
  await clearContext();
  
  console.log('\n  🔸 Passo 1: Buscar propriedades');
  await testMessage('quero alugar para 2 pessoas');
  
  console.log('\n  🔸 Passo 2: Ver fotos');
  await testMessage('quero ver fotos da primeira');
  
  console.log('\n  🔸 Passo 3: Calcular preço');
  await testMessage('quanto custa de 1 a 5 de agosto?');
  
  console.log('\n  🔸 Passo 4: Cadastrar cliente');
  await testMessage('João Silva, 11987654321, 12345678901');
  
  console.log('\n  🔸 Passo 5: Confirmar reserva');
  await testMessage('quero confirmar a reserva', {
    shouldExecute: 'create_reservation',
    shouldContain: 'confirmada'
  });
  
  // Teste 8.2: Reserva sem Preço
  console.log('\n📋 TESTE 8.2: Reserva sem Preço Calculado');
  await clearContext();
  await testMessage('Quero alugar um apartamento');
  await testMessage('João Silva, 11987654321, 12345678901');
  await testMessage('quero fazer a reserva', {
    shouldContain: 'preço'
  });
  
  // Teste 8.3: Reserva sem Cliente
  console.log('\n📋 TESTE 8.3: Reserva sem Dados do Cliente');
  await clearContext();
  await testMessage('Quero alugar um apartamento');
  await testMessage('quanto custa para 3 noites?');
  await testMessage('quero fazer a reserva', {
    shouldContain: 'dados'
  });

  console.log('\n' + '=' .repeat(60));
  console.log('✅ Testes Avançados concluídos!');
  console.log('\n📊 Resumo:');
  console.log('• TESTE 6 (register_client): Detecção automática de dados');
  console.log('• TESTE 7 (schedule_visit): Agendamento inteligente');  
  console.log('• TESTE 8 (create_reservation): Fluxo completo de reserva');
  console.log('\n🎯 Verifique se todas as funções foram executadas corretamente!');
}

// Verificar servidor e executar
console.log('🔧 Verificando servidor...');
fetch(`${BASE_URL}/api/health`)
  .then(response => {
    if (!response.ok) throw new Error('Servidor não está respondendo');
    console.log('✅ Servidor online!\n');
    return runAdvancedTests();
  })
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`❌ Erro: ${error.message}`);
    console.log('\n⚠️  Certifique-se de que o servidor está rodando na porta 3000');
    process.exit(1);
  });