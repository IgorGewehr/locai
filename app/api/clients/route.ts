import { NextRequest, NextResponse } from 'next/server'
import { clientService } from '@/lib/firebase/firestore'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { z } from 'zod'
import { CustomerSegment, AcquisitionSource } from '@/lib/types/client'
import { PaymentMethod } from '@/lib/types/reservation'
import type { Client } from '@/lib/types/client'

// Zod schema for client validation
const CreateClientSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  email: z.string()
    .email('Email deve ter formato válido')
    .max(100, 'Email deve ter no máximo 100 caracteres')
    .optional(),
  
  phone: z.string()
    .min(10, 'Telefone deve ter pelo menos 10 dígitos')
    .max(15, 'Telefone deve ter no máximo 15 dígitos'),
  
  document: z.string()
    .min(11, 'Documento deve ter pelo menos 11 caracteres')
    .max(18, 'Documento deve ter no máximo 18 caracteres'),
  
  documentType: z.enum(['cpf', 'cnpj']),
  
  address: z.object({
    street: z.string().max(200, 'Rua deve ter no máximo 200 caracteres'),
    number: z.string().max(20, 'Número deve ter no máximo 20 caracteres'),
    complement: z.string().max(100, 'Complemento deve ter no máximo 100 caracteres').optional(),
    neighborhood: z.string().max(100, 'Bairro deve ter no máximo 100 caracteres'),
    city: z.string().max(100, 'Cidade deve ter no máximo 100 caracteres'),
    state: z.string().length(2, 'Estado deve ter 2 caracteres (UF)'),
    zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP deve ter formato válido (00000-000)'),
    country: z.string().default('Brasil')
  }).optional(),
  
  preferences: z.object({
    preferredPaymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.PIX),
    preferredCheckInTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve ter formato HH:MM').optional(),
    preferredCheckOutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve ter formato HH:MM').optional(),
    petOwner: z.boolean().default(false),
    smoker: z.boolean().default(false),
    preferredRoomType: z.string().max(50, 'Tipo de quarto preferido deve ter no máximo 50 caracteres').optional(),
    emergencyContact: z.object({
      name: z.string().max(100, 'Nome deve ter no máximo 100 caracteres'),
      phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
      relationship: z.string().max(50, 'Relacionamento deve ter no máximo 50 caracteres'),
      email: z.string().email('Email deve ter formato válido').optional()
    }).optional(),
    dietaryRestrictions: z.string().max(500, 'Restrições alimentares devem ter no máximo 500 caracteres').optional(),
    accessibilityNeeds: z.string().max(500, 'Necessidades de acessibilidade devem ter no máximo 500 caracteres').optional(),
    communicationPreference: z.enum(['whatsapp', 'email', 'phone', 'sms']).default('whatsapp'),
    marketingOptIn: z.boolean().default(false)
  }).optional(),
  
  customerSegment: z.nativeEnum(CustomerSegment).default(CustomerSegment.NEW),
  acquisitionSource: z.nativeEnum(AcquisitionSource).default(AcquisitionSource.DIRECT),
  isActive: z.boolean().default(true),
  isVip: z.boolean().default(false),
  tags: z.array(z.string().max(30, 'Tag deve ter no máximo 30 caracteres')).max(10, 'Máximo de 10 tags').default([]),
  notes: z.string().max(2000, 'Observações devem ter no máximo 2000 caracteres').default(''),
  whatsappNumber: z.string().min(10, 'Número do WhatsApp deve ter pelo menos 10 dígitos').optional()
})

// GET /api/clients - List all clients
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')
    const segment = searchParams.get('segment')
    const isActive = searchParams.get('isActive')
    const isVip = searchParams.get('isVip')

    // Get clients with basic filtering
    const clients = await clientService.getAll()

    // Apply filters
    let filteredClients = clients
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredClients = filteredClients.filter(client => 
        client.name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phone?.toLowerCase().includes(searchLower) ||
        (client as any).document?.toLowerCase().includes(searchLower)
      )
    }

    // Segment filter
    if (segment) {
      filteredClients = filteredClients.filter(client => 
        (client as any).customerSegment === segment
      )
    }

    // Active filter
    if (isActive !== null) {
      const activeFilter = isActive === 'true'
      filteredClients = filteredClients.filter(client => 
        client.isActive === activeFilter
      )
    }

    // VIP filter
    if (isVip !== null) {
      const vipFilter = isVip === 'true'
      filteredClients = filteredClients.filter(client => 
        (client as any).isVip === vipFilter
      )
    }

    // Simple pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedClients = filteredClients.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      data: paginatedClients,
      pagination: {
        page,
        limit,
        total: filteredClients.length,
        totalPages: Math.ceil(filteredClients.length / limit)
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request body
    const validationResult = CreateClientSchema.safeParse(body)
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

    // Sanitize text fields
    const sanitizedData: any = {
      ...validatedData,
      name: sanitizeUserInput(validatedData.name),
      email: validatedData.email ? sanitizeUserInput(validatedData.email) : undefined,
      phone: sanitizeUserInput(validatedData.phone),
      document: sanitizeUserInput(validatedData.document),
      notes: validatedData.notes ? sanitizeUserInput(validatedData.notes) : '',
      whatsappNumber: validatedData.whatsappNumber ? sanitizeUserInput(validatedData.whatsappNumber) : undefined,
      
      // Address sanitization
      address: validatedData.address ? {
        ...validatedData.address,
        street: sanitizeUserInput(validatedData.address.street),
        number: sanitizeUserInput(validatedData.address.number),
        complement: validatedData.address.complement ? sanitizeUserInput(validatedData.address.complement) : undefined,
        neighborhood: sanitizeUserInput(validatedData.address.neighborhood),
        city: sanitizeUserInput(validatedData.address.city),
        state: sanitizeUserInput(validatedData.address.state),
        zipCode: sanitizeUserInput(validatedData.address.zipCode),
        country: sanitizeUserInput(validatedData.address.country)
      } : undefined,
      
      // Emergency contact sanitization
      preferences: validatedData.preferences ? {
        ...validatedData.preferences,
        emergencyContact: validatedData.preferences?.emergencyContact ? {
          ...validatedData.preferences.emergencyContact,
          name: sanitizeUserInput(validatedData.preferences.emergencyContact.name),
          phone: sanitizeUserInput(validatedData.preferences.emergencyContact.phone),
          relationship: sanitizeUserInput(validatedData.preferences.emergencyContact.relationship),
          email: validatedData.preferences.emergencyContact.email ? sanitizeUserInput(validatedData.preferences.emergencyContact.email) : undefined
        } : undefined
      } : {
        preferredPaymentMethod: PaymentMethod.PIX,
        petOwner: false,
        smoker: false,
        communicationPreference: 'whatsapp' as const,
        marketingOptIn: false
      },
      
      // Default values
      tenantId: process.env.NEXT_PUBLIC_TENANT_ID || 'default',
      isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
      isVip: validatedData.isVip !== undefined ? validatedData.isVip : false,
      customerSegment: validatedData.customerSegment || CustomerSegment.NEW,
      acquisitionSource: validatedData.acquisitionSource || AcquisitionSource.DIRECT,
      tags: validatedData.tags || [],
      
      // Initialize metrics
      totalReservations: 0,
      totalSpent: 0,
      averageRating: 0,
      lifetimeValue: 0,
      whatsappConversations: [],
      reviews: [],
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Create the client
    const newClient = await clientService.create(sanitizedData)

    return NextResponse.json(
      { 
        success: true, 
        data: newClient,
        message: 'Cliente criado com sucesso' 
      },
      { status: 201 }
    )

  } catch (error) {
    return handleApiError(error)
  }
}