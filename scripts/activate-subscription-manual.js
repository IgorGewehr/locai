// Script para ativar assinatura manualmente
// Dados do webhook que falhou: Sale ID 5LZ11V0V, Email: namikage20@gmail.com

const admin = require('firebase-admin');

// Inicializar Firebase Admin (assumindo que as credenciais estão configuradas)
if (!admin.apps.length) {
  admin.initializeApp({
    // As credenciais devem estar em FIREBASE_SERVICE_ACCOUNT_KEY ou arquivo de credencial
  });
}

const db = admin.firestore();

async function activateSubscriptionManually() {
  console.log('🔄 Ativando assinatura manualmente...\n');
  
  const email = 'namikage20@gmail.com';
  const saleId = '5LZ11V0V';
  const checkoutId = '8KRGB6BQ';
  
  try {
    // 1. Encontrar usuário por email
    console.log('🔍 Buscando usuário por email:', email);
    const usersRef = db.collection('users');
    const userQuery = usersRef.where('email', '==', email);
    const userSnapshot = await userQuery.get();
    
    if (userSnapshot.empty) {
      console.log('❌ Usuário não encontrado com email:', email);
      return;
    }
    
    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log('✅ Usuário encontrado:', {
      userId,
      email: userData.email,
      name: userData.name,
      free: userData.free,
      currentPlan: userData.plan
    });
    
    // 2. Criar/Atualizar assinatura
    console.log('\n📝 Criando registro de assinatura...');
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    
    const subscriptionData = {
      subscriptionActive: true,
      subscriptionStatus: 'active',
      subscriptionPlan: 'Plano Mensal',
      subscriptionStartDate: new Date(),
      subscriptionNextChargeDate: new Date('2025-10-06'),
      
      kirvanoSaleId: saleId,
      kirvanoCheckoutId: checkoutId,
      kirvanoCustomerDocument: '11954409958',
      
      lastPaymentDate: new Date('2025-09-06'),
      lastPaymentAmount: '350.00',
      lastPaymentMethod: 'CREDIT_CARD',
      totalPayments: 1,
      
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await subscriptionRef.set(subscriptionData, { merge: true });
    console.log('✅ Assinatura criada/atualizada');
    
    // 3. Atualizar usuário (remover trial, marcar como assinante)
    console.log('\n👤 Atualizando dados do usuário...');
    await userDoc.ref.update({
      free: admin.firestore.FieldValue.delete(), // Remove campo free
      subscriptionActive: true,
      lastSubscriptionUpdate: new Date()
    });
    
    console.log('✅ Usuário atualizado - trial removido, assinatura ativa');
    
    // 4. Log do evento
    console.log('\n📋 Registrando evento...');
    const eventRef = db.collection('subscription_events').doc();
    await eventRef.set({
      userId,
      event: 'SALE_APPROVED',
      eventDescription: 'Assinatura ativada manualmente',
      saleId,
      checkoutId,
      customerEmail: email,
      paymentMethod: 'CREDIT_CARD',
      amount: 350.00,
      status: 'success',
      processedAt: new Date(),
      manualActivation: true,
      originalWebhookFailed: true
    });
    
    console.log('✅ Evento registrado');
    console.log('\n🎉 ASSINATURA ATIVADA COM SUCESSO!');
    console.log('➡️ O usuário agora tem acesso total ao sistema.');
    
  } catch (error) {
    console.error('❌ Erro ao ativar assinatura:', error);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  activateSubscriptionManually();
}

module.exports = { activateSubscriptionManually };