#!/usr/bin/env node

/**
 * Script para enviar mensagem de teste diretamente para o processamento
 * Usage: node scripts/send-test-message.js
 */

// Importar os módulos necessários diretamente
async function sendTestMessage() {
  console.log('🧪 Enviando mensagem de teste diretamente ao sistema...\n');
  
  try {
    // Importar dinamicamente os módulos ES6
    const { whatsappSessionManager } = await import('../lib/whatsapp/session-manager.js');
    
    console.log('📱 Sessão WhatsApp carregada');
    
    // Simular uma mensagem recebida
    const testMessage = {
      key: {
        remoteJid: '5511888888888@s.whatsapp.net',
        id: 'test_' + Date.now(),
        fromMe: false
      },
      message: {
        conversation: 'Olá! Gostaria de saber sobre propriedades disponíveis.'
      },
      messageTimestamp: Math.floor(Date.now() / 1000)
    };
    
    console.log('📨 Processando mensagem:', testMessage.message.conversation);
    
    // Processar a mensagem diretamente
    await whatsappSessionManager.processIncomingMessage('default', testMessage);
    
    console.log('✅ Mensagem enviada para processamento!');
    console.log('\n⚠️  Verifique os logs do servidor para ver o processamento');
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar
sendTestMessage().catch(console.error);