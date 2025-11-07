// Script para verificar tickets no Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

// Configuração do Firebase (use suas credenciais)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD4q88t5MwkQH7iQx7YJLs0V9pcqU0FGIg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mini-site-alugazap.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mini-site-alugazap",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mini-site-alugazap.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "945695171299",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:945695171299:web:5e95f61b88c4f37cac4e35"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTickets() {
  const userId = 'U11UvXr67vWnDtDpDaaJDTuEcxo2';
  console.log(`\n🔍 Buscando tickets para usuário: ${userId}\n`);
  
  // 1. Verificar tickets na raiz
  console.log('📁 Verificando coleção /tickets (raiz)...');
  try {
    const rootTickets = await getDocs(collection(db, 'tickets'));
    console.log(`   Total de tickets na raiz: ${rootTickets.docs.length}`);
    
    let foundInRoot = false;
    rootTickets.docs.forEach(doc => {
      const data = doc.data();
      if (data.userId === userId) {
        console.log(`   ✅ Ticket encontrado!`);
        console.log(`      ID: ${doc.id}`);
        console.log(`      Subject: ${data.subject}`);
        console.log(`      Status: ${data.status}`);
        console.log(`      TenantId: ${data.tenantId || 'não especificado'}`);
        foundInRoot = true;
      }
    });
    
    if (!foundInRoot) {
      console.log(`   ❌ Nenhum ticket encontrado para este usuário na raiz`);
    }
  } catch (error) {
    console.log(`   ⚠️ Erro ao buscar na raiz: ${error.message}`);
  }
  
  // 2. Verificar todos os tenants
  console.log('\n📁 Verificando tenants...');
  try {
    const tenants = await getDocs(collection(db, 'tenants'));
    console.log(`   Total de tenants: ${tenants.docs.length}`);
    
    for (const tenantDoc of tenants.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      console.log(`\n   🏢 Tenant: ${tenantId} (${tenantData.name || tenantData.companyName || 'sem nome'})`);
      
      try {
        const tenantTickets = await getDocs(collection(db, `tenants/${tenantId}/tickets`));
        console.log(`      Total de tickets: ${tenantTickets.docs.length}`);
        
        let foundInTenant = false;
        tenantTickets.docs.forEach(doc => {
          const data = doc.data();
          if (data.userId === userId) {
            console.log(`      ✅ Ticket encontrado!`);
            console.log(`         ID: ${doc.id}`);
            console.log(`         Subject: ${data.subject}`);
            console.log(`         Status: ${data.status}`);
            foundInTenant = true;
          }
        });
        
        if (!foundInTenant && tenantTickets.docs.length > 0) {
          console.log(`      ❌ Nenhum ticket deste usuário neste tenant`);
        }
      } catch (error) {
        console.log(`      ⚠️ Erro ao buscar tickets: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`   ⚠️ Erro ao buscar tenants: ${error.message}`);
  }
  
  // 3. Verificar informações do usuário
  console.log('\n👤 Verificando informações do usuário...');
  try {
    const { doc, getDoc } = require('firebase/firestore');
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log(`   ✅ Usuário encontrado na coleção /users`);
      console.log(`      Email: ${userData.email}`);
      console.log(`      Nome: ${userData.name || userData.displayName || 'não especificado'}`);
      console.log(`      TenantId: ${userData.tenantId || 'não especificado'}`);
      console.log(`      Plano: ${userData.free === 7 ? 'Free' : 'Pro'}`);
    } else {
      console.log(`   ❌ Usuário não encontrado na coleção /users`);
    }
  } catch (error) {
    console.log(`   ⚠️ Erro ao buscar usuário: ${error.message}`);
  }
  
  console.log('\n✅ Verificação concluída!\n');
  process.exit(0);
}

checkTickets().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});