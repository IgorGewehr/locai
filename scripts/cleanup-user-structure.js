/**
 * Script de Limpeza da Estrutura de Usuários
 * Remove a estrutura incorreta: tenants/[tenantId]/users/[userId]
 * Mantém apenas: users/[userId] (global)
 * 
 * Usage: node scripts/cleanup-user-structure.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧹 Starting User Structure Cleanup Script...\n');

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();

async function findDuplicateUserCollections() {
  console.log('🔍 Searching for incorrect user structures...\n');
  
  const tenantsSnapshot = await db.collection('tenants').get();
  const problematicTenants = [];
  
  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;
    
    try {
      // Check if this tenant has a 'users' subcollection
      const usersSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('users')
        .limit(1)
        .get();
        
      if (!usersSnapshot.empty) {
        const userCount = (await db
          .collection('tenants')
          .doc(tenantId)
          .collection('users')
          .get()).size;
          
        problematicTenants.push({
          tenantId,
          userCount
        });
        
        console.log(`❌ Found: tenants/${tenantId}/users/ (${userCount} documents)`);
      }
    } catch (error) {
      // Collection doesn't exist, which is correct
    }
  }
  
  return problematicTenants;
}

async function consolidateUserData() {
  console.log('\n📊 Consolidating user data...\n');
  
  const globalUsersSnapshot = await db.collection('users').get();
  console.log(`✅ Global users collection has ${globalUsersSnapshot.size} documents`);
  
  const problematicTenants = await findDuplicateUserCollections();
  
  if (problematicTenants.length === 0) {
    console.log('🎉 No problematic user structures found! Structure is already clean.');
    return;
  }
  
  console.log(`\n⚠️  Found ${problematicTenants.length} tenants with duplicate user collections:`);
  problematicTenants.forEach(({ tenantId, userCount }) => {
    console.log(`   - ${tenantId}: ${userCount} users`);
  });
  
  // For each problematic tenant, check if the users exist in global collection
  for (const { tenantId, userCount } of problematicTenants) {
    console.log(`\n🔄 Processing tenant: ${tenantId}`);
    
    const tenantUsersSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('users')
      .get();
    
    for (const userDoc of tenantUsersSnapshot.docs) {
      const userId = userDoc.id;
      const tenantUserData = userDoc.data();
      
      // Check if user exists in global collection
      const globalUserDoc = await db.collection('users').doc(userId).get();
      
      if (globalUserDoc.exists) {
        const globalUserData = globalUserDoc.data();
        
        // Compare data and merge if needed
        const needsUpdate = !globalUserData.tenantId || 
                           globalUserData.tenantId !== tenantId ||
                           !globalUserData.updatedAt ||
                           new Date(tenantUserData.updatedAt || 0) > new Date(globalUserData.updatedAt || 0);
        
        if (needsUpdate) {
          console.log(`  📝 Updating global user ${userId} with tenant-specific data`);
          await db.collection('users').doc(userId).update({
            ...tenantUserData,
            tenantId: tenantId,
            consolidatedAt: new Date(),
            consolidationVersion: '1.0'
          });
        } else {
          console.log(`  ✅ Global user ${userId} is already up to date`);
        }
      } else {
        console.log(`  ➕ Moving user ${userId} to global collection`);
        await db.collection('users').doc(userId).set({
          ...tenantUserData,
          tenantId: tenantId,
          migratedFromTenant: true,
          consolidatedAt: new Date(),
          consolidationVersion: '1.0'
        });
      }
    }
  }
}

async function removeIncorrectStructures() {
  console.log('\n🗑️  Removing incorrect user structures...\n');
  
  const problematicTenants = await findDuplicateUserCollections();
  
  for (const { tenantId } of problematicTenants) {
    console.log(`🧹 Cleaning tenant: ${tenantId}`);
    
    const tenantUsersSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('users')
      .get();
    
    const batch = db.batch();
    let operations = 0;
    
    tenantUsersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      operations++;
    });
    
    if (operations > 0) {
      await batch.commit();
      console.log(`  ✅ Deleted ${operations} duplicate user documents`);
    }
  }
}

async function validateCleanup() {
  console.log('\n✅ Validating cleanup...\n');
  
  const globalUsersSnapshot = await db.collection('users').get();
  console.log(`📊 Global users collection: ${globalUsersSnapshot.size} documents`);
  
  const problematicTenants = await findDuplicateUserCollections();
  
  if (problematicTenants.length === 0) {
    console.log('🎉 Success! No incorrect user structures found.');
    console.log('📝 All users are now properly stored in the global users collection.');
  } else {
    console.log('⚠️  Some issues remain:');
    problematicTenants.forEach(({ tenantId, userCount }) => {
      console.log(`   - ${tenantId}: ${userCount} users`);
    });
  }
}

async function main() {
  try {
    console.log('📋 Cleanup Plan:');
    console.log('1. Find incorrect user structures (tenants/[id]/users/)');
    console.log('2. Consolidate data into global users collection');
    console.log('3. Remove duplicate structures');
    console.log('4. Validate cleanup\n');
    
    // Step 1 & 2: Consolidate user data
    await consolidateUserData();
    
    // Step 3: Remove incorrect structures
    await removeIncorrectStructures();
    
    // Step 4: Validate
    await validateCleanup();
    
    console.log('\n🎯 Cleanup completed successfully!');
    console.log('\n💡 Recommended next steps:');
    console.log('1. Test user authentication and profiles');
    console.log('2. Verify tenant isolation still works correctly');
    console.log('3. Check that all user-related features function properly');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));