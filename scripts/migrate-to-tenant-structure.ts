/**
 * Migration script to move data from flat structure to tenant-based structure
 * Run this once to migrate existing data
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize admin SDK
const app = initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();

// Collections to migrate
const COLLECTIONS_TO_MIGRATE = [
  'properties',
  'clients',
  'reservations',
  'conversations',
  'messages',
  'transactions',
  'payments',
  'goals',
  'leads',
  'tasks',
  'automations',
  'mini_site_analytics',
  'mini_site_inquiries',
];

async function migrateCollection(collectionName: string) {
  console.log(`\n🔄 Migrating collection: ${collectionName}`);
  
  try {
    // Get all documents from the old collection
    const oldCollection = await db.collection(collectionName).get();
    console.log(`📊 Found ${oldCollection.size} documents to migrate`);

    if (oldCollection.empty) {
      console.log('✅ No documents to migrate');
      return;
    }

    // Group documents by tenantId
    const documentsByTenant = new Map<string, any[]>();
    
    oldCollection.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      const tenantId = data.tenantId || data.userId || 'default-tenant';
      
      if (!documentsByTenant.has(tenantId)) {
        documentsByTenant.set(tenantId, []);
      }
      
      documentsByTenant.get(tenantId)!.push(data);
    });

    console.log(`👥 Found ${documentsByTenant.size} different tenants`);

    // Migrate each tenant's data
    for (const [tenantId, documents] of documentsByTenant) {
      console.log(`\n  📁 Migrating ${documents.length} documents for tenant: ${tenantId}`);
      
      const batch = db.batch();
      let batchCount = 0;
      
      for (const doc of documents) {
        const { id, ...data } = doc;
        
        // Create reference in new structure
        const newDocRef = db
          .collection('tenants')
          .doc(tenantId)
          .collection(collectionName)
          .doc(id);
        
        // Set the document
        batch.set(newDocRef, {
          ...data,
          migratedAt: new Date(),
        });
        
        batchCount++;
        
        // Firestore has a limit of 500 operations per batch
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`  ✅ Committed batch of ${batchCount} documents`);
          batchCount = 0;
        }
      }
      
      // Commit remaining documents
      if (batchCount > 0) {
        await batch.commit();
        console.log(`  ✅ Committed final batch of ${batchCount} documents`);
      }
    }
    
    console.log(`✅ Successfully migrated collection: ${collectionName}`);
    
  } catch (error) {
    console.error(`❌ Error migrating collection ${collectionName}:`, error);
  }
}

async function createTenantMetadata() {
  console.log('\n🔄 Creating tenant metadata...');
  
  try {
    // Get all unique tenant IDs
    const tenantIds = new Set<string>();
    
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      const collection = await db.collection(collectionName).get();
      collection.forEach(doc => {
        const data = doc.data();
        const tenantId = data.tenantId || data.userId || 'default-tenant';
        tenantIds.add(tenantId);
      });
    }
    
    console.log(`📊 Found ${tenantIds.size} unique tenants`);
    
    // Create metadata for each tenant
    for (const tenantId of tenantIds) {
      const tenantRef = db.collection('tenants').doc(tenantId);
      const tenantDoc = await tenantRef.get();
      
      if (!tenantDoc.exists) {
        await tenantRef.set({
          id: tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
          plan: 'free',
          status: 'active',
          metadata: {
            migrated: true,
            migratedAt: new Date(),
          }
        });
        console.log(`✅ Created metadata for tenant: ${tenantId}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating tenant metadata:', error);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  for (const collectionName of COLLECTIONS_TO_MIGRATE) {
    const oldCount = (await db.collection(collectionName).get()).size;
    
    let newCount = 0;
    const tenants = await db.collection('tenants').get();
    
    for (const tenant of tenants.docs) {
      const tenantCollection = await db
        .collection('tenants')
        .doc(tenant.id)
        .collection(collectionName)
        .get();
      newCount += tenantCollection.size;
    }
    
    console.log(`${collectionName}: Old=${oldCount}, New=${newCount} ${oldCount === newCount ? '✅' : '❌'}`);
  }
}

async function main() {
  console.log('🚀 Starting migration to tenant-based structure...\n');
  
  try {
    // Create tenant metadata first
    await createTenantMetadata();
    
    // Migrate each collection
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      await migrateCollection(collectionName);
    }
    
    // Verify migration
    await verifyMigration();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  IMPORTANT: After verifying the migration:');
    console.log('1. Update all your code to use the new tenant-based structure');
    console.log('2. Test thoroughly in development');
    console.log('3. Only then, delete the old collections');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();