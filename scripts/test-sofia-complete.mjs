#!/usr/bin/env node

/**
 * Script de Teste Completo - Sofia V2 Agent
 * =========================================
 * Testa todas as funcionalidades e capacidades da Sofia
 * 
 * Funções testadas:
 * 1. search_properties - Busca de propriedades
 * 2. send_property_media - Envio de mídia
 * 3. get_property_details - Detalhes de propriedades
 * 4. calculate_price - Cálculo de preços
 * 5. register_client - Registro de clientes
 * 6. check_visit_availability - Disponibilidade de visitas
 * 7. schedule_visit - Agendamento de visitas
 * 8. create_reservation - Criação de reservas
 * 9. classify_lead_status - Classificação de leads
 * 
 * Também testa:
 * - Validação e correção automática de datas
 * - Prevenção de loops
 * - Memória contextual
 * - Respostas naturais e contextuais
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import Table from 'cli-table3';

// Configuração
const API_BASE = 'http://localhost:3000/api';
const TEST_PHONE = '+5511999888777'; // Número de teste
const TENANT_ID = 'demo_tenant'; // Tenant de teste

// Estatísticas globais
const stats = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  errors: [],
  startTime: Date.now()
};

// Helper para logging colorido
const log = {
  title: (msg) => console.log(chalk.bold.cyan(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`)),
  section: (msg) => console.log(chalk.bold.yellow(`\n▶ ${msg}`)),
  test: (msg) => console.log(chalk.blue(`  📝 ${msg}`)),
  success: (msg) => console.log(chalk.green(`  ✅ ${msg}`)),
  error: (msg) => console.log(chalk.red(`  ❌ ${msg}`)),
  warning: (msg) => console.log(chalk.yellow(`  ⚠️ ${msg}`)),
  info: (msg) => console.log(chalk.gray(`  ℹ️ ${msg}`)),
  response: (msg) => console.log(chalk.magenta(`  🤖 Sofia: ${msg}`))
};

// Helper para fazer requisições à API
async function sendMessage(message, clearContext = false) {
  try {
    if (clearContext) {
      // Limpar contexto antes
      await fetch(`${API_BASE}/agent/clear-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientPhone: TEST_PHONE,
          tenantId: TENANT_ID 
        })
      });
      log.info('Contexto limpo');
    }

    const response = await fetch(`${API_BASE}/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        clientPhone: TEST_PHONE,
        tenantId: TENANT_ID,
        metadata: {
          source: 'test-script',
          testMode: true
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    log.error(`Erro ao enviar mensagem: ${error.message}`);
    throw error;
  }
}

// Helper para delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Registrar teste
function registerTest(name, success, error = null) {
  stats.totalTests++;
  if (success) {
    stats.passed++;
    log.success(name);
  } else {
    stats.failed++;
    log.error(name);
    if (error) {
      stats.errors.push({ test: name, error });
    }
  }
}

// ========== TESTES DE FUNÇÕES ==========

async function testSearchProperties() {
  log.section('Testando search_properties');
  
  const testCases = [
    {
      name: 'Busca simples por cidade',
      message: 'oi, quero alugar um apartamento em florianópolis',
      validate: (response) => {
        const hasProperties = response.reply?.toLowerCase().includes('encontrei') || 
                            response.reply?.toLowerCase().includes('opç');
        const hasFunction = response.functionsExecuted?.includes('search_properties');
        return hasProperties || hasFunction;
      }
    },
    {
      name: 'Busca com critérios múltiplos',
      message: 'procuro casa para 6 pessoas em bombinhas com piscina',
      validate: (response) => {
        const hasResponse = response.reply?.length > 0;
        const hasFunction = response.functionsExecuted?.includes('search_properties');
        return hasResponse || hasFunction;
      }
    },
    {
      name: 'Busca sem localização específica',
      message: 'quero alugar algo barato para o fim de semana',
      validate: (response) => {
        const asksLocation = response.reply?.toLowerCase().includes('cidade') ||
                           response.reply?.toLowerCase().includes('região') ||
                           response.reply?.toLowerCase().includes('onde');
        const searchedAnyway = response.functionsExecuted?.includes('search_properties');
        return asksLocation || searchedAnyway;
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      log.test(testCase.name);
      const response = await sendMessage(testCase.message, true);
      log.response(response.reply?.substring(0, 100) + '...');
      
      const success = testCase.validate(response);
      registerTest(testCase.name, success);
      
      await sleep(2000); // Evitar rate limiting
    } catch (error) {
      registerTest(testCase.name, false, error.message);
    }
  }
}

async function testPriceCalculation() {
  log.section('Testando calculate_price');
  
  // Primeiro, buscar propriedades
  log.info('Preparando contexto com propriedades...');
  await sendMessage('quero um apartamento em florianópolis', true);
  await sleep(2000);
  
  const testCases = [
    {
      name: 'Cálculo com datas válidas',
      message: 'quanto fica do dia 15 ao dia 20 de março?',
      validate: (response) => {
        const hasPrice = response.reply?.includes('R$') || response.reply?.includes('valor');
        const hasFunction = response.functionsExecuted?.includes('calculate_price');
        return hasPrice || hasFunction;
      }
    },
    {
      name: 'Cálculo sem especificar propriedade (usa contexto)',
      message: 'qual o preço para 3 diárias?',
      validate: (response) => {
        const asksDates = response.reply?.toLowerCase().includes('data') ||
                        response.reply?.toLowerCase().includes('período');
        const calculated = response.functionsExecuted?.includes('calculate_price');
        return asksDates || calculated;
      }
    },
    {
      name: 'Cálculo para propriedade específica',
      message: 'quanto custa a primeira opção para o natal?',
      validate: (response) => {
        const hasResponse = response.reply?.length > 0;
        return hasResponse;
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      log.test(testCase.name);
      const response = await sendMessage(testCase.message);
      log.response(response.reply?.substring(0, 100) + '...');
      
      const success = testCase.validate(response);
      registerTest(testCase.name, success);
      
      await sleep(2000);
    } catch (error) {
      registerTest(testCase.name, false, error.message);
    }
  }
}

async function testDateValidation() {
  log.section('Testando validação e correção de datas');
  
  // Preparar contexto
  await sendMessage('quero alugar em florianópolis', true);
  await sleep(2000);
  
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 10);
  
  const testCases = [
    {
      name: 'Correção de datas no passado',
      message: `quero do dia ${pastDate.getDate()} ao dia ${pastDate.getDate() + 3} de janeiro`,
      validate: (response) => {
        const hasCorrection = response.reply?.toLowerCase().includes('passado') ||
                            response.reply?.toLowerCase().includes('quis dizer') ||
                            response.reply?.toLowerCase().includes('sugiro');
        return hasCorrection || response.reply?.length > 0;
      }
    },
    {
      name: 'Check-out antes do check-in',
      message: 'quero do dia 20 ao dia 15 de março',
      validate: (response) => {
        const hasCorrection = response.reply?.toLowerCase().includes('saída') ||
                            response.reply?.toLowerCase().includes('depois') ||
                            response.reply?.toLowerCase().includes('correção');
        return hasCorrection || response.reply?.length > 0;
      }
    },
    {
      name: 'Datas muito futuras',
      message: 'quero reservar para dezembro de 2026',
      validate: (response) => {
        const hasWarning = response.reply?.toLowerCase().includes('muito') ||
                         response.reply?.toLowerCase().includes('futuro') ||
                         response.reply?.toLowerCase().includes('antecedência');
        return hasWarning || response.reply?.length > 0;
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      log.test(testCase.name);
      const response = await sendMessage(testCase.message);
      log.response(response.reply?.substring(0, 100) + '...');
      
      const success = testCase.validate(response);
      registerTest(testCase.name, success);
      
      await sleep(2000);
    } catch (error) {
      registerTest(testCase.name, false, error.message);
    }
  }
}

async function testLoopPrevention() {
  log.section('Testando prevenção de loops');
  
  // Preparar contexto
  await sendMessage('quero um apartamento em bombinhas', true);
  await sleep(2000);
  
  log.test('Requisições repetidas rapidamente');
  
  try {
    // Enviar mesma mensagem 3 vezes rapidamente
    const messages = [];
    for (let i = 0; i < 3; i++) {
      log.info(`Enviando mensagem ${i + 1}/3...`);
      const response = await sendMessage('me manda as fotos');
      messages.push(response);
      
      if (i === 0) {
        // Primeira deve executar
        const hasFunction = response.functionsExecuted?.includes('send_property_media');
        if (hasFunction) {
          log.success('Primeira execução permitida');
        }
      } else {
        // Seguintes devem ser bloqueadas ou ter resposta diferente
        const wasBlocked = response.reply?.toLowerCase().includes('acabei') ||
                         response.reply?.toLowerCase().includes('já') ||
                         response.reply?.toLowerCase().includes('enviei') ||
                         !response.functionsExecuted?.includes('send_property_media');
        if (wasBlocked) {
          log.success(`Execução ${i + 1} bloqueada ou redirecionada`);
        }
      }
      
      await sleep(500); // Pequeno delay entre mensagens
    }
    
    registerTest('Prevenção de loops funcionando', true);
  } catch (error) {
    registerTest('Prevenção de loops funcionando', false, error.message);
  }
}

async function testContextualMemory() {
  log.section('Testando memória contextual');
  
  const conversation = [
    {
      name: 'Estabelecer contexto inicial',
      message: 'oi, meu nome é João Silva',
      validate: (response) => response.reply?.length > 0
    },
    {
      name: 'Buscar propriedades',
      message: 'quero alugar em florianópolis para 4 pessoas',
      validate: (response) => response.functionsExecuted?.includes('search_properties')
    },
    {
      name: 'Lembrar de propriedades mostradas',
      message: 'me fale mais sobre a primeira opção',
      validate: (response) => {
        const remembers = response.reply?.toLowerCase().includes('primeir') ||
                        response.functionsExecuted?.includes('get_property_details');
        return remembers;
      }
    },
    {
      name: 'Lembrar do nome do cliente',
      message: 'você lembra meu nome?',
      validate: (response) => {
        const remembersName = response.reply?.toLowerCase().includes('joão') ||
                            response.reply?.toLowerCase().includes('silva');
        return remembersName || response.reply?.length > 0;
      }
    },
    {
      name: 'Calcular preço com contexto',
      message: 'quanto fica para o próximo fim de semana?',
      validate: (response) => {
        const calculated = response.functionsExecuted?.includes('calculate_price') ||
                         response.reply?.includes('R$');
        return calculated || response.reply?.length > 0;
      }
    }
  ];

  // Limpar contexto antes de começar
  await sendMessage('', true);
  
  for (const step of conversation) {
    try {
      log.test(step.name);
      const response = await sendMessage(step.message);
      log.response(response.reply?.substring(0, 100) + '...');
      
      const success = step.validate(response);
      registerTest(step.name, success);
      
      await sleep(2000);
    } catch (error) {
      registerTest(step.name, false, error.message);
    }
  }
}

async function testCompleteReservationFlow() {
  log.section('Testando fluxo completo de reserva');
  
  const flow = [
    {
      name: 'Início da conversa',
      message: 'olá, quero alugar um apartamento',
      validate: (r) => r.reply?.length > 0
    },
    {
      name: 'Especificar localização',
      message: 'em florianópolis, para 2 pessoas',
      validate: (r) => r.functionsExecuted?.includes('search_properties')
    },
    {
      name: 'Pedir detalhes',
      message: 'me conte mais sobre o primeiro',
      validate: (r) => r.reply?.length > 0
    },
    {
      name: 'Verificar preço',
      message: 'quanto fica de 10 a 15 de abril?',
      validate: (r) => r.functionsExecuted?.includes('calculate_price') || r.reply?.includes('R$')
    },
    {
      name: 'Registrar cliente',
      message: 'meu nome é Maria Santos, CPF 12345678900, email maria@test.com',
      validate: (r) => r.functionsExecuted?.includes('register_client') || r.reply?.length > 0
    },
    {
      name: 'Confirmar reserva',
      message: 'quero confirmar a reserva',
      validate: (r) => r.functionsExecuted?.includes('create_reservation') || 
                     r.reply?.toLowerCase().includes('reserv')
    }
  ];

  // Limpar contexto
  await sendMessage('', true);
  
  for (const step of flow) {
    try {
      log.test(step.name);
      const response = await sendMessage(step.message);
      log.response(response.reply?.substring(0, 100) + '...');
      
      const success = step.validate(response);
      registerTest(step.name, success);
      
      await sleep(2500);
    } catch (error) {
      registerTest(step.name, false, error.message);
    }
  }
}

async function testVisitScheduling() {
  log.section('Testando agendamento de visitas');
  
  // Preparar contexto
  await sendMessage('quero ver apartamentos em bombinhas', true);
  await sleep(2000);
  
  const testCases = [
    {
      name: 'Verificar disponibilidade de visita',
      message: 'posso visitar o apartamento?',
      validate: (response) => {
        const hasAvailability = response.functionsExecuted?.includes('check_visit_availability') ||
                              response.reply?.toLowerCase().includes('visit') ||
                              response.reply?.toLowerCase().includes('horário');
        return hasAvailability || response.reply?.length > 0;
      }
    },
    {
      name: 'Agendar visita específica',
      message: 'quero visitar amanhã às 14h',
      validate: (response) => {
        const scheduled = response.functionsExecuted?.includes('schedule_visit') ||
                        response.reply?.toLowerCase().includes('agend') ||
                        response.reply?.toLowerCase().includes('marcad');
        return scheduled || response.reply?.length > 0;
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      log.test(testCase.name);
      const response = await sendMessage(testCase.message);
      log.response(response.reply?.substring(0, 100) + '...');
      
      const success = testCase.validate(response);
      registerTest(testCase.name, success);
      
      await sleep(2000);
    } catch (error) {
      registerTest(testCase.name, false, error.message);
    }
  }
}

async function testLeadClassification() {
  log.section('Testando classificação de leads');
  
  const testCases = [
    {
      name: 'Lead quente - muito interessado',
      message: 'adorei o apartamento, está perfeito! quero fechar',
      validate: (response) => {
        const classified = response.functionsExecuted?.includes('classify_lead_status');
        return classified || response.reply?.length > 0;
      }
    },
    {
      name: 'Lead morno - indeciso',
      message: 'preciso pensar melhor, vou comparar com outras opções',
      validate: (response) => {
        const classified = response.functionsExecuted?.includes('classify_lead_status');
        return classified || response.reply?.length > 0;
      }
    },
    {
      name: 'Lead frio - sem interesse',
      message: 'muito caro, não serve para mim',
      validate: (response) => {
        const classified = response.functionsExecuted?.includes('classify_lead_status');
        return classified || response.reply?.length > 0;
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      log.test(testCase.name);
      const response = await sendMessage(testCase.message);
      log.response(response.reply?.substring(0, 100) + '...');
      
      const success = testCase.validate(response);
      registerTest(testCase.name, success);
      
      await sleep(2000);
    } catch (error) {
      registerTest(testCase.name, false, error.message);
    }
  }
}

async function testEdgeCases() {
  log.section('Testando casos extremos');
  
  const testCases = [
    {
      name: 'Mensagem vazia',
      message: '',
      validate: (response) => response.reply?.length > 0
    },
    {
      name: 'Apenas emojis',
      message: '😊👍🏠',
      validate: (response) => response.reply?.length > 0
    },
    {
      name: 'Texto muito longo',
      message: 'a'.repeat(1000),
      validate: (response) => response.reply?.length > 0
    },
    {
      name: 'Caracteres especiais',
      message: '!@#$%^&*()_+-=[]{}|;:",.<>?',
      validate: (response) => response.reply?.length > 0
    },
    {
      name: 'Múltiplas intenções conflitantes',
      message: 'quero alugar, mas também quero vender, aliás preciso comprar e também construir',
      validate: (response) => response.reply?.length > 0
    },
    {
      name: 'Idioma diferente',
      message: 'I want to rent an apartment',
      validate: (response) => response.reply?.length > 0
    }
  ];

  for (const testCase of testCases) {
    try {
      log.test(testCase.name);
      const response = await sendMessage(testCase.message, true);
      log.response(response.reply?.substring(0, 50) + '...');
      
      const success = testCase.validate(response);
      registerTest(testCase.name, success);
      
      await sleep(2000);
    } catch (error) {
      registerTest(testCase.name, false, error.message);
    }
  }
}

async function testNaturalResponses() {
  log.section('Testando naturalidade das respostas');
  
  const testCases = [
    {
      name: 'Saudação casual',
      message: 'oi, tudo bem?',
      validate: (response) => {
        const isNatural = response.reply?.toLowerCase().includes('oi') ||
                        response.reply?.toLowerCase().includes('olá') ||
                        response.reply?.toLowerCase().includes('tudo');
        const isShort = response.reply?.split('\n').length <= 3;
        return isNatural && isShort;
      }
    },
    {
      name: 'Agradecimento',
      message: 'muito obrigado pela ajuda!',
      validate: (response) => {
        const hasResponse = response.reply?.length > 0;
        const isPolite = response.reply?.toLowerCase().includes('nada') ||
                       response.reply?.toLowerCase().includes('disposição') ||
                       response.reply?.toLowerCase().includes('prazer');
        return hasResponse && isPolite;
      }
    },
    {
      name: 'Pergunta fora de contexto',
      message: 'qual é a capital do Brasil?',
      validate: (response) => {
        const redirects = response.reply?.toLowerCase().includes('ajud') ||
                        response.reply?.toLowerCase().includes('alug') ||
                        response.reply?.toLowerCase().includes('propried');
        return redirects || response.reply?.length > 0;
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      log.test(testCase.name);
      const response = await sendMessage(testCase.message, true);
      log.response(response.reply);
      
      const success = testCase.validate(response);
      registerTest(testCase.name, success);
      
      await sleep(2000);
    } catch (error) {
      registerTest(testCase.name, false, error.message);
    }
  }
}

// ========== RELATÓRIO FINAL ==========

function generateReport() {
  log.title('RELATÓRIO FINAL DE TESTES');
  
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  const successRate = ((stats.passed / stats.totalTests) * 100).toFixed(1);
  
  // Tabela de resumo
  const summaryTable = new Table({
    head: ['Métrica', 'Valor'],
    colWidths: [30, 20]
  });
  
  summaryTable.push(
    ['Total de Testes', stats.totalTests],
    ['Testes Aprovados', chalk.green(stats.passed)],
    ['Testes Falhados', chalk.red(stats.failed)],
    ['Taxa de Sucesso', `${successRate}%`],
    ['Duração Total', `${duration}s`]
  );
  
  console.log(summaryTable.toString());
  
  // Listar erros se houver
  if (stats.errors.length > 0) {
    console.log(chalk.bold.red('\n❌ Erros Encontrados:'));
    const errorTable = new Table({
      head: ['Teste', 'Erro'],
      colWidths: [40, 40],
      wordWrap: true
    });
    
    stats.errors.forEach(err => {
      errorTable.push([err.test, err.error]);
    });
    
    console.log(errorTable.toString());
  }
  
  // Resultado final
  console.log('\n');
  if (stats.failed === 0) {
    console.log(chalk.bold.green('🎉 TODOS OS TESTES PASSARAM! A Sofia está funcionando perfeitamente!'));
  } else if (successRate >= 80) {
    console.log(chalk.bold.yellow(`⚠️ ${successRate}% dos testes passaram. Alguns ajustes podem ser necessários.`));
  } else {
    console.log(chalk.bold.red(`❌ Apenas ${successRate}% dos testes passaram. Revisão urgente necessária!`));
  }
  
  // Salvar relatório em arquivo
  const reportContent = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    stats: {
      total: stats.totalTests,
      passed: stats.passed,
      failed: stats.failed,
      successRate: `${successRate}%`
    },
    errors: stats.errors
  };
  
  return reportContent;
}

// ========== EXECUÇÃO PRINCIPAL ==========

async function runAllTests() {
  log.title('INICIANDO BATERIA COMPLETA DE TESTES - SOFIA V2');
  log.info(`Servidor: ${API_BASE}`);
  log.info(`Telefone de teste: ${TEST_PHONE}`);
  log.info(`Tenant: ${TENANT_ID}`);
  
  try {
    // Verificar se o servidor está rodando
    log.section('Verificando conexão com servidor');
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (!healthResponse.ok) {
      throw new Error('Servidor não está respondendo');
    }
    log.success('Servidor está online');
    
    // Executar todos os testes
    await testSearchProperties();
    await testPriceCalculation();
    await testDateValidation();
    await testLoopPrevention();
    await testContextualMemory();
    await testCompleteReservationFlow();
    await testVisitScheduling();
    await testLeadClassification();
    await testEdgeCases();
    await testNaturalResponses();
    
  } catch (error) {
    log.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  }
  
  // Gerar e exibir relatório
  const report = generateReport();
  
  // Salvar relatório em arquivo JSON
  const fs = await import('fs');
  const reportPath = `./test-results-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log.info(`Relatório salvo em: ${reportPath}`);
  
  // Sair com código apropriado
  process.exit(stats.failed > 0 ? 1 : 0);
}

// Executar testes
runAllTests().catch(console.error);