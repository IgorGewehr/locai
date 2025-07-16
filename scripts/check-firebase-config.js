#!/usr/bin/env node

/**
 * Script para verificar configurações do Firebase
 * Usage: node scripts/check-firebase-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuração do Firebase...\n');

// Check .env file
const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');

let envContent = '';
if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');
  console.log('✅ Arquivo .env.local encontrado');
} else if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Arquivo .env encontrado');
} else {
  console.error('❌ Nenhum arquivo .env ou .env.local encontrado!');
  process.exit(1);
}

// Check required Firebase variables
const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

console.log('\n📋 Verificando variáveis necessárias:\n');

const missingVars = [];
const foundVars = {};

requiredVars.forEach(varName => {
  const regex = new RegExp(`^${varName}=(.*)$`, 'm');
  const match = envContent.match(regex);
  
  if (match && match[1] && match[1].trim()) {
    foundVars[varName] = match[1].trim();
    console.log(`✅ ${varName}: configurado`);
    
    // Special checks
    if (varName === 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') {
      if (!match[1].includes('.appspot.com')) {
        console.log(`   ⚠️  Formato esperado: seu-projeto.appspot.com`);
      }
    }
  } else {
    missingVars.push(varName);
    console.log(`❌ ${varName}: NÃO ENCONTRADO`);
  }
});

// Check storage bucket format
if (foundVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
  console.log('\n🪣 Storage Bucket:', foundVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
}

// Summary
console.log('\n📊 Resumo:');
console.log(`- Variáveis configuradas: ${Object.keys(foundVars).length}/${requiredVars.length}`);

if (missingVars.length > 0) {
  console.log('\n⚠️  AÇÃO NECESSÁRIA:');
  console.log('Adicione as seguintes variáveis ao seu arquivo .env ou .env.local:');
  missingVars.forEach(v => {
    console.log(`${v}=seu-valor-aqui`);
  });
}

// Check Firebase Storage Rules reminder
console.log('\n🔐 Lembrete sobre regras do Storage:');
console.log('1. Acesse: https://console.firebase.google.com/project/' + (foundVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'SEU-PROJETO') + '/storage/rules');
console.log('2. Para testes, use regras permissivas:');
console.log(`
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
`);

// CORS configuration reminder
console.log('\n🌐 Configuração CORS:');
console.log('Se você receber erros de CORS, crie um arquivo cors.json:');
console.log(`
[
  {
    "origin": ["http://localhost:3000", "http://localhost:3001"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["*"]
  }
]
`);
console.log('E aplique com: gsutil cors set cors.json gs://' + (foundVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'SEU-BUCKET'));

console.log('\n✨ Verificação concluída!');