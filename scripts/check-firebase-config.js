#!/usr/bin/env node
// Script para verificar configuração do Firebase

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔥 Firebase Configuration Diagnostic');
console.log('=====================================\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

console.log('📁 Environment File Check:');
console.log(`  .env file exists: ${envExists ? '✅' : '❌'}`);

if (!envExists) {
  console.log('\n❌ .env file not found! Please copy .env.example to .env and configure it.');
  process.exit(1);
}

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

console.log('\n🔐 Firebase Environment Variables:');

const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL', 
  'FIREBASE_PRIVATE_KEY',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
];

const optionalVars = [
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

let allGood = true;

// Check required variables
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const exists = !!value;
  const status = exists ? '✅' : '❌';
  
  console.log(`  ${status} ${varName}: ${exists ? 'SET' : 'MISSING'}`);
  
  if (!exists) {
    allGood = false;
  } else if (varName === 'FIREBASE_PRIVATE_KEY') {
    // Validate private key format
    const hasBegin = value.includes('-----BEGIN PRIVATE KEY-----');
    const hasEnd = value.includes('-----END PRIVATE KEY-----');
    
    if (!hasBegin || !hasEnd) {
      console.log(`    ⚠️  Invalid format! Must contain BEGIN and END markers`);
      allGood = false;
    } else {
      console.log(`    ✅ Valid private key format`);
    }
  } else if (varName === 'FIREBASE_CLIENT_EMAIL') {
    // Validate email format
    const isValidEmail = value.includes('@') && value.includes('.iam.gserviceaccount.com');
    if (!isValidEmail) {
      console.log(`    ⚠️  Should be a service account email ending with .iam.gserviceaccount.com`);
    } else {
      console.log(`    ✅ Valid service account email format`);
    }
  }
});

console.log('\n🌐 Public Firebase Variables (Optional):');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const exists = !!value;
  const status = exists ? '✅' : '⚠️ ';
  
  console.log(`  ${status} ${varName}: ${exists ? 'SET' : 'NOT SET'}`);
});

async function testFirebaseInit() {
  console.log('\n📊 Summary:');
  if (allGood) {
    console.log('✅ All required Firebase variables are configured correctly!');
    console.log('\n🧪 Testing Firebase Admin initialization...');
    
    try {
      // Try to initialize Firebase Admin
      const { initializeApp, getApps, cert } = await import('firebase-admin/app');
      
      if (getApps().length === 0) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
          projectId: process.env.FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
        
        console.log('✅ Firebase Admin initialized successfully in test!');
      }
      
    } catch (error) {
      console.log('❌ Firebase Admin test failed:');
      console.log(`   Error: ${error.message}`);
      console.log('\n🔍 Common issues:');
      console.log('   - Private key format is incorrect (missing quotes or newlines)');
      console.log('   - Service account email is wrong');
      console.log('   - Project ID mismatch');
      console.log('   - Storage bucket name is incorrect');
      allGood = false;
    }
  } else {
    console.log('❌ Firebase configuration has issues. Please fix the missing/invalid variables.');
    console.log('\n📋 To fix:');
    console.log('   1. Copy .env.example to .env');
    console.log('   2. Get your Firebase service account key from:');
    console.log('      https://console.firebase.google.com/project/YOUR_PROJECT/settings/serviceaccounts/adminsdk');
    console.log('   3. Fill in all the required variables');
    console.log('   4. Make sure FIREBASE_PRIVATE_KEY is wrapped in quotes');
  }

  console.log('\n' + '='.repeat(50));
  process.exit(allGood ? 0 : 1);
}

testFirebaseInit();