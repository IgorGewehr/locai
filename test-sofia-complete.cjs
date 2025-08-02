#!/usr/bin/env node

// Script de Testes Completo - Sofia V5
// Teste sistemático de todas as funcionalidades

const fs = require('fs');

const AGENT_URL = 'http://localhost:3000/api/agent';
const TEST_PHONE = '5511999999999';
const TENANT_ID = 'default-tenant';

// Utilitário para fazer requests
async function testMessage(message, expectedKeywords = []) {
  try {
    const response = await fetch(AGENT_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Sofia-Tester/1.0'
      },
      body: JSON.stringify({
        message,
        clientPhone: TEST_PHONE,
        tenantId: TENANT_ID,
        isTest: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Log estruturado
    console.log(`\n📤 INPUT: "${message}"`);
    console.log(`📥 SOFIA: "${result.message || result.error}"`);
    if (result.data?.functionsExecuted) {
      console.log(`🔧 FUNCTIONS: ${result.data.functionsExecuted.join(', ')}`);
    }
    if (result.data?.responseTime) {
      console.log(`⏱️  TIME: ${result.data.responseTime}ms`);
    }
    if (result.data?.tokensUsed) {
      console.log(`💰 TOKENS: ${result.data.tokensUsed}`);
    }
    
    // Validação de keywords
    const messageText = (result.message || '').toLowerCase();
    const foundKeywords = expectedKeywords.filter(keyword => 
      messageText.includes(keyword.toLowerCase())
    );
    
    if (expectedKeywords.length > 0) {
      console.log(`🔍 KEYWORDS: ${foundKeywords.length}/${expectedKeywords.length} encontradas`);
      if (foundKeywords.length < expectedKeywords.length) {
        console.log(`❌ FALTARAM: ${expectedKeywords.filter(k => !foundKeywords.includes(k.toLowerCase())).join(', ')}`);
      }
    }
    
    console.log('---');
    
    return {
      ...result,
      foundKeywords,
      keywordScore: expectedKeywords.length > 0 ? foundKeywords.length / expectedKeywords.length : 1,
      success: result.success !== false
    };
    
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    console.log('---');
    return {
      success: false,
      message: error.message,
      foundKeywords: [],
      keywordScore: 0
    };
  }
}

// Limpar contexto antes de cada teste
async function clearContext() {
  try {
    const response = await fetch(`${AGENT_URL}/clear-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientPhone: TEST_PHONE,
        tenantId: TENANT_ID
      })
    });
    
    if (response.ok) {
      console.log('🧹 Contexto limpo');
    }
  } catch (error) {
    console.log('⚠️  Erro ao limpar contexto:', error.message);
  }
}

// TESTE 1: Simpatia e Naturalidade
async function teste1() {
  console.log('\n🎭 === TESTE 1: SIMPATIA E NATURALIDADE ===');
  
  await clearContext();
  
  let score = 0;
  let total = 0;
  
  // 1.1: Primeira impressão
  console.log('\n🧪 Teste 1.1: Primeira Impressão');
  const t1 = await testMessage('Oi Sofia!', ['oi', 'olá', 'ajudar', '😊', '🏠']);
  total++;
  if (t1.success && t1.keywordScore > 0.4) score++;
  
  // 1.2: Conversa casual
  console.log('\n🧪 Teste 1.2: Conversa Casual');
  const t2 = await testMessage('Como você está hoje?', ['bem', 'ótima', 'imóveis', 'propriedades']);
  total++;
  if (t2.success && t2.keywordScore > 0.2) score++;
  
  // 1.3: Contexto emocional
  console.log('\n🧪 Teste 1.3: Contexto Emocional');
  const t3 = await testMessage('Estou procurando um lugar para passar a lua de mel', ['lua de mel', 'casal', 'romântico', '💕', '✨']);
  total++;
  if (t3.success && t3.keywordScore > 0.2) score++;
  
  const finalScore = Math.round((score / total) * 100);
  console.log(`\n📊 RESULTADO TESTE 1: ${score}/${total} (${finalScore}%)`);
  
  return { score, total, percentage: finalScore };
}

// TESTE 2: Sistema de Sumário
async function teste2() {
  console.log('\n🔍 === TESTE 2: SISTEMA DE SUMÁRIO ===');
  
  await clearContext();
  
  let score = 0;
  let total = 0;
  
  // 2.1: Extração de informações
  console.log('\n🧪 Teste 2.1: Extração de Informações');
  const t1 = await testMessage('Olá! Eu e minha esposa queremos alugar um apartamento em Copacabana para 5 dias', ['search_properties']);
  total++;
  if (t1.success && t1.data?.functionsExecuted?.includes('search_properties')) score++;
  
  // 2.2: Manutenção de contexto
  console.log('\n🧪 Teste 2.2: Manutenção de Contexto');
  const t2 = await testMessage('qual a mais barata?', []);
  total++;
  if (t2.success && !t2.data?.functionsExecuted?.includes('search_properties')) score++;
  
  // 2.3: Recuperação de contexto (após 5 segundos)
  console.log('\n🧪 Teste 2.3: Recuperação de Contexto (aguardando 5s...)');
  await new Promise(resolve => setTimeout(resolve, 5000));
  const t3 = await testMessage('e sobre aquela propriedade que você mostrou?', []);
  total++;
  if (t3.success && t3.message.length > 20) score++;
  
  const finalScore = Math.round((score / total) * 100);
  console.log(`\n📊 RESULTADO TESTE 2: ${score}/${total} (${finalScore}%)`);
  
  return { score, total, percentage: finalScore };
}

// TESTE 3: Função search_properties
async function teste3() {
  console.log('\n🏠 === TESTE 3: FUNÇÃO SEARCH_PROPERTIES ===');
  
  await clearContext();
  
  let score = 0;
  let total = 0;
  
  // 3.1: Busca básica
  console.log('\n🧪 Teste 3.1: Busca Básica');
  const t1 = await testMessage('Quero alugar um apartamento', ['search_properties']);
  total++;
  if (t1.success && t1.data?.functionsExecuted?.includes('search_properties')) score++;
  
  // 3.2: Busca com filtros
  console.log('\n🧪 Teste 3.2: Busca com Filtros');
  const t2 = await testMessage('Preciso de uma casa para 6 pessoas com piscina', ['search_properties']);
  total++;
  if (t2.success && t2.data?.functionsExecuted?.includes('search_properties')) score++;
  
  // 3.3: Busca sem repetição
  console.log('\n🧪 Teste 3.3: Busca sem Repetição');
  const t3 = await testMessage('tem outras opções?', []);
  total++;
  if (t3.success && !t3.data?.functionsExecuted?.includes('search_properties')) score++;
  
  const finalScore = Math.round((score / total) * 100);
  console.log(`\n📊 RESULTADO TESTE 3: ${score}/${total} (${finalScore}%)`);
  
  return { score, total, percentage: finalScore };
}

// TESTE 4: Função send_property_media
async function teste4() {
  console.log('\n📸 === TESTE 4: FUNÇÃO SEND_PROPERTY_MEDIA ===');
  
  await clearContext();
  
  let score = 0;
  let total = 0;
  
  // Primeiro buscar propriedades
  await testMessage('Quero ver apartamentos');
  
  // 4.1: Solicitação direta
  console.log('\n🧪 Teste 4.1: Solicitação Direta');
  const t1 = await testMessage('quero ver fotos', ['send_property_media']);
  total++;
  if (t1.success && t1.data?.functionsExecuted?.includes('send_property_media')) score++;
  
  // 4.2: Propriedade específica
  console.log('\n🧪 Teste 4.2: Propriedade Específica');
  const t2 = await testMessage('posso ver fotos da primeira opção?', ['send_property_media']);
  total++;
  if (t2.success && t2.data?.functionsExecuted?.includes('send_property_media')) score++;
  
  const finalScore = Math.round((score / total) * 100);
  console.log(`\n📊 RESULTADO TESTE 4: ${score}/${total} (${finalScore}%)`);
  
  return { score, total, percentage: finalScore };
}

// TESTE 5: Função calculate_price
async function teste5() {
  console.log('\n💰 === TESTE 5: FUNÇÃO CALCULATE_PRICE ===');
  
  await clearContext();
  
  let score = 0;
  let total = 0;
  
  // Primeiro buscar propriedades
  await testMessage('Quero ver apartamentos');
  
  // 5.1: Cálculo básico
  console.log('\n🧪 Teste 5.1: Cálculo Básico');
  const t1 = await testMessage('quanto custa para 3 noites de 15 a 18 de agosto?', ['calculate_price']);
  total++;
  if (t1.success && t1.data?.functionsExecuted?.includes('calculate_price')) score++;
  
  // 5.2: Período longo
  console.log('\n🧪 Teste 5.2: Período Longo');
  const t2 = await testMessage('e se for por uma semana?', ['calculate_price']);
  total++;
  if (t2.success && t2.data?.functionsExecuted?.includes('calculate_price')) score++;
  
  const finalScore = Math.round((score / total) * 100);
  console.log(`\n📊 RESULTADO TESTE 5: ${score}/${total} (${finalScore}%)`);
  
  return { score, total, percentage: finalScore };
}

// TESTE 6: Função register_client
async function teste6() {
  console.log('\n👤 === TESTE 6: FUNÇÃO REGISTER_CLIENT ===');
  
  await clearContext();
  
  let score = 0;
  let total = 0;
  
  // 6.1: Cadastro completo
  console.log('\n🧪 Teste 6.1: Cadastro Completo');
  const t1 = await testMessage('João Silva, 11987654321, 12345678901, joao@email.com', ['register_client']);
  total++;
  if (t1.success && t1.data?.functionsExecuted?.includes('register_client')) score++;
  
  // 6.2: Dados incompletos
  console.log('\n🧪 Teste 6.2: Dados Incompletos');
  const t2 = await testMessage('Maria Santos, 11999888777', ['cpf', 'documento']);
  total++;
  if (t2.success && t2.message.toLowerCase().includes('cpf')) score++;
  
  const finalScore = Math.round((score / total) * 100);
  console.log(`\n📊 RESULTADO TESTE 6: ${score}/${total} (${finalScore}%)`);
  
  return { score, total, percentage: finalScore };
}

// TESTE 8: Função create_reservation (Fluxo completo)
async function teste8() {
  console.log('\n🎯 === TESTE 8: FUNÇÃO CREATE_RESERVATION ===');
  
  await clearContext();
  
  let score = 0;
  let total = 0;
  
  console.log('\n🧪 Teste 8.1: Fluxo Completo de Reserva');
  
  // 1. Buscar propriedades
  await testMessage('quero alugar para 2 pessoas');
  
  // 2. Ver fotos
  await testMessage('quero ver fotos da primeira');
  
  // 3. Calcular preço
  await testMessage('quanto custa de 1 a 5 de agosto?');
  
  // 4. Cadastrar cliente
  await testMessage('João Silva, 11987654321, 12345678901');
  
  // 5. Confirmar reserva
  const t1 = await testMessage('quero confirmar a reserva', ['create_reservation']);
  total++;
  if (t1.success && t1.data?.functionsExecuted?.includes('create_reservation')) score++;
  
  const finalScore = Math.round((score / total) * 100);
  console.log(`\n📊 RESULTADO TESTE 8: ${score}/${total} (${finalScore}%)`);
  
  return { score, total, percentage: finalScore };
}

// TESTE 9: Recuperação de Contexto
async function teste9() {
  console.log('\n🔄 === TESTE 9: RECUPERAÇÃO DE CONTEXTO ===');
  
  await clearContext();
  
  let score = 0;
  let total = 0;
  
  // 9.1: Sessão longa
  console.log('\n🧪 Teste 9.1: Sessão Longa');
  await testMessage('oi, quero alugar para 3 pessoas');
  
  console.log('⏳ Aguardando 10 segundos...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  const t1 = await testMessage('qual era mesmo a primeira opção?', []);
  total++;
  if (t1.success && t1.message.length > 20) score++;
  
  // 9.2: Mudança de critério
  console.log('\n🧪 Teste 9.2: Mudança de Critério');
  const t2 = await testMessage('na verdade somos 4 pessoas', []);
  total++;
  if (t2.success) score++;
  
  const finalScore = Math.round((score / total) * 100);
  console.log(`\n📊 RESULTADO TESTE 9: ${score}/${total} (${finalScore}%)`);
  
  return { score, total, percentage: finalScore };
}

// TESTE 10: Tratamento de Erros
async function teste10() {
  console.log('\n🚨 === TESTE 10: TRATAMENTO DE ERROS ===');
  
  await clearContext();
  
  let score = 0;
  let total = 0;
  
  // 10.1: Entrada inválida
  console.log('\n🧪 Teste 10.1: Entrada Inválida');
  const t1 = await testMessage('asdfghjkl!@#$%', []);
  total++;
  if (t1.success && t1.message.length > 10) score++;
  
  // 10.2: Propriedade inexistente
  console.log('\n🧪 Teste 10.2: Propriedade Inexistente');
  const t2 = await testMessage('quero ver fotos da propriedade XYZ123', []);
  total++;
  if (t2.success) score++;
  
  const finalScore = Math.round((score / total) * 100);
  console.log(`\n📊 RESULTADO TESTE 10: ${score}/${total} (${finalScore}%)`);
  
  return { score, total, percentage: finalScore };
}

// EXECUTAR TODOS OS TESTES
async function executarTodosTestes() {
  console.log('🚀 INICIANDO BATERIA COMPLETA DE TESTES SOFIA V5');
  console.log('================================================');
  
  const resultados = {};
  let totalScore = 0;
  let totalTests = 0;
  
  try {
    // Executar testes
    resultados.teste1 = await teste1();
    resultados.teste2 = await teste2();
    resultados.teste3 = await teste3();
    resultados.teste4 = await teste4();
    resultados.teste5 = await teste5();
    resultados.teste6 = await teste6();
    resultados.teste8 = await teste8();
    resultados.teste9 = await teste9();
    resultados.teste10 = await teste10();
    
    // Calcular score geral
    Object.values(resultados).forEach(resultado => {
      if (resultado.score !== undefined) {
        totalScore += resultado.score;
        totalTests += resultado.total;
      }
    });
    
    const percentualGeral = Math.round((totalScore / totalTests) * 100);
    
    // Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL DOS TESTES SOFIA V5');
    console.log('='.repeat(60));
    
    Object.entries(resultados).forEach(([teste, resultado]) => {
      const status = resultado.percentage >= 80 ? '✅' : resultado.percentage >= 60 ? '⚠️' : '❌';
      console.log(`${status} ${teste.toUpperCase()}: ${resultado.score}/${resultado.total} (${resultado.percentage}%)`);
    });
    
    console.log('\n' + '-'.repeat(60));
    console.log(`🎯 SCORE GERAL: ${totalScore}/${totalTests} (${percentualGeral}%)`);
    
    if (percentualGeral >= 90) {
      console.log('🏆 SOFIA V5 ESTÁ PRONTA PARA PRODUÇÃO!');
    } else if (percentualGeral >= 80) {
      console.log('⚠️  SOFIA V5 PRECISA DE PEQUENOS AJUSTES');
    } else {
      console.log('❌ SOFIA V5 PRECISA DE CORREÇÕES IMPORTANTES');
    }
    
    // Salvar relatório
    const relatorio = {
      timestamp: new Date().toISOString(),
      scoreGeral: percentualGeral,
      totalScore,
      totalTests,
      resultados
    };
    
    fs.writeFileSync('sofia-test-results.json', JSON.stringify(relatorio, null, 2));
    console.log('\n📄 Relatório salvo em: sofia-test-results.json');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  executarTodosTestes().catch(console.error);
}

module.exports = {
  testMessage,
  clearContext,
  executarTodosTestes
};