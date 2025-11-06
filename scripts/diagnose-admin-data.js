// scripts/diagnose-admin-data.js
// Script para diagnosticar problemas de dados no painel admin

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = require(path.join(process.cwd(), 'serviceAccountKey.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin inicializado');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function diagnoseAdminData() {
  console.log('\n🔍 DIAGNÓSTICO DO PAINEL DE ADMIN\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar collection users
    console.log('\n1️⃣  Verificando collection users/...');
    const usersSnapshot = await db.collection('users').limit(5).get();
    console.log(`   ✅ Encontrados ${usersSnapshot.size} usuários (mostrando 5 primeiros)`);

    if (usersSnapshot.empty) {
      console.log('   ⚠️  PROBLEMA: Nenhum usuário encontrado!');
    } else {
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${doc.id}: ${data.email || 'sem email'} (idog: ${data.idog || false})`);
      });
    }

    // 2. Verificar collection tenants
    console.log('\n2️⃣  Verificando collection tenants/...');
    const tenantsSnapshot = await db.collection('tenants').limit(5).get();
    console.log(`   ✅ Encontrados ${tenantsSnapshot.size} tenants (mostrando 5 primeiros)`);

    if (tenantsSnapshot.empty) {
      console.log('   ⚠️  PROBLEMA: Nenhum tenant encontrado!');
    } else {
      for (const doc of tenantsSnapshot.docs) {
        const tenantId = doc.id;
        console.log(`   - Tenant: ${tenantId}`);

        // Verificar sub-collections do tenant
        const collections = ['properties', 'reservations', 'clients', 'tickets', 'conversations'];

        for (const collectionName of collections) {
          const snapshot = await db.collection(`tenants/${tenantId}/${collectionName}`).limit(1).get();
          console.log(`     • ${collectionName}: ${snapshot.size} documentos`);
        }
      }
    }

    // 3. Verificar tickets em todos os tenants
    console.log('\n3️⃣  Verificando tickets em todos os tenants...');
    let totalTickets = 0;
    const allTenants = await db.collection('tenants').get();

    for (const tenantDoc of allTenants.docs) {
      const ticketsSnapshot = await db.collection(`tenants/${tenantDoc.id}/tickets`).get();
      if (ticketsSnapshot.size > 0) {
        totalTickets += ticketsSnapshot.size;
        console.log(`   - ${tenantDoc.id}: ${ticketsSnapshot.size} tickets`);
      }
    }

    console.log(`   ✅ Total de tickets: ${totalTickets}`);
    if (totalTickets === 0) {
      console.log('   ⚠️  PROBLEMA: Nenhum ticket encontrado em nenhum tenant!');
    }

    // 4. Verificar índices necessários
    console.log('\n4️⃣  Verificando se há erros de índices...');
    console.log('   ℹ️  Tentando query que requer índice...');

    try {
      // Query que pode precisar de índice
      const testQuery = await db.collection('users')
        .where('idog', '==', true)
        .limit(1)
        .get();
      console.log('   ✅ Query com filtro funcionou');
    } catch (error) {
      if (error.code === 9) { // FAILED_PRECONDITION
        console.log('   ❌ PROBLEMA: Índice necessário!');
        console.log('   📝 Link para criar índice:', error.message);
      } else {
        console.log('   ⚠️  Erro na query:', error.message);
      }
    }

    // 5. Verificar permissões do Firebase Admin
    console.log('\n5️⃣  Verificando permissões...');
    try {
      const testDoc = await db.collection('users').limit(1).get();
      console.log('   ✅ Permissões de leitura OK');
    } catch (error) {
      console.log('   ❌ PROBLEMA: Sem permissão de leitura!');
      console.log('   Erro:', error.message);
    }

    // 6. Testar API do admin
    console.log('\n6️⃣  Testando APIs do admin...');
    console.log('   ℹ️  Você deve testar manualmente:');
    console.log('   - http://localhost:8080/api/admin/users-enhanced');
    console.log('   - http://localhost:8080/api/admin/all-tickets');
    console.log('   - http://localhost:8080/api/admin/verify');

    // 7. Verificar variáveis de ambiente
    console.log('\n7️⃣  Verificando variáveis de ambiente...');
    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    ];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`   ✅ ${envVar}: definida`);
      } else {
        console.log(`   ❌ ${envVar}: NÃO DEFINIDA`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DIAGNÓSTICO COMPLETO\n');

    // Recomendações
    console.log('📋 RECOMENDAÇÕES:');

    if (usersSnapshot.empty) {
      console.log('   1. Criar usuários de teste no Firebase');
    }

    if (totalTickets === 0) {
      console.log('   2. Criar tickets de teste nos tenants');
    }

    console.log('   3. Verificar se você está logado como admin (idog: true)');
    console.log('   4. Verificar console do browser para erros de permissão');
    console.log('   5. Verificar Network tab para ver status das requests');

  } catch (error) {
    console.error('\n❌ ERRO NO DIAGNÓSTICO:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar diagnóstico
diagnoseAdminData()
  .then(() => {
    console.log('\n✅ Diagnóstico finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
