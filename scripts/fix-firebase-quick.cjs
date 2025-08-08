#!/usr/bin/env node

// Script rápido para corrigir Firebase sem arquivo JSON
// Execute: node scripts/fix-firebase-quick.cjs

console.log('🔥 Firebase Quick Fix - Sem arquivo JSON\n');

console.log('🎯 SOLUÇÃO RÁPIDA:');
console.log('\n1️⃣ Baixe o arquivo de credenciais:');
console.log('   • Acesse: https://console.firebase.google.com/');
console.log('   • Selecione projeto: locai-c5e8a');
console.log('   • Vá em ⚙️ Project Settings > Service Accounts');
console.log('   • Clique em "Generate new private key"');
console.log('   • Baixe o arquivo JSON na pasta do projeto');

console.log('\n2️⃣ Configure as regras do Firestore (IMPORTANTE):');
console.log('   • Acesse: https://console.firebase.google.com/');
console.log('   • Vá em Firestore Database > Rules');
console.log('   • Substitua por:');
console.log('');
console.log('   rules_version = \'2\';');
console.log('   service cloud.firestore {');
console.log('     match /databases/{database}/documents {');
console.log('       match /{document=**} {');
console.log('         allow read, write: if true;');
console.log('       }');
console.log('     }');
console.log('   }');
console.log('');
console.log('   • Clique em "Publish"');

console.log('\n3️⃣ Ou use configuração manual no .env:');
console.log('   Substitua esta linha no seu .env:');
console.log('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQ...[CHAVE_COMPLETA]...\\n-----END PRIVATE KEY-----\\n"');

console.log('\n4️⃣ Teste a configuração:');
console.log('   node scripts/check-firebase-config.cjs');

console.log('\n🚨 ATENÇÃO:');
console.log('   Sua chave atual contém "Example/Key" que é inválida.');
console.log('   Você DEVE baixar uma nova chave do Firebase Console.');

console.log('\n📁 Arquivos disponíveis no diretório atual:');
const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.includes('firebase') || f.endsWith('.json'));
if (files.length > 0) {
  files.forEach(file => console.log(`   • ${file}`));
} else {
  console.log('   (Nenhum arquivo Firebase encontrado)');
}

console.log('\n' + '='.repeat(60));