// seed-test-properties.mjs
// Script para popular banco com propriedades de teste

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (!serviceAccount.project_id) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT não configurado no .env.local');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore();
const TENANT_ID = process.env.TENANT_ID || 'test_tenant';

// Propriedades de teste
const testProperties = [
  {
    id: 'prop_test_001_floripa',
    title: 'Apartamento Vista Mar - Florianópolis',
    description: 'Lindo apartamento com vista para o mar em Florianópolis. 2 quartos, sala ampla, cozinha completa e varanda gourmet.',
    location: 'Florianópolis',
    city: 'Florianópolis',
    state: 'SC',
    address: 'Av. Beira Mar Norte, 123',
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    area: 85,
    basePrice: 180,
    cleaningFee: 120,
    photos: [
      'https://via.placeholder.com/800x600/0288d1/ffffff?text=Vista+Mar+1',
      'https://via.placeholder.com/800x600/0288d1/ffffff?text=Vista+Mar+2',
      'https://via.placeholder.com/800x600/0288d1/ffffff?text=Vista+Mar+3'
    ],
    amenities: ['WiFi', 'Ar Condicionado', 'Piscina', 'Churrasqueira', 'Estacionamento', 'Vista Mar'],
    isActive: true,
    status: 'available',
    tenantId: TENANT_ID,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prop_test_002_floripa',
    title: 'Cobertura Duplex Luxo - Jurerê',
    description: 'Cobertura duplex de alto padrão em Jurerê Internacional. 3 suítes, piscina privativa, churrasqueira e vista panorâmica.',
    location: 'Jurerê Internacional',
    city: 'Florianópolis',
    state: 'SC',
    address: 'Rua das Gaivotas, 456',
    bedrooms: 3,
    bathrooms: 4,
    maxGuests: 6,
    area: 200,
    basePrice: 450,
    cleaningFee: 200,
    photos: [
      'https://via.placeholder.com/800x600/00897b/ffffff?text=Cobertura+1',
      'https://via.placeholder.com/800x600/00897b/ffffff?text=Cobertura+2',
      'https://via.placeholder.com/800x600/00897b/ffffff?text=Cobertura+3'
    ],
    amenities: ['WiFi', 'Ar Condicionado', 'Piscina Privativa', 'Churrasqueira', 'Estacionamento', 'Jacuzzi', 'Vista Mar'],
    isActive: true,
    status: 'available',
    tenantId: TENANT_ID,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prop_test_003_floripa',
    title: 'Casa Praia Campeche - Pé na Areia',
    description: 'Casa charmosa no Campeche, literalmente pé na areia. 4 quartos, área gourmet completa e jardim.',
    location: 'Campeche',
    city: 'Florianópolis',
    state: 'SC',
    address: 'Av. Pequeno Príncipe, 789',
    bedrooms: 4,
    bathrooms: 3,
    maxGuests: 8,
    area: 180,
    basePrice: 350,
    cleaningFee: 150,
    photos: [
      'https://via.placeholder.com/800x600/d32f2f/ffffff?text=Casa+Praia+1',
      'https://via.placeholder.com/800x600/d32f2f/ffffff?text=Casa+Praia+2',
      'https://via.placeholder.com/800x600/d32f2f/ffffff?text=Casa+Praia+3'
    ],
    amenities: ['WiFi', 'Churrasqueira', 'Estacionamento', 'Jardim', 'Praia', 'Pet Friendly'],
    isActive: true,
    status: 'available',
    tenantId: TENANT_ID,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prop_test_004_floripa',
    title: 'Studio Moderno Centro - Econômico',
    description: 'Studio moderno e compacto no centro de Florianópolis. Ideal para viagens de negócios ou casais.',
    location: 'Centro',
    city: 'Florianópolis',
    state: 'SC',
    address: 'Rua Felipe Schmidt, 321',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    area: 35,
    basePrice: 120,
    cleaningFee: 60,
    photos: [
      'https://via.placeholder.com/800x600/7b1fa2/ffffff?text=Studio+1',
      'https://via.placeholder.com/800x600/7b1fa2/ffffff?text=Studio+2'
    ],
    amenities: ['WiFi', 'Ar Condicionado', 'Cozinha Compacta', 'Smart TV'],
    isActive: true,
    status: 'available',
    tenantId: TENANT_ID,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prop_test_005_floripa',
    title: 'Apartamento Lagoa da Conceição',
    description: 'Apartamento aconchegante na Lagoa da Conceição. 2 quartos, varanda com vista para a lagoa.',
    location: 'Lagoa da Conceição',
    city: 'Florianópolis',
    state: 'SC',
    address: 'Rua das Rendeiras, 567',
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    area: 65,
    basePrice: 150,
    cleaningFee: 80,
    photos: [
      'https://via.placeholder.com/800x600/388e3c/ffffff?text=Lagoa+1',
      'https://via.placeholder.com/800x600/388e3c/ffffff?text=Lagoa+2',
      'https://via.placeholder.com/800x600/388e3c/ffffff?text=Lagoa+3'
    ],
    amenities: ['WiFi', 'Cozinha Completa', 'Varanda', 'Vista Lagoa', 'Estacionamento'],
    isActive: true,
    status: 'available',
    tenantId: TENANT_ID,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedProperties() {
  console.log('🌱 Iniciando seed de propriedades de teste...');
  console.log(`📍 Tenant ID: ${TENANT_ID}`);
  console.log(`📦 Propriedades a criar: ${testProperties.length}`);
  
  try {
    const batch = db.batch();
    
    for (const property of testProperties) {
      const docRef = db.doc(`tenants/${TENANT_ID}/properties/${property.id}`);
      batch.set(docRef, property);
      console.log(`  ✅ Preparando: ${property.title} (${property.basePrice}/noite)`);
    }
    
    await batch.commit();
    console.log('\n🎉 Todas as propriedades foram criadas com sucesso!');
    
    // Verificar se foram criadas
    const propertiesRef = db.collection(`tenants/${TENANT_ID}/properties`);
    const snapshot = await propertiesRef.get();
    console.log(`\n📊 Total de propriedades no banco: ${snapshot.size}`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.title} (R$ ${data.basePrice}/noite) - ${data.location}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar propriedades:', error);
    process.exit(1);
  }
}

// Executar
seedProperties().then(() => {
  console.log('\n✅ Seed concluído com sucesso!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});