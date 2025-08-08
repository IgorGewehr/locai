#!/usr/bin/env node

// Script para migrar dados de estrutura root para multi-tenant
// Execute: node scripts/migrate-to-multitenant.cjs

require('dotenv').config();
const admin = require('firebase-admin');

console.log('🔄 Iniciando migração para estrutura multi-tenant...\n');

async function migrateToMultiTenant() {
  try {
    // 1. Inicializar Firebase Admin
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

    const db = admin.firestore();
    const defaultTenantId = process.env.TENANT_ID || 'default-tenant';

    console.log(`📋 Configuração da migração:`);
    console.log(`   Tenant ID padrão: ${defaultTenantId}`);
    console.log(`   Projeto Firebase: ${process.env.FIREBASE_PROJECT_ID}\n`);

    // 2. Collections para migrar
    const collectionsToMigrate = [
      'properties',
      'clients', 
      'reservations',
      'conversations',
      'messages',
      'transactions',
      'payments',
      'goals'
    ];

    console.log('📦 Collections a serem migradas:');
    collectionsToMigrate.forEach(col => console.log(`   • ${col}`));
    console.log('');

    // 3. Migrar cada collection
    for (const collectionName of collectionsToMigrate) {
      await migrateCollection(db, collectionName, defaultTenantId);
    }

    console.log('\n🎉 Migração concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Verifique os dados migrados no Firebase Console');
    console.log('2. Teste a aplicação com a nova estrutura');
    console.log('3. Após confirmar que tudo funciona, remova collections antigas');
    console.log('4. Execute: node scripts/test-multitenant-structure.cjs');

  } catch (error) {
    console.error('\n❌ ERRO na migração:', error.message);
    process.exit(1);
  }
}

async function migrateCollection(db, collectionName, tenantId) {
  try {
    console.log(`\n🔄 Migrando collection: ${collectionName}`);
    
    // Ler documentos da collection root
    const rootCollection = await db.collection(collectionName).get();
    
    if (rootCollection.empty) {
      console.log(`   ⚠️  Collection ${collectionName} está vazia - pulando`);
      return;
    }

    console.log(`   📊 Encontrados ${rootCollection.size} documentos`);

    // Preparar batch para migração
    const batch = db.batch();
    let batchCount = 0;
    let migratedCount = 0;

    // Verificar se já existe na estrutura tenant
    const tenantCollectionRef = db.collection('tenants').doc(tenantId).collection(collectionName);
    
    for (const doc of rootCollection.docs) {
      const data = doc.data();
      
      // Adicionar tenantId aos dados se não existir
      if (!data.tenantId) {
        data.tenantId = tenantId;
      }
      
      // Adicionar à nova estrutura tenant
      const newDocRef = tenantCollectionRef.doc(doc.id);
      batch.set(newDocRef, data);
      
      batchCount++;
      migratedCount++;
      
      // Fazer commit do batch a cada 450 operações (limite do Firestore é 500)
      if (batchCount >= 450) {
        await batch.commit();
        console.log(`   ✅ Migrados ${migratedCount} documentos (batch)`);
        
        // Criar novo batch
        const newBatch = db.batch();
        batchCount = 0;
      }
    }

    // Commit final do batch se houver documentos restantes
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`   ✅ Collection ${collectionName} migrada: ${migratedCount} documentos`);
    console.log(`   📍 Nova localização: tenants/${tenantId}/${collectionName}`);

  } catch (error) {
    console.error(`   ❌ Erro ao migrar ${collectionName}:`, error.message);
    throw error;
  }
}

// Executar migração
migrateToMultiTenant();