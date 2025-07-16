/**
 * Debug script to check mini-site configuration
 * Run with: node debug-mini-site.js
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function checkMiniSiteConfig() {
  try {
    console.log('🔍 Checking mini-site configuration...\n');

    // Check all settings documents to find tenant IDs
    const settingsSnapshot = await getDocs(collection(db, 'settings'));
    
    if (settingsSnapshot.empty) {
      console.log('❌ No settings found in the database');
      return;
    }

    console.log(`📊 Found ${settingsSnapshot.size} tenant(s):\n`);

    settingsSnapshot.forEach((docSnapshot) => {
      const tenantId = docSnapshot.id;
      const data = docSnapshot.data();
      
      console.log(`🏢 Tenant ID: ${tenantId}`);
      console.log(`   Company: ${data.company?.name || 'Not set'}`);
      console.log(`   Mini-site Active: ${data.miniSite?.active ? '✅ YES' : '❌ NO'}`);
      
      if (data.miniSite?.active) {
        console.log(`   Mini-site Title: ${data.miniSite.title}`);
        console.log(`   Mini-site URL: http://localhost:3002/site/${tenantId}`);
      }
      
      console.log('');
    });

    // Let's activate mini-site for the first tenant if none are active
    const inactiveTenants = [];
    settingsSnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (!data.miniSite?.active) {
        inactiveTenants.push({
          id: docSnapshot.id,
          data: data
        });
      }
    });

    if (inactiveTenants.length > 0) {
      const firstTenant = inactiveTenants[0];
      console.log(`🚀 Activating mini-site for tenant: ${firstTenant.id}`);
      
      const tenantRef = doc(db, 'settings', firstTenant.id);
      await updateDoc(tenantRef, {
        'miniSite.active': true,
        'miniSite.title': 'Propriedades para Aluguel',
        'miniSite.description': 'Encontre a propriedade perfeita para suas férias',
        'miniSite.whatsappNumber': '5511999999999',
        'miniSite.companyEmail': 'contato@minhaempresa.com',
        'updatedAt': new Date()
      });
      
      console.log(`✅ Mini-site activated for tenant: ${firstTenant.id}`);
      console.log(`🌐 Access your mini-site at: http://localhost:3002/site/${firstTenant.id}`);
    }

  } catch (error) {
    console.error('❌ Error checking mini-site config:', error);
  }
}

checkMiniSiteConfig();