require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Ler a chave privada do arquivo .env
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!privateKey) {
  console.error('❌ FIREBASE_PRIVATE_KEY não encontrada no .env');
  console.error('Por favor, verifique se o arquivo .env existe e contém FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

// Inicializar o admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'locai-76dcf',
      clientEmail: 'firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com',
      privateKey: privateKey
    }),
    storageBucket: 'locai-76dcf.firebasestorage.app'
  });
}

async function applyCors() {
  console.log('🔧 Configurando CORS para Firebase Storage...');
  
  try {
    const { Storage } = require('@google-cloud/storage');
    
    // Criar cliente Storage com credenciais do admin
    const storage = new Storage({
      projectId: 'locai-76dcf',
      credentials: {
        client_email: 'firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com',
        private_key: privateKey
      }
    });

    const bucket = storage.bucket('locai-76dcf.firebasestorage.app');
    
    // Configuração CORS
    const corsConfiguration = [{
      origin: ['*'], // Permite todas as origens para desenvolvimento
      method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
      responseHeader: [
        'Content-Type',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers', 
        'Access-Control-Allow-Methods',
        'Access-Control-Max-Age',
        'Access-Control-Allow-Credentials',
        'x-goog-content-length-range',
        'x-goog-resumable'
      ],
      maxAgeSeconds: 3600
    }];

    await bucket.setCorsConfiguration(corsConfiguration);
    
    console.log('✅ CORS configurado com sucesso!');
    console.log('');
    console.log('📝 Configuração aplicada:');
    console.log(JSON.stringify(corsConfiguration, null, 2));
    console.log('');
    console.log('🚀 Agora você pode:');
    console.log('1. Limpar o cache do navegador (Ctrl+Shift+Delete)');
    console.log('2. Reiniciar o servidor (npm run dev)');
    console.log('3. Testar o upload em http://localhost:3000/test-storage');
    
  } catch (error) {
    console.error('❌ Erro ao configurar CORS:', error.message);
    console.error('');
    console.error('Detalhes do erro:', error);
    
    if (error.message.includes('Could not load the default credentials')) {
      console.error('');
      console.error('⚠️  Você precisa configurar as credenciais.');
      console.error('Use o método com gcloud CLI ou crie um arquivo firebase-key.json');
    }
  }
}

applyCors();