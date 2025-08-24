// Script completo de teste da Sofia com execução de funções
// Executar com: npx tsx scripts/test-sofia-complete.ts

import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function testSofiaAgent() {
  console.log('🤖 Teste Completo da Sofia Agent\n');
  console.log('=====================================\n');
  
  try {
    // Importar a Sofia Agent
    const { sofiaAgent } = await import('../lib/ai-agent/sofia-agent');
    
    // Configurar dados de teste
    const testMessage = {
      message: 'Olá! Preciso de um apartamento para 4 pessoas do dia 15 ao 20 de janeiro',
      clientPhone: '11999999999',
      tenantId: process.env.DEFAULT_TENANT_ID || 'test-tenant',
      metadata: {
        source: 'test' as const,
        priority: 'normal' as const
      }
    };
    
    console.log('📨 Mensagem de teste:', testMessage.message);
    console.log('🏢 Tenant ID:', testMessage.tenantId);
    console.log('\n⏳ Processando com Sofia...\n');
    
    // Processar mensagem
    const result = await sofiaAgent.processMessage(testMessage);
    
    console.log('✅ Resposta processada!\n');
    console.log('📝 Resposta da Sofia:');
    console.log('-----------------------------------');
    console.log(result.reply);
    console.log('-----------------------------------\n');
    
    console.log('📊 Detalhes da execução:');
    console.log(`   ⏱️  Tempo de resposta: ${result.responseTime}ms`);
    console.log(`   🪙 Tokens usados: ${result.tokensUsed}`);
    console.log(`   🔧 Funções executadas: ${result.functionsExecuted.length}`);
    
    if (result.functionsExecuted.length > 0) {
      console.log('\n🎯 Funções executadas:');
      result.functionsExecuted.forEach((func, idx) => {
        console.log(`   ${idx + 1}. ${func}`);
      });
    }
    
    if (result.actions && result.actions.length > 0) {
      console.log('\n📋 Resultados das ações:');
      result.actions.forEach((action: any, idx: number) => {
        console.log(`\n   ${idx + 1}. ${action.type}:`);
        if (action.result) {
          if (action.result.success) {
            console.log(`      ✅ Sucesso`);
            if (action.result.properties) {
              console.log(`      📦 Propriedades encontradas: ${action.result.properties.length}`);
              if (action.result.properties.length > 0) {
                const prop = action.result.properties[0];
                console.log(`      🏠 Primeira: ${prop.name}`);
                console.log(`         📍 Local: ${prop.location}`);
                console.log(`         💰 Preço: R$ ${prop.basePrice}/noite`);
              }
            }
          } else {
            console.log(`      ❌ Erro: ${action.result.error || action.result.message}`);
          }
        }
      });
    }
    
    console.log('\n🧠 Metadados:');
    console.log(`   Stage: ${result.metadata.stage}`);
    console.log(`   Confidence: ${(result.metadata.confidence * 100).toFixed(1)}%`);
    console.log(`   Enhanced Detection: ${result.metadata.enhancedDetection ? 'Sim' : 'Não'}`);
    
    if (result.summary) {
      console.log('\n📊 Summary Intelligence:');
      console.log(`   Stage: ${result.summary.conversationState?.stage}`);
      console.log(`   Sentiment: ${result.summary.conversationState?.sentiment}`);
      console.log(`   Next Action: ${result.summary.nextBestAction?.action}`);
    }
    
  } catch (error: any) {
    console.error('❌ Erro no teste:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

// Teste 2: Verificar se há propriedades no banco
async function checkDatabaseProperties() {
  console.log('\n\n🗄️  Verificando propriedades no banco de dados\n');
  console.log('=====================================\n');
  
  try {
    const { searchProperties } = await import('../lib/ai/tenant-aware-agent-functions');
    
    const tenantId = process.env.DEFAULT_TENANT_ID || 'test-tenant';
    const result = await searchProperties({}, tenantId);
    
    if (result.success) {
      console.log(`✅ Busca executada com sucesso`);
      console.log(`   Total de propriedades: ${result.properties?.length || 0}`);
      
      if (result.properties && result.properties.length > 0) {
        console.log('\n   Propriedades disponíveis:');
        result.properties.slice(0, 3).forEach((prop: any, idx: number) => {
          console.log(`\n   ${idx + 1}. ${prop.name}`);
          console.log(`      ID: ${prop.id}`);
          console.log(`      Quartos: ${prop.bedrooms}`);
          console.log(`      Máx. Hóspedes: ${prop.maxGuests}`);
          console.log(`      Preço base: R$ ${prop.basePrice}`);
        });
      } else {
        console.log('\n⚠️  ATENÇÃO: Nenhuma propriedade cadastrada no banco!');
        console.log('   Isso explica por que a Sofia não consegue mostrar opções.');
        console.log('   Cadastre propriedades em: /dashboard/properties');
      }
    } else {
      console.log(`❌ Erro na busca: ${result.error || result.message}`);
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar banco:', error.message);
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('====================================');
  console.log('🚀 TESTE COMPLETO DO SISTEMA SOFIA');
  console.log('====================================\n');
  
  console.log('🔐 Configuração:');
  console.log(`   OpenAI API: ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`);
  console.log(`   Tenant ID: ${process.env.DEFAULT_TENANT_ID}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  
  await testSofiaAgent();
  await checkDatabaseProperties();
  
  console.log('\n====================================');
  console.log('✅ TESTES CONCLUÍDOS');
  console.log('====================================\n');
  
  console.log('💡 Próximos passos:');
  console.log('   1. Se não há propriedades, cadastre em /dashboard/properties');
  console.log('   2. Teste via interface em /dashboard/teste');
  console.log('   3. Verifique logs do servidor para mais detalhes');
}

// Executar
runAllTests().catch(console.error);