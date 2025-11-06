// app/api/admin/users-enhanced/route.ts
// Ultra-optimized admin API with comprehensive user metrics and onboarding tracking

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime para usar firebase-admin
export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';

interface UserMetrics {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  plan: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date | null;
  lastLogin: Date | null;

  // Métricas reais
  propertyCount: number;
  reservationCount: number;
  clientCount: number;
  totalTicketsCount: number;
  newTicketsCount: number;

  // Onboarding Progress
  onboardingProgress: {
    completionPercentage: number;
    completedSteps: string[];
    currentStep: string | null;
    isCompleted: boolean;
    totalSteps: number;
    completedStepsCount: number;
  };

  // Metadata
  metadata: {
    emailVerified: boolean;
    provider: string;
    role: string;
    lastIP: string;
    totalLogins: number;
    tenantId: string;
    tenantName: string;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verificar acesso admin
    const { isAdmin, user } = await verifyAdminAccess(request);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    logger.info('🚀 [Admin Enhanced] Buscando usuários com métricas completas', {
      component: 'AdminEnhanced',
      adminId: user?.uid
    });

    // PASSO 1: Buscar todos os usuários da collection users/
    const usersSnapshot = await getDocs(collection(db, 'users'));

    logger.info(`📊 [Admin Enhanced] Encontrados ${usersSnapshot.docs.length} usuários`, {
      component: 'AdminEnhanced',
      userCount: usersSnapshot.docs.length
    });

    // PASSO 2: Processar usuários em paralelo com Promise.all
    const userPromises = usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const tenantId = userId; // tenantId = userId na nossa arquitetura

      try {
        // Buscar métricas em paralelo
        const [
          propertiesSnapshot,
          reservationsSnapshot,
          clientsSnapshot,
          ticketsSnapshot,
          onboardingData
        ] = await Promise.all([
          // Propriedades
          getDocs(collection(db, `tenants/${tenantId}/properties`)).catch(() => ({ docs: [] })),
          // Reservas
          getDocs(collection(db, `tenants/${tenantId}/reservations`)).catch(() => ({ docs: [] })),
          // Clientes
          getDocs(collection(db, `tenants/${tenantId}/clients`)).catch(() => ({ docs: [] })),
          // Tickets
          getDocs(collection(db, `tenants/${tenantId}/tickets`)).catch(() => ({ docs: [] })),
          // Onboarding Progress
          getDoc(doc(db, `users/${userId}/revolutionary_onboarding/${tenantId}`)).catch(() => null)
        ]);

        // Calcular contagens
        const propertyCount = propertiesSnapshot.docs?.length || 0;
        const reservationCount = reservationsSnapshot.docs?.length || 0;
        const clientCount = clientsSnapshot.docs?.length || 0;
        const totalTicketsCount = ticketsSnapshot.docs?.length || 0;

        // Contar tickets novos (últimos 7 dias)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newTicketsCount = ticketsSnapshot.docs?.filter(doc => {
          const ticketData = doc.data();
          const createdAt = ticketData.createdAt?.toDate?.() || new Date(ticketData.createdAt || 0);
          return ticketData.status === 'open' || createdAt > sevenDaysAgo;
        }).length || 0;

        // Processar dados de onboarding
        let onboardingProgress = {
          completionPercentage: 0,
          completedSteps: [] as string[],
          currentStep: null as string | null,
          isCompleted: false,
          totalSteps: 4, // 4 passos no Revolutionary Onboarding
          completedStepsCount: 0
        };

        if (onboardingData?.exists()) {
          const onboardingState = onboardingData.data();
          const completedSteps = onboardingState?.completedSteps || [];
          const currentStepId = onboardingState?.currentStepId || null;
          const totalSteps = 4;
          const completedStepsCount = completedSteps.length;
          const completionPercentage = Math.round((completedStepsCount / totalSteps) * 100);

          onboardingProgress = {
            completionPercentage,
            completedSteps,
            currentStep: currentStepId,
            isCompleted: completedStepsCount === totalSteps,
            totalSteps,
            completedStepsCount
          };
        }

        // Determinar plano real
        let plan = 'Free';
        if (userData.plan) {
          plan = userData.plan;
        } else if (userData.free === 7) {
          plan = 'Free Trial (7 dias)';
        } else if (userData.free === 0) {
          plan = 'Pro';
        }

        // Determinar status
        let status: 'active' | 'inactive' | 'suspended' = 'active';
        if (userData.disabled) {
          status = 'suspended';
        } else if (userData.lastLogin) {
          const lastLoginDate = userData.lastLogin?.toDate?.() || new Date(userData.lastLogin);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (lastLoginDate < thirtyDaysAgo) {
            status = 'inactive';
          }
        }

        const userMetrics: UserMetrics = {
          id: userId,
          email: userData.email || '',
          name: userData.name || userData.displayName || 'Usuário',
          phoneNumber: userData.phoneNumber || userData.phone || '',
          plan,
          status,
          createdAt: userData.createdAt?.toDate?.() ||
                     (userData.createdAt ? new Date(userData.createdAt) : null),
          lastLogin: userData.lastLogin?.toDate?.() ||
                     (userData.lastLogin ? new Date(userData.lastLogin) :
                     (userData.lastAccess ? new Date(userData.lastAccess) : null)),

          // Métricas reais
          propertyCount,
          reservationCount,
          clientCount,
          totalTicketsCount,
          newTicketsCount,

          // Onboarding
          onboardingProgress,

          // Metadata
          metadata: {
            emailVerified: userData.emailVerified || false,
            provider: userData.provider || 'email',
            role: userData.role || 'user',
            lastIP: userData.lastIP || '',
            totalLogins: userData.totalLogins || 0,
            tenantId,
            tenantName: userData.name || userData.displayName || 'Empresa'
          }
        };

        return userMetrics;

      } catch (error) {
        logger.error(`❌ [Admin Enhanced] Erro ao processar usuário ${userId}`, {
          component: 'AdminEnhanced',
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Retornar dados mínimos em caso de erro
        return {
          id: userId,
          email: userData.email || '',
          name: userData.name || 'Usuário',
          phoneNumber: userData.phoneNumber || '',
          plan: 'Unknown',
          status: 'active',
          createdAt: null,
          lastLogin: null,
          propertyCount: 0,
          reservationCount: 0,
          clientCount: 0,
          totalTicketsCount: 0,
          newTicketsCount: 0,
          onboardingProgress: {
            completionPercentage: 0,
            completedSteps: [],
            currentStep: null,
            isCompleted: false,
            totalSteps: 4,
            completedStepsCount: 0
          },
          metadata: {
            emailVerified: false,
            provider: 'email',
            role: 'user',
            lastIP: '',
            totalLogins: 0,
            tenantId: userId,
            tenantName: userData.name || 'Empresa'
          }
        } as UserMetrics;
      }
    });

    // Aguardar todos os processamentos em paralelo
    const allUsers = await Promise.all(userPromises);

    // Ordenar por data de criação (mais recentes primeiro)
    allUsers.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Calcular estatísticas agregadas
    const stats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.status === 'active').length,
      suspendedUsers: allUsers.filter(u => u.status === 'suspended').length,
      inactiveUsers: allUsers.filter(u => u.status === 'inactive').length,

      // Por plano
      freeUsers: allUsers.filter(u => u.plan.includes('Free')).length,
      proUsers: allUsers.filter(u => u.plan === 'Pro').length,

      // Métricas de uso
      usersWithProperties: allUsers.filter(u => u.propertyCount > 0).length,
      usersWithReservations: allUsers.filter(u => u.reservationCount > 0).length,
      usersWithTickets: allUsers.filter(u => u.totalTicketsCount > 0).length,

      // Onboarding
      usersCompletedOnboarding: allUsers.filter(u => u.onboardingProgress.isCompleted).length,
      averageOnboardingProgress: Math.round(
        allUsers.reduce((sum, u) => sum + u.onboardingProgress.completionPercentage, 0) / allUsers.length
      ),

      // Totais globais
      totalProperties: allUsers.reduce((sum, u) => sum + u.propertyCount, 0),
      totalReservations: allUsers.reduce((sum, u) => sum + u.reservationCount, 0),
      totalClients: allUsers.reduce((sum, u) => sum + u.clientCount, 0),
      totalTickets: allUsers.reduce((sum, u) => sum + u.totalTicketsCount, 0),
      totalNewTickets: allUsers.reduce((sum, u) => sum + u.newTicketsCount, 0)
    };

    const processingTime = Date.now() - startTime;

    logger.info(`✅ [Admin Enhanced] Dados processados com sucesso`, {
      component: 'AdminEnhanced',
      adminId: user?.uid,
      userCount: allUsers.length,
      processingTime: `${processingTime}ms`,
      stats
    });

    return NextResponse.json({
      success: true,
      users: allUsers,
      stats,
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
        dataVersion: '2.0-enhanced'
      }
    });

  } catch (error) {
    logger.error('❌ [Admin Enhanced] Erro ao buscar usuários', error as Error, {
      component: 'AdminEnhanced'
    });

    return NextResponse.json(
      {
        error: 'Erro ao buscar usuários',
        details: process.env.NODE_ENV === 'development' ?
          (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    );
  }
}
