import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import * as yup from 'yup';

// Force Node.js runtime para usar todas as funcionalidades
export const runtime = 'nodejs';

const setPasswordSchema = yup.object().shape({
  email: yup.string().email('Email inválido').required('Email é obrigatório'),
  password: yup.string().min(6, 'Senha deve ter pelo menos 6 caracteres').required('Senha é obrigatória'),
  token: yup.string().optional() // Token de verificação opcional
});

/**
 * Endpoint para usuários criados via webhook definirem sua senha
 * POST /api/auth/set-password
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('🔐 [Set Password] Requisição recebida');

    // Validar dados de entrada
    const body = await request.json();
    const { email, password, token } = await setPasswordSchema.validate(body);

    logger.info('🔐 [Set Password] Definindo senha para usuário', { email });

    // 1. Buscar usuário no Firestore
    const usersRef = collection(db, 'users');
    const emailQuery = query(usersRef, where('email', '==', email));
    const userSnapshot = await getDocs(emailQuery);

    if (userSnapshot.empty) {
      logger.warn('⚠️ [Set Password] Usuário não encontrado', { email });
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // 2. Verificar se usuário foi criado via webhook
    if (!userData.createdViaWebhook) {
      logger.warn('⚠️ [Set Password] Usuário não foi criado via webhook', { email, userId });
      return NextResponse.json(
        { success: false, error: 'Este usuário não precisa definir senha via este endpoint' },
        { status: 400 }
      );
    }

    // 3. Verificar se senha já foi definida
    if (userData.passwordSet) {
      logger.warn('⚠️ [Set Password] Senha já foi definida', { email, userId });
      return NextResponse.json(
        { success: false, error: 'Senha já foi definida para este usuário' },
        { status: 400 }
      );
    }

    // 4. Criar usuário no Firebase Auth
    try {
      const authResult = await createUserWithEmailAndPassword(auth, email, password);

      logger.info('✅ [Set Password] Usuário criado no Firebase Auth', {
        email,
        oldUserId: userId,
        newFirebaseUid: authResult.user.uid
      });

      // 5. IMPORTANTE: Migrar dados para o UID correto do Firebase Auth
      // Buscar dados do usuário antigo
      const oldUserRef = doc(db, 'users', userId);
      const oldUserSnap = await getDoc(oldUserRef);

      if (oldUserSnap.exists()) {
        const oldUserData = oldUserSnap.data();

        // Criar novo documento com UID do Firebase Auth
        const newUserRef = doc(db, 'users', authResult.user.uid);
        await setDoc(newUserRef, {
          ...oldUserData,
          passwordSet: true,
          firebaseUid: authResult.user.uid,
          emailVerified: authResult.user.emailVerified,
          lastLogin: serverTimestamp(),
          passwordSetAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // Manter histórico da migração
          migratedFrom: userId,
          migratedAt: serverTimestamp()
        });

        // Atualizar assinatura se existir
        const oldSubscriptionRef = doc(db, 'subscriptions', userId);
        const oldSubscriptionSnap = await getDoc(oldSubscriptionRef);

        if (oldSubscriptionSnap.exists()) {
          const subscriptionData = oldSubscriptionSnap.data();
          const newSubscriptionRef = doc(db, 'subscriptions', authResult.user.uid);
          await setDoc(newSubscriptionRef, {
            ...subscriptionData,
            userId: authResult.user.uid,
            updatedAt: serverTimestamp()
          });

          logger.info('✅ [Set Password] Assinatura migrada', {
            oldUserId: userId,
            newUserId: authResult.user.uid
          });
        }

        logger.info('✅ [Set Password] Dados migrados com sucesso', {
          oldUserId: userId,
          newUserId: authResult.user.uid
        });
      }

      // 6. Login automático não é necessário, pois o createUserWithEmailAndPassword já autentica
      const firebaseToken = await authResult.user.getIdToken();

      logger.info('✅ [Set Password] Senha definida com sucesso', {
        email,
        userId: authResult.user.uid
      });

      return NextResponse.json({
        success: true,
        message: 'Senha definida com sucesso',
        user: {
          uid: authResult.user.uid,
          email: authResult.user.email,
          emailVerified: authResult.user.emailVerified
        },
        firebaseToken,
        redirectTo: '/dashboard'
      });

    } catch (authError: any) {
      logger.error('❌ [Set Password] Erro ao criar usuário no Firebase Auth', authError, {
        email,
        userId,
        code: authError.code
      });

      // Tratar erros específicos do Firebase Auth
      let errorMessage = 'Erro interno ao definir senha';

      if (authError.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já possui uma conta. Tente fazer login.';
      } else if (authError.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      } else if (authError.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

  } catch (error) {
    if (error instanceof yup.ValidationError) {
      logger.warn('⚠️ [Set Password] Dados inválidos', {
        errors: error.errors,
        path: error.path
      });
      return NextResponse.json(
        { success: false, error: error.errors[0] },
        { status: 400 }
      );
    }

    logger.error('❌ [Set Password] Erro interno', error as Error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Verificar se email precisa definir senha
 * GET /api/auth/set-password?email=user@example.com
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar usuário
    const usersRef = collection(db, 'users');
    const emailQuery = query(usersRef, where('email', '==', email));
    const userSnapshot = await getDocs(emailQuery);

    if (userSnapshot.empty) {
      return NextResponse.json({
        success: true,
        needsPassword: false,
        reason: 'user_not_found'
      });
    }

    const userData = userSnapshot.docs[0].data();

    const needsPassword = userData.createdViaWebhook && !userData.passwordSet;

    return NextResponse.json({
      success: true,
      needsPassword,
      createdViaWebhook: userData.createdViaWebhook || false,
      passwordSet: userData.passwordSet || false,
      user: {
        name: userData.name || userData.fullName,
        email: userData.email,
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt
      }
    });

  } catch (error) {
    logger.error('❌ [Set Password] Erro ao verificar status', error as Error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}