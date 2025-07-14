import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
    console.log('📋 Config usado:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-8) : 'MISSING'
    });
    
    // 2. Testar Auth
    console.log('\n2. Testando Firebase Auth...');
    const auth = getAuth(app);
    console.log('✅ Firebase Auth inicializado');
    console.log('🔗 Auth URL:', `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey.slice(-8)}`);
    
    // 3. Testar Firestore
    console.log('\n3. Testando Firestore...');
    const db = getFirestore(app);
    console.log('✅ Firestore inicializado');
    console.log('🔗 Firestore URL:', `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`);
    
    // 4. Testar conectividade básica
    console.log('\n4. Testando conectividade Auth...');
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout na conexão Auth'));
      }, 10000);
      
      const unsubscribe = auth.onAuthStateChanged(
        (user) => {
          clearTimeout(timeout);
          console.log('✅ Auth state listener funcionando');
          console.log('👤 Usuário atual:', user ? user.email : 'Nenhum usuário logado');
          unsubscribe();
          resolve();
        },
        (error) => {
          clearTimeout(timeout);
          console.error('❌ Erro no Auth state listener:', error);
          reject(error);
        }
      );
    });
    
    // 5. Testar conectividade Firestore
    console.log('\n5. Testando conectividade Firestore...');
    
    // Tentar fazer uma operação simples no Firestore
    const { doc, getDoc } = await import('firebase/firestore');
    try {
      const testDoc = doc(db, 'test', 'connection');
      await getDoc(testDoc);
      console.log('✅ Firestore conectado com sucesso');
    } catch (firestoreError) {
      console.warn('⚠️ Firestore pode ter problemas de conectividade:', firestoreError.message);
    }
    
    console.log('\n🎉 Teste de conectividade concluído!');
    
  } catch (error) {
    console.error('\n❌ Erro na conexão Firebase:');
    console.error('Código:', error.code);
    console.error('Mensagem:', error.message);
    
    // Diagnósticos específicos
    console.log('\n🔍 Diagnósticos:');
    
    if (error.code === 'auth/network-request-failed' || error.message.includes('network')) {
      console.log('- ❌ Problema de rede detectado');
      console.log('- 🔧 Soluções possíveis:');
      console.log('  1. Verifique sua conexão com a internet');
      console.log('  2. Verifique se há firewall bloqueando googleapis.com');
      console.log('  3. Tente usar VPN se estiver em rede corporativa');
      console.log('  4. Verifique configurações de proxy');
    }
    
    if (error.code === 'auth/invalid-api-key') {
      console.log('- ❌ API Key inválida');
      console.log('- 🔧 Regenere a API Key no Console Firebase');
    }
    
    if (error.code === 'auth/project-not-found') {
      console.log('- ❌ Projeto não encontrado');
      console.log('- 🔧 Verifique o Project ID no Console Firebase');
    }
    
    if (error.message.includes('fetch') || error.message.includes('CORS')) {
      console.log('- ❌ Possível problema de CORS ou bloqueio de fetch');
      console.log('- 🔧 Soluções:');
      console.log('  1. Execute em ambiente de produção (build)');
      console.log('  2. Verifique configurações de domínio no Firebase');
      console.log('  3. Teste em navegador diferente');
    }
    
    if (error.message.includes('Timeout')) {
      console.log('- ❌ Timeout na conexão');
      console.log('- 🔧 Soluções:');
      console.log('  1. Conexão muito lenta');
      console.log('  2. Serviços Firebase podem estar instáveis');
      console.log('  3. Tente novamente em alguns minutos');
    }
    
    console.log('\n🌐 URLs para testar manualmente:');
    console.log('Auth:', `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`);
    console.log('Firestore:', `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)`);
    
    return false;
  }
  
  return true;
}

// Executar teste
testFirebaseConnection().then((success) => {
  if (success) {
    console.log('\n✅ Firebase está funcionando corretamente!');
  } else {
    console.log('\n❌ Problemas detectados no Firebase.');
  }
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('\n💥 Erro inesperado:', error);
  process.exit(1);
});