import { NextRequest, NextResponse } from 'next/server'
import { clientService } from '@/lib/firebase/firestore'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { z } from 'zod'
import { CustomerSegment, AcquisitionSource } from '@/lib/types/client'
import { PaymentMethod } from '@/lib/types/reservation'
import type { Client } from '@/lib/types/client'

// Zod schema for client update (all fields optional)
const UpdateClientSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .optional(),
  
  email: z.string()
    .email('Email deve ter formato válido')
    .max(100, 'Email deve ter no máximo 100 caracteres')
    .optional(),
  
  phone: z.string()
    .min(10, 'Telefone deve ter pelo menos 10 dígitos')
    .max(15, 'Telefone deve ter no máximo 15 dígitos')
    .optional(),
  
  document: z.string()
    .min(11, 'Documento deve ter pelo menos 11 caracteres')
    .max(18, 'Documento deve ter no máximo 18 caracteres')
    .optional(),
  
  documentType: z.enum(['cpf', 'cnpj']).optional(),
  
  address: z.object({
    street: z.string().max(200, 'Rua deve ter no máximo 200 caracteres').optional(),
    number: z.string().max(20, 'Número deve ter no máximo 20 caracteres').optional(),
    complement: z.string().max(100, 'Complemento deve ter no máximo 100 caracteres').optional(),
    neighborhood: z.string().max(100, 'Bairro deve ter no máximo 100 caracteres').optional(),
    city: z.string().max(100, 'Cidade deve ter no máximo 100 caracteres').optional(),
    state: z.string().length(2, 'Estado deve ter 2 caracteres (UF)').optional(),
    zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP deve ter formato válido (00000-000)').optional(),
    country: z.string().optional()
  }).optional(),
  
  preferences: z.object({
    preferredPaymentMethod: z.nativeEnum(PaymentMethod).optional(),
    preferredCheckInTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve ter formato HH:MM').optional(),
    preferredCheckOutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve ter formato HH:MM').optional(),
    petOwner: z.boolean().optional(),
    smoker: z.boolean().optional(),
    preferredRoomType: z.string().max(50, 'Tipo de quarto preferido deve ter no máximo 50 caracteres').optional(),
    emergencyContact: z.object({
      name: z.string().max(100, 'Nome deve ter no máximo 100 caracteres').optional(),
      phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').optional(),
      relationship: z.string().max(50, 'Relacionamento deve ter no máximo 50 caracteres').optional(),
      email: z.string().email('Email deve ter formato válido').optional()
    }).optional(),
    dietaryRestrictions: z.string().max(500, 'Restrições alimentares devem ter no máximo 500 caracteres').optional(),
    accessibilityNeeds: z.string().max(500, 'Necessidades de acessibilidade devem ter no máximo 500 caracteres').optional(),
    communicationPreference: z.enum(['whatsapp', 'email', 'phone', 'sms']).optional(),
    marketingOptIn: z.boolean().optional()
  }).optional(),
  
  customerSegment: z.nativeEnum(CustomerSegment).optional(),
  acquisitionSource: z.nativeEnum(AcquisitionSource).optional(),
  isActive: z.boolean().optional(),
  isVip: z.boolean().optional(),
  tags: z.array(z.string().max(30, 'Tag deve ter no máximo 30 caracteres')).max(10, 'Máximo de 10 tags').optional(),
  notes: z.string().max(2000, 'Observações devem ter no máximo 2000 caracteres').optional(),
  whatsappNumber: z.string().min(10, 'Número do WhatsApp deve ter pelo menos 10 dígitos').optional()
})

// GET /api/clients/[id] - Get a specific client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id

    if (!clientId) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório', code: 'MISSING_CLIENT_ID' },
        { status: 400 }
      )
    }

    const client = await clientService.get(clientId)

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado', code: 'CLIENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: client
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/clients/[id] - Update a specific client
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id
    const body = await request.json()

    if (!clientId) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório', code: 'MISSING_CLIENT_ID' },
        { status: 400 }
      )
    }

    // Check if client exists
    const existingClient = await clientService.get(clientId)
    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente não encontrado', code: 'CLIENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Validate the request body
    const validationResult = UpdateClientSchema.safeParse(body)
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
    const sanitizedData: any = {}

    if (validatedData.name) sanitizedData.name = sanitizeUserInput(validatedData.name)
    if (validatedData.email) sanitizedData.email = sanitizeUserInput(validatedData.email)
    if (validatedData.phone) sanitizedData.phone = sanitizeUserInput(validatedData.phone)
    if (validatedData.document) sanitizedData.document = sanitizeUserInput(validatedData.document)
    if (validatedData.documentType) sanitizedData.documentType = validatedData.documentType
    if (validatedData.notes) sanitizedData.notes = sanitizeUserInput(validatedData.notes)
    if (validatedData.whatsappNumber) sanitizedData.whatsappNumber = sanitizeUserInput(validatedData.whatsappNumber)

    // Address sanitization
    if (validatedData.address) {
      sanitizedData.address = {
        ...existingClient.address,
        ...validatedData.address
      }
      if (validatedData.address.street) sanitizedData.address.street = sanitizeUserInput(validatedData.address.street)
      if (validatedData.address.number) sanitizedData.address.number = sanitizeUserInput(validatedData.address.number)
      if (validatedData.address.complement) sanitizedData.address.complement = sanitizeUserInput(validatedData.address.complement)
      if (validatedData.address.neighborhood) sanitizedData.address.neighborhood = sanitizeUserInput(validatedData.address.neighborhood)
      if (validatedData.address.city) sanitizedData.address.city = sanitizeUserInput(validatedData.address.city)
      if (validatedData.address.state) sanitizedData.address.state = sanitizeUserInput(validatedData.address.state)
      if (validatedData.address.zipCode) sanitizedData.address.zipCode = sanitizeUserInput(validatedData.address.zipCode)
      if (validatedData.address.country) sanitizedData.address.country = sanitizeUserInput(validatedData.address.country)
    }

    // Preferences sanitization
    if (validatedData.preferences) {
      sanitizedData.preferences = {
        ...existingClient.preferences,
        ...validatedData.preferences
      }
      
      if (validatedData.preferences.emergencyContact) {
        sanitizedData.preferences.emergencyContact = {
          ...existingClient.preferences?.emergencyContact,
          ...validatedData.preferences.emergencyContact
        }
        if (validatedData.preferences.emergencyContact.name) {
          sanitizedData.preferences.emergencyContact.name = sanitizeUserInput(validatedData.preferences.emergencyContact.name)
        }
        if (validatedData.preferences.emergencyContact.phone) {
          sanitizedData.preferences.emergencyContact.phone = sanitizeUserInput(validatedData.preferences.emergencyContact.phone)
        }
        if (validatedData.preferences.emergencyContact.relationship) {
          sanitizedData.preferences.emergencyContact.relationship = sanitizeUserInput(validatedData.preferences.emergencyContact.relationship)
        }
        if (validatedData.preferences.emergencyContact.email) {
          sanitizedData.preferences.emergencyContact.email = sanitizeUserInput(validatedData.preferences.emergencyContact.email)
        }
      }
    }

    // Other fields
    if (validatedData.customerSegment) sanitizedData.customerSegment = validatedData.customerSegment
    if (validatedData.acquisitionSource) sanitizedData.acquisitionSource = validatedData.acquisitionSource
    if (validatedData.isActive !== undefined) sanitizedData.isActive = validatedData.isActive
    if (validatedData.isVip !== undefined) sanitizedData.isVip = validatedData.isVip
    if (validatedData.tags) sanitizedData.tags = validatedData.tags

    // Update timestamp
    sanitizedData.updatedAt = new Date()

    // Update the client
    const updatedClient = await clientService.update(clientId, sanitizedData)

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: 'Cliente atualizado com sucesso'
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/clients/[id] - Delete a specific client
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id

    if (!clientId) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório', code: 'MISSING_CLIENT_ID' },
        { status: 400 }
      )
    }

    // Check if client exists
    const existingClient = await clientService.get(clientId)
    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente não encontrado', code: 'CLIENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Instead of hard delete, we'll soft delete by setting isActive to false
    await clientService.update(clientId, {
      isActive: false,
      updatedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente desativado com sucesso'
    })

  } catch (error) {
    return handleApiError(error)
  }
}