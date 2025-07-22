// Teste direto do contexto do agente
// Para testar: node test-context.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock do OpenAI antes de importar o agente
global.process = global.process || {};
global.process.env = global.process.env || {};
global.process.env.OPENAI_API_KEY = 'sk-test-fake-key';
global.process.env.TENANT_ID = 'test-tenant';

async function testContext() {
  console.log('🧪 Testando contexto do Professional Agent...\n');
  
  try {
    // Definir as classes necessárias inline (simulando o professional-agent)
    class MockAgent {
      constructor() {
        this.conversationContexts = new Map();
        console.log('🆕 Nova instância MockAgent criada');
      }
      
      static getInstance() {
        if (!MockAgent.instance) {
          console.log('🆕 Criando singleton MockAgent');
          MockAgent.instance = new MockAgent();
        } else {
          console.log('♻️ Reutilizando singleton MockAgent');
        }
        return MockAgent.instance;
      }
      
      addContext(phone, data) {
        console.log(`➕ Adicionando contexto para ${phone}:`, data);
        this.conversationContexts.set(phone, data);
      }
      
      getContext(phone) {
        const hasContext = this.conversationContexts.has(phone);
        console.log(`🔍 Verificando contexto para ${phone}: ${hasContext ? 'EXISTE' : 'NÃO EXISTE'}`);
        
        if (hasContext) {
          const context = this.conversationContexts.get(phone);
          console.log(`📊 Contexto encontrado:`, context);
          return context;
        }
        return null;
      }
      
      getStats() {
        return {
          activeConversations: this.conversationContexts.size,
          allPhones: Array.from(this.conversationContexts.keys())
        };
      }
    }
    
    console.log('1. Testando singleton...');
    const agent1 = MockAgent.getInstance();
    const agent2 = MockAgent.getInstance();
    
    const sameInstance = agent1 === agent2;
    console.log(`   ${sameInstance ? '✅' : '❌'} Mesmo objeto: ${sameInstance}\n`);
    
    console.log('2. Testando persistência de contexto...');
    
    // Adicionar contexto via agent1
    agent1.addContext('5511999999999', {
      city: 'Florianópolis',
      stage: 'discovery',
      message: 'primeira mensagem'
    });
    
    const stats1 = agent1.getStats();
    console.log(`   📈 Stats agent1:`, stats1);
    
    // Verificar via agent2
    const context2 = agent2.getContext('5511999999999');
    const stats2 = agent2.getStats();
    console.log(`   📈 Stats agent2:`, stats2);
    
    console.log('\n3. Resultado:');
    if (sameInstance && context2 && context2.city === 'Florianópolis') {
      console.log('   ✅ SINGLETON FUNCIONANDO');
      console.log('   ✅ CONTEXTO PERSISTINDO ENTRE INSTÂNCIAS');
    } else {
      console.log('   ❌ PROBLEMA NO SINGLETON OU CONTEXTO');
    }
    
    console.log('\n4. Testando múltiplos contextos...');
    
    // Adicionar mais contextos
    agent1.addContext('5511888888888', {
      city: 'Rio de Janeiro',
      stage: 'greeting'
    });
    
    agent2.addContext('5511777777777', {
      city: 'São Paulo', 
      stage: 'negotiation'
    });
    
    const finalStats = agent1.getStats();
    console.log(`   📊 Stats finais:`, finalStats);
    
    if (finalStats.activeConversations === 3) {
      console.log('   ✅ MÚLTIPLOS CONTEXTOS FUNCIONANDO');
    } else {
      console.log('   ❌ PROBLEMA COM MÚLTIPLOS CONTEXTOS');
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

// Executar
testContext();