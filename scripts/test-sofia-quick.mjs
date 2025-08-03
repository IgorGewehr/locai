// test-sofia-quick.mjs
// Teste rápido de todas as funções da Sofia v5

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const API_URL = 'http://localhost:3000/api/agent';
const TENANT_ID = process.env.TENANT_ID || 'test_tenant';

// Cores
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testMessage(message, expectedFunction) {
  console.log(`\n📤 Testando: "${message}"`);
  console.log(`   Esperando função: ${colors.yellow}${expectedFunction}${colors.reset}`);
  
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        clientPhone: '+5511999887766',
        tenantId: TENANT_ID,
        isTest: true,
        metadata: { source: 'test' }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    const functionsExecuted = data.data?.functionsExecuted || [];
    const functionExecuted = functionsExecuted.includes(expectedFunction);
    
    if (functionExecuted) {
      console.log(`   ${colors.green}✓ Função ${expectedFunction} executada!${colors.reset} (${responseTime}ms)`);
    } else if (functionsExecuted.length > 0) {
      console.log(`   ${colors.yellow}⚠ Executou: ${functionsExecuted.join(', ')}${colors.reset} (${responseTime}ms)`);
    } else {
      console.log(`   ${colors.red}✗ Nenhuma função executada${colors.reset} (${responseTime}ms)`);
    }
    
    console.log(`   Resposta: "${data.message || data.data?.response || 'Sem resposta'}".substring(0, 100)}`);
    
    return {
      success: functionExecuted,
      functionsExecuted,
      responseTime
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      console.log(`   ${colors.red}✗ Timeout após ${responseTime}ms${colors.reset}`);
    } else {
      console.log(`   ${colors.red}✗ Erro: ${error.message}${colors.reset}`);
    }
    
    return {
      success: false,
      error: error.message,
      responseTime
    };
  }
}

async function runQuickTests() {
  console.log(`${colors.bright}${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.bright}TESTE RÁPIDO - SOFIA V5 - TODAS AS FUNÇÕES${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
  
  const tests = [
    { message: 'quero alugar um apartamento em florianópolis', expectedFunction: 'search_properties' },
    { message: 'me conte detalhes sobre o primeiro apartamento', expectedFunction: 'get_property_details' },
    { message: 'me mande as fotos do apartamento', expectedFunction: 'send_property_media' },
    { message: 'quanto fica 5 dias no apartamento?', expectedFunction: 'calculate_price' },
    { message: 'quero fazer meu cadastro, nome João Silva, CPF 123.456.789-00', expectedFunction: 'register_client' },
    { message: 'posso visitar o apartamento amanhã?', expectedFunction: 'check_visit_availability' },
    { message: 'agendar visita para amanhã às 14h', expectedFunction: 'schedule_visit' },
    { message: 'quero fazer a reserva agora', expectedFunction: 'create_reservation' },
    { message: 'estou muito interessado em fechar negócio!', expectedFunction: 'classify_lead_status' }
  ];
  
  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  
  for (const test of tests) {
    const result = await testMessage(test.message, test.expectedFunction);
    results.push({ ...test, ...result });
    
    if (result.success) {
      passedCount++;
    } else {
      failedCount++;
    }
  }
  
  // Relatório Final
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.bright}RELATÓRIO FINAL${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
  
  const totalTests = tests.length;
  const successRate = ((passedCount / totalTests) * 100).toFixed(1);
  
  console.log(`\nTotal de funções testadas: ${totalTests}`);
  console.log(`${colors.green}✓ Passou: ${passedCount}${colors.reset}`);
  console.log(`${colors.red}✗ Falhou: ${failedCount}${colors.reset}`);
  console.log(`Taxa de sucesso: ${colors.bright}${successRate}%${colors.reset}`);
  
  // Listar funções que falharam
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log(`\n${colors.red}Funções que falharam:${colors.reset}`);
    failedTests.forEach(test => {
      console.log(`  ✗ ${test.expectedFunction}`);
      if (test.functionsExecuted?.length > 0) {
        console.log(`    Executou: ${test.functionsExecuted.join(', ')}`);
      } else if (test.error) {
        console.log(`    Erro: ${test.error}`);
      }
    });
  }
  
  // Tempo médio
  const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  console.log(`\n⏱️ Tempo médio de resposta: ${avgTime.toFixed(0)}ms`);
  
  // Avaliação
  console.log(`\n${colors.bright}Avaliação:${colors.reset}`);
  if (successRate >= 90) {
    console.log(`${colors.green}🎉 EXCELENTE! Sofia está altamente funcional!${colors.reset}`);
  } else if (successRate >= 70) {
    console.log(`${colors.yellow}⚠️ BOM! Maioria das funções operacionais.${colors.reset}`);
  } else if (successRate >= 50) {
    console.log(`${colors.yellow}⚠️ REGULAR! Várias funções precisam de correção.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ CRÍTICO! Muitas funções não estão funcionando.${colors.reset}`);
  }
}

// Executar
async function main() {
  console.log(`${colors.bright}Iniciando teste rápido...${colors.reset}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Tenant ID: ${TENANT_ID}`);
  
  await runQuickTests();
  
  console.log(`\n${colors.bright}✅ Teste concluído!${colors.reset}`);
}

main().catch(error => {
  console.error(`${colors.red}Erro fatal: ${error.message}${colors.reset}`);
  process.exit(1);
});