#!/usr/bin/env node

/**
 * Script para testar o agente WhatsApp
 * Usage: node scripts/test-whatsapp-agent.js
 */

const fetch = require('node-fetch');

// Simular uma mensagem do WhatsApp
const testMessage = {
  entry: [{
    id: 'default-tenant',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '5511999999999',
          phone_number_id: 'default-tenant',
        },
        messages: [{
          from: '5511888888888',
          id: 'test_msg_' + Date.now(),
          timestamp: String(Math.floor(Date.now() / 1000)),
          text: {
            body: 'Olá! Gostaria de ver propriedades disponíveis para o próximo final de semana.'
          },
          type: 'text',
        }],
      },
    }],
  }],
};

async function testAgent() {
  console.log('🧪 Testando o agente WhatsApp...\n');
  
  try {
    // 1. Verificar se o servidor está rodando
    console.log('1️⃣ Verificando servidor...');
    const healthCheck = await fetch('http://localhost:3001/api/health').catch(() => null);
    
    if (!healthCheck || !healthCheck.ok) {
      console.error('❌ Servidor não está respondendo. Certifique-se de que está rodando com npm run dev');
      return;
    }
    console.log('✅ Servidor respondendo\n');

    // 2. Enviar mensagem simulada para o webhook
    console.log('2️⃣ Enviando mensagem de teste para o agente...');
    console.log('Mensagem:', testMessage.entry[0].changes[0].value.messages[0].text.body);
    
    const response = await fetch('http://localhost:3001/api/webhook/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    console.log('Status da resposta:', response.status);
    
    if (response.ok) {
      console.log('✅ Mensagem processada com sucesso!');
      
      // Aguardar um pouco para ver os logs
      console.log('\n⏳ Aguardando processamento... Verifique os logs do servidor.');
      
      // Verificar conversas
      setTimeout(async () => {
        console.log('\n3️⃣ Verificando conversas criadas...');
        
        // Você precisaria de autenticação aqui, mas isso é só um exemplo
        const convResponse = await fetch('http://localhost:3001/api/conversations', {
          headers: {
            // Adicione headers de autenticação se necessário
          }
        }).catch(() => null);
        
        if (convResponse && convResponse.ok) {
          const conversations = await convResponse.json();
          console.log(`📊 Total de conversas: ${conversations.length}`);
        }
      }, 3000);
      
    } else {
      const error = await response.text();
      console.error('❌ Erro ao processar mensagem:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Dicas de debug
console.log('💡 Dicas de debug:');
console.log('1. Verifique se o arquivo .env tem OPENAI_API_KEY configurado');
console.log('2. Verifique os logs do servidor para mensagens detalhadas');
console.log('3. Certifique-se de que a sessão WhatsApp está conectada');
console.log('4. Use o comando: tail -f para acompanhar os logs em tempo real\n');

// Executar teste
testAgent();