// app/api/goals/checkpoint/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { goalService } from '@/lib/services/goal-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/utils/api-errors'
import { z } from 'zod'

// Schema de validação para checkpoint
const checkpointSchema = z.object({
  goalId: z.string().min(1),
  value: z.number(),
  notes: z.string().optional(),
  automated: z.boolean().default(false)
})

// POST - Adicionar checkpoint a uma meta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validar dados
    const validationResult = checkpointSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      )
    }

    const { goalId, ...checkpointData } = validationResult.data

    // Verificar se a meta existe e pertence ao tenant
    const goal = await goalService.getGoalById(goalId)
    if (!goal) {
      return NextResponse.json(
        { error: 'Meta não encontrada' },
        { status: 404 }
      )
    }

    if (goal.tenantId !== session.user.tenantId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Adicionar checkpoint
    await goalService.addCheckpoint(goalId, {
      ...checkpointData,
      value: checkpointData.value || 0,
      automated: checkpointData.automated || false,
      notes: checkpointData.notes || ''
    })

    // Buscar meta atualizada com novo checkpoint
    const updatedGoal = await goalService.getGoalById(goalId)
    
    // Calcular nova performance
    const performance = await goalService.calculateGoalPerformance(goalId)

    return NextResponse.json({
      message: 'Checkpoint adicionado com sucesso',
      goal: updatedGoal,
      performance
    })

  } catch (error) {
    return handleApiError(error)
  }
}