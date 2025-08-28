#!/usr/bin/env node

/**
 * Script para migrar propriedades existentes e adicionar o campo location concatenado
 * Usage: node scripts/migrate-location-field.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'locai-agente-firebase-adminsdk.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Arquivo de service account não encontrado:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://locai-agente.firebaseio.com'
});

const db = admin.firestore();

/**
 * Gera campo de location concatenado
 */
function generateLocationField(property) {
  const locationParts = [
    property.address,
    property.neighborhood,
    property.city,
    property.title,
    property.description
  ]
    .filter(Boolean)
    .map(part => String(part).trim().toLowerCase())
    .filter(part => part && part.length > 0);
  
  return locationParts.join(' ');
}

/**
 * Migrar propriedades de um tenant
 */
async function migratePropertiesForTenant(tenantId) {
  console.log(`\n🔄 Migrando propriedades do tenant: ${tenantId}`);
  
  const propertiesRef = db.collection(`tenants/${tenantId}/properties`);
  const snapshot = await propertiesRef.get();
  
  if (snapshot.empty) {
    console.log(`ℹ️ Nenhuma propriedade encontrada para o tenant ${tenantId}`);
    return { migrated: 0, errors: 0 };
  }
  
  const batch = db.batch();
  let migrated = 0;
  let errors = 0;
  let skipped = 0;
  
  snapshot.forEach((doc) => {
    const property = doc.data();
    
    // Verificar se já tem o campo location
    if (property.location) {
      console.log(`⏭️ Propriedade ${doc.id} já possui campo location, pulando...`);
      skipped++;
      return;
    }
    
    try {
      const locationField = generateLocationField(property);
      
      if (locationField.length > 0) {
        batch.update(doc.ref, { 
          location: locationField,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Propriedade ${doc.id} (${property.title}) - Location: "${locationField.substring(0, 80)}..."`);
        migrated++;
      } else {
        console.log(`⚠️ Propriedade ${doc.id} não possui dados suficientes para gerar location`);
        errors++;
      }
    } catch (error) {
      console.error(`❌ Erro ao processar propriedade ${doc.id}:`, error.message);
      errors++;
    }
  });
  
  if (migrated > 0) {
    await batch.commit();
    console.log(`✅ Batch commit realizado para ${migrated} propriedades`);
  }
  
  return { migrated, errors, skipped };
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando migração do campo location para propriedades...\n');
  
  try {
    // Buscar todos os tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    
    if (tenantsSnapshot.empty) {
      console.log('❌ Nenhum tenant encontrado');
      return;
    }
    
    let totalMigrated = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    
    console.log(`📊 Encontrados ${tenantsSnapshot.size} tenants`);
    
    // Processar cada tenant
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const result = await migratePropertiesForTenant(tenantId);
      
      totalMigrated += result.migrated;
      totalErrors += result.errors;
      totalSkipped += result.skipped;
    }
    
    // Resultado final
    console.log('\n📊 RESULTADO FINAL:');
    console.log(`✅ Propriedades migradas: ${totalMigrated}`);
    console.log(`⏭️ Propriedades puladas: ${totalSkipped}`);
    console.log(`❌ Erros: ${totalErrors}`);
    console.log('\n🎉 Migração concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    process.exit(0);
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error);
}