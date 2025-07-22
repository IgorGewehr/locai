import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const results: any = {
    success: true,
    tests_performed: [],
    timestamp: new Date().toISOString()
  };
  
  try {
    // 1. Testar conexão Firebase
    console.log('🧪 [FUNCTIONS DEBUG] Testando conexão Firebase...');
    try {
      const { propertyService } = await import('@/lib/services/property-service');
      const testProperties = await propertyService.getPropertiesByTenant('debug-test');
      
      results.tests_performed.push({
        test: 'firebase_connection',
        status: 'success ✅',
        result: `Conectado ao Firebase. Propriedades encontradas: ${testProperties.length}`,
        properties_sample: testProperties.slice(0, 2).map(p => ({
          id: p.id,
          name: p.name,
          location: p.location || p.city
        }))
      });
    } catch (error) {
      results.tests_performed.push({
        test: 'firebase_connection',
        status: 'error ❌',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // 2. Testar função de busca de propriedades
    console.log('🧪 [FUNCTIONS DEBUG] Testando searchProperties...');
    try {
      const { ProfessionalAgent } = await import('@/lib/ai-agent/professional-agent');
      const agent = ProfessionalAgent.getInstance();
      
      // Testar busca via método privado - vamos fazer diferente
      const searchResult = await agent.processMessage({
        message: 'Busco apartamento em florianópolis',
        clientPhone: '5511999999999',
        tenantId: 'debug-test',
        conversationHistory: []
      });
      
      results.tests_performed.push({
        test: 'search_properties_function',
        status: 'success ✅',
        result: searchResult,
        intent_detected: searchResult.intent,
        tokens_used: searchResult.tokensUsed
      });
    } catch (error) {
      results.tests_performed.push({
        test: 'search_properties_function',
        status: 'error ❌',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // 3. Testar detecção de intenções
    console.log('🧪 [FUNCTIONS DEBUG] Testando detecção de intenções...');
    try {
      const testMessages = [
        { msg: 'Olá', expected: 'greeting' },
        { msg: 'Quero alugar um apartamento', expected: 'search_properties' },
        { msg: 'Quanto custa?', expected: 'price_inquiry' },
        { msg: 'Quero reservar', expected: 'booking_intent' }
      ];
      
      const { ProfessionalAgent } = await import('@/lib/ai-agent/professional-agent');
      const agent = ProfessionalAgent.getInstance();
      
      const intentResults = [];
      for (const test of testMessages) {
        const response = await agent.processMessage({
          message: test.msg,
          clientPhone: '5511999999999',
          tenantId: 'debug-test',
          conversationHistory: []
        });
        
        intentResults.push({
          message: test.msg,
          expected_intent: test.expected,
          detected_intent: response.intent,
          correct: response.intent === test.expected,
          tokens_used: response.tokensUsed
        });
      }
      
      results.tests_performed.push({
        test: 'intent_detection',
        status: 'success ✅',
        results: intentResults,
        accuracy: intentResults.filter(r => r.correct).length / intentResults.length
      });
    } catch (error) {
      results.tests_performed.push({
        test: 'intent_detection',
        status: 'error ❌',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // 4. Testar cache
    console.log('🧪 [FUNCTIONS DEBUG] Testando cache...');
    try {
      const { ProfessionalAgent } = await import('@/lib/ai-agent/professional-agent');
      const agent = ProfessionalAgent.getInstance();
      
      // Primeira chamada
      const response1 = await agent.processMessage({
        message: 'Olá',
        clientPhone: '5511999999998',
        tenantId: 'debug-test',
        conversationHistory: []
      });
      
      // Segunda chamada idêntica (deve vir do cache)
      const response2 = await agent.processMessage({
        message: 'Olá',
        clientPhone: '5511999999997',
        tenantId: 'debug-test',
        conversationHistory: []
      });
      
      results.tests_performed.push({
        test: 'cache_system',
        status: 'success ✅',
        result: {
          first_call: { fromCache: response1.fromCache, tokensUsed: response1.tokensUsed },
          second_call: { fromCache: response2.fromCache, tokensUsed: response2.tokensUsed },
          cache_working: response2.fromCache && response1.tokensUsed === 0
        }
      });
    } catch (error) {
      results.tests_performed.push({
        test: 'cache_system',
        status: 'error ❌',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Summary
    const successfulTests = results.tests_performed.filter(t => t.status.includes('success')).length;
    const totalTests = results.tests_performed.length;
    
    results.summary = {
      total_tests: totalTests,
      successful_tests: successfulTests,
      success_rate: (successfulTests / totalTests) * 100,
      overall_status: successfulTests === totalTests ? 'ALL PASS ✅' : 'SOME FAILURES ⚠️'
    };
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('❌ [FUNCTIONS DEBUG] Erro geral nos testes:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      tests_performed: results.tests_performed
    }, { status: 500 });
  }
}