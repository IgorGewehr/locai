import { NextRequest, NextResponse } from 'next/server'
import { FirestoreService } from '@/lib/firebase/firestore'
import { Reservation, ReservationStatus, PaymentStatus } from '@/lib/types/reservation'
import { withAuth, AuthUser } from '@/lib/middleware/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit'
import { handleApiError } from '@/lib/utils/api-errors'
import { z } from 'zod'

const reservationDb = new FirestoreService<Reservation>('reservations')

// Analytics query schema
const analyticsQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  propertyId: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('month')
})

/**
 * GET /api/reservations/analytics - Get reservation analytics
 */
export async function GET(request: NextRequest) {
  return withRateLimit(
    request,
    RATE_LIMIT_CONFIGS.read,
    async () => withAuth(request, async (req: NextRequest, user: AuthUser) => {
      try {
        // Parse query parameters
        const { searchParams } = new URL(req.url)
        const queryParams = Object.fromEntries(searchParams.entries())
        
        let query: z.infer<typeof analyticsQuerySchema>
        try {
          query = analyticsQuerySchema.parse(queryParams)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { 
                error: 'Parâmetros de consulta inválidos',
                details: error.errors,
                code: 'INVALID_QUERY'
              },
              { status: 400 }
            )
          }
          throw error
        }

        const startDate = new Date(query.startDate)
        const endDate = new Date(query.endDate)

        // Build filters
        const filters: any[] = [
          { field: 'tenantId', operator: '==', value: user.tenantId },
          { field: 'checkIn', operator: '>=', value: startDate },
          { field: 'checkIn', operator: '<=', value: endDate }
        ]

        if (query.propertyId) {
          filters.push({ field: 'propertyId', operator: '==', value: query.propertyId })
        }

        // Get all reservations in the period
        const reservations = await reservationDb.getMany(filters)

        // Calculate analytics
        const analytics = {
          period: {
            start: query.startDate,
            end: query.endDate
          },
          summary: {
            totalReservations: reservations.length,
            confirmedReservations: 0,
            cancelledReservations: 0,
            completedReservations: 0,
            totalRevenue: 0,
            paidRevenue: 0,
            pendingRevenue: 0,
            averageStayLength: 0,
            averageGuestsPerReservation: 0,
            occupancyRate: 0
          },
          byStatus: {} as Record<string, number>,
          bySource: {} as Record<string, number>,
          byPaymentStatus: {} as Record<string, number>,
          timeline: [] as any[]
        }

        // Process reservations
        let totalNights = 0
        let totalGuests = 0

        for (const reservation of reservations) {
          // Status counts
          analytics.byStatus[reservation.status] = (analytics.byStatus[reservation.status] || 0) + 1
          
          // Source counts
          analytics.bySource[reservation.source] = (analytics.bySource[reservation.source] || 0) + 1
          
          // Payment status counts
          analytics.byPaymentStatus[reservation.paymentStatus] = 
            (analytics.byPaymentStatus[reservation.paymentStatus] || 0) + 1

          // Summary calculations
          if (reservation.status === ReservationStatus.CONFIRMED) {
            analytics.summary.confirmedReservations++
          } else if (reservation.status === ReservationStatus.CANCELLED) {
            analytics.summary.cancelledReservations++
          } else if (reservation.status === ReservationStatus.CHECKED_OUT) {
            analytics.summary.completedReservations++
          }

          // Revenue calculations (exclude cancelled)
          if (reservation.status !== ReservationStatus.CANCELLED) {
            analytics.summary.totalRevenue += reservation.totalAmount
            analytics.summary.paidRevenue += reservation.paidAmount
            analytics.summary.pendingRevenue += reservation.pendingAmount
          }

          // Stay length and guests
          const nights = Math.ceil(
            (new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 
            (1000 * 60 * 60 * 24)
          )
          totalNights += nights
          totalGuests += reservation.guests
        }

        // Calculate averages
        if (reservations.length > 0) {
          analytics.summary.averageStayLength = totalNights / reservations.length
          analytics.summary.averageGuestsPerReservation = totalGuests / reservations.length
        }

        // Group by time period for timeline
        const timeGroups = new Map<string, any>()
        
        for (const reservation of reservations) {
          const checkInDate = new Date(reservation.checkIn)
          let groupKey: string
          
          if (query.groupBy === 'day') {
            groupKey = checkInDate.toISOString().split('T')[0]
          } else if (query.groupBy === 'week') {
            const weekStart = new Date(checkInDate)
            weekStart.setDate(checkInDate.getDate() - checkInDate.getDay())
            groupKey = weekStart.toISOString().split('T')[0]
          } else {
            groupKey = `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}`
          }

          if (!timeGroups.has(groupKey)) {
            timeGroups.set(groupKey, {
              period: groupKey,
              reservations: 0,
              revenue: 0,
              nights: 0
            })
          }

          const group = timeGroups.get(groupKey)
          group.reservations++
          
          if (reservation.status !== ReservationStatus.CANCELLED) {
            group.revenue += reservation.totalAmount
          }
          
          const nights = Math.ceil(
            (new Date(reservation.checkOut).getTime() - new Date(reservation.checkIn).getTime()) / 
            (1000 * 60 * 60 * 24)
          )
          group.nights += nights
        }

        analytics.timeline = Array.from(timeGroups.values()).sort((a, b) => 
          a.period.localeCompare(b.period)
        )

        return NextResponse.json({
          success: true,
          data: analytics
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  )
}