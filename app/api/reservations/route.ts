import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { z } from 'zod'
import { PaymentMethod, PaymentStatus, ReservationStatus, ReservationSource } from '@/lib/types/reservation'

// Zod schema for reservation validation
const CreateReservationSchema = z.object({
  propertyId: z.string()
    .min(1, 'ID da propriedade é obrigatório')
    .max(100, 'ID da propriedade inválido'),

  clientId: z.string()
    .min(1, 'ID do cliente é obrigatório')
    .max(100, 'ID do cliente inválido'),

  checkIn: z.coerce.date({
    errorMap: () => ({ message: 'Data de check-in inválida' })
  }),

  checkOut: z.coerce.date({
    errorMap: () => ({ message: 'Data de check-out inválida' })
  }),

  guests: z.number()
    .int('Número de hóspedes deve ser inteiro')
    .positive('Número de hóspedes deve ser positivo')
    .min(1, 'Deve ter pelo menos 1 hóspede'),

  totalAmount: z.number()
    .min(0, 'Valor total não pode ser negativo'),

  paidAmount: z.number()
    .min(0, 'Valor pago não pode ser negativo')
    .default(0),

  pendingAmount: z.number()
    .min(0, 'Valor pendente não pode ser negativo')
    .optional(),

  status: z.nativeEnum(ReservationStatus).default(ReservationStatus.PENDING),

  paymentStatus: z.nativeEnum(PaymentStatus).default(PaymentStatus.PENDING),

  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.PIX),

  source: z.nativeEnum(ReservationSource).default(ReservationSource.MANUAL),

  agentId: z.string().max(100).optional(),

  specialRequests: z.string()
    .max(2000, 'Solicitações especiais devem ter no máximo 2000 caracteres')
    .default(''),

  observations: z.string()
    .max(2000, 'Observações devem ter no máximo 2000 caracteres')
    .default(''),

  guestDetails: z.array(z.object({
    name: z.string().min(1, 'Nome do hóspede é obrigatório'),
    document: z.string().min(1, 'Documento do hóspede é obrigatório'),
    documentType: z.enum(['cpf', 'rg', 'passport']),
    phone: z.string().optional(),
    email: z.string().email('Email inválido').optional(),
    birthDate: z.coerce.date().optional(),
    isMainGuest: z.boolean().default(false)
  })).default([]),

  extraServices: z.array(z.object({
    name: z.string().min(1, 'Nome do serviço é obrigatório'),
    description: z.string().optional(),
    price: z.number().min(0, 'Preço não pode ser negativo'),
    quantity: z.number().int().positive('Quantidade deve ser positiva'),
    total: z.number().min(0, 'Total não pode ser negativo'),
    category: z.enum(['cleaning', 'transport', 'food', 'entertainment', 'other'])
  })).default([]),

  payments: z.array(z.any()).default([]),

  paymentPlan: z.object({
    totalAmount: z.number().min(0),
    installments: z.array(z.any()),
    paymentMethod: z.nativeEnum(PaymentMethod),
    feePercentage: z.number().min(0).default(0),
    totalFees: z.number().min(0).default(0),
    description: z.string().optional()
  }).optional(),
})

const UpdateReservationSchema = CreateReservationSchema.partial()

// GET /api/reservations - List all reservations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    const source = searchParams.get('source')
    const propertyId = searchParams.get('propertyId')
    const clientId = searchParams.get('clientId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeRelations = searchParams.get('include')

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    const reservations = await services.reservations.getAll()

    // Apply filters
    let filteredReservations = reservations as any[]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredReservations = filteredReservations.filter(reservation =>
        reservation.id?.toLowerCase().includes(searchLower) ||
        reservation.specialRequests?.toLowerCase().includes(searchLower) ||
        reservation.observations?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (status) {
      filteredReservations = filteredReservations.filter(reservation =>
        reservation.status === status
      )
    }

    // Payment status filter
    if (paymentStatus) {
      filteredReservations = filteredReservations.filter(reservation =>
        reservation.paymentStatus === paymentStatus
      )
    }

    // Source filter
    if (source) {
      filteredReservations = filteredReservations.filter(reservation =>
        reservation.source === source
      )
    }

    // Property filter
    if (propertyId) {
      filteredReservations = filteredReservations.filter(reservation =>
        reservation.propertyId === propertyId
      )
    }

    // Client filter
    if (clientId) {
      filteredReservations = filteredReservations.filter(reservation =>
        reservation.clientId === clientId
      )
    }

    // Date range filter (check-in)
    if (startDate) {
      const start = new Date(startDate)
      filteredReservations = filteredReservations.filter(reservation => {
        const checkIn = reservation.checkIn instanceof Date ? reservation.checkIn : new Date(reservation.checkIn)
        return checkIn >= start
      })
    }

    if (endDate) {
      const end = new Date(endDate)
      filteredReservations = filteredReservations.filter(reservation => {
        const checkIn = reservation.checkIn instanceof Date ? reservation.checkIn : new Date(reservation.checkIn)
        return checkIn <= end
      })
    }

    // Sort by check-in date (newest first)
    filteredReservations.sort((a, b) => {
      const dateA = a.checkIn instanceof Date ? a.checkIn : new Date(a.checkIn)
      const dateB = b.checkIn instanceof Date ? b.checkIn : new Date(b.checkIn)
      return dateB.getTime() - dateA.getTime()
    })

    // Load related data if requested
    if (includeRelations) {
      const includes = includeRelations.split(',')

      for (const reservation of filteredReservations) {
        if (includes.includes('property') && reservation.propertyId) {
          try {
            reservation.property = await services.properties.getById(reservation.propertyId)
          } catch (error) {
            console.error('Error loading property:', error)
          }
        }

        if (includes.includes('client') && reservation.clientId) {
          try {
            reservation.client = await services.clients.getById(reservation.clientId)
          } catch (error) {
            console.error('Error loading client:', error)
          }
        }
      }
    }

    // Calculate statistics
    const stats = {
      total: filteredReservations.length,
      pending: filteredReservations.filter(r => r.status === ReservationStatus.PENDING).length,
      confirmed: filteredReservations.filter(r => r.status === ReservationStatus.CONFIRMED).length,
      checkedIn: filteredReservations.filter(r => r.status === ReservationStatus.CHECKED_IN).length,
      checkedOut: filteredReservations.filter(r => r.status === ReservationStatus.CHECKED_OUT).length,
      cancelled: filteredReservations.filter(r => r.status === ReservationStatus.CANCELLED).length,
      totalRevenue: filteredReservations
        .filter(r => r.paymentStatus === PaymentStatus.PAID)
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0),
      pendingRevenue: filteredReservations
        .filter(r => r.paymentStatus === PaymentStatus.PENDING || r.paymentStatus === PaymentStatus.PARTIAL)
        .reduce((sum, r) => sum + (r.pendingAmount || 0), 0),
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedReservations = filteredReservations.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      data: paginatedReservations,
      stats,
      pagination: {
        page,
        limit,
        total: filteredReservations.length,
        totalPages: Math.ceil(filteredReservations.length / limit)
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/reservations - Create a new reservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Validate the request body
    const validationResult = CreateReservationSchema.safeParse(body)
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

    // Validate check-in and check-out dates
    if (validatedData.checkOut <= validatedData.checkIn) {
      return NextResponse.json(
        {
          error: 'Data de check-out deve ser posterior à data de check-in',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Calculate nights
    const nights = Math.ceil(
      (validatedData.checkOut.getTime() - validatedData.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Calculate pending amount if not provided
    const pendingAmount = validatedData.pendingAmount !== undefined
      ? validatedData.pendingAmount
      : validatedData.totalAmount - validatedData.paidAmount

    // Sanitize text fields
    const sanitizedData: any = {
      ...validatedData,
      nights,
      pendingAmount,
      specialRequests: sanitizeUserInput(validatedData.specialRequests),
      observations: sanitizeUserInput(validatedData.observations),

      // Sanitize guest details
      guestDetails: validatedData.guestDetails.map(guest => ({
        ...guest,
        id: guest.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        name: sanitizeUserInput(guest.name),
        document: sanitizeUserInput(guest.document),
        phone: guest.phone ? sanitizeUserInput(guest.phone) : undefined,
        email: guest.email ? sanitizeUserInput(guest.email) : undefined,
      })),

      // Sanitize extra services
      extraServices: validatedData.extraServices.map(service => ({
        ...service,
        id: service.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        name: sanitizeUserInput(service.name),
        description: service.description ? sanitizeUserInput(service.description) : undefined,
      })),

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),

      // Tenant ID
      tenantId: authContext.tenantId,
    }

    const services = new TenantServiceFactory(authContext.tenantId)

    // Verify that property exists
    const property = await services.properties.getById(validatedData.propertyId)
    if (!property) {
      return NextResponse.json(
        { error: 'Propriedade não encontrada', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Verify that client exists
    const client = await services.clients.getById(validatedData.clientId)
    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check property capacity
    if (validatedData.guests > (property as any).maxGuests) {
      return NextResponse.json(
        {
          error: `Número de hóspedes excede a capacidade máxima da propriedade (${(property as any).maxGuests})`,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Create the reservation
    const newReservation = await services.reservations.create(sanitizedData)

    // Trigger notification for new reservation (NON-BLOCKING - fire and forget)
    import('@/lib/services/notification-service').then(({ NotificationServiceFactory }) => {
      const notificationService = NotificationServiceFactory.getInstance(authContext.tenantId)

      return notificationService.createNotification({
        targetUserId: authContext.userId || 'system',
        targetUserName: authContext.email,
        type: 'reservation_created' as any,
        title: '🎉 Nova Reserva Criada',
        message: `Reserva confirmada para ${(property as any).name || 'propriedade'} de ${validatedData.checkIn.toLocaleDateString('pt-BR')} até ${validatedData.checkOut.toLocaleDateString('pt-BR')}. Cliente: ${client.name || 'N/A'}. Total: R$ ${validatedData.totalAmount.toFixed(2)}.`,
        entityType: 'reservation',
        entityId: newReservation,
        entityData: {
          propertyName: (property as any).name,
          clientName: client.name,
          checkIn: validatedData.checkIn,
          checkOut: validatedData.checkOut,
          guests: validatedData.guests,
          totalAmount: validatedData.totalAmount,
          nights
        },
        priority: 'high' as any,
        channels: ['dashboard', 'email'] as any[],
        recipientEmail: authContext.email,
        actionUrl: `/dashboard/reservations/${newReservation}`,
        actionLabel: 'Ver Reserva',
        metadata: {
          source: 'reservation_api',
          triggerEvent: 'reservation_created',
          reservationId: newReservation
        }
      })
    }).catch(notificationError => {
      // Log but don't fail the reservation creation
      console.error('Failed to send reservation notification:', notificationError)
    })

    return NextResponse.json(
      {
        success: true,
        data: newReservation,
        message: 'Reserva criada com sucesso'
      },
      { status: 201 }
    )

  } catch (error) {
    return handleApiError(error)
  }
}
