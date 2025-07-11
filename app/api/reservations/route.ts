import { NextRequest, NextResponse } from 'next/server'
import { FirestoreService } from '@/lib/firebase/firestore'
import { Reservation, ReservationStatus, PaymentStatus } from '@/lib/types/reservation'
import { withAuth, AuthUser } from '@/lib/middleware/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit'
import { handleApiError } from '@/lib/utils/api-errors'
import { reservationService } from '@/lib/services/reservation-service'
import {
  createReservationSchema,
  updateReservationSchema,
  reservationQuerySchema,
  type CreateReservationInput,
  type UpdateReservationInput,
  type ReservationQuery
} from '@/lib/validations/reservation'
import { z } from 'zod'

const reservationDb = new FirestoreService<Reservation>('reservations')

export async function GET(request: NextRequest) {
  return withRateLimit(
    request,
    RATE_LIMIT_CONFIGS.read,
    async () => withAuth(request, async (req: NextRequest, user: AuthUser) => {
      try {
        // Parse and validate query parameters
        const { searchParams } = new URL(req.url)
        const queryParams = Object.fromEntries(searchParams.entries())
        
        let query: ReservationQuery
        try {
          query = reservationQuerySchema.parse(queryParams)
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

        // Build filters with tenant isolation
        const filters: any[] = [
          { field: 'tenantId', operator: '==', value: user.tenantId }
        ]
        
        if (query.status) {
          filters.push({ field: 'status', operator: '==', value: query.status })
        }
        
        if (query.propertyId) {
          filters.push({ field: 'propertyId', operator: '==', value: query.propertyId })
        }
        
        if (query.clientId) {
          filters.push({ field: 'clientId', operator: '==', value: query.clientId })
        }
        
        if (query.source) {
          filters.push({ field: 'source', operator: '==', value: query.source })
        }
        
        // Date range filters
        if (query.startDate) {
          filters.push({ field: 'checkIn', operator: '>=', value: new Date(query.startDate) })
        }
        
        if (query.endDate) {
          filters.push({ field: 'checkOut', operator: '<=', value: new Date(query.endDate) })
        }

        // Get reservations with pagination
        const reservations = await reservationDb.getMany(filters, {
          orderBy: query.sortBy,
          orderDirection: query.sortOrder,
          limit: query.limit,
          offset: (query.page - 1) * query.limit
        })

        // Get total count for pagination
        const totalCount = await reservationDb.count(filters)

        return NextResponse.json({
          success: true,
          data: {
            reservations,
            pagination: {
              page: query.page,
              limit: query.limit,
              total: totalCount,
              totalPages: Math.ceil(totalCount / query.limit)
            }
          }
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  )
}

export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    RATE_LIMIT_CONFIGS.write,
    async () => withAuth(request, async (req: NextRequest, user: AuthUser) => {
      try {
        // Parse request body
        const body = await req.json()
        
        // Validate input
        let validatedData: CreateReservationInput
        try {
          validatedData = createReservationSchema.parse(body)
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

        // Convert dates
        const checkInDate = new Date(validatedData.checkIn)
        const checkOutDate = new Date(validatedData.checkOut)

        // Validate business rules
        reservationService.validateReservationDates(checkInDate, checkOutDate)
        await reservationService.validatePropertyCapacity(
          validatedData.propertyId,
          validatedData.guests
        )

        // Check availability
        const isAvailable = await reservationService.checkAvailability({
          propertyId: validatedData.propertyId,
          checkIn: validatedData.checkIn,
          checkOut: validatedData.checkOut
        })

        if (!isAvailable) {
          return NextResponse.json(
            { 
              error: 'Propriedade não está disponível para as datas selecionadas',
              code: 'PROPERTY_NOT_AVAILABLE'
            },
            { status: 409 }
          )
        }

        // Calculate pricing if not provided
        let pricing = {
          totalAmount: validatedData.totalAmount,
          baseAmount: 0,
          cleaningFee: 0,
          securityDeposit: 0
        }

        if (!validatedData.totalAmount || validatedData.totalAmount === 0) {
          pricing = await reservationService.calculatePricing(
            validatedData.propertyId,
            checkInDate,
            checkOutDate,
            validatedData.guests
          )
        }

        // Create reservation object
        const reservation: Omit<Reservation, 'id'> = {
          ...validatedData,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          status: ReservationStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount: pricing.totalAmount,
          paidAmount: 0,
          pendingAmount: pricing.totalAmount,
          tenantId: user.tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
          payments: [],
          paymentPlan: validatedData.paymentPlan || {
            totalAmount: pricing.totalAmount,
            installments: [{
              number: 1,
              amount: pricing.totalAmount,
              dueDate: checkInDate,
              description: 'Pagamento total',
              isPaid: false
            }],
            paymentMethod: validatedData.paymentMethod,
            feePercentage: 0,
            totalFees: 0
          }
        }

        // Create reservation
        const savedReservation = await reservationDb.create(reservation)

        // Sync reservation dates with property unavailableDates if status is confirmed or pending
        if (savedReservation.id && [ReservationStatus.CONFIRMED, ReservationStatus.PENDING].includes(savedReservation.status)) {
          await reservationService.syncReservationWithUnavailableDates(savedReservation.id, 'add')
        }

        // TODO: Send confirmation email/WhatsApp
        // TODO: Create initial payment record
        // TODO: Trigger automation workflows

        return NextResponse.json(
          {
            success: true,
            data: savedReservation
          },
          { status: 201 }
        )

      } catch (error) {
        return handleApiError(error)
      }
    })
  )
}

export async function PUT(request: NextRequest) {
  return withRateLimit(
    request,
    RATE_LIMIT_CONFIGS.write,
    async () => withAuth(request, async (req: NextRequest, user: AuthUser) => {
      try {
        // Parse request body
        const body = await req.json()
        const { id, ...updateData } = body

        if (!id) {
          return NextResponse.json(
            { 
              error: 'ID da reserva é obrigatório',
              code: 'MISSING_ID'
            },
            { status: 400 }
          )
        }

        // Validate update data
        let validatedData: UpdateReservationInput
        try {
          validatedData = updateReservationSchema.parse(updateData)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { 
                error: 'Dados de atualização inválidos',
                details: error.errors,
                code: 'VALIDATION_ERROR'
              },
              { status: 400 }
            )
          }
          throw error
        }

        // Get existing reservation with tenant check
        const existingReservation = await reservationDb.get(id)
        if (!existingReservation) {
          return NextResponse.json(
            { 
              error: 'Reserva não encontrada',
              code: 'NOT_FOUND'
            },
            { status: 404 }
          )
        }

        // Ensure tenant isolation
        if (existingReservation.tenantId !== user.tenantId) {
          return NextResponse.json(
            { 
              error: 'Acesso negado',
              code: 'FORBIDDEN'
            },
            { status: 403 }
          )
        }

        // Check if reservation can be modified
        if (!reservationService.canModifyReservation(existingReservation)) {
          return NextResponse.json(
            { 
              error: 'Reserva não pode ser modificada no status atual',
              code: 'INVALID_STATUS'
            },
            { status: 400 }
          )
        }

        // Validate date changes if provided
        if (validatedData.checkIn || validatedData.checkOut) {
          const checkInDate = validatedData.checkIn 
            ? new Date(validatedData.checkIn) 
            : new Date(existingReservation.checkIn)
          const checkOutDate = validatedData.checkOut
            ? new Date(validatedData.checkOut)
            : new Date(existingReservation.checkOut)

          reservationService.validateReservationDates(checkInDate, checkOutDate)

          // Check availability for new dates
          const isAvailable = await reservationService.checkAvailability({
            propertyId: existingReservation.propertyId,
            checkIn: checkInDate.toISOString(),
            checkOut: checkOutDate.toISOString(),
            excludeReservationId: id
          })

          if (!isAvailable) {
            return NextResponse.json(
              { 
                error: 'Propriedade não está disponível para as novas datas',
                code: 'PROPERTY_NOT_AVAILABLE'
              },
              { status: 409 }
            )
          }
        }

        // Validate guest count if changed
        if (validatedData.guests) {
          await reservationService.validatePropertyCapacity(
            existingReservation.propertyId,
            validatedData.guests
          )
        }

        // Update reservation
        const updates = {
          ...validatedData,
          updatedAt: new Date()
        }

        // Convert date strings to Date objects if present
        if (updates.checkIn) updates.checkIn = new Date(updates.checkIn)
        if (updates.checkOut) updates.checkOut = new Date(updates.checkOut)

        const updatedReservation = await reservationDb.update(id, updates)

        // Handle status changes and sync availability
        if (validatedData.status && validatedData.status !== existingReservation.status) {
          await reservationService.updateReservationStatus(id, validatedData.status)
        }

        // Update payment status if paid amount changed
        if (validatedData.paidAmount !== undefined) {
          await reservationService.updatePaymentStatus(id, validatedData.paidAmount)
        }

        return NextResponse.json({
          success: true,
          data: updatedReservation
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  )
}

export async function DELETE(request: NextRequest) {
  return withRateLimit(
    request,
    RATE_LIMIT_CONFIGS.delete,
    async () => withAuth(request, async (req: NextRequest, user: AuthUser) => {
      try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
          return NextResponse.json(
            { 
              error: 'ID da reserva é obrigatório',
              code: 'MISSING_ID'
            },
            { status: 400 }
          )
        }

        // Get existing reservation
        const existingReservation = await reservationDb.get(id)
        if (!existingReservation) {
          return NextResponse.json(
            { 
              error: 'Reserva não encontrada',
              code: 'NOT_FOUND'
            },
            { status: 404 }
          )
        }

        // Ensure tenant isolation
        if (existingReservation.tenantId !== user.tenantId) {
          return NextResponse.json(
            { 
              error: 'Acesso negado',
              code: 'FORBIDDEN'
            },
            { status: 403 }
          )
        }

        // Only allow deletion of pending reservations
        // For other statuses, use cancel endpoint
        if (existingReservation.status !== ReservationStatus.PENDING) {
          return NextResponse.json(
            { 
              error: 'Apenas reservas pendentes podem ser excluídas. Use o cancelamento para outras situações.',
              code: 'INVALID_STATUS'
            },
            { status: 400 }
          )
        }

        // Delete the reservation
        await reservationDb.delete(id)

        // TODO: Clean up related records (payments, etc.)

        return NextResponse.json({
          success: true,
          message: 'Reserva excluída com sucesso'
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  )
}