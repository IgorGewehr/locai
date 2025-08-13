#!/usr/bin/env node

/**
 * Script para adicionar dados de teste ao Firebase
 * Adiciona propriedades, clientes e reservas de teste para o tenant
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hardcoded Firebase configuration
const FIREBASE_PROJECT_ID = 'locai-76dcf';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDASTbJp3VRgZpl\ntr2uvLkwpcR5sVmIQA33ziSCktN1tjTAfjLROFvoh4LfJs3Vv6h4qgXvpXpCW8vH\nyCJlDIkzKlPkm/3RuDshdnzHRKpNDRmee3VCcyS3KNJCO2Jwjcl6bSA0IJis6nJa\nLArB/rgh1KclZcHZtN5wur9GDzHiXGdaaSOSO2Jnl8UPTb0Hrbf0ZVXGX2mWRwOx\nTnJGnmNXzmrDHgWmEZlqu8PYmOTSNJZO6Ra+wCXqX25QjR9Do1ICdymBnSl7i/Hw\nxgL+I0kovYkrN+qm2BbQRsy4eaTxn+K+6DOhlbBTEhuZr/uaUUpEHDCorXg+btnk\nW7l476WpAgMBAAECggEAGrDO+xTUkxjDXsUL9Vpa9ma8LAwzGleR2MjzhnBtC9Tb\n47Bgy2vgThmpT+JqBfaRoxYutsIog1eMpNGh/JbN4J1KgdwpUlgZVR7GWT6tyP49\nhSMr9qpW+VmgPfNSSb9UrTrCkpnHt5DfiKa+Y4lA8+k5vlYun1Kc4db6P/ZR/VKK\nqJY0J4C2+2j8nW1GrOxkSaP0HGkaS35LCsFLPGYWcrC6egeh7sO8GfO7VrlRW0Wp\nnT8QTVf64dR0894Lm7Re2CeOTeFZ7nS786rbSg7wLHrVnkabZyS8UKSvflYkJJmC\nDWjGjZSvPQefrrGCqzYZ+j3RzBR5qkPn1IzyNW8uJQKBgQDgyQZWF1UTLBL6Vx8C\n8Z/dWt2rcP4OlOSTBbGMYfg3x4BZEXUjBXcxnPdbKMPFpd5KrlrjHe7nNtrwR8uo\niwwsDPc1A14adh/VFp7oBi509eTandhQ0iGyAZrvPEf+M+tkAHjrornBGNP0l/6A\nlrQei+5+jy7apfA9QwnrqSNuiwKBgQDa/NxhM4Jd3MSzICOUgxlixhlGT0SE5At/\nPwG6XhGsdNWQZGjArY6z2ZdYxjbhwKsk6FMPywVpiZPkQwk9Ces/KJ77WOmn1UEL\nlyA9eNYe0TJHzknpwj98Co5BwFyxnF4cj89FkLxzGt6Jb3dqRyi+3B7WCeWQJsnN\nYsvUqt2XGwKBgAe7IjqnxsdIBscRZAGn6cWlMGaLFlHOESZ1VavsWqsgc2uczBiO\nQZE1QtShzEnp8IFFCd8x0lulaVZGQdzkG2EQeRgbq4rhcSrVAlYckFB5fIuATkZJ\nU9tZbsi3nApEIt5nncEM8bKQdgm9iIVHqZ47VdKIfiYK+v5AZgDy6kMNAoGALiKd\nj0DZ00qCijZYKJ6iB4QyqPRkPBcLMQimJYxR7uJCaAQvaYBnEw7hast/nnoH1GO5\ntBcSkdRxOuLAnIJtdEXrkIp/12L/LCDvouPFQILUM/qK6duJomla5RFQtf56eUv2\n3/IJMbrUbWH1Z4eMVwFq4a7+FSuG0mVhCfHhc0cCgYBjMbgal53mlfOFZmgMB14r\nj1K0R1oo+daZhYWSPQXLS3hfTXgSxPoz8YG9H9O1uOOHII2wRIJE7Gm4jFq7DhIr\n1mK13TR6WLNH1gJeIp/eH781RiCbBTzMikjGEu4bAunGu8rS0czTQreDI62VHfS/\n/suP25cNFjVc1+xWcoL7Ig==\n-----END PRIVATE KEY-----\n";

// Configurar Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: FIREBASE_PROJECT_ID,
  private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: FIREBASE_CLIENT_EMAIL,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
};

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: `https://${FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = getFirestore();

// Usar o tenant ID fornecido ou usar um padrão
const TENANT_ID = process.argv[2] || process.env.TENANT_ID || 'test-tenant';

console.log(`🚀 Adicionando dados de teste para o tenant: ${TENANT_ID}`);

// Dados de teste
const testProperties = [
  {
    title: 'Apartamento Vista Mar',
    address: 'Av. Beira Mar, 1000',
    city: 'Florianópolis',
    state: 'SC',
    neighborhood: 'Centro',
    category: 'apartment',
    type: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    area: 85,
    basePrice: 350,
    isActive: true,
    description: 'Lindo apartamento com vista para o mar',
    amenities: ['Wi-Fi', 'Ar condicionado', 'Piscina', 'Churrasqueira'],
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    title: 'Casa de Praia Jurerê',
    address: 'Rua das Palmeiras, 500',
    city: 'Florianópolis',
    state: 'SC',
    neighborhood: 'Jurerê Internacional',
    category: 'house',
    type: 'house',
    bedrooms: 4,
    bathrooms: 3,
    maxGuests: 8,
    area: 200,
    basePrice: 800,
    isActive: true,
    description: 'Casa espaçosa próxima à praia',
    amenities: ['Wi-Fi', 'Ar condicionado', 'Piscina', 'Churrasqueira', 'Garagem'],
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    title: 'Studio Moderno Centro',
    address: 'Rua Felipe Schmidt, 200',
    city: 'Florianópolis',
    state: 'SC',
    neighborhood: 'Centro',
    category: 'studio',
    type: 'studio',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    area: 45,
    basePrice: 200,
    isActive: true,
    description: 'Studio moderno e bem localizado',
    amenities: ['Wi-Fi', 'Ar condicionado', 'Academia'],
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

const testClients = [
  {
    name: 'João Silva',
    email: 'joao.silva@example.com',
    phone: '(48) 99999-0001',
    cpf: '111.111.111-11',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Maria Santos',
    email: 'maria.santos@example.com',
    phone: '(48) 99999-0002',
    cpf: '222.222.222-22',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Pedro Oliveira',
    email: 'pedro.oliveira@example.com',
    phone: '(48) 99999-0003',
    cpf: '333.333.333-33',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

async function addTestData() {
  try {
    // Adicionar propriedades
    console.log('📦 Adicionando propriedades...');
    const propertyRefs = [];
    for (const property of testProperties) {
      const ref = await db
        .collection('tenants')
        .doc(TENANT_ID)
        .collection('properties')
        .add(property);
      propertyRefs.push(ref.id);
      console.log(`  ✅ Propriedade adicionada: ${property.title} (${ref.id})`);
    }

    // Adicionar clientes
    console.log('👥 Adicionando clientes...');
    const clientRefs = [];
    for (const client of testClients) {
      const ref = await db
        .collection('tenants')
        .doc(TENANT_ID)
        .collection('clients')
        .add(client);
      clientRefs.push(ref.id);
      console.log(`  ✅ Cliente adicionado: ${client.name} (${ref.id})`);
    }

    // Adicionar algumas reservas de teste
    console.log('📅 Adicionando reservas...');
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const testReservations = [
      {
        propertyId: propertyRefs[0],
        clientId: clientRefs[0],
        checkIn: Timestamp.fromDate(nextWeek),
        checkOut: Timestamp.fromDate(new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000)),
        guests: 2,
        totalPrice: 1050,
        status: 'confirmed',
        paymentStatus: 'paid',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        propertyId: propertyRefs[1],
        clientId: clientRefs[1],
        checkIn: Timestamp.fromDate(nextMonth),
        checkOut: Timestamp.fromDate(new Date(nextMonth.getTime() + 7 * 24 * 60 * 60 * 1000)),
        guests: 6,
        totalPrice: 5600,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    ];

    for (const reservation of testReservations) {
      const ref = await db
        .collection('tenants')
        .doc(TENANT_ID)
        .collection('reservations')
        .add(reservation);
      console.log(`  ✅ Reserva adicionada: ${ref.id}`);
    }

    console.log('\n🎉 Dados de teste adicionados com sucesso!');
    console.log(`📍 Tenant ID: ${TENANT_ID}`);
    console.log(`📊 Resumo:`);
    console.log(`  - ${testProperties.length} propriedades`);
    console.log(`  - ${testClients.length} clientes`);
    console.log(`  - ${testReservations.length} reservas`);

  } catch (error) {
    console.error('❌ Erro ao adicionar dados de teste:', error);
    process.exit(1);
  }
}

// Executar
addTestData().then(() => {
  console.log('\n✅ Script concluído!');
  process.exit(0);
});