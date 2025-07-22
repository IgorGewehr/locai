/**
 * Firebase Migration Script
 * Moves data from flat structure to tenant-based subcollections
 * 
 * Usage: node scripts/migrate-firebase-structure.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🚀 Starting Firebase Migration Script...\n');

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();

// Collections to migrate
const COLLECTIONS = [
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
  'mini_site_analytics',
  'mini_site_inquiries'
];

async function getAllTenantIds() {
  console.log('🔍 Discovering tenant IDs...');
  
  const tenantIds = new Set();
  
  // Check properties for tenant IDs
  try {
    const propertiesSnapshot = await db.collection('properties').get();
    propertiesSnapshot.forEach(doc => {
      const data = doc.data();
      const tenantId = data.tenantId || data.userId || 'default-tenant';
      tenantIds.add(tenantId);
    });
  } catch (error) {
    console.log('  No properties collection found');
  }

  // Check settings for tenant IDs (these are already in the right structure)
  try {
    const settingsSnapshot = await db.collection('settings').get();
    settingsSnapshot.forEach(doc => {
      tenantIds.add(doc.id); // Document ID is the tenant ID
    });
  } catch (error) {
    console.log('  No settings collection found');
  }

  console.log(`📊 Found ${tenantIds.size} unique tenants: ${Array.from(tenantIds).join(', ')}\n`);
  return Array.from(tenantIds);
}

async function migrateCollection(collectionName, tenantIds) {
  console.log(`\n📁 Migrating: ${collectionName}`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`  ⚪ No documents found in ${collectionName}`);
      return;
    }

    console.log(`  📊 Found ${snapshot.size} documents`);

    // Group documents by tenant
    const documentsByTenant = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      let tenantId = data.tenantId || data.userId;
      
      // If no tenantId found, try to assign to first tenant
      if (!tenantId && tenantIds.length > 0) {
        tenantId = tenantIds[0];
        console.log(`  ⚠️  Document ${doc.id} has no tenantId, assigning to ${tenantId}`);
      }
      
      if (!tenantId) {
        tenantId = 'default-tenant';
        console.log(`  ⚠️  Document ${doc.id} assigned to default-tenant`);
      }

      if (!documentsByTenant[tenantId]) {
        documentsByTenant[tenantId] = [];
      }
      
      documentsByTenant[tenantId].push({
        id: doc.id,
        data: data
      });
    });

    // Migrate each tenant's documents
    for (const [tenantId, documents] of Object.entries(documentsByTenant)) {
      console.log(`  🔄 Migrating ${documents.length} documents for tenant: ${tenantId}`);
      
      const batch = db.batch();
      let operations = 0;

      for (const doc of documents) {
        const newDocRef = db
          .collection('tenants')
          .doc(tenantId)
          .collection(collectionName)
          .doc(doc.id);

        batch.set(newDocRef, {
          ...doc.data,
          tenantId, // Ensure tenantId is set
          migratedAt: new Date(),
          migrationVersion: '1.0'
        });

        operations++;

        // Firestore batch limit is 500
        if (operations >= 450) {
          await batch.commit();
          console.log(`    ✅ Committed batch of ${operations} documents`);
          operations = 0;
        }
      }

      // Commit remaining operations
      if (operations > 0) {
        await batch.commit();
        console.log(`    ✅ Committed final batch of ${operations} documents`);
      }
    }

    console.log(`  ✅ Successfully migrated ${collectionName}`);

  } catch (error) {
    console.error(`  ❌ Error migrating ${collectionName}:`, error.message);
  }
}

async function createTenantDocuments(tenantIds) {
  console.log('\n👥 Creating tenant documents...');
  
  const batch = db.batch();
  
  for (const tenantId of tenantIds) {
    const tenantRef = db.collection('tenants').doc(tenantId);
    
    // Check if already exists
    const existing = await tenantRef.get();
    if (existing.exists) {
      console.log(`  ⚪ Tenant ${tenantId} already exists`);
      continue;
    }
    
    batch.set(tenantRef, {
      id: tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: 'free',
      status: 'active',
      metadata: {
        migrated: true,
        migratedAt: new Date(),
        migrationVersion: '1.0'
      }
    });
    
    console.log(`  ✅ Created tenant document: ${tenantId}`);
  }
  
  await batch.commit();
}

async function verifyMigration(tenantIds) {
  console.log('\n🔍 Verifying migration...\n');
  
  let totalSuccess = true;
  
  for (const collection of COLLECTIONS) {
    let oldCount = 0;
    let newCount = 0;
    
    // Count old documents
    try {
      const oldSnapshot = await db.collection(collection).get();
      oldCount = oldSnapshot.size;
    } catch (error) {
      // Collection might not exist
    }
    
    // Count new documents
    for (const tenantId of tenantIds) {
      try {
        const newSnapshot = await db
          .collection('tenants')
          .doc(tenantId)
          .collection(collection)
          .get();
        newCount += newSnapshot.size;
      } catch (error) {
        // Subcollection might not exist
      }
    }
    
    const status = oldCount === newCount ? '✅' : '❌';
    console.log(`  ${status} ${collection.padEnd(20)} Old: ${oldCount.toString().padStart(3)}, New: ${newCount.toString().padStart(3)}`);
    
    if (oldCount !== newCount) {
      totalSuccess = false;
    }
  }
  
  return totalSuccess;
}

async function main() {
  try {
    console.log('🔧 Firebase Migration Starting...\n');
    
    // Step 1: Discover all tenant IDs
    const tenantIds = await getAllTenantIds();
    
    if (tenantIds.length === 0) {
      console.log('❌ No tenant IDs found! Cannot proceed with migration.');
      process.exit(1);
    }
    
    // Step 2: Create tenant documents
    await createTenantDocuments(tenantIds);
    
    // Step 3: Migrate each collection
    for (const collection of COLLECTIONS) {
      await migrateCollection(collection, tenantIds);
    }
    
    // Step 4: Verify migration
    const success = await verifyMigration(tenantIds);
    
    if (success) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📋 Next Steps:');
      console.log('1. Test the application with the new structure');
      console.log('2. Update all code to use tenant-based services');
      console.log('3. After thorough testing, you can delete the old flat collections');
      console.log('\n⚠️  IMPORTANT: Keep backups until you are 100% sure everything works!');
    } else {
      console.log('\n❌ Migration completed with errors. Please check the verification results above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
main();