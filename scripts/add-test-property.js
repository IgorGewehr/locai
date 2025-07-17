const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config();

// Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('🔧 Firebase Project:', firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function addTestProperty() {
  try {
    // First, let's check if we can connect
    console.log('\n📡 Testing Firebase connection...');
    
    // Try to get existing properties first
    const propertiesRef = collection(db, 'properties');
    const snapshot = await getDocs(propertiesRef);
    console.log(`✅ Connected! Found ${snapshot.size} existing properties.`);
    
    // If no properties exist, add one
    if (snapshot.size === 0) {
      console.log('\n🏠 Adding test property...');
      
      const testProperty = {
        title: 'Casa de Praia Teste',
        description: 'Uma linda casa de praia para testar o mini-site',
        type: 'Casa',
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 6,
        area: 100,
        address: 'Praia dos Ingleses, 123',
        city: 'Florianópolis',
        neighborhood: 'Ingleses',
        basePrice: 350,
        cleaningFee: 100,
        minimumNights: 2,
        status: 'active',
        isActive: true,
        isFeatured: true,
        amenities: ['Wi-Fi', 'Piscina', 'Churrasqueira', 'Ar Condicionado'],
        photos: [
          {
            url: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800',
            caption: 'Vista da casa',
            order: 0,
            isMain: true
          }
        ],
        tenantId: 'default-tenant', // We'll update this later
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(propertiesRef, testProperty);
      console.log('✅ Property added with ID:', docRef.id);
      console.log('\n⚠️  Note: Property was created with tenantId = "default-tenant"');
      console.log('   You may need to update this to match your actual user ID in the Firebase console.');
    } else {
      // List existing properties
      console.log('\n📋 Existing properties:');
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`   - ${data.title || 'Untitled'} (Tenant: ${data.tenantId || 'none'})`);
      });
    }
    
    console.log('\n✨ Done! You can now check your mini-site.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'permission-denied') {
      console.log('\n💡 Tip: Make sure your Firestore security rules allow read/write access.');
      console.log('   For testing, you can temporarily set rules to:');
      console.log('   allow read, write: if true;');
    }
  }
}

// Run the script
addTestProperty();