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

// Sample transactions data for the last 3 months
const sampleTransactions = [
  // Current month (December 2024)
  {
    description: 'Reserva Casa de Praia - João Silva',
    amount: 1500,
    type: 'income',
    status: 'completed',
    category: 'Reserva',
    date: Timestamp.fromDate(new Date('2024-12-15')),
    paymentMethod: 'PIX',
    notes: 'Reserva para fim de semana'
  },
  {
    description: 'Limpeza Apartamento Centro',
    amount: 150,
    type: 'expense',
    status: 'completed',
    category: 'Limpeza',
    date: Timestamp.fromDate(new Date('2024-12-14')),
    paymentMethod: 'Dinheiro',
    notes: 'Limpeza pós-checkout'
  },
  {
    description: 'Reserva Chalé Serra - Maria Santos',
    amount: 1200,
    type: 'income',
    status: 'completed',
    category: 'Reserva',
    date: Timestamp.fromDate(new Date('2024-12-10')),
    paymentMethod: 'Cartão',
    notes: 'Reserva para lua de mel'
  },
  {
    description: 'Manutenção Ar Condicionado',
    amount: 300,
    type: 'expense',
    status: 'completed',
    category: 'Manutenção',
    date: Timestamp.fromDate(new Date('2024-12-08')),
    paymentMethod: 'Transferência',
    notes: 'Reparo do ar condicionado'
  },
  {
    description: 'Reserva Cobertura - Carlos Oliveira',
    amount: 2500,
    type: 'income',
    status: 'pending',
    category: 'Reserva',
    date: Timestamp.fromDate(new Date('2024-12-20')),
    paymentMethod: 'Cartão',
    notes: 'Reserva para Ano Novo'
  },
  
  // Previous month (November 2024)
  {
    description: 'Reserva Casa de Praia - Ana Costa',
    amount: 1800,
    type: 'income',
    status: 'completed',
    category: 'Reserva',
    date: Timestamp.fromDate(new Date('2024-11-25')),
    paymentMethod: 'PIX',
    notes: 'Reserva para feriado'
  },
  {
    description: 'Limpeza Chalé Serra',
    amount: 120,
    type: 'expense',
    status: 'completed',
    category: 'Limpeza',
    date: Timestamp.fromDate(new Date('2024-11-24')),
    paymentMethod: 'Dinheiro',
    notes: 'Limpeza semanal'
  },
  {
    description: 'Comissão Agente - Venda João',
    amount: 450,
    type: 'expense',
    status: 'completed',
    category: 'Comissão',
    date: Timestamp.fromDate(new Date('2024-11-20')),
    paymentMethod: 'Transferência',
    notes: 'Comissão sobre reserva'
  },
  {
    description: 'Reserva Apartamento Centro - Pedro Lima',
    amount: 900,
    type: 'income',
    status: 'completed',
    category: 'Reserva',
    date: Timestamp.fromDate(new Date('2024-11-15')),
    paymentMethod: 'Cartão',
    notes: 'Reserva de negócios'
  },
  
  // Two months ago (October 2024)
  {
    description: 'Reserva Casa de Praia - Família Souza',
    amount: 2200,
    type: 'income',
    status: 'completed',
    category: 'Reserva',
    date: Timestamp.fromDate(new Date('2024-10-28')),
    paymentMethod: 'PIX',
    notes: 'Reserva para Halloween'
  },
  {
    description: 'Manutenção Piscina',
    amount: 400,
    type: 'expense',
    status: 'completed',
    category: 'Manutenção',
    date: Timestamp.fromDate(new Date('2024-10-22')),
    paymentMethod: 'Dinheiro',
    notes: 'Limpeza e tratamento da piscina'
  },
  {
    description: 'Reserva Cobertura - Empresa XYZ',
    amount: 3500,
    type: 'income',
    status: 'completed',
    category: 'Reserva',
    date: Timestamp.fromDate(new Date('2024-10-15')),
    paymentMethod: 'Transferência',
    notes: 'Evento corporativo'
  }
];

async function seedTransactions() {
  try {
    console.log('🌱 Starting transaction seeding...\n');
    
    // Use the development tenant ID
    const defaultTenantId = 'development';
    
    for (const transaction of sampleTransactions) {
      const transactionData = {
        ...transaction,
        tenantId: defaultTenantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      console.log(`✅ Added transaction: ${transaction.description} - ${transaction.amount} (ID: ${docRef.id})`);
    }
    
    console.log('\n🎉 Transaction seeding completed successfully!');
    console.log(`📊 Total transactions added: ${sampleTransactions.length}`);
    console.log('\n💡 Note: All transactions were assigned to tenant ID: development');
    console.log('   This will provide data for the Enhanced Financial Dashboard.');
    
  } catch (error) {
    console.error('❌ Error seeding transactions:', error);
  }
}

// Run the seeding
seedTransactions();