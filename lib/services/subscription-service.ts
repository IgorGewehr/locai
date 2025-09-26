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
      await this.logSubscriptionEvent({
        userId,
        event: webhookData.event,
        eventDescription: webhookData.event_description,
        kirvanoEvent: webhookData,
        status: result.success ? 'processed' : 'failed',
        processedAt: new Date(),
        errorMessage: result.success ? undefined : result.message
      });
      
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
      
      // Buscar ou criar registro de assinatura
      const subscriptionRef = doc(db, 'subscriptions', userId);
      const subscriptionSnap = await getDoc(subscriptionRef);
      
      const subscriptionData: UserSubscription = {
        userId,
        subscriptionActive: true,
        subscriptionStatus: 'active',
        subscriptionPlan: webhookData.plan?.name || 'Plano Único',
        subscriptionStartDate: new Date(webhookData.created_at),
        // Não incluir campos undefined - Firebase não aceita
        ...(webhookData.plan?.next_charge_date && {
          subscriptionNextChargeDate: new Date(webhookData.plan.next_charge_date)
        }),
        
        kirvanoSaleId: webhookData.sale_id,
        kirvanoCheckoutId: webhookData.checkout_id,
        kirvanoCustomerDocument: webhookData.customer.document,
        
        lastPaymentDate: new Date(webhookData.payment.finished_at || webhookData.created_at),
        lastPaymentAmount: webhookData.total_price,
        lastPaymentMethod: webhookData.payment_method,
        totalPayments: subscriptionSnap.exists() ? (subscriptionSnap.data().totalPayments || 0) + 1 : 1,
        
        createdAt: subscriptionSnap.exists() ? subscriptionSnap.data().createdAt : new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(subscriptionRef, subscriptionData, { merge: true });
      
      // Remover dados de trial do usuário
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        free: null, // Remove campo free
        subscriptionActive: true,
        lastSubscriptionUpdate: Timestamp.now()
      });
      
      logger.info('✅ [Subscription] Assinatura ativada', {
        userId,
        plan: subscriptionData.subscriptionPlan,
        isSubscription
      });
      
      return { success: true, message: 'Assinatura ativada com sucesso' };
      
    } catch (error) {
      logger.error('❌ [Subscription] Erro ao ativar assinatura', error as Error, { userId });
      return { success: false, message: 'Erro ao ativar assinatura' };
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
      
      const updateData: any = {
        subscriptionActive: true,
        subscriptionStatus: 'active',
        lastPaymentDate: new Date(webhookData.payment.finished_at || webhookData.created_at),
        lastPaymentAmount: webhookData.total_price,
        lastPaymentMethod: webhookData.payment_method,
        totalPayments: subscriptionSnap.exists() ? (subscriptionSnap.data().totalPayments || 0) + 1 : 1,
        updatedAt: new Date()
      };
      
      // Só adicionar next_charge_date se existir
      if (webhookData.plan?.next_charge_date) {
        updateData.subscriptionNextChargeDate = new Date(webhookData.plan.next_charge_date);
      }
      
      await updateDoc(subscriptionRef, updateData);
      
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
   * APENAS MÉTODO TRADICIONAL - Firebase Admin SDK é usado em API routes separadas
   */
  private static async createUserFromWebhook(webhookData: KirvanoWebhookEvent): Promise<string> {
    const { email, name, document } = webhookData.customer;
    
    // Extrair nome e sobrenome
    const fullName = name || email.split('@')[0];
    const [firstName, ...lastNameArray] = fullName.split(' ');
    const lastName = lastNameArray.join(' ');

    try {
      // Criar apenas no Firestore - Firebase Auth será criado via API route separada
      const usersRef = collection(db, 'users');
      const newUserDoc = doc(usersRef);
      const userId = newUserDoc.id;

      const userData = {
        email,
        name: fullName,
        fullName,
        firstName: firstName || '',
        lastName: lastName || '',
        document: document || '',
        role: 'user',
        isActive: true,
        emailVerified: false,
        plan: 'free',
        createdAt: new Date(),
        lastLogin: null,
        whatsappNumbers: [],
        authProvider: 'kirvano_webhook',
        firstAccess: true,
        
        // Campos especiais para usuários criados via webhook
        createdViaWebhook: true,
        passwordSet: false, // Indica que o usuário ainda precisa definir senha
        needsPasswordSetup: true,
        
        webhookData: {
          saleId: webhookData.sale_id,
          checkoutId: webhookData.checkout_id,
          createdAt: new Date(),
          source: 'kirvano'
        }
      };

      await setDoc(newUserDoc, userData);

      logger.info('✅ [Subscription] Usuário criado via método tradicional (Firestore apenas)', {
        userId,
        email,
        name: fullName,
        saleId: webhookData.sale_id
      });

      return userId;

    } catch (error) {
      logger.error('❌ [Subscription] Erro ao criar usuário via webhook', error as Error, {
        email: webhookData.customer.email,
        saleId: webhookData.sale_id
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
      
      // Filtrar valores undefined antes de salvar no Firebase
      const cleanEventData = {
        ...eventData,
        errorMessage: eventData.errorMessage || null, // Converter undefined para null
        createdAt: Timestamp.now()
      };
      
      await addDoc(eventsRef, cleanEventData);
      
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