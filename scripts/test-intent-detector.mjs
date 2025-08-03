// Teste rápido do IntentDetector após correções
import { IntentDetector } from '../lib/ai-agent/intent-detector.js';

console.log('🧪 Testando IntentDetector após correções...\n');

try {
  // Teste básico de detecção
  const testMessage = "localização não é importante, gostariamos apenas de um local com ar-condicionado e wi-fi ao menos";
  const testPhone = "5511999999999";
  const testTenant = "default-tenant";
  
  console.log('📝 Testando detecção de intenção...');
  console.log('Mensagem:', testMessage);
  
  const intent = IntentDetector.detectIntent(testMessage, testPhone, testTenant);
  
  if (intent) {
    console.log('✅ Intenção detectada:');
    console.log('- Função:', intent.function);
    console.log('- Confiança:', intent.confidence);
    console.log('- Força execução:', intent.shouldForceExecution);
    console.log('- Razão:', intent.reason);
  } else {
    console.log('ℹ️ Nenhuma intenção forçada detectada (ok para esta mensagem)');
  }
  
  console.log('\n✅ Teste concluído sem erros!');
} catch (error) {
  console.error('❌ Erro no teste:', error.message);
  console.error('Stack:', error.stack);
}