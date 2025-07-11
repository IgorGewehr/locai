import { NextRequest, NextResponse } from 'next/server'
import { FirestoreService } from '@/lib/firebase/firestore'
import { Reservation } from '@/lib/types/reservation'
import { withAuth, AuthUser } from '@/lib/middleware/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit'
import { handleApiError } from '@/lib/utils/api-errors'

const reservationDb = new FirestoreService<Reservation>('reservations')

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/reservations/[id] - Get a single reservation by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withRateLimit(
    request,
    RATE_LIMIT_CONFIGS.read,
    async () => withAuth(request, async (req: NextRequest, user: AuthUser) => {
      try {
        const { id } = params

        if (!id) {
          return NextResponse.json(
            { 
              error: 'ID da reserva é obrigatório',
              code: 'MISSING_ID'
            },
            { status: 400 }
          )
        }

        // Get reservation
        const reservation = await reservationDb.get(id)
        
        if (!reservation) {
          return NextResponse.json(
            { 
              error: 'Reserva não encontrada',
              code: 'NOT_FOUND'
            },
            { status: 404 }
          )
        }

        // Ensure tenant isolation
        if (reservation.tenantId !== user.tenantId) {
          return NextResponse.json(
            { 
              error: 'Acesso negado',
              code: 'FORBIDDEN'
            },
            { status: 403 }
          )
        }

        return NextResponse.json({
          success: true,
          data: reservation
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  )
}