#!/usr/bin/env node

// Script para sincronizar projeto Firebase no .env
// Execute: node scripts/sync-firebase-project.cjs

require('dotenv').config();
const fs = require('fs');

console.log('🔄 Sincronizando projeto Firebase...\n');

console.log('📊 Estado atual:');
console.log(`   .env NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
console.log(`   .env FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID}`);
console.log('   Arquivo JSON: locai-76dcf');

console.log('\n🤔 Você precisa escolher qual projeto usar:');
console.log('\n1️⃣ OPÇÃO 1 - Usar projeto do arquivo JSON (locai-76dcf):');
console.log('   • Já temos as credenciais corretas');
console.log('   • Precisa atualizar outras configurações no .env');

console.log('\n2️⃣ OPÇÃO 2 - Usar projeto original (locai-c5e8a):');
console.log('   • Precisa baixar novo arquivo JSON deste projeto');
console.log('   • Manter configurações atuais do .env');

console.log('\n🎯 RECOMENDAÇÃO: Use o projeto do arquivo JSON (locai-76dcf)');
console.log('   Motivo: Já temos credenciais válidas e testadas');

console.log('\n📝 Para aplicar OPÇÃO 1 (recomendada):');
console.log('   1. Substitua no seu .env:');
console.log('      NEXT_PUBLIC_FIREBASE_PROJECT_ID=locai-76dcf');
console.log('      FIREBASE_PROJECT_ID=locai-76dcf');
console.log('      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=locai-76dcf.firebaseapp.com');
console.log('      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=locai-76dcf.appspot.com');

// Ler configurações do .env.firebase gerado
if (fs.existsSync('.env.firebase')) {
  console.log('\n   2. Substitua também:');
  const firebaseEnv = fs.readFileSync('.env.firebase', 'utf8');
  const privateKeyMatch = firebaseEnv.match(/FIREBASE_PRIVATE_KEY="([^"]+)"/);
  const clientEmailMatch = firebaseEnv.match(/FIREBASE_CLIENT_EMAIL=([^\n]+)/);
  
  if (clientEmailMatch) {
    console.log(`      FIREBASE_CLIENT_EMAIL=${clientEmailMatch[1]}`);
  }
  
  if (privateKeyMatch) {
    console.log('      FIREBASE_PRIVATE_KEY="[CHAVE_DO_ARQUIVO_.env.firebase]"');
  }
}

console.log('\n   3. Execute: node scripts/check-firebase-config.cjs');

console.log('\n📋 Para aplicar OPÇÃO 2:');
console.log('   1. Acesse: https://console.firebase.google.com/');
console.log('   2. Selecione projeto: locai-c5e8a');
console.log('   3. Baixe novo arquivo JSON');
console.log('   4. Execute: node scripts/setup-firebase-env.cjs [novo-arquivo.json]');

console.log('\n' + '='.repeat(60));