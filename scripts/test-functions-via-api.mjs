// Teste Individual de Funções via API
console.log('🧪 TESTE INDIVIDUAL DE FUNÇÕES VIA API');
console.log('======================================\n');

const API_URL = 'http://localhost:3000/api/test-functions';
let results = { passed: 0, failed: 0, errors: [] };

async function testFunction(functionName, args, description) {
  console.log(`📝 TESTANDO: ${functionName}`);
  console.log(`   Descrição: ${description}`);
  console.log(`   Args: ${JSON.stringify(args, null, 2)}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        functionName,
        args,
        tenantId: 'default-tenant'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Function execution failed');
    }
    
    console.log(`   ✅ SUCESSO (${data.executionTime}):`);
    console.log(`   - Function Success: ${data.result?.success || 'N/A'}`);
    console.log(`   - Message: ${(data.result?.message || '').substring(0, 80)}...`);
    
    if (data.result?.data) {
      console.log(`   - Data Type: ${typeof data.result.data}`);
      if (Array.isArray(data.result.data)) {
        console.log(`   - Array Length: ${data.result.data.length}`);
      } else if (typeof data.result.data === 'object') {
        console.log(`   - Object Keys: ${Object.keys(data.result.data).join(', ')}`);
      }
    }
    
    results.passed++;
    return data.result;
    
  } catch (error) {
    console.error(`   ❌ ERRO: ${error.message}`);
    results.failed++;
    results.errors.push({
      function: functionName,
      error: error.message
    });
    return null;
  }
  
  console.log('\n');
}

async function runTests() {
  console.log('🚀 Iniciando testes individuais...\n');
  
  // TESTE 1: search_properties básico
  await testFunction(
    'search_properties',
    { guests: 2 },
    'Busca básica de propriedades'
  );
  
  // TESTE 2: search_properties com filtros
  await testFunction(
    'search_properties',
    { 
      location: 'Florianópolis',
      bedrooms: 2,
      guests: 4,
      maxPrice: 3000
    },
    'Busca com filtros específicos'
  );
  
  // TESTE 3: get_property_details
  await testFunction(
    'get_property_details',
    { propertyId: 'demo_property_001' },
    'Detalhes de propriedade demo'
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
    'Cálculo de preço'
  );
  
  // TESTE 5: send_property_media
  await testFunction(
    'send_property_media',
    { propertyId: 'demo_property_001' },
    'Envio de mídia'
  );
  
  // TESTE 6: register_client
  await testFunction(
    'register_client',
    {
      name: 'João Teste API',
      phone: '5511888888888',
      email: 'joao.api@teste.com'
    },
    'Registro de cliente'
  );
  
  console.log('='.repeat(60));
  console.log('📊 RESULTADO DOS TESTES INDIVIDUAIS');
  console.log('='.repeat(60));
  console.log(`✅ Funções funcionando: ${results.passed}`);
  console.log(`❌ Funções com erro: ${results.failed}`);
  console.log(`📈 Taxa de sucesso: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERROS ENCONTRADOS:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.function}: ${error.error}`);
    });
  }
  
  console.log('\n🔧 CONCLUSÃO:');
  if (results.failed === 0) {
    console.log('🎉 PERFEITO! Todas as funções funcionam individualmente.');
    console.log('   O problema está na integração com OpenAI ou detecção de intenção.');
  } else if (results.failed <= 2) {
    console.log('⚠️  Poucas funções com problema. Maioria funciona corretamente.');
  } else {
    console.log('🚨 Várias funções com problemas. Necessária correção básica.');
  }
}

runTests().catch(console.error);