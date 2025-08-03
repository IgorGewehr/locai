#!/usr/bin/env node

/**
 * 🧪 TESTE RÁPIDO - SOFIA MELHORADA
 * Testa as melhorias implementadas no sistema
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
  cyan: '\x1b[36m'
};

const API_URL = 'http://localhost:3000/api/agent';
const TENANT_ID = 'test_tenant';
const CLIENT_PHONE = '+5511999887766';

console.log(`${colors.bright}${colors.blue}=== TESTE SOFIA MELHORADA ===${colors.reset}`);
console.log(`API: ${API_URL}`);
console.log(`Cliente: ${CLIENT_PHONE.substring(0, 8)}***\n`);

async function testMessage(message, expectedFunction = null) {
  console.log(`${colors.cyan}📤 "${message}"${colors.reset}`);
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
      } else if (expectedFunction && executedFunction !== expectedFunction) {
        console.log(`   ${colors.red}✗ Executou: ${executedFunction}${colors.reset} (${responseTime}ms)`);
      } else {
        console.log(`   ${colors.blue}🔧 ${executedFunction}${colors.reset} (${responseTime}ms)`);
      }
      
      const reply = result.data?.response || result.message;
      console.log(`${colors.cyan}🤖${colors.reset} "${reply.substring(0, 120)}${reply.length > 120 ? '...' : ''}"`);
      
      return { success: true, function: executedFunction, responseTime };
    } else {
      console.log(`   ${colors.red}✗ Erro: ${result.error || 'Unknown error'}${colors.reset}`);
      return { success: false, error: result.error, responseTime };
    }
  } catch (error) {
    console.log(`   ${colors.red}✗ Erro de rede: ${error.message}${colors.reset}`);
    return { success: false, error: error.message, responseTime: 0 };
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
    console.log(`${colors.yellow}🧹 Contexto limpo${colors.reset}\n`);
  } catch (error) {
    console.log(`${colors.yellow}⚠️ Erro ao limpar contexto: ${error.message}${colors.reset}\n`);
  }
}

async function runTests() {
  console.log(`${colors.bright}FASE 1: TESTE DE CONTEXTO E DETECÇÃO${colors.reset}`);
  
  // Limpar contexto
  await clearContext();
  
  // Teste 1: Busca inicial
  const test1 = await testMessage(
    "oi, quero alugar um apartamento em florianópolis", 
    "search_properties"
  );
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 2: Detalhes (deve usar contexto, NÃO search_properties)
  const test2 = await testMessage(
    "me conte mais detalhes sobre a primeira opção", 
    "get_property_details"
  );
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 3: Fotos (deve usar contexto, NÃO search_properties)
  const test3 = await testMessage(
    "quero ver as fotos", 
    "send_property_media"
  );
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 4: Preço (deve usar contexto, NÃO search_properties)
  const test4 = await testMessage(
    "quanto fica para 3 dias?", 
    "calculate_price"
  );
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 5: Cadastro de cliente
  const test5 = await testMessage(
    "meu nome é Carlos Silva, CPF 12345678900", 
    "register_client"
  );
  
  console.log(`\n${colors.bright}${colors.blue}=== RELATÓRIO FINAL ===${colors.reset}`);
  
  const tests = [
    { name: 'Busca inicial', result: test1, expected: 'search_properties' },
    { name: 'Detalhes (contexto)', result: test2, expected: 'get_property_details' },
    { name: 'Fotos (contexto)', result: test3, expected: 'send_property_media' },
    { name: 'Preço (contexto)', result: test4, expected: 'calculate_price' },
    { name: 'Cadastro cliente', result: test5, expected: 'register_client' }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach(test => {
    const success = test.result.success && test.result.function === test.expected;
    const status = success ? '✓' : '✗';
    const color = success ? colors.green : colors.red;
    
    console.log(`${color}${status} ${test.name}: ${test.result.function || 'erro'}${colors.reset}`);
    
    if (success) passed++;
  });
  
  const successRate = ((passed / total) * 100).toFixed(1);
  const rateColor = successRate >= 80 ? colors.green : successRate >= 60 ? colors.yellow : colors.red;
  
  console.log(`\n${colors.bright}Taxa de sucesso: ${rateColor}${successRate}%${colors.reset} (${passed}/${total})`);
  
  if (successRate >= 80) {
    console.log(`${colors.green}${colors.bright}🎉 EXCELENTE! Melhorias funcionando!${colors.reset}`);
  } else if (successRate >= 60) {
    console.log(`${colors.yellow}${colors.bright}⚠️ BOM, mas ainda pode melhorar${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bright}❌ Precisa de mais ajustes${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}✅ Teste concluído!${colors.reset}`);
}

runTests().catch(console.error);