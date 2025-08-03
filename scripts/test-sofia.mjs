// test-sofia-enhanced.mjs
// Teste da Sofia V5 MELHORADA - Verificação de detecção de intenções

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const API_URL = 'http://localhost:3000/api/agent';
const TENANT_ID = process.env.TENANT_ID || 'test_tenant';

// Cliente único para manter contexto
const testClient = {
  phone: '+5511988776655' // Novo número para novo contexto
};

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
  console.log(`\n📤 "${message}"`);
  if (expectedFunction) {
    console.log(`   ${colors.yellow}Esperando: ${expectedFunction}${colors.reset}`);
  }
  
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        clientPhone: testClient.phone,
        tenantId: TENANT_ID,
        isTest: true,
        metadata: { source: 'enhanced_test' }
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
    const functionExecuted = expectedFunction ? functionsExecuted.includes(expectedFunction) : true;
    
    if (functionExecuted) {
      console.log(`   ${colors.green}✓ ${expectedFunction || 'OK'}${colors.reset} (${responseTime}ms)`);
    } else {
      console.log(`   ${colors.red}✗ Executou: ${functionsExecuted.join(', ') || 'nenhuma'}${colors.reset} (${responseTime}ms)`);
    }
    
    if (functionsExecuted.length > 0) {
      console.log(`   🔧 ${functionsExecuted.join(', ')}`);
    }
    
    console.log(`🤖 "${(data.message || data.data?.response || '').substring(0, 120)}..."`);
    
    return {
      success: functionExecuted,
      functionsExecuted,
      responseTime
    };
    
  } catch (error) {
    console.log(`   ${colors.red}✗ Erro: ${error.message}${colors.reset}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runEnhancedTests() {
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}TESTE SOFIA V5 MELHORADA - DETECÇÃO DE INTENÇÕES${colors.reset}`);
  console.log(`Cliente: ${testClient.phone}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  console.log(`\n${colors.cyan}━━━ FASE 1: ESTABELECER CONTEXTO ━━━${colors.reset}`);
  
  // 1. Busca inicial para estabelecer contexto
  await testMessage('ola, quero alugar um apartamento em florianópolis', 'search_properties');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`\n${colors.cyan}━━━ FASE 2: TESTAR DETECÇÃO DE INTENÇÕES ━━━${colors.reset}`);
  
  // 2. Testar get_property_details
  await testMessage('me conte mais sobre a primeira opção', 'get_property_details');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. Testar send_property_media
  await testMessage('me mande as fotos', 'send_property_media');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 4. Testar calculate_price
  await testMessage('quanto fica 5 dias?', 'calculate_price');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 5. Testar register_client
  await testMessage('meu nome é Carlos Silva, CPF 12345678900', 'register_client');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 6. Testar check_visit_availability
  await testMessage('posso visitar o apartamento?', 'check_visit_availability');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 7. Testar schedule_visit
  await testMessage('quero agendar para amanhã às 15h', 'schedule_visit');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 8. Testar classify_lead_status
  await testMessage('estou muito interessado no apartamento!', 'classify_lead_status');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 9. Testar create_reservation
  await testMessage('quero confirmar a reserva', 'create_reservation');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`\n${colors.cyan}━━━ FASE 3: TESTAR CASOS EDGE ━━━${colors.reset}`);
  
  // 10. Teste de contexto - não deve fazer nova busca
  await testMessage('me conte sobre o banheiro do apartamento', 'get_property_details');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 11. Teste de contextualização - não deve fazer nova busca
  await testMessage('quantos quartos tem?', 'get_property_details');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}RESULTADO: Sofia V5 Melhorada testada!${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  console.log(`\n${colors.green}✅ Teste concluído!${colors.reset}`);
  console.log(`\n${colors.yellow}💡 Próximos passos:${colors.reset}`);
  console.log(`1. Comparar resultados com teste anterior`);
  console.log(`2. Verificar se detecção de intenções melhorou`);
  console.log(`3. Verificar se search_properties não é executada desnecessariamente`);
}

// Executar
async function main() {
  console.log(`${colors.bright}Testando Sofia V5 MELHORADA...${colors.reset}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Tenant ID: ${TENANT_ID}`);
  
  await runEnhancedTests();
}

main().catch(error => {
  console.error(`${colors.red}Erro fatal: ${error.message}${colors.reset}`);
  process.exit(1);
});