// scripts/create-firebase-indexes.js
// Script para criar os índices necessários no Firebase

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createIndexes() {
  console.log('🔧 Criando índices do Firebase...\n');

  console.log('Para criar os índices necessários, acesse os seguintes links no Firebase Console:\n');

  // Índice para conversation_messages
  console.log('1. Índice para conversation_messages (histórico de mensagens):');
  console.log('   https://console.firebase.google.com/v1/r/project/locai-76dcf/firestore/indexes?create_composite=Cllwcm9qZWN0cy9sb2NhaS03NmRjZi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvY29udmVyc2F0aW9uX21lc3NhZ2VzL2luZGV4ZXMvXxABGhIKDmNvbnZlcnNhdGlvbklkEAEaDQoJdGltZXN0YW1wEAIaDAoIX19uYW1lX18QAg\n');

  console.log('2. Índice para mini_site_analytics:');
  console.log('   https://console.firebase.google.com/v1/r/project/locai-76dcf/firestore/indexes?create_composite=Cldwcm9qZWN0cy9sb2NhaS03NmRjZi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvbWluaV9zaXRlX2FuYWx5dGljcy9pbmRleGVzL18QARoMCgh0ZW5hbnRJZBABGggKBGRhdGUQAhoMCghfX25hbWVfXxAC\n');

  console.log('Alternativamente, você pode criar os índices manualmente no Firebase Console:');
  console.log('\n📋 Índice 1 - conversation_messages:');
  console.log('   - Collection ID: conversation_messages');
  console.log('   - Fields:');
  console.log('     • conversationId (Ascending)');
  console.log('     • timestamp (Descending)');
  console.log('   - Query scope: Collection');

  console.log('\n📋 Índice 2 - mini_site_analytics:');
  console.log('   - Collection ID: mini_site_analytics');
  console.log('   - Fields:');
  console.log('     • tenantId (Ascending)');
  console.log('     • date (Ascending)');
  console.log('   - Query scope: Collection');

  console.log('\n✅ Após criar os índices, aguarde alguns minutos para que sejam processados.');
  console.log('📌 Os índices são essenciais para o funcionamento correto das queries do sistema.');
}

createIndexes().catch(console.error);