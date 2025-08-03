#!/usr/bin/env node

/**
 * 🧪 Script de Testes Automatizados - Sofia V5
 * Executa bateria completa de testes para validar funcionamento
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Cores ANSI nativas
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  bold: {
    cyan: (text) => `\x1b[1m\x1b[36m${text}\x1b[0m`,
    yellow: (text) => `\x1b[1m\x1b[33m${text}\x1b[0m`,
    green: (text) => `\x1b[1m\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[1m\x1b[31m${text}\x1b[0m`,
    magenta: (text) => `\x1b[1m\x1b[35m${text}\x1b[0m`
  },
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Configuração base
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_PHONE = '5511999999999';
const TENANT_ID = 'default-tenant';

// Estatísticas dos testes
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Helper para delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper para limpar contexto
async function clearContext() {
  try {
    const response = await fetch(`${BASE_URL}/api/agent/clear-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientPhone: TEST_PHONE,
        tenantId: TENANT_ID
      })
    });
    const result = await response.json();
    console.log(colors.gray('🔄 Contexto limpo'));
    return result;
  } catch (error) {
    console.error(colors.red('❌ Erro ao limpar contexto:', error.message));
  }
}

// Helper principal para testar mensagens
async function testMessage(message, expectations = {}) {
  totalTests++;
  const startTime = Date.now();
  
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
    const responseTime = Date.now() - startTime;
    
    // Log da resposta
    console.log(colors.cyan(`\n📤 Input: ${message}`));
    console.log(colors.green(`📥 Sofia: ${result.message || result.response}`));
    
    // Verificar dados adicionais
    if (result.data) {
      if (result.data.functionsExecuted) {
        console.log(colors.yellow(`🔧 Functions: ${JSON.stringify(result.data.functionsExecuted)}`));
      }
      if (result.data.summary) {
        console.log(colors.magenta(`📋 Summary: ${JSON.stringify(result.data.summary, null, 2)}`));
      }
    }
    
    console.log(colors.gray(`⏱️  Time: ${responseTime}ms`));
    
    // Validar expectativas
    let testPassed = true;
    const validationResults = [];
    
    if (expectations.shouldContain) {
      for (const keyword of expectations.shouldContain) {
        const responseText = (result.message || result.response || '').toLowerCase();
        const contains = responseText.includes(keyword.toLowerCase());
        if (!contains) {
          testPassed = false;
          validationResults.push(`❌ Deveria conter: "${keyword}"`);
        } else {
          validationResults.push(`✅ Contém: "${keyword}"`);
        }
      }
    }
    
    if (expectations.shouldNotContain) {
      for (const keyword of expectations.shouldNotContain) {
        const responseText = (result.message || result.response || '').toLowerCase();
        const contains = responseText.includes(keyword.toLowerCase());
        if (contains) {
          testPassed = false;
          validationResults.push(`❌ Não deveria conter: "${keyword}"`);
        } else {
          validationResults.push(`✅ Não contém: "${keyword}"`);
        }
      }
    }
    
    if (expectations.shouldExecuteFunctions) {
      const executedFunctions = result.data?.functionsExecuted || [];
      for (const funcName of expectations.shouldExecuteFunctions) {
        const executed = executedFunctions.some(f => f.name === funcName);
        if (!executed) {
          testPassed = false;
          validationResults.push(`❌ Deveria executar: ${funcName}`);
        } else {
          validationResults.push(`✅ Executou: ${funcName}`);
        }
      }
    }
    
    if (expectations.shouldNotExecuteFunctions) {
      const executedFunctions = result.data?.functionsExecuted || [];
      for (const funcName of expectations.shouldNotExecuteFunctions) {
        const executed = executedFunctions.some(f => f.name === funcName);
        if (executed) {
          testPassed = false;
          validationResults.push(`❌ Não deveria executar: ${funcName}`);
        } else {
          validationResults.push(`✅ Não executou: ${funcName}`);
        }
      }
    }
    
    if (expectations.maxResponseTime && responseTime > expectations.maxResponseTime) {
      testPassed = false;
      validationResults.push(`❌ Tempo excedido: ${responseTime}ms > ${expectations.maxResponseTime}ms`);
    }
    
    // Log dos resultados de validação
    if (validationResults.length > 0) {
      console.log(colors.blue('\n📊 Validações:'));
      validationResults.forEach(r => console.log('  ' + r));
    }
    
    // Atualizar estatísticas
    if (testPassed) {
      passedTests++;
      console.log(colors.green('✅ Teste passou!\n'));
    } else {
      failedTests++;
      console.log(colors.red('❌ Teste falhou!\n'));
    }
    
    // Adicionar ao relatório
    testResults.push({
      test: message,
      passed: testPassed,
      responseTime,
      validations: validationResults,
      response: result.message || result.response
    });
    
    return result;
    
  } catch (error) {
    failedTests++;
    console.error(colors.red(`❌ Erro no teste: ${error.message}\n`));
    testResults.push({
      test: message,
      passed: false,
      error: error.message
    });
    return null;
  }
}

// Função principal de testes
async function runAllTests() {
  console.log(colors.bold.cyan('\n🚀 Iniciando Bateria de Testes - Sofia V5\n'));
  console.log('=' .repeat(60));
  
  // TESTE 1: Simpatia e Naturalidade
  console.log(colors.bold.yellow('\n🎭 TESTE 1: SIMPATIA E NATURALIDADE'));
  console.log('-'.repeat(40));
  
  await clearContext();
  await testMessage('Oi Sofia!', {
    shouldContain: ['oi', 'olá', '😊', 'ajudar', 'procurando'],
    shouldNotContain: ['erro', 'undefined', 'null'],
    shouldNotExecuteFunctions: ['search_properties'],
    maxResponseTime: 5000
  });
  
  await testMessage('Como você está hoje?', {
    shouldContain: ['bem', 'ótima', 'ajudar', 'imóvel', 'propriedade'],
    shouldNotExecuteFunctions: ['search_properties']
  });
  
  await testMessage('Estou procurando um lugar para passar a lua de mel', {
    shouldContain: ['lua de mel', 'romântico', 'especial', 'casal', '💕'],
    shouldNotExecuteFunctions: ['search_properties']
  });
  
  // TESTE 2: Sistema de Sumário Inteligente
  console.log(colors.bold.yellow('\n🔍 TESTE 2: SISTEMA DE SUMÁRIO INTELIGENTE'));
  console.log('-'.repeat(40));
  
  await clearContext();
  await testMessage('Olá! Eu e minha esposa queremos alugar um apartamento em Copacabana para 5 dias', {
    shouldContain: ['copacabana', 'casal', 'esposa'],
    shouldExecuteFunctions: ['search_properties']
  });
  
  await testMessage('qual a mais barata?', {
    shouldContain: ['barata', 'econômica', 'valor'],
    shouldNotExecuteFunctions: ['search_properties']
  });
  
  await sleep(1000);
  await testMessage('e sobre aquela propriedade que você mostrou?', {
    shouldNotContain: ['não entendi', 'qual propriedade'],
    shouldNotExecuteFunctions: ['search_properties']
  });
  
  // TESTE 3: Função search_properties
  console.log(colors.bold.yellow('\n🏠 TESTE 3: FUNÇÃO SEARCH_PROPERTIES'));
  console.log('-'.repeat(40));
  
  await clearContext();
  await testMessage('Quero alugar um apartamento', {
    shouldExecuteFunctions: ['search_properties'],
    shouldContain: ['encontrei', 'opções', 'apartamento']
  });
  
  await testMessage('Preciso de uma casa para 6 pessoas com piscina', {
    shouldExecuteFunctions: ['search_properties'],
    shouldContain: ['6 pessoas', 'piscina']
  });
  
  await testMessage('tem outras opções?', {
    shouldNotExecuteFunctions: ['search_properties'],
    shouldContain: ['outras', 'opções']
  });
  
  // TESTE 4: Função send_property_media
  console.log(colors.bold.yellow('\n📸 TESTE 4: FUNÇÃO SEND_PROPERTY_MEDIA'));
  console.log('-'.repeat(40));
  
  await clearContext();
  await testMessage('Quero ver apartamentos', {
    shouldExecuteFunctions: ['search_properties']
  });
  
  await testMessage('quero ver fotos', {
    shouldExecuteFunctions: ['send_property_media'],
    shouldContain: ['fotos', 'imagens']
  });
  
  await testMessage('posso ver fotos da primeira opção?', {
    shouldExecuteFunctions: ['send_property_media'],
    shouldContain: ['primeira', 'fotos']
  });
  
  // TESTE 5: Função calculate_price
  console.log(colors.bold.yellow('\n💰 TESTE 5: FUNÇÃO CALCULATE_PRICE'));
  console.log('-'.repeat(40));
  
  await clearContext();
  await testMessage('Quero um apartamento', {
    shouldExecuteFunctions: ['search_properties']
  });
  
  await testMessage('quanto custa para 3 noites de 15 a 18 de agosto?', {
    shouldExecuteFunctions: ['calculate_price'],
    shouldContain: ['3 noites', 'total', 'valor', 'R$']
  });
  
  await testMessage('e se for por uma semana?', {
    shouldExecuteFunctions: ['calculate_price'],
    shouldContain: ['7', 'semana', 'total', 'R$']
  });
  
  // TESTE 6: Função register_client
  console.log(colors.bold.yellow('\n👤 TESTE 6: FUNÇÃO REGISTER_CLIENT'));
  console.log('-'.repeat(40));
  
  await clearContext();
  await testMessage('João Silva, 11987654321, 12345678901, joao@email.com', {
    shouldExecuteFunctions: ['register_client'],
    shouldContain: ['cadastro', 'registrado', 'João']
  });
  
  await testMessage('Maria Santos, 11999888777', {
    shouldNotExecuteFunctions: ['register_client'],
    shouldContain: ['CPF', 'documento']
  });
  
  // TESTE 7: Função schedule_visit
  console.log(colors.bold.yellow('\n📅 TESTE 7: FUNÇÃO SCHEDULE_VISIT'));
  console.log('-'.repeat(40));
  
  await clearContext();
  await testMessage('Quero ver um apartamento', {
    shouldExecuteFunctions: ['search_properties']
  });
  
  await testMessage('gostaria de visitar o apartamento', {
    shouldContain: ['visita', 'agendar', 'horário']
  });
  
  await testMessage('quero agendar para amanhã às 14h', {
    shouldContain: ['agendado', 'confirmado', '14h', 'amanhã']
  });
  
  // TESTE 8: Função create_reservation
  console.log(colors.bold.yellow('\n🎯 TESTE 8: FUNÇÃO CREATE_RESERVATION'));
  console.log('-'.repeat(40));
  
  await clearContext();
  await testMessage('quero alugar para 2 pessoas', {
    shouldExecuteFunctions: ['search_properties']
  });
  
  await testMessage('quero ver fotos da primeira', {
    shouldExecuteFunctions: ['send_property_media']
  });
  
  await testMessage('quanto custa de 1 a 5 de agosto?', {
    shouldExecuteFunctions: ['calculate_price']
  });
  
  await testMessage('João Silva, 11987654321, 12345678901', {
    shouldExecuteFunctions: ['register_client']
  });
  
  await testMessage('quero confirmar a reserva', {
    shouldExecuteFunctions: ['create_reservation'],
    shouldContain: ['reserva', 'confirmada']
  });
  
  // TESTE 9: Recuperação de Contexto
  console.log(colors.bold.yellow('\n🔄 TESTE 9: RECUPERAÇÃO DE CONTEXTO'));
  console.log('-'.repeat(40));
  
  await clearContext();
  await testMessage('oi, quero alugar para 3 pessoas', {
    shouldExecuteFunctions: ['search_properties']
  });
  
  await sleep(2000);
  await testMessage('qual era mesmo a primeira opção?', {
    shouldNotExecuteFunctions: ['search_properties'],
    shouldNotContain: ['não entendi', 'qual propriedade']
  });
  
  await testMessage('na verdade somos 4 pessoas', {
    shouldExecuteFunctions: ['search_properties'],
    shouldContain: ['4 pessoas']
  });
  
  // TESTE 10: Tratamento de Erros
  console.log(colors.bold.yellow('\n🚨 TESTE 10: TRATAMENTO DE ERROS'));
  console.log('-'.repeat(40));
  
  await clearContext();
  await testMessage('asdfghjkl!@#$%', {
    shouldNotContain: ['erro', 'undefined', 'null'],
    shouldContain: ['ajudar', 'entender', 'procurando']
  });
  
  await testMessage('quero ver fotos da propriedade XYZ123', {
    shouldNotContain: ['erro', 'undefined'],
    shouldContain: ['não encontrei', 'outra', 'opções']
  });
  
  // Relatório Final
  console.log('\n' + '='.repeat(60));
  console.log(colors.bold.cyan('\n📊 RELATÓRIO FINAL DE TESTES\n'));
  
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log(colors.green(`✅ Testes aprovados: ${passedTests}`));
  console.log(colors.red(`❌ Testes falhados: ${failedTests}`));
  console.log(colors.yellow(`📊 Total de testes: ${totalTests}`));
  console.log(colors.bold.magenta(`🎯 Taxa de sucesso: ${successRate}%`));
  
  // Salvar relatório detalhado
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: successRate + '%'
    },
    tests: testResults
  };
  
  fs.writeFileSync(
    'test-results-sofia-v5.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log(colors.gray('\n📄 Relatório detalhado salvo em: test-results-sofia-v5.json'));
  
  // Status final
  if (successRate >= 95) {
    console.log(colors.bold.green('\n🎉 SOFIA V5 APROVADA PARA PRODUÇÃO! 🎉'));
  } else if (successRate >= 80) {
    console.log(colors.bold.yellow('\n⚠️  SOFIA V5 PRECISA DE AJUSTES MENORES'));
  } else {
    console.log(colors.bold.red('\n❌ SOFIA V5 PRECISA DE CORREÇÕES SIGNIFICATIVAS'));
  }
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Executar testes
console.log(colors.bold.cyan('🔧 Verificando servidor...'));
fetch(`${BASE_URL}/api/health`)
  .then(response => {
    if (!response.ok) throw new Error('Servidor não está respondendo');
    console.log(colors.green('✅ Servidor online!\n'));
    return runAllTests();
  })
  .catch(error => {
    console.error(colors.red(`❌ Erro: ${error.message}`));
    console.log(colors.yellow('\n⚠️  Certifique-se de que o servidor está rodando na porta 3000'));
    console.log(colors.gray('   npm run dev'));
    process.exit(1);
  });