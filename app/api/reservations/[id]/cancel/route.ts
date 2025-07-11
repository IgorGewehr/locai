import { NextRequest, NextResponse } from 'next/server'
import { FirestoreService } from '@/lib/firebase/firestore'
import { Reservation, ReservationStatus, PaymentStatus } from '@/lib/types/reservation'
import { withAuth, AuthUser } from '@/lib/middleware/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit'
import { handleApiError } from '@/lib/utils/api-errors'
import { reservationService } from '@/lib/services/reservation-service'
import { cancelReservationSchema, type CancelReservationInput } from '@/lib/validations/reservation'
import { z } from 'zod'

const reservationDb = new FirestoreService<Reservation>('reservations')

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/reservations/[id]/cancel - Cancel a reservation
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
        let validatedData: CancelReservationInput
        
        try {
          validatedData = cancelReservationSchema.parse(body)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { 
                error: 'Dados de cancelamento inválidos',
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

        // Check if reservation can be cancelled
        if (!reservationService.canCancelReservation(reservation)) {
          return NextResponse.json(
            { 
              error: 'Reserva não pode ser cancelada no status atual',
              code: 'INVALID_STATUS'
            },
            { status: 400 }
          )
        }

        // Calculate refund amount if not provided
        let refundAmount = validatedData.refundAmount || 0
        if (reservation.paidAmount > 0 && !validatedData.refundAmount) {
          // Default cancellation policy: full refund if cancelled 48h before check-in
          const checkIn = new Date(reservation.checkIn)
          const now = new Date()
          const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60)
          
          if (hoursUntilCheckIn >= 48) {
            refundAmount = reservation.paidAmount
          } else if (hoursUntilCheckIn >= 24) {
            refundAmount = reservation.paidAmount * 0.5 // 50% refund
          }
          // No refund if less than 24h
        }

        // Update reservation status
        const updates: Partial<Reservation> = {
          status: ReservationStatus.CANCELLED,
          updatedAt: new Date(),
          observations: reservation.observations 
            ? `${reservation.observations}\n\nCancelamento: ${validatedData.reason}`
            : `Cancelamento: ${validatedData.reason}`
        }

        // Update payment status if there's a refund
        if (refundAmount > 0) {
          updates.paymentStatus = PaymentStatus.REFUNDED
          updates.pendingAmount = 0
        }

        const updatedReservation = await reservationDb.update(id, updates)

        // TODO: Process refund if applicable
        // TODO: Send cancellation notification
        // TODO: Update calendar/availability

        return NextResponse.json({
          success: true,
          data: {
            reservation: updatedReservation,
            refund: {
              amount: refundAmount,
              method: validatedData.refundMethod || reservation.paymentMethod
            }
          }
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  )
}