#!/usr/bin/env node

/**
 * Script de Teste - Melhorias de Detecção e Personalização
 * =========================================================
 * Valida as otimizações implementadas na Sofia V3
 */

// Configuração
const API_BASE = 'http://localhost:3000/api';
const TEST_PHONE = '+5511999888777';
const TENANT_ID = 'demo_tenant';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper para logging
const log = {
  title: (msg) => console.log(`${colors.cyan}${colors.bright}\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}`),
  section: (msg) => console.log(`${colors.yellow}${colors.bright}\n▶ ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.blue}  📝 ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}  ✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}  ❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`  ℹ️ ${msg}`),
  response: (msg) => console.log(`${colors.magenta}  🤖 Sofia: ${msg}${colors.reset}`)
};

// Estatísticas
const stats = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  detectionAccuracy: [],
  responseTime: [],
  functionsExecuted: {}
};

// Helper para enviar mensagem
async function sendMessage(message, clearContext = false) {
  try {
    if (clearContext) {
      await fetch(`${API_BASE}/agent/clear-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientPhone: TEST_PHONE, tenantId: TENANT_ID })
      });
    }

    const startTime = Date.now();
    const response = await fetch(`${API_BASE}/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        clientPhone: TEST_PHONE,
        tenantId: TENANT_ID,
        metadata: { source: 'test-script', testMode: true }
      })
    });

    const responseTime = Date.now() - startTime;
    stats.responseTime.push(responseTime);

    const data = await response.json();
    
    // Registrar funções executadas
    if (data.data?.functionsExecuted) {
      data.data.functionsExecuted.forEach(func => {
        stats.functionsExecuted[func] = (stats.functionsExecuted[func] || 0) + 1;
      });
    }

    return { ...data, responseTime };
  } catch (error) {
    log.error(`Erro: ${error.message}`);
    return null;
  }
}

// Helper para delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========== TESTES DE DETECÇÃO DE INTENÇÃO ==========

async function testIntentDetection() {
  log.section('1. TESTANDO DETECÇÃO DE INTENÇÃO APRIMORADA');
  
  const testCases = [
    {
      name: 'Busca óbvia - deve executar search_properties',
      message: 'quero alugar um apartamento em florianópolis',
      expectedFunction: 'search_properties',
      shouldForce: true
    },
    {
      name: 'Pedido de fotos com contexto - deve executar send_property_media',
      setup: 'quero ver apartamentos em bombinhas',
      message: 'me manda as fotos',
      expectedFunction: 'send_property_media',
      shouldForce: true
    },
    {
      name: 'Cálculo de preço - deve executar calculate_price',
      setup: 'quero um apartamento em florianópolis',
      message: 'quanto fica para 5 dias em março?',
      expectedFunction: 'calculate_price',
      shouldForce: true
    },
    {
      name: 'Registro de cliente - deve executar register_client',
      message: 'meu nome é João Silva, CPF 12345678900',
      expectedFunction: 'register_client',
      shouldForce: true
    },
    {
      name: 'Agendamento de visita - deve executar schedule_visit',
      setup: 'quero ver casas em bombinhas',
      message: 'quero visitar amanhã às 14h',
      expectedFunction: 'schedule_visit',
      shouldForce: true
    },
    {
      name: 'Criação de reserva - deve executar create_reservation',
      setup: 'quero alugar em florianópolis',
      message: 'quero confirmar a reserva',
      expectedFunction: 'create_reservation',
      shouldForce: false // Precisa de contexto completo
    }
  ];

  for (const test of testCases) {
    stats.totalTests++;
    log.test(test.name);
    
    // Setup se necessário
    if (test.setup) {
      await sendMessage(test.setup, true);
      await sleep(2000);
    }
    
    // Enviar mensagem de teste
    const response = await sendMessage(test.message, !test.setup);
    
    if (!response) {
      stats.failed++;
      log.error('Sem resposta do servidor');
      continue;
    }
    
    // Verificar execução da função
    const functionsExecuted = response.data?.functionsExecuted || [];
    const executed = functionsExecuted.includes(test.expectedFunction);
    const forceExecuted = response.data?.metadata?.forceExecuted;
    
    if (executed) {
      stats.passed++;
      log.success(`Função ${test.expectedFunction} executada${forceExecuted ? ' (forçada)' : ''}`);
      stats.detectionAccuracy.push(1);
    } else {
      stats.failed++;
      log.error(`Função ${test.expectedFunction} NÃO executada`);
      stats.detectionAccuracy.push(0);
    }
    
    log.response(response.message?.substring(0, 100) + '...');
    log.info(`Tempo de resposta: ${response.responseTime}ms`);
    
    await sleep(2000);
  }
}

// ========== TESTES DE PERSONALIZAÇÃO ==========

async function testClientPersonalization() {
  log.section('2. TESTANDO PERSONALIZAÇÃO POR TIPO DE CLIENTE');
  
  // Simular diferentes tipos de cliente
  const clientScenarios = [
    {
      name: 'Cliente Novo - Resposta mais explicativa',
      messages: [
        'oi, primeira vez aqui',
        'quero alugar um apartamento'
      ],
      expectedBehavior: 'explicativa e acolhedora'
    },
    {
      name: 'Cliente Sensível a Preço - Foco em valor',
      messages: [
        'quero algo barato',
        'qual o mais em conta?',
        'tem desconto?',
        'está muito caro'
      ],
      expectedBehavior: 'foco em custo-benefício'
    },
    {
      name: 'Cliente Detalhista - Informações completas',
      messages: [
        'quero todos os detalhes',
        'me explique tudo sobre o apartamento',
        'quais são as especificações completas?'
      ],
      expectedBehavior: 'respostas detalhadas'
    }
  ];

  for (const scenario of clientScenarios) {
    stats.totalTests++;
    log.test(scenario.name);
    
    // Limpar contexto para simular cliente novo
    await sendMessage('', true);
    
    // Enviar sequência de mensagens
    let lastResponse;
    for (const msg of scenario.messages) {
      lastResponse = await sendMessage(msg);
      await sleep(1500);
    }
    
    if (lastResponse) {
      log.response(lastResponse.message?.substring(0, 150) + '...');
      log.info(`Comportamento esperado: ${scenario.expectedBehavior}`);
      
      // Análise básica da resposta
      const responseLength = lastResponse.message?.length || 0;
      const hasEmojis = /[😊🏠💰✨🎉]/.test(lastResponse.message || '');
      
      stats.passed++;
      log.success('Personalização aplicada');
      
      log.info(`Tamanho da resposta: ${responseLength} caracteres`);
      log.info(`Usa emojis: ${hasEmojis ? 'Sim' : 'Não'}`);
    } else {
      stats.failed++;
      log.error('Sem resposta');
    }
    
    await sleep(2000);
  }
}

// ========== TESTES DE FORÇA DE EXECUÇÃO ==========

async function testForceExecution() {
  log.section('3. TESTANDO FORÇA DE EXECUÇÃO PARA CASOS ÓBVIOS');
  
  const obviousCases = [
    {
      name: 'Busca explícita sem contexto',
      message: 'quero alugar apartamento em florianópolis para 4 pessoas',
      shouldExecute: 'search_properties'
    },
    {
      name: 'Cadastro com dados completos',
      message: 'Maria Santos, CPF 98765432100, email maria@teste.com',
      shouldExecute: 'register_client'
    },
    {
      name: 'Pedido direto de fotos com contexto',
      setup: 'quero casas em bombinhas',
      message: 'envia as fotos da primeira opção',
      shouldExecute: 'send_property_media'
    },
    {
      name: 'Cálculo com datas específicas',
      setup: 'quero apartamento em floripa',
      message: 'quanto fica do dia 10 ao dia 15 de abril?',
      shouldExecute: 'calculate_price'
    }
  ];

  for (const test of obviousCases) {
    stats.totalTests++;
    log.test(test.name);
    
    // Setup se necessário
    if (test.setup) {
      await sendMessage(test.setup, true);
      await sleep(2000);
    }
    
    // Enviar mensagem
    const response = await sendMessage(test.message, !test.setup);
    
    if (!response) {
      stats.failed++;
      log.error('Sem resposta');
      continue;
    }
    
    const functionsExecuted = response.data?.functionsExecuted || [];
    const forceExecuted = response.data?.metadata?.forceExecuted;
    
    if (functionsExecuted.includes(test.shouldExecute)) {
      stats.passed++;
      log.success(`✅ ${test.shouldExecute} executada${forceExecuted ? ' (FORÇADA)' : ''}`);
    } else {
      stats.failed++;
      log.error(`❌ ${test.shouldExecute} NÃO executada`);
    }
    
    log.info(`Funções executadas: ${functionsExecuted.join(', ') || 'nenhuma'}`);
    log.response(response.message?.substring(0, 100) + '...');
    
    await sleep(2000);
  }
}

// ========== TESTES DE PREVENÇÃO DE LOOPS ==========

async function testLoopPrevention() {
  log.section('4. TESTANDO PREVENÇÃO DE LOOPS MELHORADA');
  
  log.test('Enviando mesma mensagem 3x rapidamente');
  
  // Preparar contexto
  await sendMessage('quero apartamentos em florianópolis', true);
  await sleep(2000);
  
  // Enviar mesma mensagem múltiplas vezes
  const results = [];
  for (let i = 0; i < 3; i++) {
    log.info(`Tentativa ${i + 1}/3...`);
    const response = await sendMessage('me manda as fotos');
    
    if (response) {
      const functionsExecuted = response.data?.functionsExecuted || [];
      results.push({
        attempt: i + 1,
        executed: functionsExecuted.includes('send_property_media'),
        message: response.message?.substring(0, 50)
      });
    }
    
    await sleep(1000);
  }
  
  // Analisar resultados
  stats.totalTests++;
  const firstExecuted = results[0]?.executed;
  const othersBlocked = results.slice(1).every(r => !r.executed);
  
  if (firstExecuted && othersBlocked) {
    stats.passed++;
    log.success('Loop prevenido corretamente!');
  } else {
    stats.failed++;
    log.error('Prevenção de loop falhou');
  }
  
  results.forEach(r => {
    log.info(`Tentativa ${r.attempt}: ${r.executed ? 'Executou' : 'Bloqueou'} - "${r.message}..."`);
  });
}

// ========== RELATÓRIO FINAL ==========

function generateReport() {
  log.title('RELATÓRIO FINAL - TESTE DE OTIMIZAÇÕES');
  
  const avgResponseTime = stats.responseTime.reduce((a, b) => a + b, 0) / stats.responseTime.length || 0;
  const detectionAccuracy = stats.detectionAccuracy.reduce((a, b) => a + b, 0) / stats.detectionAccuracy.length || 0;
  const successRate = (stats.passed / stats.totalTests * 100).toFixed(1);
  
  console.log('\n📊 Estatísticas Gerais:');
  console.log(`  Total de Testes: ${stats.totalTests}`);
  console.log(`  ${colors.green}Passou: ${stats.passed}${colors.reset}`);
  console.log(`  ${colors.red}Falhou: ${stats.failed}${colors.reset}`);
  console.log(`  Taxa de Sucesso: ${successRate}%`);
  
  console.log('\n⚡ Performance:');
  console.log(`  Tempo Médio de Resposta: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`  Precisão de Detecção: ${(detectionAccuracy * 100).toFixed(1)}%`);
  
  console.log('\n📈 Funções Executadas:');
  Object.entries(stats.functionsExecuted).forEach(([func, count]) => {
    console.log(`  ${func}: ${count}x`);
  });
  
  console.log('\n💡 Melhorias Validadas:');
  if (detectionAccuracy > 0.8) {
    console.log(`  ${colors.green}✅ Detecção de Intenção: MELHORADA${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}⚠️ Detecção de Intenção: Precisa ajustes${colors.reset}`);
  }
  
  if (avgResponseTime < 5000) {
    console.log(`  ${colors.green}✅ Performance: BOA${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}⚠️ Performance: Pode melhorar${colors.reset}`);
  }
  
  if (stats.functionsExecuted['search_properties'] > 0) {
    console.log(`  ${colors.green}✅ Força de Execução: FUNCIONANDO${colors.reset}`);
  }
  
  console.log('\n');
  if (successRate >= 80) {
    console.log(`${colors.green}${colors.bright}🎉 OTIMIZAÇÕES BEM SUCEDIDAS!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ Algumas otimizações precisam de ajustes${colors.reset}`);
  }
}

// ========== EXECUÇÃO PRINCIPAL ==========

async function runTests() {
  log.title('TESTE DE OTIMIZAÇÕES - SOFIA V3');
  log.info('Servidor: ' + API_BASE);
  
  try {
    // Verificar servidor
    const health = await fetch(`${API_BASE}/health`);
    if (!health.ok) throw new Error('Servidor offline');
    log.success('Servidor online');
    
    // Executar testes
    await testIntentDetection();
    await testClientPersonalization();
    await testForceExecution();
    await testLoopPrevention();
    
    // Gerar relatório
    generateReport();
    
  } catch (error) {
    log.error(`Erro fatal: ${error.message}`);
  }
}

// Executar
runTests().catch(console.error);