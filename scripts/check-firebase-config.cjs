#!/usr/bin/env node

// Script para verificar configuração do Firebase
// Execute: node scripts/check-firebase-config.cjs

const path = require('path');
const fs = require('fs');

// Carregar .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('🔍 Verificando configuração do Firebase...\n');

// Verificar variáveis obrigatórias
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL', 
  'FIREBASE_PRIVATE_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_API_KEY'
];

let hasErrors = false;

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (!value) {
    console.error(`❌ ${envVar}: AUSENTE`);
    hasErrors = true;
  } else if (envVar === 'FIREBASE_PRIVATE_KEY') {
    // Verificar se é uma chave válida
    if (value.includes('Example/Key') || value.length < 100) {
      console.error(`❌ ${envVar}: INVÁLIDA (muito curta ou contém exemplo)`);
      console.log(`   Tamanho atual: ${value.length} caracteres`);
      hasErrors = true;
    } else if (!value.includes('BEGIN PRIVATE KEY') || !value.includes('END PRIVATE KEY')) {
      console.error(`❌ ${envVar}: FORMATO INVÁLIDO (deve ter BEGIN/END markers)`);
      hasErrors = true;
    } else {
      console.log(`✅ ${envVar}: OK (${value.length} caracteres)`);
    }
  } else {
    console.log(`✅ ${envVar}: OK`);
  }
});

console.log('\n🔐 Detalhes das credenciais:');
console.log(`Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
console.log(`Client Email: ${process.env.FIREBASE_CLIENT_EMAIL}`);
console.log(`Private Key Preview: ${process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50)}...`);

if (hasErrors) {
  console.log('\n❌ ERROS ENCONTRADOS!');
  console.log('\n📝 Para corrigir:');
  console.log('1. Acesse o Firebase Console: https://console.firebase.google.com/');
  console.log('2. Vá em Project Settings > Service Accounts');
  console.log('3. Clique em "Generate new private key"');
  console.log('4. Baixe o arquivo JSON');
  console.log('5. Use o script helper: node scripts/setup-firebase-env.cjs [arquivo.json]');
} else {
  console.log('\n✅ Configuração parece estar OK!');
  console.log('\nTestando conexão...');
  
  // Teste de conexão simples
  try {
    const admin = require('firebase-admin');
    
    if (admin.apps.length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
    
    console.log('✅ Firebase Admin inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar com Firebase:', error.message);
  }
}

console.log('\n' + '='.repeat(60));