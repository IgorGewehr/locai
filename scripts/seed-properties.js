import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample properties data
const sampleProperties = [
  {
    title: 'Casa de Praia em Florianópolis',
    description: 'Linda casa de praia com vista para o mar, perfeita para férias em família. Localizada na praia dos Ingleses, com acesso direto à praia.',
    type: 'Casa',
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 8,
    area: 120,
    address: 'Praia dos Ingleses, Florianópolis - SC',
    city: 'Florianópolis',
    neighborhood: 'Ingleses',
    basePrice: 450,
    cleaningFee: 150,
    pricePerExtraGuest: 50,
    minimumNights: 3,
    amenities: ['Wi-Fi', 'Ar Condicionado', 'Piscina', 'Churrasqueira', 'Estacionamento', 'Vista para o Mar'],
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800',
        caption: 'Vista frontal da casa',
        order: 0,
        isMain: true
      },
      {
        url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
        caption: 'Sala de estar',
        order: 1,
        isMain: false
      },
      {
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        caption: 'Quarto principal',
        order: 2,
        isMain: false
      }
    ],
    videos: [],
    status: 'active',
    isActive: true,
    isFeatured: true,
    unavailableDates: []
  },
  {
    title: 'Apartamento Moderno no Centro',
    description: 'Apartamento completamente mobiliado no coração da cidade. Próximo a restaurantes, shopping e principais pontos turísticos.',
    type: 'Apartamento',
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    area: 70,
    address: 'Rua XV de Novembro, 123 - Centro',
    city: 'Blumenau',
    neighborhood: 'Centro',
    basePrice: 250,
    cleaningFee: 80,
    pricePerExtraGuest: 30,
    minimumNights: 2,
    amenities: ['Wi-Fi', 'Ar Condicionado', 'Smart TV', 'Cozinha Completa', 'Elevador'],
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        caption: 'Sala de estar moderna',
        order: 0,
        isMain: true
      },
      {
        url: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800',
        caption: 'Cozinha equipada',
        order: 1,
        isMain: false
      }
    ],
    videos: [],
    status: 'active',
    isActive: true,
    isFeatured: false,
    unavailableDates: []
  },
  {
    title: 'Chalé Aconchegante na Serra',
    description: 'Chalé romântico em meio à natureza. Ideal para casais em busca de tranquilidade e contato com a natureza.',
    type: 'Chalé',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    area: 45,
    address: 'Estrada da Serra, km 15',
    city: 'Gramado',
    neighborhood: 'Serra',
    basePrice: 380,
    cleaningFee: 100,
    pricePerExtraGuest: 0,
    minimumNights: 2,
    amenities: ['Lareira', 'Banheira de Hidromassagem', 'Vista para as Montanhas', 'Wi-Fi', 'Estacionamento', 'Deck Privativo'],
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800',
        caption: 'Vista externa do chalé',
        order: 0,
        isMain: true
      },
      {
        url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800',
        caption: 'Interior aconchegante',
        order: 1,
        isMain: false
      }
    ],
    videos: [],
    status: 'active',
    isActive: true,
    isFeatured: true,
    unavailableDates: []
  }
];

async function seedProperties() {
  try {
    console.log('🌱 Starting property seeding...\n');
    
    // Use a default tenant ID for testing
    const defaultTenantId = 'development';
    
    for (const property of sampleProperties) {
      const propertyData = {
        ...property,
        tenantId: defaultTenantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'properties'), propertyData);
      console.log(`✅ Added property: ${property.title} (ID: ${docRef.id})`);
    }
    
    console.log('\n🎉 Property seeding completed successfully!');
    console.log(`📊 Total properties added: ${sampleProperties.length}`);
    console.log('\n💡 Note: All properties were assigned to tenant ID: development');
    
  } catch (error) {
    console.error('❌ Error seeding properties:', error);
  }
}

// Run the seeding
seedProperties();