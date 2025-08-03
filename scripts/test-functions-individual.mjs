// Teste Individual de Funções - Sofia V3
// Testa cada função do AgentFunctions diretamente

import { AgentFunctions } from '../lib/ai/agent-functions.js';

console.log('🧪 TESTE INDIVIDUAL DE FUNÇÕES - SOFIA V3');
console.log('==========================================\n');

const testTenant = "default-tenant"; 
let results = {
  passed: 0,
  failed: 0,
  errors: []
};

async function testFunction(functionName, args, description) {
  console.log(`📝 TESTANDO: ${functionName}`);
  console.log(`   Descrição: ${description}`);
  console.log(`   Args: ${JSON.stringify(args)}`);
  
  try {
    const result = await AgentFunctions.executeFunction(functionName, args, testTenant);
    
    console.log(`   ✅ SUCESSO:`);
    console.log(`   - Success: ${result.success || 'N/A'}`);
    console.log(`   - Message: ${(result.message || '').substring(0, 100)}...`);
    console.log(`   - Data keys: ${result.data ? Object.keys(result.data).join(', ') : 'None'}`);
    
    results.passed++;
    return result;
    
  } catch (error) {
    console.error(`   ❌ ERRO: ${error.message}`);
    console.error(`   Stack: ${error.stack?.split('\n')[1] || 'N/A'}`);
    
    results.failed++;
    results.errors.push({
      function: functionName,
      error: error.message,
      stack: error.stack?.split('\n')[1]
    });
    return null;
  }
  
  console.log('\n');
}

async function runIndividualTests() {
  console.log('🚀 Iniciando testes individuais das funções...\n');
  
  // TESTE 1: search_properties
  await testFunction(
    'search_properties',
    { location: 'Florianópolis', bedrooms: 2, guests: 4 },
    'Buscar propriedades com filtros'
  );
  
  // TESTE 2: search_properties simples
  await testFunction(
    'search_properties', 
    { guests: 2 },
    'Buscar propriedades sem filtros específicos'
  );
  
  // TESTE 3: get_property_details
  await testFunction(
    'get_property_details',
    { propertyId: 'demo_property_001' },
    'Obter detalhes de uma propriedade'
  );
  
  // TESTE 4: calculate_price
  await testFunction(
    'calculate_price',
    { 
      propertyId: 'demo_property_001',
      checkIn: '2025-12-15',
      checkOut: '2025-12-20',
      guests: 2
    },
    'Calcular preço para período específico'
  );
  
  // TESTE 5: send_property_media
  await testFunction(
    'send_property_media',
    { propertyId: 'demo_property_001' },
    'Enviar mídia da propriedade'
  );
  
  // TESTE 6: register_client
  await testFunction(
    'register_client',
    {
      name: 'João Silva Teste',
      phone: '5511999999999',
      email: 'joao.teste@email.com'
    },
    'Registrar novo cliente'
  );
  
  // TESTE 7: create_reservation
  await testFunction(
    'create_reservation',
    {
      propertyId: 'demo_property_001',
      checkIn: '2025-12-15', 
      checkOut: '2025-12-20',
      guestName: 'João Silva',
      guestPhone: '5511999999999',
      totalAmount: 1500
    },
    'Criar reserva completa'
  );
  
  // TESTE 8: schedule_visit
  await testFunction(
    'schedule_visit',
    {
      propertyId: 'demo_property_001',
      clientName: 'João Silva',
      clientPhone: '5511999999999',
      preferredDate: '2025-08-05',
      timePreference: 'morning'
    },
    'Agendar visita'
  );
  
  console.log('='.repeat(50));
  console.log('📊 RESULTADO DOS TESTES INDIVIDUAIS');
  console.log('='.repeat(50));
  console.log(`✅ Funções funcionando: ${results.passed}`);
  console.log(`❌ Funções com erro: ${results.failed}`);
  console.log(`📈 Taxa de sucesso: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERROS DETALHADOS:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.function}:`);
      console.log(`      Erro: ${error.error}`);
      console.log(`      Local: ${error.stack || 'N/A'}`);
    });
  }
  
  console.log('\n🔧 ANÁLISE:');
  if (results.failed === 0) {
    console.log('🎉 Todas as funções estão funcionando individualmente!');
    console.log('   O problema deve estar na integração com OpenAI ou detecção de intenção.');
  } else {
    console.log('🚨 Algumas funções têm problemas básicos que precisam ser corrigidos primeiro.');
  }
}

runIndividualTests().catch(console.error);