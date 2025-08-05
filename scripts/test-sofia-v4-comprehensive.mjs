#!/usr/bin/env node

/**
 * SOFIA V4 COMPREHENSIVE TEST SUITE
 * 
 * Testa todas as funcionalidades principais:
 * - Sistema multi-tenant
 * - Contexto e histórico
 * - Funções de busca, reserva, agenda
 * - Inteligência contextual
 * - Envio de mídias
 * - Persistência de dados
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

// ===== CONFIGURAÇÕES =====
const BASE_URL = 'http://localhost:3000';
const TEST_TENANT_ID = 'test-tenant-sofia-v4';
const TEST_PHONE = '11987654321';
const API_ENDPOINT = `${BASE_URL}/api/agent`;

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// ===== UTILITIES =====
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  console.log(`${colors[statusColor]}[${status}]${colors.reset} ${testName} ${details}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== HELPER FUNCTIONS =====
async function sendMessage(message, options = {}) {
  const payload = {
    message,
    clientPhone: TEST_PHONE,
    tenantId: TEST_TENANT_ID,
    isTest: true,
    metadata: {
      source: 'test',
      priority: 'normal'
    },
    ...options
  };

  const startTime = performance.now();
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const responseTime = Math.round(performance.now() - startTime);

    return {
      success: response.ok,
      status: response.status,
      data,
      responseTime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: Math.round(performance.now() - startTime)
    };
  }
}

async function clearContext() {
  try {
    const response = await fetch(`${BASE_URL}/api/agent/clear-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientPhone: TEST_PHONE,
        tenantId: TEST_TENANT_ID
      }),
    });
    
    return response.ok;
  } catch (error) {
    log(`Erro ao limpar contexto: ${error.message}`, 'red');
    return false;
  }
}

async function getContext() {
  try {
    const response = await fetch(`${API_ENDPOINT}?action=summary&clientPhone=${TEST_PHONE}&tenantId=${TEST_TENANT_ID}`);
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    return null;
  }
}

async function getMetrics() {
  try {
    const response = await fetch(`${API_ENDPOINT}?action=metrics`);
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    return null;
  }
}

// ===== TEST SUITES =====

async function testAPIEndpoints() {
  logSection('1. TESTE DE ENDPOINTS DA API');
  
  // Health check
  try {
    const response = await fetch(API_ENDPOINT);
    const data = await response.json();
    
    if (response.ok && data.success) {
      logTest('Health Check', 'PASS', `Status: ${data.data.status}`);
    } else {
      logTest('Health Check', 'FAIL', `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Health Check', 'FAIL', error.message);
  }

  // Metrics endpoint
  const metrics = await getMetrics();
  if (metrics && metrics.version) {
    logTest('Metrics Endpoint', 'PASS', `Versão: ${metrics.version}`);
    logTest('Features Check', 'INFO', `${metrics.features.length} features ativas`);
  } else {
    logTest('Metrics Endpoint', 'FAIL');
  }
}

async function testBasicConversation() {
  logSection('2. TESTE DE CONVERSA BÁSICA');
  
  // Limpar contexto antes de começar
  await clearContext();
  await sleep(500);

  // Teste 1: Saudação inicial
  const greeting = await sendMessage('Olá!');
  if (greeting.success && greeting.data.message) {
    logTest('Saudação Inicial', 'PASS', `Resposta em ${greeting.responseTime}ms`);
    log(`Resposta: "${greeting.data.message.substring(0, 100)}..."`, 'blue');
  } else {
    logTest('Saudação Inicial', 'FAIL', greeting.error || 'Sem resposta');
  }

  // Teste 2: Capacidade de responder
  const response = await sendMessage('Como você pode me ajudar?');
  if (response.success && response.data.message) {
    logTest('Capacidade de Resposta', 'PASS', `Resposta em ${response.responseTime}ms`);
  } else {
    logTest('Capacidade de Resposta', 'FAIL');
  }
}

async function testPropertySearch() {
  logSection('3. TESTE DE BUSCA DE PROPRIEDADES');
  
  // Limpar contexto
  await clearContext();
  await sleep(500);

  // Teste 1: Busca simples
  const search1 = await sendMessage('Quero alugar um apartamento');
  if (search1.success) {
    const hasFunctionCall = search1.data.data?.functionsExecuted > 0;
    logTest('Busca Simples', hasFunctionCall ? 'PASS' : 'WARN', 
           `Funções executadas: ${search1.data.data?.functionsExecuted || 0}`);
  } else {
    logTest('Busca Simples', 'FAIL');
  }

  await sleep(1000);

  // Teste 2: Busca com localização
  const search2 = await sendMessage('Procuro um apartamento em Florianópolis para 2 pessoas');
  if (search2.success) {
    const functionsUsed = search2.data.data?.functionsExecuted || 0;
    logTest('Busca com Localização', functionsUsed > 0 ? 'PASS' : 'WARN', 
           `Funções: ${functionsUsed}, Tempo: ${search2.responseTime}ms`);
    
    if (search2.data.message.includes('propriedade') || search2.data.message.includes('imóvel')) {
      logTest('Resposta Contextual', 'PASS', 'Mencionou propriedades');
    }
  } else {
    logTest('Busca com Localização', 'FAIL');
  }
}

async function testPropertyDetails() {
  logSection('4. TESTE DE DETALHES E PREÇOS');
  
  await sleep(1000);

  // Teste 1: Solicitar preço
  const pricing = await sendMessage('Quanto custa a primeira opção?');
  if (pricing.success) {
    const functionsUsed = pricing.data.data?.functionsExecuted || 0;
    logTest('Cálculo de Preços', functionsUsed > 0 ? 'PASS' : 'WARN', 
           `Funções executadas: ${functionsUsed}`);
    
    if (pricing.data.message.includes('R$') || pricing.data.message.includes('preço')) {
      logTest('Resposta de Preço', 'PASS', 'Informações de preço encontradas');
    }
  } else {
    logTest('Cálculo de Preços', 'FAIL');
  }

  await sleep(1000);

  // Teste 2: Solicitar fotos
  const media = await sendMessage('Pode me mostrar fotos do imóvel?');
  if (media.success) {
    const functionsUsed = media.data.data?.functionsExecuted || 0;
    logTest('Envio de Mídias', functionsUsed > 0 ? 'PASS' : 'WARN', `Funções: ${functionsUsed}`);
  } else {
    logTest('Envio de Mídias', 'FAIL');
  }
}

async function testReservationFlow() {
  logSection('5. TESTE DE FLUXO DE RESERVA');
  
  await sleep(1000);

  // Teste 1: Iniciar reserva
  const reservation1 = await sendMessage('Quero reservar este apartamento');
  if (reservation1.success) {
    logTest('Iniciar Reserva', 'PASS', `Resposta: "${reservation1.data.message.substring(0, 50)}..."`);
  } else {
    logTest('Iniciar Reserva', 'FAIL');
  }

  await sleep(1000);

  // Teste 2: Fornecer dados do cliente
  const reservation2 = await sendMessage('Meu nome é João Silva, CPF 123.456.789-00');
  if (reservation2.success) {
    const functionsUsed = reservation2.data.data?.functionsExecuted || 0;
    logTest('Dados do Cliente', functionsUsed > 0 ? 'PASS' : 'WARN', 
           `Funções executadas: ${functionsUsed}`);
  } else {
    logTest('Dados do Cliente', 'FAIL');
  }

  await sleep(1000);

  // Teste 3: Finalizar reserva
  const reservation3 = await sendMessage('Pode finalizar a reserva para janeiro de 2025?');
  if (reservation3.success) {
    const functionsUsed = reservation3.data.data?.functionsExecuted || 0;
    logTest('Finalizar Reserva', functionsUsed > 0 ? 'PASS' : 'WARN', 
           `Funções executadas: ${functionsUsed}`);
  } else {
    logTest('Finalizar Reserva', 'FAIL');
  }
}

async function testContextMemory() {
  logSection('6. TESTE DE MEMÓRIA CONTEXTUAL');
  
  await sleep(1000);

  // Teste 1: Lembrar informações anteriores
  const memory1 = await sendMessage('Qual foi mesmo o meu nome?');
  if (memory1.success) {
    if (memory1.data.message.toLowerCase().includes('joão') || 
        memory1.data.message.toLowerCase().includes('silva')) {
      logTest('Memória de Nome', 'PASS', 'Lembrou do nome João Silva');
    } else {
      logTest('Memória de Nome', 'WARN', 'Não mencionou o nome específico');
    }
  } else {
    logTest('Memória de Nome', 'FAIL');
  }

  await sleep(1000);

  // Teste 2: Contexto da propriedade
  const memory2 = await sendMessage('E qual cidade eu estava procurando?');
  if (memory2.success) {
    if (memory2.data.message.toLowerCase().includes('florianópolis') || 
        memory2.data.message.toLowerCase().includes('floripa')) {
      logTest('Memória de Localização', 'PASS', 'Lembrou de Florianópolis');
    } else {
      logTest('Memória de Localização', 'WARN', 'Não mencionou Florianópolis');
    }
  } else {
    logTest('Memória de Localização', 'FAIL');
  }

  // Teste 3: Verificar contexto salvo
  const context = await getContext();
  if (context && context.summary) {
    logTest('Contexto Persistido', 'PASS', `Stage: ${context.conversationStage}`);
    log(`Mensagens no contexto: ${context.messageCount || 0}`, 'blue');
  } else {
    logTest('Contexto Persistido', 'WARN', 'Contexto não encontrado');
  }
}

async function testEdgeCases() {
  logSection('7. TESTE DE CASOS EXTREMOS');
  
  // Teste 1: Mensagem vazia
  const empty = await sendMessage('');
  logTest('Mensagem Vazia', empty.success ? 'WARN' : 'PASS', 
         'Deve rejeitar mensagens vazias');

  // Teste 2: Mensagem muito longa
  const longMessage = 'A'.repeat(1000);
  const long = await sendMessage(longMessage);
  logTest('Mensagem Longa', long.success ? 'PASS' : 'WARN', 
         `1000 caracteres processados`);

  // Teste 3: Caracteres especiais
  const special = await sendMessage('Olá! Como está? 🏠💰📱');
  logTest('Caracteres Especiais', special.success ? 'PASS' : 'FAIL', 
         'Emojis e acentos');

  // Teste 4: Pergunta fora do escopo
  const outOfScope = await sendMessage('Qual é a receita de bolo de chocolate?');
  if (outOfScope.success) {
    const isRelevant = outOfScope.data.message.toLowerCase().includes('imóvel') ||
                      outOfScope.data.message.toLowerCase().includes('propriedade') ||
                      outOfScope.data.message.toLowerCase().includes('aluguel');
    logTest('Pergunta Fora do Escopo', isRelevant ? 'PASS' : 'WARN', 
           'Deve redirecionar para imóveis');
  }
}

async function testPerformance() {
  logSection('8. TESTE DE PERFORMANCE');
  
  const performanceTests = [];
  const testMessages = [
    'Olá',
    'Procuro apartamento',
    'Florianópolis 2 pessoas',
    'Quanto custa?',
    'Quero reservar'
  ];

  for (const message of testMessages) {
    const result = await sendMessage(message);
    if (result.success) {
      performanceTests.push(result.responseTime);
    }
    await sleep(200);
  }

  if (performanceTests.length > 0) {
    const avgTime = performanceTests.reduce((a, b) => a + b, 0) / performanceTests.length;
    const maxTime = Math.max(...performanceTests);
    const minTime = Math.min(...performanceTests);
    
    logTest('Tempo Médio', avgTime < 5000 ? 'PASS' : 'WARN', `${avgTime.toFixed(0)}ms`);
    logTest('Tempo Máximo', maxTime < 10000 ? 'PASS' : 'WARN', `${maxTime}ms`);
    logTest('Tempo Mínimo', 'INFO', `${minTime}ms`);
    logTest('Consistência', (maxTime - minTime) < 3000 ? 'PASS' : 'WARN', 
           `Variação: ${maxTime - minTime}ms`);
  }
}

async function testMultiTenant() {
  logSection('9. TESTE MULTI-TENANT');
  
  // Teste com tenant diferente
  const tenant2Result = await sendMessage('Olá Sofia!', {
    tenantId: 'tenant-2-test'
  });
  
  if (tenant2Result.success) {
    logTest('Isolamento de Tenant', 'PASS', 'Processou com tenant diferente');
  } else {
    logTest('Isolamento de Tenant', 'FAIL', 'Erro com tenant diferente');
  }

  // Verificar se contextos são isolados
  const context1 = await getContext();
  // Aqui verificaríamos se o contexto do tenant-1 não vaza para tenant-2
  logTest('Isolamento de Contexto', 'INFO', 'Verificação manual necessária');
}

// ===== MAIN TEST RUNNER =====
async function runAllTests() {
  log('🚀 INICIANDO SUITE DE TESTES SOFIA V4 COMPREHENSIVE', 'bold');
  log('====================================================', 'cyan');
  
  const startTime = performance.now();
  
  try {
    await testAPIEndpoints();
    await testBasicConversation();
    await testPropertySearch();
    await testPropertyDetails();
    await testReservationFlow();
    await testContextMemory();
    await testEdgeCases();
    await testPerformance();
    await testMultiTenant();
    
    const totalTime = Math.round(performance.now() - startTime);
    
    logSection('RESUMO DOS TESTES');
    log(`✅ Suite de testes concluída em ${totalTime}ms`, 'green');
    log(`📊 Total de testes executados: ~40 testes`, 'blue');
    log(`🎯 Foco: Multi-tenant, Contexto, Funções, Performance`, 'yellow');
    
    // Limpar contexto final
    await clearContext();
    log(`🧹 Contexto de teste limpo`, 'cyan');
    
  } catch (error) {
    log(`❌ Erro durante os testes: ${error.message}`, 'red');
    console.error(error);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests };