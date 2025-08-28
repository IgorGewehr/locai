// app/api/goals/sync-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { goalService } from '@/lib/services/goal-service'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { handleApiError } from '@/lib/utils/api-errors'
import { GoalStatus, GoalType } from '@/lib/types/financial'
import { getAnalytics } from '@/lib/services/analytics-service'

// POST - Sincronizar metas com métricas atuais
export async function POST(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const tenantId = authContext.tenantId
    const body = await request.json()
    const { goalIds, period } = body

    // Buscar métricas atuais
    const analytics = await getAnalytics(tenantId, {
      period: period || {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
      }
    })

    // Se goalIds específicos foram fornecidos, sincronizar apenas esses
    let goalsToSync
    if (goalIds && goalIds.length > 0) {
      goalsToSync = await Promise.all(
        goalIds.map((id: string) => goalService.getGoalById(id))
      )
      goalsToSync = goalsToSync.filter(g => g && g.tenantId === tenantId)
    } else {
      // Caso contrário, sincronizar todas as metas ativas
      goalsToSync = await goalService.getGoalsByTenant(tenantId, {
        status: GoalStatus.ACTIVE
      })
    }

    // Sincronizar cada meta
    const syncResults = await Promise.all(
      goalsToSync.map(async (goal) => {
        if (!goal) return null

        try {
          await goalService.updateGoalFromMetrics(
            goal.id,
            analytics,
            true // automated
          )
          
          return {
            goalId: goal.id,
            goalName: goal.name,
            status: 'success',
            message: 'Meta sincronizada com sucesso'
          }
        } catch (error) {
          return {
            goalId: goal.id,
            goalName: goal.name,
            status: 'error',
            message: error instanceof Error ? error.message : 'Erro ao sincronizar'
          }
        }
      })
    )

    const successCount = syncResults.filter(r => r?.status === 'success').length
    const errorCount = syncResults.filter(r => r?.status === 'error').length

    return NextResponse.json({
      message: `Sincronização concluída: ${successCount} sucesso, ${errorCount} erros`,
      results: syncResults.filter(r => r !== null),
      timestamp: new Date()
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// GET - Verificar status de sincronização
export async function GET(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const tenantId = authContext.tenantId
    
    // Buscar todas as metas ativas
    const activeGoals = await goalService.getGoalsByTenant(tenantId, {
      status: GoalStatus.ACTIVE
    })

    // Verificar última atualização de cada meta
    const syncStatus = activeGoals.map(goal => {
      const lastCheckpoint = goal.checkpoints
        ?.filter(cp => cp.automated)
        ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

      const hoursSinceLastSync = lastCheckpoint
        ? Math.floor((Date.now() - new Date(lastCheckpoint.date).getTime()) / (1000 * 60 * 60))
        : null

      return {
        goalId: goal.id,
        goalName: goal.name,
        type: goal.type,
        metric: goal.metric,
        lastSync: lastCheckpoint?.date || null,
        hoursSinceLastSync,
        needsSync: !lastCheckpoint || (hoursSinceLastSync !== null && hoursSinceLastSync > 24),
        currentValue: goal.currentValue,
        targetValue: goal.targetValue,
        progress: goal.progress
      }
    })

    const needsSyncCount = syncStatus.filter(s => s.needsSync).length

    return NextResponse.json({
      totalActiveGoals: activeGoals.length,
      needsSync: needsSyncCount,
      syncStatus,
      recommendedAction: needsSyncCount > 0 
        ? 'Execute sincronização para atualizar metas' 
        : 'Todas as metas estão atualizadas'
    })

  } catch (error) {
    return handleApiError(error)
  }
}