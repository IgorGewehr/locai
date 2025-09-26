import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import * as yup from 'yup';

// Force Node.js runtime para usar todas as funcionalidades
export const runtime = 'nodejs';

const setPasswordSchema = yup.object().shape({
  email: yup.string().email('Email inválido').required('Email é obrigatório'),
  password: yup.string().min(6, 'Senha deve ter pelo menos 6 caracteres').required('Senha é obrigatória'),
  userId: yup.string().required('User ID é obrigatório'),
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
    const { email, password, userId, token } = await setPasswordSchema.validate(body);

    logger.info('🔐 [Set Password] Definindo senha para usuário', { email });

    // 1. Buscar usuário no Firestore pelo userId (mais eficiente)
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      logger.warn('⚠️ [Set Password] Usuário não encontrado', { email, userId });
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const userData = userSnap.data();

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

    // 4. Definir senha - Verificar se usuário tem firebaseUid ou usar método tradicional
    try {
      if (userData.firebaseUid) {
        // 🎯 MÉTODO 1: Usuário foi criado via Admin SDK, apenas definir senha
        const { auth: adminAuth } = await import('@/lib/firebase/admin');
        
        if (!adminAuth) {
          throw new Error('Firebase Admin Auth não inicializado');
        }

        // Definir senha no usuário que já existe no Firebase Auth
        await adminAuth.updateUser(userData.firebaseUid, {
          password: password,
          emailVerified: false
        });

        logger.info('✅ [Set Password] Senha definida no Firebase Auth existente', {
          email,
          firebaseUid: userData.firebaseUid
        });

        // Atualizar status no Firestore
        await updateDoc(userRef, {
          passwordSet: true,
          needsPasswordSetup: false,
          passwordSetAt: new Date(),
          updatedAt: new Date()
        });

        // Login automático
        const authResult = await signInWithEmailAndPassword(auth, email, password);
        const firebaseToken = await authResult.user.getIdToken();

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
        
      } else {
        // 🔄 MÉTODO 2: Usuário criado no Firestore apenas, criar no Firebase Auth e migrar
        const authResult = await createUserWithEmailAndPassword(auth, email, password);

        logger.info('✅ [Set Password] Usuário criado no Firebase Auth', {
          email,
          oldUserId: userId,
          newFirebaseUid: authResult.user.uid
        });

        // Migrar dados para o UID correto do Firebase Auth
        const oldUserData = userData;
        const newUserRef = doc(db, 'users', authResult.user.uid);
        
        await setDoc(newUserRef, {
          ...oldUserData,
          passwordSet: true,
          needsPasswordSetup: false,
          firebaseUid: authResult.user.uid,
          emailVerified: authResult.user.emailVerified,
          lastLogin: new Date(),
          passwordSetAt: new Date(),
          updatedAt: new Date(),
          // Manter histórico da migração
          migratedFrom: userId,
          migratedAt: new Date()
        });

        // Migrar assinatura se existir
        const oldSubscriptionRef = doc(db, 'subscriptions', userId);
        const oldSubscriptionSnap = await getDoc(oldSubscriptionRef);

        if (oldSubscriptionSnap.exists()) {
          const subscriptionData = oldSubscriptionSnap.data();
          const newSubscriptionRef = doc(db, 'subscriptions', authResult.user.uid);
          await setDoc(newSubscriptionRef, {
            ...subscriptionData,
            userId: authResult.user.uid,
            updatedAt: new Date()
          });

          logger.info('✅ [Set Password] Assinatura migrada', {
            oldUserId: userId,
            newUserId: authResult.user.uid
          });
        }

        const firebaseToken = await authResult.user.getIdToken();

        logger.info('✅ [Set Password] Migração completa com sucesso', {
          email,
          oldUserId: userId,
          newUserId: authResult.user.uid
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
      }

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
    const userId = userSnapshot.docs[0].id;

    const needsPassword = userData.createdViaWebhook && !userData.passwordSet;

    return NextResponse.json({
      success: true,
      needsPassword,
      createdViaWebhook: userData.createdViaWebhook || false,
      passwordSet: userData.passwordSet || false,
      userId, // ← Incluir userId para usar no POST
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