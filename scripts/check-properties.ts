// @ts-nocheck - script file, suppress all type checking
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
// @ts-ignore - suppress type checking for Firebase options
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkProperties() {
  try {
    console.log('🔍 Checking properties in Firestore...\n');
    
    // Get all properties
    const propertiesSnapshot = await getDocs(collection(db, 'properties'));
    console.log(`📊 Total properties found: ${propertiesSnapshot.size}`);
    
    // List all properties
    propertiesSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n🏠 Property: ${data.title || 'Untitled'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Tenant ID: ${data.tenantId}`);
      console.log(`   Active: ${data.isActive}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Price: R$ ${data.basePrice}`);
    });
    
    // Check for active properties
    const activeQuery = query(collection(db, 'properties'), where('isActive', '==', true));
    const activeSnapshot = await getDocs(activeQuery);
    console.log(`\n✅ Active properties: ${activeSnapshot.size}`);
    
    // Check tenants with properties
    const tenantIds = new Set();
    propertiesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.tenantId) {
        tenantIds.add(data.tenantId);
      }
    });
    
    console.log(`\n👥 Tenants with properties: ${tenantIds.size}`);
    tenantIds.forEach(id => console.log(`   - ${id}`));
    
  } catch (error) {
    console.error('❌ Error checking properties:', error);
  }
}

// Run the check
checkProperties();