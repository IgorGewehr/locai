/**
 * Simple script to activate mini-site
 * Run with: node -r dotenv/config activate-mini-site.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);

async function activateMiniSite() {
  try {
    console.log('🔍 Looking for tenant settings...');
    
    // Get all settings documents
    const settingsRef = db.collection('settings');
    const snapshot = await settingsRef.get();
    
    if (snapshot.empty) {
      console.log('❌ No tenant settings found. Please create a user account first.');
      return;
    }
    
    // Use the first tenant or find one with company data
    let targetDoc = snapshot.docs[0];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.company?.name && !targetDoc.data().company?.name) {
        targetDoc = doc;
      }
    });
    
    const tenantId = targetDoc.id;
    const currentData = targetDoc.data();
    
    console.log(`📋 Found tenant: ${tenantId}`);
    console.log(`🏢 Company: ${currentData.company?.name || 'Not set'}`);
    console.log(`📱 Current mini-site status: ${currentData.miniSite?.active ? 'Active' : 'Inactive'}`);
    
    // Update mini-site settings
    const updateData = {
      'miniSite.active': true,
      'miniSite.title': currentData.company?.name || 'Minha Imobiliária',
      'miniSite.description': 'Encontre o imóvel perfeito para você',
      'miniSite.whatsappNumber': '5511999999999', // Update with your number
      'miniSite.companyEmail': currentData.company?.email || 'contato@empresa.com',
      'miniSite.primaryColor': '#1976d2',
      'miniSite.secondaryColor': '#dc004e', 
      'miniSite.accentColor': '#ed6c02',
      'miniSite.fontFamily': 'modern',
      'miniSite.borderRadius': 'rounded',
      'miniSite.showPrices': true,
      'miniSite.showAvailability': true,
      'miniSite.showReviews': true,
      'miniSite.seoKeywords': 'imóveis, aluguel, temporada, férias, propriedades',
      'updatedAt': new Date()
    };
    
    await settingsRef.doc(tenantId).update(updateData);
    
    console.log('✅ Mini-site activated successfully!');
    console.log(`🌐 Your mini-site URL: http://localhost:3001/site/${tenantId}`);
    console.log(`⚙️  Dashboard settings: http://localhost:3001/dashboard/settings`);
    
  } catch (error) {
    console.error('❌ Error activating mini-site:', error);
  }
}

activateMiniSite();