import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { z } from 'zod'
import { PaymentMethod, PaymentStatus, ReservationStatus, ReservationSource } from '@/lib/types/reservation'

// Zod schema for reservation update
const UpdateReservationSchema = z.object({
  propertyId: z.string()
    .min(1, 'ID da propriedade é obrigatório')
    .max(100, 'ID da propriedade inválido')
    .optional(),

  clientId: z.string()
    .min(1, 'ID do cliente é obrigatório')
    .max(100, 'ID do cliente inválido')
    .optional(),

  checkIn: z.coerce.date({
    errorMap: () => ({ message: 'Data de check-in inválida' })
  }).optional(),

  checkOut: z.coerce.date({
    errorMap: () => ({ message: 'Data de check-out inválida' })
  }).optional(),

  guests: z.number()
    .int('Número de hóspedes deve ser inteiro')
    .positive('Número de hóspedes deve ser positivo')
    .min(1, 'Deve ter pelo menos 1 hóspede')
    .optional(),

  totalAmount: z.number()
    .min(0, 'Valor total não pode ser negativo')
    .optional(),

  paidAmount: z.number()
    .min(0, 'Valor pago não pode ser negativo')
    .optional(),

  pendingAmount: z.number()
    .min(0, 'Valor pendente não pode ser negativo')
    .optional(),

  status: z.nativeEnum(ReservationStatus).optional(),

  paymentStatus: z.nativeEnum(PaymentStatus).optional(),

  paymentMethod: z.nativeEnum(PaymentMethod).optional(),

  source: z.nativeEnum(ReservationSource).optional(),

  agentId: z.string().max(100).optional(),

  specialRequests: z.string()
    .max(2000, 'Solicitações especiais devem ter no máximo 2000 caracteres')
    .optional(),

  observations: z.string()
    .max(2000, 'Observações devem ter no máximo 2000 caracteres')
    .optional(),

  guestDetails: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Nome do hóspede é obrigatório'),
    document: z.string().min(1, 'Documento do hóspede é obrigatório'),
    documentType: z.enum(['cpf', 'rg', 'passport']),
    phone: z.string().optional(),
    email: z.string().email('Email inválido').optional(),
    birthDate: z.coerce.date().optional(),
    isMainGuest: z.boolean().default(false)
  })).optional(),

  extraServices: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Nome do serviço é obrigatório'),
    description: z.string().optional(),
    price: z.number().min(0, 'Preço não pode ser negativo'),
    quantity: z.number().int().positive('Quantidade deve ser positiva'),
    total: z.number().min(0, 'Total não pode ser negativo'),
    category: z.enum(['cleaning', 'transport', 'food', 'entertainment', 'other'])
  })).optional(),

  payments: z.array(z.any()).optional(),

  paymentPlan: z.object({
    totalAmount: z.number().min(0),
    installments: z.array(z.any()),
    paymentMethod: z.nativeEnum(PaymentMethod),
    feePercentage: z.number().min(0).default(0),
    totalFees: z.number().min(0).default(0),
    description: z.string().optional()
  }).optional(),
})

// GET /api/reservations/[id] - Get a specific reservation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    const reservation = await services.reservations.getById(id)

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reserva não encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Optionally load related data
    const includeRelations = request.nextUrl.searchParams.get('include')
    const relatedData: any = {}

    if (includeRelations) {
      const includes = includeRelations.split(',')

      if (includes.includes('client') && reservation.clientId) {
        try {
          relatedData.client = await services.clients.getById(reservation.clientId)
        } catch (error) {
          console.error('Error loading client:', error)
        }
      }

      if (includes.includes('property') && reservation.propertyId) {
        try {
          relatedData.property = await services.properties.getById(reservation.propertyId)
        } catch (error) {
          console.error('Error loading property:', error)
        }
      }

      if (includes.includes('transactions')) {
        try {
          const transactions = await services.transactions.getAll()
          relatedData.transactions = (transactions as any[]).filter(
            (t: any) => t.reservationId === id
          )
        } catch (error) {
          console.error('Error loading transactions:', error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...reservation,
        ...relatedData
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/reservations/[id] - Update a reservation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)

    // Check if reservation exists
    const existingReservation = await services.reservations.getById(id)
    if (!existingReservation) {
      return NextResponse.json(
        { error: 'Reserva não encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Validate the request body
    const validationResult = UpdateReservationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten()
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Validate check-in and check-out dates if both are provided
    const checkIn = validatedData.checkIn || existingReservation.checkIn
    const checkOut = validatedData.checkOut || existingReservation.checkOut

    if (checkOut <= checkIn) {
      return NextResponse.json(
        {
          error: 'Data de check-out deve ser posterior à data de check-in',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Recalculate nights if dates changed
    let nights = existingReservation.nights
    if (validatedData.checkIn || validatedData.checkOut) {
      nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    // Sanitize text fields
    const sanitizedData: any = {
      ...validatedData,
      nights,
    }

    if (validatedData.specialRequests) {
      sanitizedData.specialRequests = sanitizeUserInput(validatedData.specialRequests)
    }

    if (validatedData.observations) {
      sanitizedData.observations = sanitizeUserInput(validatedData.observations)
    }

    // Sanitize guest details if provided
    if (validatedData.guestDetails) {
      sanitizedData.guestDetails = validatedData.guestDetails.map(guest => ({
        ...guest,
        id: guest.id || guest.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        name: sanitizeUserInput(guest.name),
        document: sanitizeUserInput(guest.document),
        phone: guest.phone ? sanitizeUserInput(guest.phone) : undefined,
        email: guest.email ? sanitizeUserInput(guest.email) : undefined,
      }))
    }

    // Sanitize extra services if provided
    if (validatedData.extraServices) {
      sanitizedData.extraServices = validatedData.extraServices.map(service => ({
        ...service,
        id: service.id || service.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        name: sanitizeUserInput(service.name),
        description: service.description ? sanitizeUserInput(service.description) : undefined,
      }))
    }

    // Recalculate pending amount if totalAmount or paidAmount changed
    if (validatedData.totalAmount !== undefined || validatedData.paidAmount !== undefined) {
      const totalAmount = validatedData.totalAmount || existingReservation.totalAmount
      const paidAmount = validatedData.paidAmount || existingReservation.paidAmount
      sanitizedData.pendingAmount = totalAmount - paidAmount
    }

    // Always update the updatedAt timestamp
    sanitizedData.updatedAt = new Date()

    // Verify property capacity if guests changed
    if (validatedData.guests && validatedData.propertyId) {
      const property = await services.properties.getById(validatedData.propertyId)
      if (property && validatedData.guests > (property as any).maxGuests) {
        return NextResponse.json(
          {
            error: `Número de hóspedes excede a capacidade máxima da propriedade (${(property as any).maxGuests})`,
            code: 'VALIDATION_ERROR'
          },
          { status: 400 }
        )
      }
    }

    // Update the reservation
    const updatedReservation = await services.reservations.update(id, sanitizedData)

    return NextResponse.json({
      success: true,
      data: updatedReservation,
      message: 'Reserva atualizada com sucesso'
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/reservations/[id] - Delete a reservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)

    // Check if reservation exists
    const existingReservation = await services.reservations.getById(id)
    if (!existingReservation) {
      return NextResponse.json(
        { error: 'Reserva não encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Soft delete: mark as cancelled instead of deleting
    const softDelete = request.nextUrl.searchParams.get('soft') !== 'false' // Default to soft delete

    if (softDelete) {
      await services.reservations.update(id, {
        status: ReservationStatus.CANCELLED,
        updatedAt: new Date()
      })

      return NextResponse.json({
        success: true,
        message: 'Reserva cancelada com sucesso'
      })
    } else {
      // Hard delete
      await services.reservations.delete(id)

      return NextResponse.json({
        success: true,
        message: 'Reserva excluída com sucesso'
      })
    }

  } catch (error) {
    return handleApiError(error)
  }
}
