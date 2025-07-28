#!/usr/bin/env node

/**
 * Script para testar a geração de QR code do WhatsApp
 */

const { whatsappSessionManager } = require('../lib/whatsapp/session-manager');

async function testWhatsAppQR() {
  console.log('🧪 Testando geração de QR code do WhatsApp...\n');
  
  const tenantId = 'test-tenant';
  
  try {
    console.log('1️⃣ Inicializando sessão...');
    await whatsappSessionManager.initializeSession(tenantId);
    
    console.log('⏳ Aguardando geração do QR code...');
    
    // Listen for QR code generation
    whatsappSessionManager.on('qr', (tenant, qrCode) => {
      console.log(`🔲 QR Code gerado para tenant ${tenant}`);
      console.log(`📏 Tamanho do QR code: ${qrCode.length} caracteres`);
      console.log(`🔍 Tipo: ${qrCode.startsWith('data:') ? 'Data URL' : 'String bruta'}`);
      
      if (qrCode.startsWith('data:')) {
        console.log('✅ QR code em formato Data URL - correto!');
      } else {
        console.log('⚠️ QR code em formato string - será convertido');
      }
    });
    
    whatsappSessionManager.on('connected', (tenant, phoneNumber) => {
      console.log(`✅ WhatsApp conectado para tenant ${tenant}: ${phoneNumber}`);
      process.exit(0);
    });
    
    whatsappSessionManager.on('status', (tenant, status) => {
      console.log(`📊 Status atualizado para tenant ${tenant}: ${status}`);
    });
    
    // Wait for 30 seconds max
    setTimeout(async () => {
      console.log('\n⏰ Timeout atingido. Verificando status final...');
      
      const status = await whatsappSessionManager.getSessionStatus(tenantId);
      console.log('📈 Status final:');
      console.log(`  - Conectado: ${status.connected}`);
      console.log(`  - Status: ${status.status}`);
      console.log(`  - QR Code: ${status.qrCode ? 'Presente' : 'Ausente'}`);
      console.log(`  - Telefone: ${status.phoneNumber || 'N/A'}`);
      console.log(`  - Nome: ${status.businessName || 'N/A'}`);
      
      if (status.qrCode) {
        console.log('✅ QR Code foi gerado com sucesso!');
      } else {
        console.log('❌ QR Code não foi gerado');
      }
      
      // Cleanup
      await whatsappSessionManager.disconnectSession(tenantId);
      process.exit(status.qrCode ? 0 : 1);
    }, 30000);
    
  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Interrompido pelo usuário. Limpando sessões...');
  try {
    await whatsappSessionManager.disconnectSession('test-tenant');
  } catch (error) {
    console.error('Erro na limpeza:', error.message);
  }
  process.exit(0);
});

testWhatsAppQR();