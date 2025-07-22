// Teste simples do singleton ProfessionalAgent
// Para testar: node test-singleton.js

const { ProfessionalAgent } = require('./lib/ai-agent/professional-agent.ts');

async function testSingleton() {
  console.log('🧪 Testando padrão Singleton do ProfessionalAgent...\n');
  
  try {
    // Primeiro, criar duas instâncias
    console.log('1. Criando primeira instância...');
    const agent1 = ProfessionalAgent.getInstance();
    console.log('   ✅ Primeira instância criada');
    
    console.log('2. Criando segunda instância...');
    const agent2 = ProfessionalAgent.getInstance();
    console.log('   ✅ Segunda instância obtida');
    
    // Verificar se são a mesma instância
    console.log('\n3. Verificando se são a mesma instância...');
    const sameInstance = agent1 === agent2;
    console.log(`   ${sameInstance ? '✅' : '❌'} Mesmo objeto? ${sameInstance}`);
    
    // Testar processamento de mensagem para verificar contexto
    console.log('\n4. Testando processamento de mensagens...');
    
    console.log('   📱 Primeira mensagem: "Olá, quero alugar em Florianópolis"');
    const response1 = await agent1.processMessage({
      message: 'Olá, quero alugar em Florianópolis',
      clientPhone: '5511999999999',
      tenantId: 'test',
      conversationHistory: []
    });
    
    console.log(`   📤 Resposta 1: Intent=${response1.intent}, Tokens=${response1.tokensUsed}`);
    
    // Verificar stats após primeira mensagem
    const stats1 = agent1.getAgentStats();
    console.log(`   📊 Conversas ativas após msg 1: ${stats1.activeConversations}`);
    
    console.log('\n   📱 Segunda mensagem: "Quero ver opções"');
    const response2 = await agent2.processMessage({
      message: 'Quero ver opções',
      clientPhone: '5511999999999',
      tenantId: 'test',
      conversationHistory: []
    });
    
    console.log(`   📤 Resposta 2: Intent=${response2.intent}, Tokens=${response2.tokensUsed}`);
    
    // Verificar stats após segunda mensagem
    const stats2 = agent2.getAgentStats();
    console.log(`   📊 Conversas ativas após msg 2: ${stats2.activeConversations}`);
    
    console.log('\n5. Resultado do teste:');
    if (sameInstance && stats1.activeConversations > 0 && stats2.activeConversations > 0) {
      console.log('   ✅ SINGLETON FUNCIONANDO CORRETAMENTE');
      console.log('   ✅ CONTEXTO SENDO MANTIDO ENTRE MENSAGENS');
    } else {
      console.log('   ❌ PROBLEMA DETECTADO NO SINGLETON');
      console.log(`   - Mesma instância: ${sameInstance}`);
      console.log(`   - Contexto preservado: ${stats1.activeConversations > 0 && stats2.activeConversations > 0}`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Executar teste
testSingleton();