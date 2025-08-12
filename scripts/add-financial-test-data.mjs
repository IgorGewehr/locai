#!/usr/bin/env node

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase config (deve estar em .env ou firebase-config.json)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAnbezjy0Q7pB4vxP6VwZQr8YV8jV5V2V4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "locai-a01b3.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "locai-a01b3",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "locai-76dcf.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1031984350698",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1031984350698:web:49b9a9b6b4b6a9b6a9b6a9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Tenant ID específico
const TENANT_ID = 'U11UvXr67vWnDtDpDaaJDTuEcxo2';

// Dados de teste para transações
const testTransactions = [
  {
    id: 'trans_001',
    type: 'income',
    status: 'completed',
    category: 'Aluguel',
    amount: 1500.00,
    description: 'Aluguel Apartamento Centro - Janeiro 2025',
    date: new Date('2025-01-15'),
    propertyId: 'prop_001',
    clientId: 'client_001',
    reservationId: null,
    paymentMethod: 'PIX',
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByAI: false,
    confirmedBy: 'admin',
    confirmedAt: new Date('2025-01-15T14:30:00')
  },
  {
    id: 'trans_002',
    type: 'expense',
    status: 'completed',
    category: 'Manutenção',
    amount: 250.00,
    description: 'Reparo elétrico - Apartamento Centro',
    date: new Date('2025-01-10'),
    propertyId: 'prop_001',
    clientId: null,
    reservationId: null,
    paymentMethod: 'Débito',
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByAI: false,
    confirmedBy: 'admin',
    confirmedAt: new Date('2025-01-10T16:45:00')
  },
  {
    id: 'trans_003',
    type: 'income',
    status: 'pending',
    category: 'Aluguel',
    amount: 1200.00,
    description: 'Aluguel Casa Praia - Janeiro 2025',
    date: new Date('2025-01-20'),
    propertyId: 'prop_002',
    clientId: 'client_002',
    reservationId: 'res_001',
    paymentMethod: 'Transferência',
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByAI: true
  },
  {
    id: 'trans_004',
    type: 'income',
    status: 'completed',
    category: 'Taxa de Limpeza',
    amount: 80.00,
    description: 'Taxa de limpeza - Casa Praia',
    date: new Date('2025-01-05'),
    propertyId: 'prop_002',
    clientId: 'client_002',
    reservationId: 'res_001',
    paymentMethod: 'PIX',
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByAI: false,
    confirmedBy: 'admin',
    confirmedAt: new Date('2025-01-05T10:20:00')
  },
  {
    id: 'trans_005',
    type: 'expense',
    status: 'pending',
    category: 'Comissão',
    amount: 120.00,
    description: 'Comissão agente - Casa Praia',
    date: new Date('2025-01-25'),
    propertyId: 'prop_002',
    clientId: null,
    reservationId: 'res_001',
    paymentMethod: 'PIX',
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByAI: true
  }
];

// Dados de teste para metas financeiras
const testGoals = [
  {
    id: 'goal_001',
    name: 'Receita Mensal Janeiro 2025',
    description: 'Meta de receita para o mês de janeiro',
    type: 'income',
    category: 'revenue',
    metric: 'monthly_income',
    targetValue: 3000.00,
    startValue: 0,
    currentValue: 1580.00,
    progress: 52.67,
    period: {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31')
    },
    frequency: 'monthly',
    status: 'active',
    tenantId: TENANT_ID,
    createdBy: 'admin',
    milestones: [
      {
        id: 'milestone_001',
        name: '50% da meta',
        value: 1500.00,
        reached: true,
        reachedAt: new Date('2025-01-15')
      }
    ],
    checkpoints: [
      {
        id: 'checkpoint_001',
        date: new Date('2025-01-15'),
        value: 1500.00,
        notes: 'Primeira quinzena do mês'
      }
    ],
    alerts: [],
    notificationSettings: {
      enabled: true,
      frequency: 'daily',
      channels: ['dashboard'],
      onMilestone: true,
      onTarget: true,
      onDeviation: true,
      deviationThreshold: 10,
      recipients: []
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'goal_002',
    name: 'Redução de Custos Q1 2025',
    description: 'Reduzir custos operacionais em 15% no primeiro trimestre',
    type: 'expense',
    category: 'cost_reduction',
    metric: 'quarterly_expenses',
    targetValue: 850.00, // Reduzir para este valor
    startValue: 1000.00,
    currentValue: 370.00, // Já gastou 370, restam 480 para ficar dentro da meta
    progress: 63.0, // 63% de progresso na redução
    period: {
      start: new Date('2025-01-01'),
      end: new Date('2025-03-31')
    },
    frequency: 'quarterly',
    status: 'active',
    tenantId: TENANT_ID,
    createdBy: 'admin',
    milestones: [],
    checkpoints: [
      {
        id: 'checkpoint_002',
        date: new Date('2025-01-15'),
        value: 370.00,
        notes: 'Gastos do primeiro mês'
      }
    ],
    alerts: [],
    notificationSettings: {
      enabled: true,
      frequency: 'weekly',
      channels: ['dashboard'],
      onMilestone: false,
      onTarget: true,
      onDeviation: true,
      deviationThreshold: 15,
      recipients: []
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function addFinancialTestData() {
  try {
    console.log(`🚀 Adicionando dados de teste financeiros para tenant: ${TENANT_ID}`);

    // Adicionar transações
    console.log('\n📊 Adicionando transações...');
    for (const transaction of testTransactions) {
      const docRef = doc(db, `tenants/${TENANT_ID}/transactions`, transaction.id);
      await setDoc(docRef, {
        ...transaction,
        date: Timestamp.fromDate(transaction.date),
        createdAt: Timestamp.fromDate(transaction.createdAt),
        updatedAt: Timestamp.fromDate(transaction.updatedAt),
        ...(transaction.confirmedAt && { confirmedAt: Timestamp.fromDate(transaction.confirmedAt) })
      });
      console.log(`  ✅ Transação: ${transaction.description}`);
    }

    // Adicionar metas
    console.log('\n🎯 Adicionando metas financeiras...');
    for (const goal of testGoals) {
      const docRef = doc(db, `tenants/${TENANT_ID}/goals`, goal.id);
      await setDoc(docRef, {
        ...goal,
        period: {
          start: Timestamp.fromDate(goal.period.start),
          end: Timestamp.fromDate(goal.period.end)
        },
        milestones: goal.milestones.map(m => ({
          ...m,
          ...(m.reachedAt && { reachedAt: Timestamp.fromDate(m.reachedAt) })
        })),
        checkpoints: goal.checkpoints.map(c => ({
          ...c,
          date: Timestamp.fromDate(c.date)
        })),
        createdAt: Timestamp.fromDate(goal.createdAt),
        updatedAt: Timestamp.fromDate(goal.updatedAt)
      });
      console.log(`  ✅ Meta: ${goal.name}`);
    }

    console.log('\n✅ Dados financeiros de teste adicionados com sucesso!');
    console.log('\n📈 Resumo dos dados:');
    console.log(`  • ${testTransactions.length} transações`);
    console.log(`  • ${testGoals.length} metas financeiras`);
    console.log(`  • Receita total confirmada: R$ ${testTransactions.filter(t => t.type === 'income' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`);
    console.log(`  • Despesas totais confirmadas: R$ ${testTransactions.filter(t => t.type === 'expense' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`);
    console.log(`  • Receita pendente: R$ ${testTransactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar dados de teste:', error);
    process.exit(1);
  }
}

addFinancialTestData();