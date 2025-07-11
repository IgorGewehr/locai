import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/middleware/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit'
import { handleApiError } from '@/lib/utils/api-errors'
import { reservationService } from '@/lib/services/reservation-service'
import { checkAvailabilitySchema, type CheckAvailabilityInput } from '@/lib/validations/reservation'
import { z } from 'zod'

/**
 * POST /api/reservations/check-availability - Check if a property is available for given dates
 */
export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    RATE_LIMIT_CONFIGS.search,
    async () => withAuth(request, async (req: NextRequest, user: AuthUser) => {
      try {
        // Parse and validate request body
        const body = await req.json()
        let validatedData: CheckAvailabilityInput
        
        try {
          validatedData = checkAvailabilitySchema.parse(body)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { 
                error: 'Dados de consulta inválidos',
                details: error.errors,
                code: 'VALIDATION_ERROR'
              },
              { status: 400 }
            )
          }
          throw error
        }

        // Check availability
        const isAvailable = await reservationService.checkAvailability(validatedData)

        // If not available, get conflicting reservations for better UX
        let conflicts = []
        if (!isAvailable) {
          conflicts = await reservationService.findConflictingReservations(
            validatedData.propertyId,
            new Date(validatedData.checkIn),
            new Date(validatedData.checkOut),
            validatedData.excludeReservationId
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            available: isAvailable,
            propertyId: validatedData.propertyId,
            checkIn: validatedData.checkIn,
            checkOut: validatedData.checkOut,
            conflicts: conflicts.map(r => ({
              id: r.id,
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              status: r.status
            }))
          }
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  )
}