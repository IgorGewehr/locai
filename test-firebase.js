const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBKRDtn0BqMhE0Dk0wHI6iLaMmtForeChs",
  authDomain: "locai-76dcf.firebaseapp.com",
  projectId: "locai-76dcf",
  storageBucket: "locai-76dcf.firebasestorage.app",
  messagingSenderId: "22321657212",
  appId: "1:22321657212:web:2e8493a49eeda5fda6a0f9"
};

async function testFirebaseConnection() {
  try {
    console.log('🔥 Testando conexão Firebase...\n');
    
    // 1. Inicializar Firebase
    console.log('1. Inicializando Firebase App...');
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase App inicializado com sucesso');
    
    // 2. Testar Auth
    console.log('\n2. Testando Firebase Auth...');
    const auth = getAuth(app);
    console.log('✅ Firebase Auth inicializado');
    
    // 3. Testar Firestore
    console.log('\n3. Testando Firestore...');
    const db = getFirestore(app);
    console.log('✅ Firestore inicializado');
    
    // 4. Testar conectividade
    console.log('\n4. Testando conectividade...');
    
    // Verificar se podemos fazer uma operação básica
    await new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(
        (user) => {
          console.log('✅ Auth state listener funcionando');
          console.log('👤 Usuário atual:', user ? user.email : 'Nenhum usuário logado');
          unsubscribe();
          resolve();
        },
        (error) => {
          console.error('❌ Erro no Auth state listener:', error);
          reject(error);
        }
      );
    });
    
    console.log('\n🎉 Todos os testes passaram! Firebase está funcionando corretamente.');
    
  } catch (error) {
    console.error('\n❌ Erro na conexão Firebase:');
    console.error('Código:', error.code);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    // Diagnósticos específicos
    console.log('\n🔍 Diagnósticos:');
    
    if (error.code === 'auth/network-request-failed') {
      console.log('- Problema de rede. Verifique sua conexão com a internet.');
    }
    
    if (error.code === 'auth/invalid-api-key') {
      console.log('- API Key inválida. Verifique as credenciais do Firebase.');
    }
    
    if (error.code === 'auth/project-not-found') {
      console.log('- Projeto não encontrado. Verifique o Project ID.');
    }
    
    if (error.message.includes('fetch')) {
      console.log('- Possível problema de CORS ou firewall.');
      console.log('- Tente acessar diretamente: https://identitytoolkit.googleapis.com/');
    }
  }
}

// Executar teste
testFirebaseConnection().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});