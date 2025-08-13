/**
 * Migration script to move data from flat structure to tenant-based structure
 * Run this once to migrate existing data
 */

// @ts-nocheck - script file, suppress all type checking
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Hardcoded Firebase credentials
const FIREBASE_PROJECT_ID = 'locai-76dcf';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDASTbJp3VRgZpl\ntr2uvLkwpcR5sVmIQA33ziSCktN1tjTAfjLROFvoh4LfJs3Vv6h4qgXvpXpCW8vH\nyCJlDIkzKlPkm/3RuDshdnzHRKpNDRmee3VCcyS3KNJCO2Jwjcl6bSA0IJis6nJa\nLArB/rgh1KclZcHZtN5wur9GDzHiXGdaaSOSO2Jnl8UPTb0Hrbf0ZVXGX2mWRwOx\nTnJGnmNXzmrDHgWmEZlqu8PYmOTSNJZO6Ra+wCXqX25QjR9Do1ICdymBnSl7i/Hw\nxgL+I0kovYkrN+qm2BbQRsy4eaTxn+K+6DOhlbBTEhuZr/uaUUpEHDCorXg+btnk\nW7l476WpAgMBAAECggEAGrDO+xTUkxjDXsUL9Vpa9ma8LAwzGleR2MjzhnBtC9Tb\n47Bgy2vgThmpT+JqBfaRoxYutsIog1eMpNGh/JbN4J1KgdwpUlgZVR7GWT6tyP49\nhSMr9qpW+VmgPfNSSb9UrTrCkpnHt5DfiKa+Y4lA8+k5vlYun1Kc4db6P/ZR/VKK\nqJY0J4C2+2j8nW1GrOxkSaP0HGkaS35LCsFLPGYWcrC6egeh7sO8GfO7VrlRW0Wp\nnT8QTVf64dR0894Lm7Re2CeOTeFZ7nS786rbSg7wLHrVnkabZyS8UKSvflYkJJmC\nDWjGjZSvPQefrrGCqzYZ+j3RzBR5qkPn1IzyNW8uJQKBgQDgyQZWF1UTLBL6Vx8C\n8Z/dWt2rcP4OlOSTBbGMYfg3x4BZEXUjBXcxnPdbKMPFpd5KrlrjHe7nNtrwR8uo\niwwsDPc1A14adh/VFp7oBi509eTandhQ0iGyAZrvPEf+M+tkAHjrornBGNP0l/6A\nlrQei+5+jy7apfA9QwnrqSNuiwKBgQDa/NxhM4Jd3MSzICOUgxlixhlGT0SE5At/\nPwG6XhGsdNWQZGjArY6z2ZdYxjbhwKsk6FMPywVpiZPkQwk9Ces/KJ77WOmn1UEL\nlyA9eNYe0TJHzknpwj98Co5BwFyxnF4cj89FkLxzGt6Jb3dqRyi+3B7WCeWQJsnN\nYsvUqt2XGwKBgAe7IjqnxsdIBscRZAGn6cWlMGaLFlHOESZ1VavsWqsgc2uczBiO\nQZE1QtShzEnp8IFFCd8x0lulaVZGQdzkG2EQeRgbq4rhcSrVAlYckFB5fIuATkZJ\nU9tZbsi3nApEIt5nncEM8bKQdgm9iIVHqZ47VdKIfiYK+v5AZgDy6kMNAoGALiKd\nj0DZ00qCijZYKJ6iB4QyqPRkPBcLMQimJYxR7uJCaAQvaYBnEw7hast/nnoH1GO5\ntBcSkdRxOuLAnIJtdEXrkIp/12L/LCDvouPFQILUM/qK6duJomla5RFQtf56eUv2\n3/IJMbrUbWH1Z4eMVwFq4a7+FSuG0mVhCfHhc0cCgYBjMbgal53mlfOFZmgMB14r\nj1K0R1oo+daZhYWSPQXLS3hfTXgSxPoz8YG9H9O1uOOHII2wRIJE7Gm4jFq7DhIr\n1mK13TR6WLNH1gJeIp/eH781RiCbBTzMikjGEu4bAunGu8rS0czTQreDI62VHfS/\n/suP25cNFjVc1+xWcoL7Ig==\n-----END PRIVATE KEY-----\n";

// Initialize admin SDK
const app = initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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
      // @ts-ignore - suppress type checking for userId property
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