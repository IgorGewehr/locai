// lib/services/goal-service.ts
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  onSnapshot,
  WriteBatch,
  writeBatch,
  runTransaction,
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { 
  FinancialGoal, 
  GoalStatus, 
  GoalType, 
  GoalCategory,
  GoalMetric,
  GoalFrequency,
  GoalCheckpoint,
  GoalMilestone,
  GoalAlert,
  GoalPerformance,
  GoalsDashboard,
  DateRange,
  NotificationChannel
} from '@/lib/types/financial'
import { startOfDay, endOfDay, isWithinInterval, differenceInDays, addDays, format } from 'date-fns'
import { validateFinancialGoal } from '@/lib/utils/validation'
import { handleFirestoreError } from '@/lib/utils/errors'
import { withTimeout } from '@/lib/utils/async'

export class GoalService {
  private readonly collectionName = 'financial_goals'
  private readonly performanceCollectionName = 'goal_performance'
  private readonly checkpointsCollectionName = 'goal_checkpoints'

  // Criar nova meta
  async createGoal(goal: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialGoal> {
    try {
      // Validação
      const validation = validateFinancialGoal(goal as FinancialGoal)
      if (!validation.valid) {
        throw new Error(`Validação falhou: ${validation.errors.join(', ')}`)
      }

      const goalId = doc(collection(db, this.collectionName)).id
      const now = new Date()

      const newGoal: FinancialGoal = {
        ...goal,
        id: goalId,
        createdAt: now,
        updatedAt: now,
        currentValue: goal.startValue || 0,
        progress: 0,
        checkpoints: [],
        milestones: goal.milestones || [],
        alerts: [],
        status: goal.status || GoalStatus.DRAFT
      }

      // Calcular progresso inicial
      newGoal.progress = this.calculateProgress(newGoal)

      // Salvar no Firestore
      await withTimeout(
        setDoc(doc(db, this.collectionName, goalId), {
          ...newGoal,
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
          'period.start': Timestamp.fromDate(newGoal.period.start),
          'period.end': Timestamp.fromDate(newGoal.period.end),
          checkpoints: newGoal.checkpoints.map(cp => ({
            ...cp,
            date: Timestamp.fromDate(cp.date)
          })),
          milestones: newGoal.milestones.map(ms => ({
            ...ms,
            targetDate: Timestamp.fromDate(ms.targetDate),
            achievedDate: ms.achievedDate ? Timestamp.fromDate(ms.achievedDate) : null
          }))
        }),
        10000,
        'Criar meta financeira'
      )

      // Criar checkpoint inicial
      await this.addCheckpoint(goalId, {
        value: newGoal.startValue || 0,
        notes: 'Valor inicial da meta',
        automated: true
      })

      return newGoal
    } catch (error) {
      throw handleFirestoreError(error, 'criar meta financeira')
    }
  }

  // Atualizar meta
  async updateGoal(goalId: string, updates: Partial<FinancialGoal>): Promise<void> {
    try {
      const goalRef = doc(db, this.collectionName, goalId)
      const goalDoc = await getDoc(goalRef)

      if (!goalDoc.exists()) {
        throw new Error('Meta não encontrada')
      }

      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      }

      // Converter datas para Timestamp
      if (updates.period) {
        if (updates.period.start) {
          updateData['period.start'] = Timestamp.fromDate(updates.period.start)
        }
        if (updates.period.end) {
          updateData['period.end'] = Timestamp.fromDate(updates.period.end)
        }
      }

      // Recalcular progresso se necessário
      if (updates.currentValue !== undefined || updates.targetValue !== undefined) {
        const currentGoal = this.convertTimestampsToDates(goalDoc.data()) as FinancialGoal
        const updatedGoal = { ...currentGoal, ...updates }
        updateData.progress = this.calculateProgress(updatedGoal)
      }

      await withTimeout(
        updateDoc(goalRef, updateData),
        10000,
        'Atualizar meta financeira'
      )
    } catch (error) {
      throw handleFirestoreError(error, 'atualizar meta financeira')
    }
  }

  // Buscar meta por ID
  async getGoalById(goalId: string): Promise<FinancialGoal | null> {
    try {
      const goalDoc = await withTimeout(
        getDoc(doc(db, this.collectionName, goalId)),
        5000,
        'Buscar meta'
      )

      if (!goalDoc.exists()) {
        return null
      }

      return {
        id: goalDoc.id,
        ...this.convertTimestampsToDates(goalDoc.data())
      } as FinancialGoal
    } catch (error) {
      throw handleFirestoreError(error, 'buscar meta')
    }
  }

  // Listar metas por tenant
  async getGoalsByTenant(
    tenantId: string, 
    filters?: {
      status?: GoalStatus
      type?: GoalType
      category?: GoalCategory
      period?: DateRange
    }
  ): Promise<FinancialGoal[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc')
      ]

      if (filters?.status) {
        constraints.push(where('status', '==', filters.status))
      }
      if (filters?.type) {
        constraints.push(where('type', '==', filters.type))
      }
      if (filters?.category) {
        constraints.push(where('category', '==', filters.category))
      }

      const q = query(collection(db, this.collectionName), ...constraints)
      const snapshot = await withTimeout(
        getDocs(q),
        10000,
        'Listar metas'
      )

      let goals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertTimestampsToDates(doc.data())
      } as FinancialGoal))

      // Filtrar por período se necessário
      if (filters?.period) {
        goals = goals.filter(goal => 
          this.isGoalInPeriod(goal, filters.period)
        )
      }

      return goals
    } catch (error) {
      throw handleFirestoreError(error, 'listar metas')
    }
  }

  // Adicionar checkpoint
  async addCheckpoint(
    goalId: string, 
    checkpoint: Omit<GoalCheckpoint, 'id' | 'date' | 'progress'>
  ): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const goalRef = doc(db, this.collectionName, goalId)
        const goalDoc = await transaction.get(goalRef)

        if (!goalDoc.exists()) {
          throw new Error('Meta não encontrada')
        }

        const goal = this.convertTimestampsToDates(goalDoc.data()) as FinancialGoal
        const now = new Date()

        const newCheckpoint: GoalCheckpoint = {
          id: doc(collection(db, this.checkpointsCollectionName)).id,
          date: now,
          value: checkpoint.value,
          progress: this.calculateProgress({ ...goal, currentValue: checkpoint.value }),
          notes: checkpoint.notes,
          automated: checkpoint.automated
        }

        // Adicionar checkpoint ao array
        const updatedCheckpoints = [...(goal.checkpoints || []), newCheckpoint]

        // Atualizar meta
        transaction.update(goalRef, {
          checkpoints: updatedCheckpoints.map(cp => ({
            ...cp,
            date: Timestamp.fromDate(cp.date)
          })),
          currentValue: checkpoint.value,
          progress: newCheckpoint.progress,
          updatedAt: Timestamp.now()
        })

        // Salvar checkpoint separadamente para histórico
        const checkpointRef = doc(db, this.checkpointsCollectionName, newCheckpoint.id)
        transaction.set(checkpointRef, {
          ...newCheckpoint,
          goalId,
          date: Timestamp.fromDate(now)
        })

        // Verificar marcos
        await this.checkMilestones(goalId, checkpoint.value, transaction)

        // Verificar alertas
        await this.checkAlerts(goalId, newCheckpoint.progress, transaction)
      })
    } catch (error) {
      throw handleFirestoreError(error, 'adicionar checkpoint')
    }
  }

  // Calcular performance da meta
  async calculateGoalPerformance(goalId: string): Promise<GoalPerformance> {
    try {
      const goal = await this.getGoalById(goalId)
      if (!goal) {
        throw new Error('Meta não encontrada')
      }

      const checkpoints = goal.checkpoints || []
      const sortedCheckpoints = checkpoints.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Calcular métricas de velocidade
      const now = new Date()
      const daysElapsed = differenceInDays(now, goal.period.start)
      const totalDays = differenceInDays(goal.period.end, goal.period.start)
      const daysRemaining = totalDays - daysElapsed

      // Calcular médias
      const dailyAverage = daysElapsed > 0 
        ? (goal.currentValue - goal.startValue) / daysElapsed 
        : 0

      const weeklyAverage = dailyAverage * 7
      const monthlyAverage = dailyAverage * 30

      // Calcular tendência
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (sortedCheckpoints.length >= 2) {
        const recent = sortedCheckpoints.slice(-5)
        const recentProgress = recent[recent.length - 1].value - recent[0].value
        trend = recentProgress > 0 ? 'up' : recentProgress < 0 ? 'down' : 'stable'
      }

      // Calcular projeções
      const remainingToTarget = goal.targetValue - goal.currentValue
      const requiredDailyRate = daysRemaining > 0 
        ? remainingToTarget / daysRemaining 
        : 0

      const projectedValue = goal.currentValue + (dailyAverage * daysRemaining)
      const projectedCompletion = dailyAverage > 0
        ? addDays(now, remainingToTarget / dailyAverage)
        : goal.period.end

      // Determinar ritmo
      let currentPace: 'ahead' | 'on_track' | 'behind' = 'on_track'
      if (dailyAverage > requiredDailyRate * 1.1) {
        currentPace = 'ahead'
      } else if (dailyAverage < requiredDailyRate * 0.9) {
        currentPace = 'behind'
      }

      // Analisar fatores contribuintes
      const contributingFactors = await this.analyzeContributingFactors(goal)

      return {
        goalId: goal.id,
        period: goal.period,
        actualValue: goal.currentValue,
        targetValue: goal.targetValue,
        progress: goal.progress,
        trend,
        dailyAverage,
        weeklyAverage,
        monthlyAverage,
        projectedCompletion,
        requiredDailyRate,
        currentPace,
        contributingFactors,
        blockers: this.identifyBlockers(goal, currentPace),
        opportunities: this.identifyOpportunities(goal, currentPace)
      }
    } catch (error) {
      throw handleFirestoreError(error, 'calcular performance da meta')
    }
  }

  // Dashboard de metas
  async getGoalsDashboard(tenantId: string, period?: DateRange): Promise<GoalsDashboard> {
    try {
      const goals = await this.getGoalsByTenant(tenantId, { period })

      // Calcular resumo
      const activeGoals = goals.filter(g => g.status === GoalStatus.ACTIVE)
      const completedGoals = goals.filter(g => g.status === GoalStatus.COMPLETED)
      const totalProgress = activeGoals.reduce((sum, g) => sum + g.progress, 0)
      const averageProgress = activeGoals.length > 0 ? totalProgress / activeGoals.length : 0

      // Calcular metas no prazo
      const performancePromises = activeGoals.map(g => this.calculateGoalPerformance(g.id))
      const performances = await Promise.all(performancePromises)
      const onTrackCount = performances.filter(p => p.currentPace !== 'behind').length
      const onTrackPercentage = activeGoals.length > 0 ? (onTrackCount / activeGoals.length) * 100 : 0

      // Agrupar por status
      const goalsByStatus = goals.reduce((acc, goal) => {
        acc[goal.status] = (acc[goal.status] || 0) + 1
        return acc
      }, {} as Record<GoalStatus, number>)

      // Agrupar por categoria
      const goalsByCategory = goals.reduce((acc, goal) => {
        if (!acc[goal.category]) {
          acc[goal.category] = { count: 0, averageProgress: 0, completionRate: 0 }
        }

        const categoryGoals = goals.filter(g => g.category === goal.category)
        const activeInCategory = categoryGoals.filter(g => g.status === GoalStatus.ACTIVE)
        const completedInCategory = categoryGoals.filter(g => g.status === GoalStatus.COMPLETED)

        acc[goal.category] = {
          count: categoryGoals.length,
          averageProgress: activeInCategory.length > 0
            ? activeInCategory.reduce((sum, g) => sum + g.progress, 0) / activeInCategory.length
            : 0,
          completionRate: categoryGoals.length > 0
            ? (completedInCategory.length / categoryGoals.length) * 100
            : 0
        }

        return acc
      }, {} as Record<GoalCategory, any>)

      // Top performers e atenção necessária
      const sortedPerformances = performances.sort((a, b) => b.progress - a.progress)
      const topPerformers = sortedPerformances.slice(0, 5)
      const needsAttention = sortedPerformances
        .filter(p => p.currentPace === 'behind' || p.progress < 50)
        .slice(0, 5)

      // Metas recentemente concluídas
      const recentlyCompleted = completedGoals
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)

      // Gerar insights e recomendações
      const insights = await this.generateInsights(goals, performances)
      const recommendations = await this.generateRecommendations(goals, performances)

      return {
        tenantId,
        period: period || { 
          start: new Date(new Date().getFullYear(), 0, 1), 
          end: new Date() 
        },
        summary: {
          totalGoals: goals.length,
          activeGoals: activeGoals.length,
          completedGoals: completedGoals.length,
          averageProgress,
          onTrackPercentage
        },
        goalsByStatus,
        goalsByCategory,
        topPerformers,
        needsAttention,
        recentlyCompleted,
        insights,
        recommendations
      }
    } catch (error) {
      throw handleFirestoreError(error, 'gerar dashboard de metas')
    }
  }

  // Atualizar valor atual da meta baseado em métricas
  async updateGoalFromMetrics(
    goalId: string, 
    metricsData: any,
    automated: boolean = true
  ): Promise<void> {
    try {
      const goal = await this.getGoalById(goalId)
      if (!goal || goal.status !== GoalStatus.ACTIVE) {
        return
      }

      // Extrair valor baseado na métrica
      const newValue = this.extractValueFromMetrics(goal.metric, metricsData)

      if (newValue !== null && newValue !== goal.currentValue) {
        await this.addCheckpoint(goalId, {
          value: newValue,
          notes: `Atualização automática: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
          automated
        })
      }
    } catch (error) {
      }
  }

  // Métodos privados auxiliares

  private calculateProgress(goal: Partial<FinancialGoal>): number {
    if (!goal.targetValue || !goal.startValue === undefined) return 0

    const current = goal.currentValue || 0
    const start = goal.startValue || 0
    const target = goal.targetValue

    if (target === start) return 100

    const progress = ((current - start) / (target - start)) * 100
    return Math.max(0, Math.min(100, Math.round(progress)))
  }

  private isGoalInPeriod(goal: FinancialGoal, period: DateRange): boolean {
    return isWithinInterval(goal.period.start, { start: period.start, end: period.end }) ||
           isWithinInterval(goal.period.end, { start: period.start, end: period.end }) ||
           (goal.period.start <= period.start && goal.period.end >= period.end)
  }

  private async checkMilestones(
    goalId: string, 
    currentValue: number, 
    transaction: any
  ): Promise<void> {
    const goalRef = doc(db, this.collectionName, goalId)
    const goalDoc = await transaction.get(goalRef)
    const goal = this.convertTimestampsToDates(goalDoc.data()) as FinancialGoal

    const updatedMilestones = goal.milestones.map(milestone => {
      if (!milestone.achieved && currentValue >= milestone.targetValue) {
        return {
          ...milestone,
          achieved: true,
          achievedDate: new Date()
        }
      }
      return milestone
    })

    if (updatedMilestones.some(m => m.achieved && !goal.milestones.find(gm => gm.id === m.id)?.achieved)) {
      transaction.update(goalRef, {
        milestones: updatedMilestones.map(ms => ({
          ...ms,
          targetDate: Timestamp.fromDate(ms.targetDate),
          achievedDate: ms.achievedDate ? Timestamp.fromDate(ms.achievedDate) : null
        }))
      })
    }
  }

  private async checkAlerts(
    goalId: string, 
    progress: number, 
    transaction: any
  ): Promise<void> {
    const goalRef = doc(db, this.collectionName, goalId)
    const goalDoc = await transaction.get(goalRef)
    const goal = this.convertTimestampsToDates(goalDoc.data()) as FinancialGoal

    const alerts = [...(goal.alerts || [])]

    // Verificar desvio
    if (goal.notificationSettings?.onDeviation) {
      const expectedProgress = this.calculateExpectedProgress(goal)
      const deviation = Math.abs(progress - expectedProgress)

      if (deviation > (goal.notificationSettings.deviationThreshold || 10)) {
        alerts.push({
          id: doc(collection(db, 'alerts')).id,
          type: progress < expectedProgress ? 'warning' : 'info',
          title: 'Desvio detectado',
          message: `A meta está ${deviation.toFixed(1)}% ${progress < expectedProgress ? 'abaixo' : 'acima'} do esperado`,
          date: new Date(),
          read: false,
          actionRequired: progress < expectedProgress
        })
      }
    }

    // Verificar conclusão
    if (progress >= 100 && goal.notificationSettings?.onTarget) {
      alerts.push({
        id: doc(collection(db, 'alerts')).id,
        type: 'success',
        title: 'Meta alcançada!',
        message: `Parabéns! A meta "${goal.name}" foi alcançada.`,
        date: new Date(),
        read: false,
        actionRequired: false
      })
    }

    if (alerts.length > goal.alerts.length) {
      transaction.update(goalRef, {
        alerts: alerts.map(alert => ({
          ...alert,
          date: Timestamp.fromDate(alert.date)
        }))
      })
    }
  }

  private calculateExpectedProgress(goal: FinancialGoal): number {
    const now = new Date()
    const totalDays = differenceInDays(goal.period.end, goal.period.start)
    const elapsedDays = differenceInDays(now, goal.period.start)

    if (totalDays === 0) return 100
    if (elapsedDays <= 0) return 0
    if (elapsedDays >= totalDays) return 100

    return (elapsedDays / totalDays) * 100
  }

  private extractValueFromMetrics(metric: GoalMetric, metricsData: any): number | null {
    switch (metric) {
      case GoalMetric.TOTAL_REVENUE:
        return metricsData.totalRevenue || null
      case GoalMetric.NET_REVENUE:
        return metricsData.netRevenue || null
      case GoalMetric.OCCUPANCY_RATE:
        return metricsData.occupancyRate || null
      case GoalMetric.ADR:
        return metricsData.adr || null
      case GoalMetric.REVPAR:
        return metricsData.revPAR || null
      case GoalMetric.BOOKING_COUNT:
        return metricsData.totalReservations || null
      case GoalMetric.MRR:
        return metricsData.mrr || null
      case GoalMetric.ARR:
        return metricsData.arr || null
      case GoalMetric.CAC:
        return metricsData.cac || null
      case GoalMetric.LTV:
        return metricsData.ltv || null
      case GoalMetric.CONVERSION_RATE:
        return metricsData.conversionRate || null
      case GoalMetric.REPEAT_RATE:
        return metricsData.repeatBookingRate || null
      default:
        return null
    }
  }

  private async analyzeContributingFactors(goal: FinancialGoal): Promise<any[]> {
    const factors = []

    // Analisar tendência
    if (goal.checkpoints.length >= 3) {
      const recentCheckpoints = goal.checkpoints.slice(-3)
      const trend = recentCheckpoints[2].value - recentCheckpoints[0].value

      if (trend > 0) {
        factors.push({
          factor: 'Tendência positiva',
          impact: 'positive',
          magnitude: 'medium',
          description: 'Crescimento consistente nos últimos checkpoints'
        })
      }
    }

    // Analisar sazonalidade
    const currentMonth = new Date().getMonth()
    if ([11, 0, 1].includes(currentMonth)) {
      factors.push({
        factor: 'Alta temporada',
        impact: 'positive',
        magnitude: 'high',
        description: 'Período de alta demanda favorece o alcance da meta'
      })
    }

    return factors
  }

  private identifyBlockers(goal: FinancialGoal, pace: string): string[] {
    const blockers = []

    if (pace === 'behind') {
      blockers.push('Ritmo atual insuficiente para alcançar a meta no prazo')
    }

    if (goal.progress < 25 && this.calculateExpectedProgress(goal) > 50) {
      blockers.push('Progresso significativamente abaixo do esperado')
    }

    return blockers
  }

  private identifyOpportunities(goal: FinancialGoal, pace: string): string[] {
    const opportunities = []

    if (pace === 'ahead') {
      opportunities.push('Possibilidade de superar a meta ou antecipar conclusão')
    }

    if (goal.type === GoalType.REVENUE) {
      opportunities.push('Implementar estratégias de upselling')
      opportunities.push('Otimizar preços para períodos de alta demanda')
    }

    return opportunities
  }

  private async generateInsights(goals: FinancialGoal[], performances: GoalPerformance[]): Promise<any[]> {
    const insights = []

    // Insight de conquistas
    const recentAchievements = goals.filter(g => 
      g.status === GoalStatus.COMPLETED && 
      differenceInDays(new Date(), g.updatedAt) <= 30
    )

    if (recentAchievements.length > 0) {
      insights.push({
        id: doc(collection(db, 'insights')).id,
        type: 'achievement',
        title: `${recentAchievements.length} metas concluídas no último mês`,
        description: 'Excelente performance no alcance de objetivos',
        goals: recentAchievements.map(g => g.id),
        impact: 'high',
        createdAt: new Date()
      })
    }

    // Insight de riscos
    const atRisk = performances.filter(p => p.currentPace === 'behind' && p.progress < 50)
    if (atRisk.length > 0) {
      insights.push({
        id: doc(collection(db, 'insights')).id,
        type: 'risk',
        title: `${atRisk.length} metas em risco`,
        description: 'Estas metas precisam de atenção imediata',
        goals: atRisk.map(p => p.goalId),
        impact: 'high',
        createdAt: new Date()
      })
    }

    return insights
  }

  private async generateRecommendations(goals: FinancialGoal[], performances: GoalPerformance[]): Promise<any[]> {
    const recommendations = []

    // Recomendação para metas atrasadas
    const behindGoals = performances.filter(p => p.currentPace === 'behind')
    if (behindGoals.length > 0) {
      recommendations.push({
        id: doc(collection(db, 'recommendations')).id,
        goalId: behindGoals[0].goalId,
        title: 'Revisar estratégia',
        description: 'A meta está abaixo do ritmo esperado',
        actions: [
          'Analisar fatores que estão impedindo o progresso',
          'Considerar ajustar prazos ou valores',
          'Implementar ações corretivas imediatas'
        ],
        expectedImpact: 'Retomar o ritmo adequado para alcançar a meta',
        priority: 'high',
        category: 'strategy'
      })
    }

    return recommendations
  }

  private convertTimestampsToDates(data: any): any {
    if (!data) return data

    const converted = { ...data }

    // Converter Timestamps principais
    if (converted.createdAt?.toDate) converted.createdAt = converted.createdAt.toDate()
    if (converted.updatedAt?.toDate) converted.updatedAt = converted.updatedAt.toDate()

    // Converter período
    if (converted.period) {
      if (converted.period.start?.toDate) converted.period.start = converted.period.start.toDate()
      if (converted.period.end?.toDate) converted.period.end = converted.period.end.toDate()
    }

    // Converter checkpoints
    if (converted.checkpoints) {
      converted.checkpoints = converted.checkpoints.map((cp: any) => ({
        ...cp,
        date: cp.date?.toDate ? cp.date.toDate() : cp.date
      }))
    }

    // Converter milestones
    if (converted.milestones) {
      converted.milestones = converted.milestones.map((ms: any) => ({
        ...ms,
        targetDate: ms.targetDate?.toDate ? ms.targetDate.toDate() : ms.targetDate,
        achievedDate: ms.achievedDate?.toDate ? ms.achievedDate.toDate() : ms.achievedDate
      }))
    }

    // Converter alerts
    if (converted.alerts) {
      converted.alerts = converted.alerts.map((alert: any) => ({
        ...alert,
        date: alert.date?.toDate ? alert.date.toDate() : alert.date
      }))
    }

    return converted
  }

  // Monitoramento em tempo real
  subscribeToGoal(
    goalId: string, 
    callback: (goal: FinancialGoal) => void
  ): () => void {
    const unsubscribe = onSnapshot(
      doc(db, this.collectionName, goalId),
      (doc) => {
        if (doc.exists()) {
          callback({
            id: doc.id,
            ...this.convertTimestampsToDates(doc.data())
          } as FinancialGoal)
        }
      },
      (error) => {
        }
    )

    return unsubscribe
  }

  // Deletar meta
  async deleteGoal(goalId: string): Promise<void> {
    try {
      await withTimeout(
        deleteDoc(doc(db, this.collectionName, goalId)),
        5000,
        'Deletar meta'
      )
    } catch (error) {
      throw handleFirestoreError(error, 'deletar meta')
    }
  }
}

// Instância única do serviço
export const goalService = new GoalService()