import { NextRequest, NextResponse } from 'next/server'
import { FirestoreService } from '@/lib/firebase/firestore'
import { Reservation, ReservationStatus } from '@/lib/types/reservation'
import { withAuth, AuthUser } from '@/lib/middleware/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit'
import { handleApiError } from '@/lib/utils/api-errors'
import { checkInOutSchema, type CheckInOutInput } from '@/lib/validations/reservation'
import { z } from 'zod'

const reservationDb = new FirestoreService<Reservation>('reservations')

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/reservations/[id]/check-in-out - Process check-in or check-out
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withRateLimit(
    request,
    RATE_LIMIT_CONFIGS.write,
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

        // Parse and validate request body
        const body = await req.json()
        let validatedData: CheckInOutInput
        
        try {
          validatedData = checkInOutSchema.parse(body)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { 
                error: 'Dados inválidos',
                details: error.errors,
                code: 'VALIDATION_ERROR'
              },
              { status: 400 }
            )
          }
          throw error
        }

        // Get existing reservation
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

        // Validate action based on current status
        if (validatedData.action === 'check_in') {
          if (reservation.status !== ReservationStatus.CONFIRMED) {
            return NextResponse.json(
              { 
                error: 'Check-in só pode ser feito em reservas confirmadas',
                code: 'INVALID_STATUS'
              },
              { status: 400 }
            )
          }

          // Validate check-in date (allow check-in up to 1 day early)
          const checkInDate = new Date(reservation.checkIn)
          const now = new Date()
          const daysBefore = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          
          if (daysBefore > 1) {
            return NextResponse.json(
              { 
                error: 'Check-in muito antecipado. Permitido apenas 1 dia antes.',
                code: 'TOO_EARLY'
              },
              { status: 400 }
            )
          }
        } else if (validatedData.action === 'check_out') {
          if (reservation.status !== ReservationStatus.CHECKED_IN) {
            return NextResponse.json(
              { 
                error: 'Check-out só pode ser feito após check-in',
                code: 'INVALID_STATUS'
              },
              { status: 400 }
            )
          }
        }

        // Update reservation
        const updates: Partial<Reservation> = {
          status: validatedData.action === 'check_in' 
            ? ReservationStatus.CHECKED_IN 
            : ReservationStatus.CHECKED_OUT,
          updatedAt: new Date()
        }

        // Add notes if provided
        if (validatedData.notes) {
          updates.observations = reservation.observations 
            ? `${reservation.observations}\n\n${validatedData.action === 'check_in' ? 'Check-in' : 'Check-out'}: ${validatedData.notes}`
            : `${validatedData.action === 'check_in' ? 'Check-in' : 'Check-out'}: ${validatedData.notes}`
        }

        // Update actual guests if provided (check-in only)
        if (validatedData.action === 'check_in' && validatedData.actualGuests) {
          updates.guests = validatedData.actualGuests
        }

        const updatedReservation = await reservationDb.update(id, updates)

        // TODO: Send notifications
        // TODO: Update property availability status
        // TODO: Trigger post-check-in/out automations

        return NextResponse.json({
          success: true,
          data: {
            reservation: updatedReservation,
            action: validatedData.action,
            timestamp: new Date()
          }
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  )
}