#!/usr/bin/env node

/**
 * Script to initialize mini-site data for a tenant
 * This creates default settings and demo properties if none exist
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

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

async function createDefaultSettings(tenantId) {
  console.log(`📋 Creating default settings for tenant: ${tenantId}`);
  
  const defaultSettings = {
    id: tenantId,
    company: {
      name: 'Minha Imobiliária',
      logo: null,
      address: 'Endereço da empresa',
      phone: '+55 11 99999-9999',
      email: 'contato@empresa.com',
      website: 'https://www.empresa.com',
      updatedAt: new Date()
    },
    ai: {
      personalityPrompt: 'Você é Sofia, uma assistente especializada em imóveis.',
      responseStyle: 'friendly',
      customInstructions: 'Seja sempre prestativa e detalhada.',
      greetingMessage: 'Olá! Como posso ajudá-lo hoje?',
      unavailableMessage: 'Desculpe, não estou disponível no momento.',
      autoReply: true,
      businessHours: {
        enabled: false,
        start: '08:00',
        end: '18:00'
      },
      updatedAt: new Date()
    },
    billing: {
      automaticBilling: false,
      reminderDays: 7,
      paymentMethods: ['PIX', 'Transferência'],
      lateFeePercentage: 2,
      customMessage: 'Obrigado pela preferência!',
      updatedAt: new Date()
    },
    whatsapp: {
      phoneNumberId: '',
      accessToken: '',
      verifyToken: '',
      connected: false,
      businessName: 'Minha Imobiliária',
      mode: 'web',
      updatedAt: new Date()
    },
    miniSite: {
      active: true, // Ativar por padrão
      title: 'Minha Imobiliária - Aluguel por Temporada',
      description: 'Encontre o imóvel perfeito para suas férias',
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      accentColor: '#ed6c02',
      fontFamily: 'modern',
      borderRadius: 'rounded',
      showPrices: true,
      showAvailability: true,
      showReviews: true,
      whatsappNumber: '+5511999999999',
      companyEmail: 'contato@empresa.com',
      seoKeywords: 'imóveis, aluguel, temporada, férias',
      updatedAt: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    await db.collection('tenants').doc(tenantId).collection('settings').doc(tenantId).set(defaultSettings);
    console.log('✅ Default settings created successfully');
    return defaultSettings;
  } catch (error) {
    console.error('❌ Error creating default settings:', error);
    throw error;
  }
}

async function createDemoProperties(tenantId) {
  console.log(`🏠 Creating demo properties for tenant: ${tenantId}`);
  
  const demoProperties = [
    {
      title: 'Casa de Praia Aconchegante',
      description: 'Linda casa de praia com vista para o mar, perfeita para relaxar e aproveitar as férias em família.',
      type: 'Casa',
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      area: 120,
      basePrice: 350,
      minimumNights: 2,
      cleaningFee: 50,
      pricePerExtraGuest: 30,
      address: 'Rua das Ondas, 123',
      city: 'Ubatuba',
      neighborhood: 'Centro',
      status: 'active',
      isActive: true,
      isFeatured: true,
      amenities: ['Wi-Fi', 'Piscina', 'Ar Condicionado', 'Cozinha', 'Estacionamento', 'Varanda'],
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1520637736862-4d197d17c795?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
          caption: 'Casa de Praia Aconchegante',
          order: 1,
          isMain: true
        }
      ],
      unavailableDates: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Apartamento Moderno no Centro',
      description: 'Apartamento moderno e bem localizado no centro da cidade, com fácil acesso a restaurantes e pontos turísticos.',
      type: 'Apartamento',
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      area: 80,
      basePrice: 180,
      minimumNights: 1,
      cleaningFee: 30,
      pricePerExtraGuest: 20,
      address: 'Avenida Central, 456',
      city: 'São Paulo',
      neighborhood: 'Centro',
      status: 'active',
      isActive: true,
      isFeatured: false,
      amenities: ['Wi-Fi', 'Ar Condicionado', 'Cozinha', 'Elevador', 'Segurança', 'TV'],
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
          caption: 'Apartamento Moderno no Centro',
          order: 1,
          isMain: true
        }
      ],
      unavailableDates: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const batch = db.batch();
  
  demoProperties.forEach((property, index) => {
    const docRef = db.collection('tenants').doc(tenantId).collection('properties').doc();
    batch.set(docRef, property);
  });

  try {
    await batch.commit();
    console.log(`✅ ${demoProperties.length} demo properties created successfully`);
  } catch (error) {
    console.error('❌ Error creating demo properties:', error);
    throw error;
  }
}

async function initializeTenantMiniSite(tenantId) {
  console.log(`🚀 Initializing mini-site for tenant: ${tenantId}`);
  
  try {
    // Check if settings already exist
    const settingsDoc = await db.collection('tenants').doc(tenantId).collection('settings').doc(tenantId).get();
    
    if (!settingsDoc.exists) {
      await createDefaultSettings(tenantId);
    } else {
      console.log('⚠️ Settings already exist, skipping creation');
    }

    // Check if properties exist
    const propertiesSnapshot = await db.collection('tenants').doc(tenantId).collection('properties').limit(1).get();
    
    if (propertiesSnapshot.empty) {
      await createDemoProperties(tenantId);
    } else {
      console.log('⚠️ Properties already exist, skipping demo creation');
    }

    console.log('🎉 Tenant mini-site initialization completed successfully!');
    console.log(`📱 You can now access the mini-site at: /site/${tenantId}`);
    console.log(`🔧 Debug endpoint: /api/debug/mini-site/${tenantId}`);
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

// Get tenant ID from command line args or use default
const tenantId = process.argv[2] || 'default';

if (tenantId.length < 3) {
  console.error('❌ Please provide a valid tenant ID');
  console.log('Usage: node initialize-tenant-minisite.js <tenantId>');
  console.log('Example: node initialize-tenant-minisite.js my-company');
  process.exit(1);
}

console.log('🔧 Mini-Site Tenant Initialization Tool');
console.log('=' .repeat(50));

initializeTenantMiniSite(tenantId)
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Initialization failed:', error);
    process.exit(1);
  });