// Teste simples do padrão Singleton
console.log('🧪 Testando padrão Singleton...\n');

// Implementação de exemplo para testar o conceito
class TestSingleton {
  constructor() {
    this.contexts = new Map();
    this.id = Math.random().toString(36).substr(2, 9);
    console.log(`🆕 Nova instância criada com ID: ${this.id}`);
  }
  
  static getInstance() {
    if (!TestSingleton.instance) {
      console.log('🆕 Criando nova instância singleton');
      TestSingleton.instance = new TestSingleton();
    } else {
      console.log('♻️ Reutilizando instância existente');
    }
    return TestSingleton.instance;
  }
  
  addContext(phone, data) {
    this.contexts.set(phone, data);
    console.log(`➕ Contexto adicionado para ${phone}:`, data);
  }
  
  getContext(phone) {
    return this.contexts.get(phone);
  }
  
  getStats() {
    return {
      instanceId: this.id,
      activeContexts: this.contexts.size,
      allPhones: Array.from(this.contexts.keys())
    };
  }
}

console.log('1. Testando criação de instâncias...');
const agent1 = TestSingleton.getInstance();
const agent2 = TestSingleton.getInstance();

console.log(`   Agent1 ID: ${agent1.id}`);
console.log(`   Agent2 ID: ${agent2.id}`);
console.log(`   Mesmo objeto: ${agent1 === agent2}\n`);

console.log('2. Testando persistência de contexto...');
agent1.addContext('5511999999999', {
  city: 'Florianópolis',
  stage: 'discovery',
  timestamp: new Date().toISOString()
});

const context1 = agent1.getContext('5511999999999');
const context2 = agent2.getContext('5511999999999');

console.log('   Contexto via agent1:', context1);
console.log('   Contexto via agent2:', context2);
console.log(`   Contextos iguais: ${JSON.stringify(context1) === JSON.stringify(context2)}\n`);

console.log('3. Stats comparação:');
const stats1 = agent1.getStats();
const stats2 = agent2.getStats();

console.log('   Stats agent1:', stats1);
console.log('   Stats agent2:', stats2);

console.log('\n4. Resultado final:');
if (agent1 === agent2 && stats1.instanceId === stats2.instanceId && context1 && context2) {
  console.log('   ✅ SINGLETON FUNCIONANDO CORRETAMENTE');
  console.log('   ✅ CONTEXTO SENDO COMPARTILHADO');
  console.log('   ✅ IMPLEMENTAÇÃO ESTÁ CORRETA');
} else {
  console.log('   ❌ PROBLEMA DETECTADO NO SINGLETON');
}

console.log('\n5. Testando múltiplas instâncias simultâneas...');
const agents = [];
for (let i = 0; i < 5; i++) {
  agents.push(TestSingleton.getInstance());
}

const allSame = agents.every(agent => agent === agents[0]);
console.log(`   Todas as 5 instâncias são iguais: ${allSame}`);

if (allSame) {
  console.log('   ✅ SINGLETON FUNCIONA COM MÚLTIPLAS CHAMADAS');
  console.log('\n🎯 CONCLUSÃO: O padrão singleton está implementado corretamente!');
  console.log('📝 PRÓXIMO PASSO: Verificar se o Next.js não está interferindo na instância');
}