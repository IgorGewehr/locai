// app/api/goals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { goalService } from '@/lib/services/goal-service'
import { GoalStatus, GoalType, GoalCategory, NotificationChannel } from '@/lib/types/financial'
import { authMiddleware } from '@/lib/middleware/auth'
import { handleApiError } from '@/lib/utils/api-errors'
import { z } from 'zod'

// Schema de validação para criação de meta
const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.nativeEnum(GoalType),
  category: z.nativeEnum(GoalCategory),
  metric: z.string(),
  targetValue: z.number().positive(),
  startValue: z.number().default(0),
  period: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }),
  frequency: z.string(),
  status: z.nativeEnum(GoalStatus).default(GoalStatus.DRAFT),
  notificationSettings: z.object({
    enabled: z.boolean().default(true),
    channels: z.array(z.nativeEnum(NotificationChannel)).default([NotificationChannel.DASHBOARD]),
    frequency: z.enum(['realtime', 'daily', 'weekly']).default('daily'),
    onMilestone: z.boolean().default(true),
    onTarget: z.boolean().default(true),
    onDeviation: z.boolean().default(true),
    deviationThreshold: z.number().default(10),
    recipients: z.array(z.string()).default([])
  }).optional()
})

// GET - Listar metas ou buscar por ID
export async function GET(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const goalId = searchParams.get('id')
    const tenantId = authContext.tenantId

    // Buscar meta específica
    if (goalId) {
      const goal = await goalService.getGoalById(goalId)
      
      if (!goal) {
        return NextResponse.json(
          { error: 'Meta não encontrada' },
          { status: 404 }
        )
      }

      // Verificar se a meta pertence ao tenant
      if (goal.tenantId !== tenantId) {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        )
      }

      // Incluir performance se solicitado
      const includePerformance = searchParams.get('includePerformance') === 'true'
      if (includePerformance) {
        const performance = await goalService.calculateGoalPerformance(goalId)
        return NextResponse.json({
          goal,
          performance
        })
      }

      return NextResponse.json(goal)
    }

    // Listar metas com filtros
    const filters: any = {}
    
    const status = searchParams.get('status')
    if (status && Object.values(GoalStatus).includes(status as GoalStatus)) {
      filters.status = status as GoalStatus
    }

    const type = searchParams.get('type')
    if (type && Object.values(GoalType).includes(type as GoalType)) {
      filters.type = type as GoalType
    }

    const category = searchParams.get('category')
    if (category && Object.values(GoalCategory).includes(category as GoalCategory)) {
      filters.category = category as GoalCategory
    }

    // Filtro de período
    const periodStart = searchParams.get('periodStart')
    const periodEnd = searchParams.get('periodEnd')
    if (periodStart && periodEnd) {
      filters.period = {
        start: new Date(periodStart),
        end: new Date(periodEnd)
      }
    }

    const goals = await goalService.getGoalsByTenant(tenantId, filters)

    // Dashboard completo se solicitado
    const dashboard = searchParams.get('dashboard') === 'true'
    if (dashboard) {
      const dashboardData = await goalService.getGoalsDashboard(tenantId, filters.period)
      return NextResponse.json(dashboardData)
    }

    return NextResponse.json({
      goals,
      total: goals.length,
      filters
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Criar nova meta
export async function POST(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validar dados
    const validationResult = createGoalSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      )
    }

    const goalData = {
      ...validationResult.data,
      name: validationResult.data.name || 'Meta sem nome',
      type: (validationResult.data.type as any) || 'revenue',
      description: validationResult.data.description || '',
      metric: validationResult.data.metric as any,
      frequency: validationResult.data.frequency as any,
      status: 'active' as const,
      notificationSettings: validationResult.data.notificationSettings || {
        enabled: false,
        frequency: 'daily',
        channels: [NotificationChannel.DASHBOARD],
        onMilestone: false,
        onTarget: false,
        onDeviation: false,
        deviationThreshold: 10,
        recipients: []
      },
      tenantId: authContext.tenantId,
      createdBy: authContext.userId || 'system',
      milestones: body.milestones || [],
      progress: 0,
      currentValue: 0,
      checkpoints: [],
      alerts: []
    }

    const newGoal = await goalService.createGoal(goalData)

    return NextResponse.json(
      { 
        message: 'Meta criada com sucesso',
        goal: newGoal 
      },
      { status: 201 }
    )

  } catch (error) {
    return handleApiError(error)
  }
}

// PUT - Atualizar meta
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const goalId = searchParams.get('id')
    
    if (!goalId) {
      return NextResponse.json(
        { error: 'ID da meta é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a meta existe e pertence ao tenant
    const existingGoal = await goalService.getGoalById(goalId)
    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Meta não encontrada' },
        { status: 404 }
      )
    }

    if (existingGoal.tenantId !== authContext.tenantId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Remover campos que não devem ser atualizados
    const { id, tenantId, createdAt, createdBy, ...updates } = body

    // Converter datas se necessário
    if (updates.period) {
      if (updates.period.start) {
        updates.period.start = new Date(updates.period.start)
      }
      if (updates.period.end) {
        updates.period.end = new Date(updates.period.end)
      }
    }

    await goalService.updateGoal(goalId, updates)

    // Buscar meta atualizada
    const updatedGoal = await goalService.getGoalById(goalId)

    return NextResponse.json({
      message: 'Meta atualizada com sucesso',
      goal: updatedGoal
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE - Deletar meta
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const goalId = searchParams.get('id')
    
    if (!goalId) {
      return NextResponse.json(
        { error: 'ID da meta é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a meta existe e pertence ao tenant
    const existingGoal = await goalService.getGoalById(goalId)
    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Meta não encontrada' },
        { status: 404 }
      )
    }

    if (existingGoal.tenantId !== authContext.tenantId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    await goalService.deleteGoal(goalId)

    return NextResponse.json({
      message: 'Meta deletada com sucesso'
    })

  } catch (error) {
    return handleApiError(error)
  }
}