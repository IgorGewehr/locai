const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  // Será necessário adicionar suas credenciais aqui
  // ou usar um arquivo de configuração
};

// Função para verificar usuário
async function checkUserByEmail(email) {
  try {
    console.log('🔍 Verificando usuário com email:', email);

    // Buscar por email
    const usersRef = collection(db, 'users');
    const emailQuery = query(usersRef, where('email', '==', email));
    const emailSnapshot = await getDocs(emailQuery);

    if (!emailSnapshot.empty) {
      const userData = emailSnapshot.docs[0].data();
      const userId = emailSnapshot.docs[0].id;

      console.log('✅ Usuário encontrado:', {
        id: userId,
        email: userData.email,
        name: userData.name,
        createdViaWebhook: userData.createdViaWebhook,
        passwordSet: userData.passwordSet,
        createdAt: userData.createdAt,
        plan: userData.plan
      });

      // Verificar assinatura
      const subscriptionRef = doc(db, 'subscriptions', userId);
      const subscriptionSnap = await getDoc(subscriptionRef);

      if (subscriptionSnap.exists()) {
        const subscriptionData = subscriptionSnap.data();
        console.log('💳 Assinatura encontrada:', {
          active: subscriptionData.subscriptionActive,
          status: subscriptionData.subscriptionStatus,
          plan: subscriptionData.subscriptionPlan,
          saleId: subscriptionData.kirvanoSaleId
        });
      } else {
        console.log('❌ Nenhuma assinatura encontrada');
      }

      return { found: true, userId, userData };
    } else {
      console.log('❌ Usuário não encontrado');
      return { found: false };
    }

  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error);
    return { found: false, error };
  }
}

// Função para simular webhook
async function simulateWebhook(email, name = null) {
  console.log('\n🔔 Simulando webhook da Kirvano...');

  const webhookData = {
    event: 'SALE_APPROVED',
    sale_id: 'test_' + Date.now(),
    checkout_id: 'checkout_test',
    customer: {
      email: email,
      name: name || email.split('@')[0],
      document: '12345678901'
    },
    payment_method: 'pix',
    total_price: 97.00,
    type: 'RECURRING',
    status: 'approved',
    created_at: new Date().toISOString(),
    plan: {
      name: 'Plano Básico',
      next_charge_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    payment: {
      finished_at: new Date().toISOString()
    }
  };

  console.log('📦 Dados do webhook:', JSON.stringify(webhookData, null, 2));

  try {
    // Simular o processamento do webhook
    console.log('\n🔄 Processando webhook...');

    // Primeiro tentar encontrar usuário
    const userResult = await checkUserByEmail(email);

    if (!userResult.found) {
      console.log('📝 Usuário não encontrado, seria criado automaticamente');
      console.log('🎯 URL para definir senha seria:', `/set-password?email=${encodeURIComponent(email)}`);
    } else {
      console.log('👤 Usuário já existe, seria atualizada assinatura');
    }

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
  }
}

// Executar verificações
async function main() {
  const email = 'jhinpepeye@gmail.com';

  console.log('=== VERIFICAÇÃO DE USUÁRIO E WEBHOOK ===\n');

  // 1. Verificar se usuário existe
  await checkUserByEmail(email);

  // 2. Simular webhook
  await simulateWebhook(email);

  console.log('\n=== PRÓXIMOS PASSOS ===');
  console.log('1. Verificar se o webhook da Kirvano está sendo chamado');
  console.log('2. Verificar se a URL do webhook está correta');
  console.log('3. Testar criação manual do usuário');
  console.log('4. Verificar logs do servidor');
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkUserByEmail, simulateWebhook };