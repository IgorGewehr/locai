#!/usr/bin/env node

/**
 * 🧪 TESTE ESTRATÉGICO COMPLETO - SOFIA
 * Testa TODAS as 9 funções com sequência inteligente
 * Funciona mesmo com apenas 3 propriedades na base
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const API_URL = 'http://localhost:3000/api/agent';
const TENANT_ID = 'test_tenant';
const CLIENT_PHONE = '+5511987654321';

console.log(`${colors.bright}${colors.magenta}🚀 TESTE ESTRATÉGICO COMPLETO - SOFIA${colors.reset}`);
console.log(`API: ${API_URL}`);
console.log(`Cliente: ${CLIENT_PHONE.substring(0, 8)}***\n`);

async function testMessage(message, expectedFunction = null, description = '') {
  console.log(`${colors.cyan}📤 ${description || message}${colors.reset}`);
  if (expectedFunction) {
    console.log(`   ${colors.yellow}Esperando: ${expectedFunction}${colors.reset}`);
  }
  
  try {
    const startTime = Date.now();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        clientPhone: CLIENT_PHONE,
        tenantId: TENANT_ID,
        isTest: true
      })
    });

    const result = await response.json();
    const responseTime = Date.now() - startTime;

    if (result.success) {
      const functionsExecuted = result.data?.functionsExecuted || [];
      const executedFunction = functionsExecuted[0] || 'nenhuma';
      
      if (expectedFunction && executedFunction === expectedFunction) {
        console.log(`   ${colors.green}✓ ${executedFunction}${colors.reset} (${responseTime}ms)`);
        return { success: true, function: executedFunction, responseTime, correct: true };
      } else if (expectedFunction && executedFunction !== expectedFunction) {
        console.log(`   ${colors.red}✗ Executou: ${executedFunction}${colors.reset} (${responseTime}ms)`);
        return { success: true, function: executedFunction, responseTime, correct: false };
      } else {
        console.log(`   ${colors.blue}🔧 ${executedFunction}${colors.reset} (${responseTime}ms)`);
        return { success: true, function: executedFunction, responseTime, correct: true };
      }
    } else {
      console.log(`   ${colors.red}✗ Erro: ${result.error || 'Unknown error'}${colors.reset}`);
      return { success: false, error: result.error, responseTime, correct: false };
    }
  } catch (error) {
    console.log(`   ${colors.red}✗ Erro de rede: ${error.message}${colors.reset}`);
    return { success: false, error: error.message, responseTime: 0, correct: false };
  }
}

async function clearContext() {
  try {
    await fetch('http://localhost:3000/api/agent/clear-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientPhone: CLIENT_PHONE,
        tenantId: TENANT_ID
      })
    });
    console.log(`${colors.yellow}🧹 Contexto limpo e pronto para teste estratégico${colors.reset}\n`);
  } catch (error) {
    console.log(`${colors.yellow}⚠️ Erro ao limpar contexto: ${error.message}${colors.reset}\n`);
  }
}

async function runStrategicTests() {
  console.log(`${colors.bright}${colors.blue}═══ FASE 1: ESTABELECER CONTEXTO (Base para todas as outras) ═══${colors.reset}`);
  
  // Limpar contexto
  await clearContext();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // TESTE 1: Busca inicial - ESTABELECE CONTEXTO para todas as outras funções
  const test1 = await testMessage(
    "oi, quero alugar um apartamento em florianópolis para 2 pessoas",
    "search_properties",
    "🔍 BUSCA INICIAL (essencial para criar contexto)"
  );
  
  console.log(`\n${colors.bright}${colors.blue}═══ FASE 2: FUNÇÕES QUE DEPENDEM DO CONTEXTO ═══${colors.reset}`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TESTE 2: Detalhes da primeira propriedade
  const test2 = await testMessage(
    "me conte mais detalhes sobre a primeira opção",
    "get_property_details",
    "📋 DETALHES (usa contexto da busca anterior)"
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TESTE 3: Fotos da propriedade
  const test3 = await testMessage(
    "quero ver as fotos dessa propriedade",
    "send_property_media",
    "📸 FOTOS (usa contexto da propriedade em foco)"
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TESTE 4: Cálculo de preço
  const test4 = await testMessage(
    "quanto fica para 3 dias, de 15 a 18 de dezembro?",
    "calculate_price",
    "💰 PREÇO (usa contexto + datas específicas)"
  );
  
  console.log(`\n${colors.bright}${colors.blue}═══ FASE 3: FUNÇÕES INDEPENDENTES ═══${colors.reset}`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TESTE 5: Cadastro de cliente (independente de contexto)
  const test5 = await testMessage(
    "meu nome é João Silva, CPF 12345678900, email joao@email.com",
    "register_client",
    "👤 CADASTRO (função independente)"
  );
  
  console.log(`\n${colors.bright}${colors.blue}═══ FASE 4: FUNÇÕES DE AGENDAMENTO ═══${colors.reset}`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TESTE 6: Consulta de disponibilidade para visita
  const test6 = await testMessage(
    "posso visitar essa propriedade? que horários têm disponível?",
    "check_visit_availability",
    "📅 DISPONIBILIDADE VISITA (consulta genérica)"
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TESTE 7: Agendamento específico
  const test7 = await testMessage(
    "quero agendar uma visita para amanhã às 14h30",
    "schedule_visit",
    "📅 AGENDAR VISITA (data/hora específica)"
  );
  
  console.log(`\n${colors.bright}${colors.blue}═══ FASE 5: FECHAMENTO E ANÁLISE ═══${colors.reset}`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TESTE 8: Criar reserva
  const test8 = await testMessage(
    "estou decidido, quero confirmar a reserva dessa propriedade",
    "create_reservation",
    "🏆 RESERVA (usa todo o contexto construído)"
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TESTE 9: Classificação de interesse
  const test9 = await testMessage(
    "adorei essa propriedade, está perfeita para minha família!",
    "classify_lead_status",
    "📊 CLASSIFICAÇÃO (análise de sentimento)"
  );
  
  console.log(`\n${colors.bright}${colors.magenta}═══ RELATÓRIO ESTRATÉGICO COMPLETO ═══${colors.reset}`);
  
  const tests = [
    { name: '🔍 Busca Inicial', result: test1, expected: 'search_properties', critical: true },
    { name: '📋 Detalhes Propriedade', result: test2, expected: 'get_property_details', critical: true },
    { name: '📸 Fotos/Mídia', result: test3, expected: 'send_property_media', critical: true },
    { name: '💰 Cálculo Preço', result: test4, expected: 'calculate_price', critical: true },
    { name: '👤 Cadastro Cliente', result: test5, expected: 'register_client', critical: false },
    { name: '📅 Consulta Visita', result: test6, expected: 'check_visit_availability', critical: false },
    { name: '📅 Agendar Visita', result: test7, expected: 'schedule_visit', critical: false },
    { name: '🏆 Criar Reserva', result: test8, expected: 'create_reservation', critical: true },
    { name: '📊 Classificar Lead', result: test9, expected: 'classify_lead_status', critical: false }
  ];
  
  let passed = 0;
  let criticalPassed = 0;
  let totalCritical = 0;
  let total = tests.length;
  
  console.log(`\n${colors.bright}RESULTADOS POR FUNÇÃO:${colors.reset}`);
  
  tests.forEach((test, index) => {
    const success = test.result.success && test.result.correct;
    const status = success ? '✓' : '✗';
    const color = success ? colors.green : colors.red;
    const priority = test.critical ? '🔥' : '📝';
    
    console.log(`${color}${status} ${priority} ${test.name}: ${test.result.function || 'erro'}${colors.reset}`);
    
    if (success) passed++;
    if (test.critical) {
      totalCritical++;
      if (success) criticalPassed++;
    }
  });
  
  const successRate = ((passed / total) * 100).toFixed(1);
  const criticalRate = totalCritical > 0 ? ((criticalPassed / totalCritical) * 100).toFixed(1) : 100;
  
  console.log(`\n${colors.bright}📊 MÉTRICAS FINAIS:${colors.reset}`);
  console.log(`Taxa Geral: ${getColorForRate(successRate)}${successRate}%${colors.reset} (${passed}/${total})`);
  console.log(`Taxa Crítica: ${getColorForRate(criticalRate)}${criticalRate}%${colors.reset} (${criticalPassed}/${totalCritical})`);
  
  // Análise de performance
  const avgResponseTime = tests.filter(t => t.result.responseTime).reduce((sum, t) => sum + t.result.responseTime, 0) / tests.filter(t => t.result.responseTime).length;
  console.log(`Tempo Médio: ${avgResponseTime.toFixed(0)}ms`);
  
  console.log(`\n${colors.bright}🎯 AVALIAÇÃO ESTRATÉGICA:${colors.reset}`);
  
  if (criticalRate >= 80 && successRate >= 70) {
    console.log(`${colors.green}${colors.bright}🏆 EXCELENTE! Sofia está funcionando perfeitamente!${colors.reset}`);
    console.log(`${colors.green}✨ Sistema de contexto funcionando${colors.reset}`);
    console.log(`${colors.green}✨ Detecção de intenções precisa${colors.reset}`);
    console.log(`${colors.green}✨ Sequência completa executada${colors.reset}`);
  } else if (criticalRate >= 60 && successRate >= 50) {
    console.log(`${colors.yellow}${colors.bright}⚠️ BOM! Maioria das funções funcionando${colors.reset}`);
    console.log(`${colors.yellow}💡 Algumas funções podem precisar de ajustes${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}❌ REQUER ATENÇÃO! Muitas funções falhando${colors.reset}`);
    console.log(`${colors.red}🔧 Sistema de contexto pode precisar de correções${colors.reset}`);
  }
  
  // Análise específica do fluxo
  console.log(`\n${colors.bright}🔄 ANÁLISE DO FLUXO:${colors.reset}`);
  
  if (test1.result.correct) {
    console.log(`${colors.green}✓ Base estabelecida com sucesso (search_properties)${colors.reset}`);
    
    const contextDependentTests = [test2, test3, test4, test8];
    const contextSuccess = contextDependentTests.filter(t => t.result.correct).length;
    
    console.log(`${contextSuccess >= 3 ? colors.green : colors.yellow}→ Funções de contexto: ${contextSuccess}/4 funcionando${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Falha na base - isso impacta todas as outras funções${colors.reset}`);
  }
  
  const independentTests = [test5, test6, test7, test9];
  const independentSuccess = independentTests.filter(t => t.result.correct).length;
  console.log(`${independentSuccess >= 2 ? colors.green : colors.yellow}→ Funções independentes: ${independentSuccess}/4 funcionando${colors.reset}`);
  
  console.log(`\n${colors.bright}${colors.magenta}🎉 TESTE ESTRATÉGICO CONCLUÍDO!${colors.reset}`);
  
  return {
    totalRate: parseFloat(successRate),
    criticalRate: parseFloat(criticalRate),
    avgResponseTime: avgResponseTime,
    passed,
    total,
    criticalPassed,
    totalCritical
  };
}

function getColorForRate(rate) {
  const numRate = parseFloat(rate);
  if (numRate >= 80) return colors.green;
  if (numRate >= 60) return colors.yellow;
  return colors.red;
}

// Executar testes
runStrategicTests().catch(console.error);