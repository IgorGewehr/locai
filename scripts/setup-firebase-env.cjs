#!/usr/bin/env node

// Script para configurar Firebase a partir do arquivo JSON baixado
// Execute: node scripts/setup-firebase-env.cjs [caminho-para-service-account.json]

const fs = require('fs');
const path = require('path');

const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  console.error('❌ Erro: Forneça o caminho para o arquivo JSON do service account');
  console.log('\n📝 Uso: node scripts/setup-firebase-env.cjs [arquivo-service-account.json]');
  console.log('\n📖 Como obter o arquivo:');
  console.log('1. Acesse: https://console.firebase.google.com/');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá em ⚙️ Project Settings > Service Accounts');
  console.log('4. Clique em "Generate new private key"');
  console.log('5. Baixe o arquivo JSON');
  console.log('6. Execute este script com o caminho do arquivo');
  process.exit(1);
}

if (!fs.existsSync(jsonFilePath)) {
  console.error(`❌ Erro: Arquivo não encontrado: ${jsonFilePath}`);
  process.exit(1);
}

try {
  console.log('🔍 Lendo arquivo de credenciais...');
  const serviceAccount = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  
  // Validar campos obrigatórios
  const requiredFields = ['project_id', 'private_key', 'client_email'];
  for (const field of requiredFields) {
    if (!serviceAccount[field]) {
      console.error(`❌ Erro: Campo obrigatório ausente no JSON: ${field}`);
      process.exit(1);
    }
  }
  
  console.log('✅ Arquivo JSON válido encontrado!');
  console.log(`   Project ID: ${serviceAccount.project_id}`);
  console.log(`   Client Email: ${serviceAccount.client_email}`);
  
  // Gerar configurações para .env
  console.log('\n📝 Adicione essas linhas ao seu arquivo .env:');
  console.log('\n' + '='.repeat(60));
  console.log('# Firebase Admin (Server-side) - ATUALIZADO');
  console.log(`FIREBASE_PROJECT_ID=${serviceAccount.project_id}`);
  console.log(`FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`);
  
  // Escapar a chave privada corretamente
  const privateKeyEscaped = serviceAccount.private_key.replace(/\n/g, '\\n');
  console.log(`FIREBASE_PRIVATE_KEY="${privateKeyEscaped}"`);
  console.log('='.repeat(60));
  
  // Tentar escrever um arquivo .env.firebase
  const envContent = `# Firebase Admin (Server-side) - ATUALIZADO
FIREBASE_PROJECT_ID=${serviceAccount.project_id}
FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}
FIREBASE_PRIVATE_KEY="${privateKeyEscaped}"

# Frontend Firebase Config (copie também para seu .env principal)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${serviceAccount.project_id}
NEXT_PUBLIC_FIREBASE_API_KEY=[SUBSTITUA_PELA_SUA_API_KEY]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${serviceAccount.project_id}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${serviceAccount.project_id}.appspot.com
`;

  fs.writeFileSync('.env.firebase', envContent);
  console.log('\n💾 Arquivo .env.firebase criado com as configurações!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Copie as configurações acima para seu arquivo .env');
  console.log('2. Substitua NEXT_PUBLIC_FIREBASE_API_KEY pela sua API key do projeto');
  console.log('3. Execute: node scripts/check-firebase-config.cjs para verificar');
  
  // Teste básico
  console.log('\n🧪 Testando credenciais...');
  const admin = require('firebase-admin');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  
  console.log('✅ Credenciais testadas com sucesso!');
  
} catch (error) {
  console.error('❌ Erro ao processar o arquivo:', error.message);
  
  if (error.message.includes('Unexpected token')) {
    console.log('\n💡 Dica: Verifique se o arquivo JSON está bem formatado');
  }
  
  process.exit(1);
}