// test-sofia-complete.mjs
// Bateria completa de testes para Sofia v5 - Todas as funções
// 5 testes para cada função = 45 testes totais

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const API_URL = 'http://localhost:3000/api/agent';
const TENANT_ID = process.env.TENANT_ID || 'test_tenant';

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

// Cliente de teste para manter contexto
const testClient = {
  phone: '+5511999887766',
  name: 'Teste Completo',
  email: 'teste@complete.com'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let propertyId = null; // Para usar nos testes subsequentes
let clientId = null; // Para usar nos testes subsequentes

// Função auxiliar para enviar mensagem
async function sendMessage(message, expectFunction = null) {
  totalTests++;
  const testNumber = totalTests;
  
  try {
    console.log(`\n${colors.cyan}[Teste ${testNumber}]${colors.reset} "${message}"`);
    if (expectFunction) {
      console.log(`${colors.yellow}Esperando função: ${expectFunction}${colors.reset}`);
    }
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        clientPhone: testClient.phone,
        tenantId: TENANT_ID,
        metadata: {
          source: 'test',
          testNumber,
          expectFunction
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    // Verificar se a função esperada foi executada
    let functionExecuted = false;
    if (expectFunction && data.functionsExecuted?.length > 0) {
      functionExecuted = data.functionsExecuted.some(f => 
        f.name === expectFunction && f.success
      );
    }

    // Capturar IDs para usar em testes posteriores
    if (data.functionsExecuted?.length > 0) {
      for (const func of data.functionsExecuted) {
        if (func.result?.properties?.length > 0 && !propertyId) {
          propertyId = func.result.properties[0].id;
          console.log(`${colors.magenta}PropertyID capturado: ${propertyId}${colors.reset}`);
        }
        if (func.result?.client?.id && !clientId) {
          clientId = func.result.client.id;
          console.log(`${colors.magenta}ClientID capturado: ${clientId}${colors.reset}`);
        }
      }
    }

    if (expectFunction && !functionExecuted) {
      console.log(`${colors.red}✗ Função ${expectFunction} NÃO foi executada${colors.reset}`);
      console.log(`Funções executadas: ${data.functionsExecuted?.map(f => f.name).join(', ') || 'nenhuma'}`);
      failedTests++;
    } else {
      console.log(`${colors.green}✓ Teste ${testNumber} passou${colors.reset}`);
      if (data.functionsExecuted?.length > 0) {
        console.log(`Funções executadas: ${data.functionsExecuted.map(f => 
          `${f.name}(${f.success ? '✓' : '✗'})`
        ).join(', ')}`);
      }
      passedTests++;
    }

    console.log(`Resposta: ${data.reply?.substring(0, 150)}...`);
    
    return data;
  } catch (error) {
    console.error(`${colors.red}✗ Erro no teste ${testNumber}: ${error.message}${colors.reset}`);
    failedTests++;
    return null;
  }
}

// Função para aguardar
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// TESTES PARA CADA FUNÇÃO
async function runTests() {
  console.log(`${colors.bright}${colors.blue}=== BATERIA COMPLETA DE TESTES SOFIA V5 ===${colors.reset}`);
  console.log(`${colors.yellow}9 funções × 5 testes = 45 testes totais${colors.reset}\n`);

  // ========== 1. SEARCH_PROPERTIES (5 testes) ==========
  console.log(`\n${colors.bright}${colors.cyan}━━━ SEARCH_PROPERTIES (5 testes) ━━━${colors.reset}`);
  
  await sendMessage('olá, quero alugar um apartamento', 'search_properties');
  await sleep(1000);
  
  await sendMessage('procuro algo em Florianópolis', 'search_properties');
  await sleep(1000);
  
  await sendMessage('quero um apartamento barato, até 200 reais por dia', 'search_properties');
  await sleep(1000);
  
  await sendMessage('preciso para 4 pessoas, entrada dia 20/08/2025 e saída 25/08/2025', 'search_properties');
  await sleep(1000);
  
  await sendMessage('me mostre opções com piscina e churrasqueira', 'search_properties');
  await sleep(1500);

  // ========== 2. GET_PROPERTY_DETAILS (5 testes) ==========
  console.log(`\n${colors.bright}${colors.cyan}━━━ GET_PROPERTY_DETAILS (5 testes) ━━━${colors.reset}`);
  
  await sendMessage('me conte mais sobre a primeira opção', 'get_property_details');
  await sleep(1000);
  
  await sendMessage('quais são os detalhes do apartamento?', 'get_property_details');
  await sleep(1000);
  
  await sendMessage('quantos quartos tem?', 'get_property_details');
  await sleep(1000);
  
  await sendMessage('tem estacionamento?', 'get_property_details');
  await sleep(1000);
  
  await sendMessage('qual o endereço completo?', 'get_property_details');
  await sleep(1500);

  // ========== 3. SEND_PROPERTY_MEDIA (5 testes) ==========
  console.log(`\n${colors.bright}${colors.cyan}━━━ SEND_PROPERTY_MEDIA (5 testes) ━━━${colors.reset}`);
  
  await sendMessage('me mande as fotos do apartamento', 'send_property_media');
  await sleep(1000);
  
  await sendMessage('quero ver mais fotos', 'send_property_media');
  await sleep(1000);
  
  await sendMessage('tem vídeo do imóvel?', 'send_property_media');
  await sleep(1000);
  
  await sendMessage('envia as imagens do quarto e banheiro', 'send_property_media');
  await sleep(1000);
  
  await sendMessage('manda todas as fotos disponíveis', 'send_property_media');
  await sleep(1500);

  // ========== 4. CALCULATE_PRICE (5 testes) ==========
  console.log(`\n${colors.bright}${colors.cyan}━━━ CALCULATE_PRICE (5 testes) ━━━${colors.reset}`);
  
  await sendMessage('quanto fica 5 dias nesse apartamento?', 'calculate_price');
  await sleep(1000);
  
  await sendMessage('calcule o valor para entrada dia 20/08 e saída 25/08', 'calculate_price');
  await sleep(1000);
  
  await sendMessage('qual o preço total para 3 pessoas, 7 noites?', 'calculate_price');
  await sleep(1000);
  
  await sendMessage('quanto custa um final de semana (sexta a domingo)?', 'calculate_price');
  await sleep(1000);
  
  await sendMessage('me dá o orçamento para o mês inteiro de setembro', 'calculate_price');
  await sleep(1500);

  // ========== 5. REGISTER_CLIENT (5 testes) ==========
  console.log(`\n${colors.bright}${colors.cyan}━━━ REGISTER_CLIENT (5 testes) ━━━${colors.reset}`);
  
  await sendMessage('quero fazer meu cadastro', 'register_client');
  await sleep(1000);
  
  await sendMessage('meu nome é João Silva Santos', 'register_client');
  await sleep(1000);
  
  await sendMessage('meu CPF é 123.456.789-00', 'register_client');
  await sleep(1000);
  
  await sendMessage('meu email é joao.silva@teste.com', 'register_client');
  await sleep(1000);
  
  await sendMessage('pode atualizar meu telefone para 11 98765-4321', 'register_client');
  await sleep(1500);

  // ========== 6. CHECK_VISIT_AVAILABILITY (5 testes) ==========
  console.log(`\n${colors.bright}${colors.cyan}━━━ CHECK_VISIT_AVAILABILITY (5 testes) ━━━${colors.reset}`);
  
  await sendMessage('posso visitar o apartamento?', 'check_visit_availability');
  await sleep(1000);
  
  await sendMessage('quais horários disponíveis para visita amanhã?', 'check_visit_availability');
  await sleep(1000);
  
  await sendMessage('tem disponibilidade sábado de manhã?', 'check_visit_availability');
  await sleep(1000);
  
  await sendMessage('posso conhecer o imóvel hoje à tarde?', 'check_visit_availability');
  await sleep(1000);
  
  await sendMessage('verificar agenda para visita segunda-feira', 'check_visit_availability');
  await sleep(1500);

  // ========== 7. SCHEDULE_VISIT (5 testes) ==========
  console.log(`\n${colors.bright}${colors.cyan}━━━ SCHEDULE_VISIT (5 testes) ━━━${colors.reset}`);
  
  await sendMessage('quero agendar uma visita para amanhã às 14h', 'schedule_visit');
  await sleep(1000);
  
  await sendMessage('agendar visita sábado 10h da manhã', 'schedule_visit');
  await sleep(1000);
  
  await sendMessage('marcar para conhecer o apartamento segunda às 15h', 'schedule_visit');
  await sleep(1000);
  
  await sendMessage('pode ser terça-feira à tarde?', 'schedule_visit');
  await sleep(1000);
  
  await sendMessage('confirmar visita para domingo 11h', 'schedule_visit');
  await sleep(1500);

  // ========== 8. CREATE_RESERVATION (5 testes) ==========
  console.log(`\n${colors.bright}${colors.cyan}━━━ CREATE_RESERVATION (5 testes) ━━━${colors.reset}`);
  
  await sendMessage('quero fazer a reserva', 'create_reservation');
  await sleep(1000);
  
  await sendMessage('confirmar reserva de 20/08 a 25/08 para 3 pessoas', 'create_reservation');
  await sleep(1000);
  
  await sendMessage('reservar o apartamento para o próximo final de semana', 'create_reservation');
  await sleep(1000);
  
  await sendMessage('fechar a locação para setembro inteiro', 'create_reservation');
  await sleep(1000);
  
  await sendMessage('confirmo a reserva, pode processar', 'create_reservation');
  await sleep(1500);

  // ========== 9. CLASSIFY_LEAD_STATUS (5 testes) ==========
  console.log(`\n${colors.bright}${colors.cyan}━━━ CLASSIFY_LEAD_STATUS (5 testes) ━━━${colors.reset}`);
  
  await sendMessage('estou muito interessado, quando posso fechar?', 'classify_lead_status');
  await sleep(1000);
  
  await sendMessage('ainda estou pesquisando outras opções', 'classify_lead_status');
  await sleep(1000);
  
  await sendMessage('preciso conversar com minha família primeiro', 'classify_lead_status');
  await sleep(1000);
  
  await sendMessage('quero fechar negócio hoje mesmo!', 'classify_lead_status');
  await sleep(1000);
  
  await sendMessage('vou pensar e retorno em breve', 'classify_lead_status');
  await sleep(1000);

  // ========== RELATÓRIO FINAL ==========
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.bright}RELATÓRIO FINAL DOS TESTES${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
  
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`\nTotal de testes: ${colors.bright}${totalTests}${colors.reset}`);
  console.log(`${colors.green}✓ Passou: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}✗ Falhou: ${failedTests}${colors.reset}`);
  console.log(`Taxa de sucesso: ${colors.bright}${successRate}%${colors.reset}`);
  
  if (successRate >= 90) {
    console.log(`\n${colors.green}${colors.bright}🎉 EXCELENTE! Sofia está funcionando perfeitamente!${colors.reset}`);
  } else if (successRate >= 70) {
    console.log(`\n${colors.yellow}${colors.bright}⚠️ BOM! Mas algumas funções precisam de ajustes.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ ATENÇÃO! Muitas funções estão falhando.${colors.reset}`);
  }

  // IDs capturados
  if (propertyId || clientId) {
    console.log(`\n${colors.magenta}IDs Capturados durante os testes:${colors.reset}`);
    if (propertyId) console.log(`  PropertyID: ${propertyId}`);
    if (clientId) console.log(`  ClientID: ${clientId}`);
  }
}

// Executar testes
console.log(`${colors.bright}Iniciando bateria completa de testes...${colors.reset}`);
console.log(`API URL: ${API_URL}`);
console.log(`Tenant ID: ${TENANT_ID}\n`);

runTests().catch(error => {
  console.error(`${colors.red}Erro fatal: ${error.message}${colors.reset}`);
  process.exit(1);
});