import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import { SubscriptionService } from '@/lib/services/subscription-service';

export const runtime = 'nodejs';

/**
 * Endpoint de teste para verificar webhook da Kirvano
 * GET /api/test/webhook-kirvano?email=teste@email.com
 * POST /api/test/webhook-kirvano - simula webhook
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email é obrigatório'
      }, { status: 400 });
    }

    logger.info('🔍 [Test] Verificando usuário por email', { email });

    // Buscar usuário por email
    const usersRef = collection(db, 'users');
    const emailQuery = query(usersRef, where('email', '==', email));
    const emailSnapshot = await getDocs(emailQuery);

    if (emailSnapshot.empty) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'Usuário não encontrado',
        email,
        nextSteps: [
          'Fazer compra na Kirvano com este email',
          'Verificar se webhook está configurado',
          'Usuário seria criado automaticamente pelo webhook'
        ]
      });
    }

    const userDoc = emailSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Verificar assinatura
    const subscriptionRef = doc(db, 'subscriptions', userId);
    const subscriptionSnap = await getDoc(subscriptionRef);

    const result = {
      success: true,
      found: true,
      user: {
        id: userId,
        email: userData.email,
        name: userData.name,
        createdViaWebhook: userData.createdViaWebhook || false,
        passwordSet: userData.passwordSet,
        createdAt: userData.createdAt,
        plan: userData.plan
      },
      subscription: null as any,
      setPasswordUrl: null as string | null
    };

    if (subscriptionSnap.exists()) {
      const subscriptionData = subscriptionSnap.data();
      result.subscription = {
        active: subscriptionData.subscriptionActive,
        status: subscriptionData.subscriptionStatus,
        plan: subscriptionData.subscriptionPlan,
        saleId: subscriptionData.kirvanoSaleId,
        lastPayment: subscriptionData.lastPaymentDate,
        nextCharge: subscriptionData.subscriptionNextChargeDate
      };
    }

    // Se usuário foi criado via webhook e não definiu senha
    if (userData.createdViaWebhook && !userData.passwordSet) {
      result.setPasswordUrl = `/set-password?email=${encodeURIComponent(email)}`;
    }

    return NextResponse.json(result);

  } catch (error) {
    logger.error('❌ [Test] Erro ao verificar usuário', error as Error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, simulateOnly = false } = body;

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email é obrigatório'
      }, { status: 400 });
    }

    logger.info('🧪 [Test] Simulando webhook da Kirvano', { email, simulateOnly });

    // Criar dados simulados do webhook
    const simulatedWebhookData = {
      event: 'SALE_APPROVED',
      sale_id: `test_${Date.now()}`,
      checkout_id: 'test_checkout',
      customer: {
        email,
        name: email.split('@')[0],
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

    if (simulateOnly) {
      return NextResponse.json({
        success: true,
        message: 'Simulação do webhook (não processado)',
        webhookData: simulatedWebhookData,
        wouldCreate: 'Usuário seria criado se não existir',
        setPasswordUrl: `/set-password?email=${encodeURIComponent(email)}`
      });
    }

    // Processar webhook real
    logger.info('🔄 [Test] Processando webhook simulado');
    const result = await SubscriptionService.processKirvanoWebhook(simulatedWebhookData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Webhook processado com sucesso',
        result,
        setPasswordUrl: `/set-password?email=${encodeURIComponent(email)}`,
        nextSteps: [
          'Verificar se usuário foi criado',
          'Acessar URL de definir senha',
          'Fazer login no sistema'
        ]
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Falha no processamento do webhook',
        details: result.message
      }, { status: 422 });
    }

  } catch (error) {
    logger.error('❌ [Test] Erro ao simular webhook', error as Error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}