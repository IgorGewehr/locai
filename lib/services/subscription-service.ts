import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import { UserSubscription, SubscriptionEvent, KirvanoWebhookEvent, TrialStatus, SubscriptionValidation } from '@/lib/types/subscription';

export class SubscriptionService {
  
  /**
   * Verifica se o usuário tem acesso válido (trial ativo ou assinatura)
   */
  static async validateUserAccess(userId: string): Promise<SubscriptionValidation> {
    try {
      logger.info('🔍 [Subscription] Validando acesso do usuário', { userId });
      
      // 1. Buscar dados do usuário
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return {
          isValid: false,
          hasAccess: false,
          reason: 'no_subscription',
          message: 'Usuário não encontrado'
        };
      }
      
      const userData = userSnap.data();
      
      // DEBUG: Log completo dos dados do usuário
      logger.info('📊 [Subscription] DEBUG - Dados completos do usuário', {
        userId,
        email: userData.email,
        free: userData.free,
        freeType: typeof userData.free,
        plan: userData.plan,
        createdAt: userData.createdAt?.toDate(),
        isActive: userData.isActive
      });
      
      // 2. Buscar assinatura do usuário
      const subscriptionRef = doc(db, 'subscriptions', userId);
      const subscriptionSnap = await getDoc(subscriptionRef);
      
      let subscription: UserSubscription | undefined;
      
      if (subscriptionSnap.exists()) {
        subscription = { id: subscriptionSnap.id, ...subscriptionSnap.data() } as UserSubscription;
        
        // Verificar se assinatura está ativa
        if (subscription.subscriptionActive && subscription.subscriptionStatus === 'active') {
          logger.info('✅ [Subscription] Usuário com assinatura ativa', { userId });
          return {
            isValid: true,
            hasAccess: true,
            reason: 'active_subscription',
            subscription
          };
        }
      }
      
      // 3. Verificar trial gratuito
      if (userData.free && typeof userData.free === 'number') {
        const trialStatus = this.calculateTrialStatus(userData.createdAt?.toDate() || new Date(), userData.free);
        
        logger.info('🔍 [Subscription] DEBUG - Verificando trial', {
          userId,
          free: userData.free,
          createdAt: userData.createdAt?.toDate(),
          hasTrialExpired: trialStatus.hasTrialExpired,
          daysRemaining: trialStatus.daysRemaining
        });
        
        if (!trialStatus.hasTrialExpired) {
          logger.info('✅ [Subscription] Usuário em trial ativo', { 
            userId, 
            daysRemaining: trialStatus.daysRemaining 
          });
          return {
            isValid: true,
            hasAccess: true,
            reason: 'trial_active',
            trialStatus,
            subscription
          };
        } else {
          logger.warn('🚨 [Subscription] TRIAL EXPIRADO - DEVE BLOQUEAR!', { 
            userId,
            free: userData.free,
            daysRemaining: trialStatus.daysRemaining,
            hasTrialExpired: trialStatus.hasTrialExpired
          });
          return {
            isValid: false,
            hasAccess: false,
            reason: 'trial_expired',
            redirectUrl: 'https://moneyin.agency/alugazapplanos/',
            message: 'Seu período de teste expirou. Assine um plano para continuar.',
            trialStatus,
            subscription
          };
        }
      }
      
      // 🚨 FALLBACK INTELIGENTE: Usuários sem campo 'free' 
      if (!userData.hasOwnProperty('free')) {
        // Verificar data de criação para determinar estratégia
        const accountAge = this.calculateAccountAge(userData.createdAt?.toDate() || new Date());
        
        // Usuários criados há mais de 30 dias sem configuração = acesso livre
        if (accountAge > 30) {
          logger.info('✅ [Subscription] Usuário legacy (>30 dias) - acesso liberado', { 
            userId, 
            accountAgeDays: accountAge 
          });
          return {
            isValid: true,
            hasAccess: true,
            reason: 'legacy_user_grandfathered',
            message: 'Usuário grandfathered - acesso mantido',
            subscription
          };
        } else {
          // Usuários novos sem configuração = período de graça de 7 dias
          const gracePeriodEnd = new Date(userData.createdAt?.toDate() || new Date());
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
          
          if (new Date() <= gracePeriodEnd) {
            const daysRemaining = Math.ceil((gracePeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            logger.info('✅ [Subscription] Usuário em período de graça', { 
              userId, 
              daysRemaining 
            });
            return {
              isValid: true,
              hasAccess: true,
              reason: 'grace_period_active',
              message: `Período de graça: ${daysRemaining} dias restantes`,
              trialStatus: {
                hasTrialExpired: false,
                daysRemaining,
                trialEndDate: gracePeriodEnd,
                shouldRedirectToPlans: false,
                isSubscriptionActive: false
              },
              subscription
            };
          } else {
            logger.warn('⚠️ [Subscription] Período de graça expirado', { userId });
            return {
              isValid: false,
              hasAccess: false,
              reason: 'grace_period_expired',
              redirectUrl: 'https://moneyin.agency/alugazapplanos/',
              message: 'Período de graça expirou. Assine um plano para continuar.',
              subscription
            };
          }
        }
      }
      
      // 4. Usuário com free: 0 (trial expirado) - BLOQUEAR
      if (userData.free === 0) {
        logger.warn('🚨 [Subscription] FREE = 0 - BLOQUEANDO USUÁRIO!', { 
          userId,
          email: userData.email,
          createdAt: userData.createdAt?.toDate(),
          free: userData.free,
          plan: userData.plan 
        });
        return {
          isValid: false,
          hasAccess: false,
          reason: 'trial_expired',
          redirectUrl: 'https://moneyin.agency/alugazapplanos/',
          message: 'Seu período de teste expirou. Assine um plano para continuar.',
          subscription
        };
      }
      
      // 5. Usuário com free: null (sem trial) - permitir acesso (usuários antigos)
      if (userData.free === null) {
        logger.info('✅ [Subscription] Usuário sem trial (legado) - acesso liberado', { userId });
        return {
          isValid: true,
          hasAccess: true,
          reason: 'no_trial_restriction',
          message: 'Usuário sem restrições de trial',
          subscription
        };
      }
      
      // 5. Último recurso - negar acesso apenas se explicitamente configurado
      logger.warn('⚠️ [Subscription] Configuração de trial não reconhecida', { 
        userId, 
        freeValue: userData.free 
      });
      return {
        isValid: false,
        hasAccess: false,
        reason: 'no_subscription',
        redirectUrl: 'https://moneyin.agency/alugazapplanos/',
        message: 'Assine um plano para acessar o sistema.',
        subscription
      };
      
    } catch (error) {
      logger.error('❌ [Subscription] Erro na validação de acesso', error as Error, { userId });
      
      return {
        isValid: false,
        hasAccess: false,
        reason: 'no_subscription',
        message: 'Erro ao validar acesso. Tente novamente.'
      };
    }
  }
  
  /**
   * Calcula status do trial baseado na data de criação
   * LÓGICA DIRETA: o valor free representa os dias de trial INICIAIS
   * Se já passou mais tempo que o free inicial desde a criação, trial expirou
   */
  static calculateTrialStatus(createdAt: Date, initialFreeDays: number): TrialStatus {
    const now = new Date();
    
    // Calcular quantos dias se passaram desde a criação da conta
    const daysPassed = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // LÓGICA SIMPLES: se passaram mais dias do que o trial inicial, expirou
    const hasTrialExpired = daysPassed >= initialFreeDays;
    
    // Calcular dias restantes: trial inicial - dias que passaram
    const daysRemaining = hasTrialExpired ? 0 : Math.max(0, initialFreeDays - daysPassed);
    
    // Data de expiração: data criação + dias iniciais do trial
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + initialFreeDays);
    
    logger.info('🔍 [Subscription] Cálculo de trial CORRIGIDO', {
      daysPassed,
      initialFreeDays,
      daysRemaining,
      hasTrialExpired,
      createdAt: createdAt.toLocaleDateString(),
      now: now.toLocaleDateString(),
      trialEndDate: trialEndDate.toLocaleDateString()
    });
    
    return {
      hasTrialExpired,
      daysRemaining,
      trialEndDate,
      shouldRedirectToPlans: hasTrialExpired,
      isSubscriptionActive: false
    };
  }
  
  /**
   * Calcula idade da conta em dias
   */
  static calculateAccountAge(createdAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  /**
   * Processa webhook do Kirvano
   */
  static async processKirvanoWebhook(webhookData: KirvanoWebhookEvent): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('🔔 [Subscription] Processando webhook Kirvano', {
        event: webhookData.event,
        saleId: webhookData.sale_id,
        customerEmail: webhookData.customer.email
      });
      
      // Encontrar usuário pelo email ou documento
      let userId = await this.findUserByEmailOrDocument(
        webhookData.customer.email,
        webhookData.customer.document
      );

      // Se usuário não existe e é uma venda aprovada, criar automaticamente
      if (!userId && webhookData.event === 'SALE_APPROVED') {
        logger.info('🔄 [Subscription] Criando usuário automaticamente via webhook', {
          email: webhookData.customer.email,
          saleId: webhookData.sale_id
        });

        try {
          userId = await this.createUserFromWebhook(webhookData);

          logger.info('✅ [Subscription] Usuário criado via webhook - pode definir senha em /set-password', {
            userId,
            email: webhookData.customer.email,
            setPasswordUrl: `/set-password?email=${encodeURIComponent(webhookData.customer.email)}`
          });

        } catch (createError) {
          logger.error('❌ [Subscription] Erro ao criar usuário via webhook', createError as Error, {
            email: webhookData.customer.email,
            saleId: webhookData.sale_id
          });

          await this.logSubscriptionEvent({
            userId: 'failed_creation',
            event: webhookData.event,
            eventDescription: webhookData.event_description,
            kirvanoEvent: webhookData,
            status: 'failed',
            processedAt: new Date(),
            errorMessage: 'Erro ao criar usuário automaticamente'
          });

          return { success: false, message: 'Erro ao criar usuário automaticamente' };
        }
      }

      if (!userId) {
        logger.warn('⚠️ [Subscription] Usuário não encontrado para webhook', {
          email: webhookData.customer.email,
          document: webhookData.customer.document,
          event: webhookData.event
        });

        // Log do evento mesmo sem usuário
        await this.logSubscriptionEvent({
          userId: 'unknown',
          event: webhookData.event,
          eventDescription: webhookData.event_description,
          kirvanoEvent: webhookData,
          status: 'failed',
          processedAt: new Date(),
          errorMessage: 'Usuário não encontrado e evento não é SALE_APPROVED'
        });

        return { success: false, message: 'Usuário não encontrado' };
      }
      
      // Processar diferentes eventos
      let result: { success: boolean; message: string };
      
      switch (webhookData.event) {
        case 'SALE_APPROVED':
          result = await this.handleSaleApproved(userId, webhookData);
          break;
          
        case 'SUBSCRIPTION_CANCELED':
          result = await this.handleSubscriptionCanceled(userId, webhookData);
          break;
          
        case 'SUBSCRIPTION_EXPIRED':
          result = await this.handleSubscriptionExpired(userId, webhookData);
          break;
          
        case 'SUBSCRIPTION_RENEWED':
          result = await this.handleSubscriptionRenewed(userId, webhookData);
          break;
          
        case 'SALE_REFUNDED':
        case 'SALE_CHARGEBACK':
          result = await this.handleSubscriptionRevoked(userId, webhookData);
          break;
          
        default:
          // Eventos que não afetam assinatura diretamente
          result = await this.handleOtherEvent(userId, webhookData);
          break;
      }
      
      // Log do evento processado
      const eventLogData: Omit<SubscriptionEvent, 'id'> = {
        userId,
        event: webhookData.event,
        eventDescription: webhookData.event_description,
        kirvanoEvent: webhookData,
        status: result.success ? 'processed' : 'failed',
        processedAt: new Date()
      };

      // Só incluir errorMessage se houver erro
      if (!result.success && result.message) {
        eventLogData.errorMessage = result.message;
      }

      await this.logSubscriptionEvent(eventLogData);
      
      return result;
      
    } catch (error) {
      logger.error('❌ [Subscription] Erro no processamento do webhook', error as Error, {
        event: webhookData.event,
        saleId: webhookData.sale_id
      });
      
      return { success: false, message: 'Erro interno no processamento' };
    }
  }
  
  /**
   * Handle venda aprovada
   */
  private static async handleSaleApproved(userId: string, webhookData: KirvanoWebhookEvent): Promise<{ success: boolean; message: string }> {
    try {
      // Determinar se é assinatura ou compra única
      const isSubscription = webhookData.type === 'RECURRING';

      // Log detalhado dos dados recebidos
      logger.info('🔍 [Subscription] Processando SALE_APPROVED', {
        userId,
        saleId: webhookData.sale_id,
        type: webhookData.type,
        isSubscription,
        planName: webhookData.plan?.name,
        totalPrice: webhookData.total_price,
        fiscalValue: webhookData.fiscal?.total_value,
        customerEmail: webhookData.customer.email
      });

      // Buscar ou criar registro de assinatura
      const subscriptionRef = doc(db, 'subscriptions', userId);
      const subscriptionSnap = await getDoc(subscriptionRef);

      // Usar valor fiscal se disponível, senão usar total_price
      const paymentAmount = webhookData.fiscal?.total_value?.toString() || webhookData.total_price;

      const subscriptionData: UserSubscription = {
        userId,
        subscriptionActive: true,
        subscriptionStatus: 'active',
        subscriptionPlan: webhookData.plan?.name || 'Plano Único',
        subscriptionStartDate: new Date(webhookData.created_at),
        subscriptionNextChargeDate: webhookData.plan?.next_charge_date ? new Date(webhookData.plan.next_charge_date) : undefined,

        kirvanoSaleId: webhookData.sale_id,
        kirvanoCheckoutId: webhookData.checkout_id,
        kirvanoCustomerDocument: webhookData.customer.document || '',

        lastPaymentDate: new Date(webhookData.payment.finished_at || webhookData.created_at),
        lastPaymentAmount: paymentAmount,
        lastPaymentMethod: webhookData.payment_method,
        totalPayments: subscriptionSnap.exists() ? (subscriptionSnap.data().totalPayments || 0) + 1 : 1,

        createdAt: subscriptionSnap.exists() ? subscriptionSnap.data().createdAt : new Date(),
        updatedAt: new Date()
      };

      await setDoc(subscriptionRef, subscriptionData, { merge: true });

      // Atualizar dados do usuário
      const userRef = doc(db, 'users', userId);
      const updateData: any = {
        free: null, // Remove campo free - usuario tem acesso total
        subscriptionActive: true,
        plan: 'premium', // Atualiza para plano premium
        lastSubscriptionUpdate: Timestamp.now()
      };

      // Tratamento diferencial entre usuários novos e existentes
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (!userData.createdViaWebhook) {
          // Para usuários existentes (não criados via webhook)
          updateData.emailVerified = true; // Usuário pagante = email verificado
        }

        // Log diferencial baseado no tipo de usuário
        logger.info('🔍 [Subscription] Atualizando usuário existente', {
          userId,
          isWebhookUser: !!userData.createdViaWebhook,
          previousPlan: userData.plan,
          newPlan: updateData.plan,
          previousSubscriptionStatus: userData.subscriptionActive
        });
      } else {
        // Cenário improvável mas possível - usuário foi deletado entre criação e ativação
        logger.error('❌ [Subscription] Usuário não encontrado durante ativação de assinatura', {
          userId,
          saleId: webhookData.sale_id
        });
        throw new Error('Usuário não encontrado durante ativação de assinatura');
      }

      await updateDoc(userRef, updateData);

      logger.info('✅ [Subscription] Assinatura ativada com sucesso', {
        userId,
        plan: subscriptionData.subscriptionPlan,
        isSubscription,
        totalPayments: subscriptionData.totalPayments,
        paymentAmount
      });

      return { success: true, message: 'Assinatura ativada com sucesso' };

    } catch (error) {
      logger.error('❌ [Subscription] Erro ao ativar assinatura', error as Error, {
        userId,
        saleId: webhookData.sale_id,
        errorMessage: (error as Error).message,
        ...(process.env.NODE_ENV === 'development' && { stack: (error as Error).stack })
      });
      return { success: false, message: `Erro ao ativar assinatura: ${(error as Error).message}` };
    }
  }
  
  /**
   * Handle assinatura cancelada
   */
  private static async handleSubscriptionCanceled(userId: string, webhookData: KirvanoWebhookEvent): Promise<{ success: boolean; message: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', userId);
      
      await updateDoc(subscriptionRef, {
        subscriptionActive: false,
        subscriptionStatus: 'canceled',
        updatedAt: new Date()
      });
      
      // Atualizar usuário
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionActive: false,
        lastSubscriptionUpdate: Timestamp.now()
      });
      
      logger.info('⚠️ [Subscription] Assinatura cancelada', { userId });
      
      return { success: true, message: 'Assinatura cancelada' };
      
    } catch (error) {
      logger.error('❌ [Subscription] Erro ao cancelar assinatura', error as Error, { userId });
      return { success: false, message: 'Erro ao cancelar assinatura' };
    }
  }
  
  /**
   * Handle assinatura expirada/atrasada
   */
  private static async handleSubscriptionExpired(userId: string, webhookData: KirvanoWebhookEvent): Promise<{ success: boolean; message: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', userId);
      
      await updateDoc(subscriptionRef, {
        subscriptionActive: false,
        subscriptionStatus: 'expired',
        updatedAt: new Date()
      });
      
      // Atualizar usuário  
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionActive: false,
        lastSubscriptionUpdate: Timestamp.now()
      });
      
      logger.warn('⚠️ [Subscription] Assinatura expirada', { userId });
      
      return { success: true, message: 'Assinatura marcada como expirada' };
      
    } catch (error) {
      logger.error('❌ [Subscription] Erro ao marcar assinatura como expirada', error as Error, { userId });
      return { success: false, message: 'Erro ao processar expiração' };
    }
  }
  
  /**
   * Handle assinatura renovada
   */
  private static async handleSubscriptionRenewed(userId: string, webhookData: KirvanoWebhookEvent): Promise<{ success: boolean; message: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', userId);
      const subscriptionSnap = await getDoc(subscriptionRef);
      
      await updateDoc(subscriptionRef, {
        subscriptionActive: true,
        subscriptionStatus: 'active',
        subscriptionNextChargeDate: webhookData.plan?.next_charge_date ? new Date(webhookData.plan.next_charge_date) : undefined,
        lastPaymentDate: new Date(webhookData.payment.finished_at || webhookData.created_at),
        lastPaymentAmount: webhookData.total_price,
        lastPaymentMethod: webhookData.payment_method,
        totalPayments: subscriptionSnap.exists() ? (subscriptionSnap.data().totalPayments || 0) + 1 : 1,
        updatedAt: new Date()
      });
      
      // Atualizar usuário
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionActive: true,
        lastSubscriptionUpdate: Timestamp.now()
      });
      
      logger.info('✅ [Subscription] Assinatura renovada', { userId });
      
      return { success: true, message: 'Assinatura renovada com sucesso' };
      
    } catch (error) {
      logger.error('❌ [Subscription] Erro ao renovar assinatura', error as Error, { userId });
      return { success: false, message: 'Erro ao renovar assinatura' };
    }
  }
  
  /**
   * Handle reembolso/chargeback (revoga acesso)
   */
  private static async handleSubscriptionRevoked(userId: string, webhookData: KirvanoWebhookEvent): Promise<{ success: boolean; message: string }> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', userId);
      
      await updateDoc(subscriptionRef, {
        subscriptionActive: false,
        subscriptionStatus: webhookData.event === 'SALE_REFUNDED' ? 'canceled' : 'suspended',
        updatedAt: new Date()
      });
      
      // Atualizar usuário
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionActive: false,
        lastSubscriptionUpdate: Timestamp.now()
      });
      
      logger.warn('⚠️ [Subscription] Acesso revogado', { 
        userId, 
        reason: webhookData.event 
      });
      
      return { success: true, message: 'Acesso revogado devido a ' + webhookData.event };
      
    } catch (error) {
      logger.error('❌ [Subscription] Erro ao revogar acesso', error as Error, { userId });
      return { success: false, message: 'Erro ao revogar acesso' };
    }
  }
  
  /**
   * Handle outros eventos (não críticos)
   */
  private static async handleOtherEvent(userId: string, webhookData: KirvanoWebhookEvent): Promise<{ success: boolean; message: string }> {
    logger.info('ℹ️ [Subscription] Evento não crítico processado', {
      userId,
      event: webhookData.event
    });
    
    return { success: true, message: 'Evento registrado' };
  }
  
  /**
   * Encontra usuário por email ou documento, ou cria se não existir
   */
  private static async findUserByEmailOrDocument(email: string, document: string): Promise<string | null> {
    try {
      // Buscar por email primeiro
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        return emailSnapshot.docs[0].id;
      }

      // Buscar por documento se não encontrou por email
      if (document) {
        const documentQuery = query(usersRef, where('document', '==', document));
        const documentSnapshot = await getDocs(documentQuery);

        if (!documentSnapshot.empty) {
          return documentSnapshot.docs[0].id;
        }
      }

      return null;

    } catch (error) {
      logger.error('❌ [Subscription] Erro ao buscar usuário', error as Error, { email, document });
      return null;
    }
  }

  /**
   * Cria usuário automaticamente a partir dos dados do webhook
   */
  private static async createUserFromWebhook(webhookData: KirvanoWebhookEvent): Promise<string> {
    try {
      const { email, name, document, phone_number } = webhookData.customer;

      // Validação robusta do email
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        throw new Error('Email inválido ou não fornecido');
      }

      // Validar se email já existe (race condition prevention)
      const existingUser = await this.findUserByEmailOrDocument(email, document);
      if (existingUser) {
        logger.warn('⚠️ [Subscription] Usuário já existe durante criação - possível race condition', {
          email,
          existingUserId: existingUser,
          saleId: webhookData.sale_id
        });
        return existingUser; // Retorna o usuário existente em vez de criar duplicata
      }

      // Gerar ID único para o usuário
      const usersRef = collection(db, 'users');
      const newUserDoc = doc(usersRef);
      const userId = newUserDoc.id;

      // Extrair nome e sobrenome com validação
      const fullName = (name && typeof name === 'string' && name.trim()) ? name.trim() : email.split('@')[0];
      const [firstName, ...lastNameArray] = fullName.split(' ');
      const lastName = lastNameArray.join(' ');

      // Limpar e validar documento
      const cleanDocument = document && typeof document === 'string' ? document.replace(/[^0-9]/g, '') : '';

      // Limpar telefone
      const cleanPhone = phone_number && typeof phone_number === 'string' ? phone_number.replace(/[^0-9]/g, '') : '';

      const userData = {
        email: email.toLowerCase().trim(),
        name: fullName,
        fullName,
        firstName: firstName || '',
        lastName: lastName || '',
        document: cleanDocument,
        phone: cleanPhone,
        role: 'user',
        isActive: true,
        emailVerified: false,
        plan: 'premium', // Usuário já pagou, então é premium
        free: null, // Remove restrições de trial
        subscriptionActive: true, // Já tem assinatura ativa
        createdAt: Timestamp.now(),
        lastLogin: null,
        whatsappNumbers: [],
        authProvider: 'kirvano_webhook',
        firstAccess: true,
        // Campos especiais para usuários criados via webhook
        createdViaWebhook: true,
        passwordSet: false, // Indica que o usuário ainda precisa definir senha
        webhookData: {
          saleId: webhookData.sale_id,
          checkoutId: webhookData.checkout_id,
          planName: webhookData.plan?.name || 'Plano Único',
          totalValue: webhookData.fiscal?.total_value || webhookData.total_price,
          paymentMethod: webhookData.payment_method,
          createdAt: Timestamp.now(),
          source: 'kirvano'
        }
      };

      // Usar setDoc sem merge para garantir que não sobrescreva usuário existente
      await setDoc(newUserDoc, userData);

      logger.info('✅ [Subscription] Usuário criado via webhook', {
        userId,
        email: userData.email,
        name: fullName,
        document: cleanDocument,
        phone: cleanPhone,
        plan: userData.plan,
        saleId: webhookData.sale_id,
        planName: webhookData.plan?.name,
        setPasswordUrl: `/set-password?email=${encodeURIComponent(userData.email)}`
      });

      // TODO: Implementar envio de email de boas-vindas com link para definir senha
      // await this.sendWelcomeEmail(userData.email, fullName, userId);

      return userId;

    } catch (error) {
      logger.error('❌ [Subscription] Erro ao criar usuário via webhook', error as Error, {
        email: webhookData.customer?.email,
        saleId: webhookData.sale_id,
        errorMessage: (error as Error).message
      });
      throw error;
    }
  }
  
  /**
   * Log evento de assinatura
   */
  private static async logSubscriptionEvent(eventData: Omit<SubscriptionEvent, 'id'>): Promise<void> {
    try {
      const eventsRef = collection(db, 'subscription_events');
      await addDoc(eventsRef, {
        ...eventData,
        createdAt: Timestamp.now()
      });
      
    } catch (error) {
      logger.error('❌ [Subscription] Erro ao salvar log do evento', error as Error);
    }
  }
  
  /**
   * Busca assinatura do usuário
   */
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const subscriptionRef = doc(db, 'subscriptions', userId);
      const subscriptionSnap = await getDoc(subscriptionRef);
      
      if (subscriptionSnap.exists()) {
        return { id: subscriptionSnap.id, ...subscriptionSnap.data() } as UserSubscription;
      }
      
      return null;
      
    } catch (error) {
      logger.error('❌ [Subscription] Erro ao buscar assinatura', error as Error, { userId });
      return null;
    }
  }
}