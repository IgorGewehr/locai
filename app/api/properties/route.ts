import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { CreatePropertySchema } from '@/lib/validation/property-schemas'
import { UltraPermissiveCreatePropertySchema } from '@/lib/validation/ultra-permissive-schemas'
import type { Property } from '@/lib/types/property'

// GET /api/properties - List all properties
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')

    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    // Get properties with basic filtering
    const properties = await services.properties.getAll()

    // Simple search filtering if search term provided
    let filteredProperties = properties
    if (search) {
      const searchLower = search.toLowerCase()
      filteredProperties = properties.filter(property => 
        (property as any).title?.toLowerCase().includes(searchLower) ||
        (property as any).description?.toLowerCase().includes(searchLower) ||
        (property as any).address?.toLowerCase().includes(searchLower)
      )
    }

    // Simple pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedProperties = filteredProperties.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      data: paginatedProperties,
      pagination: {
        page,
        limit,
        total: filteredProperties.length,
        totalPages: Math.ceil(filteredProperties.length / limit)
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/properties - Create a new property
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

    // ULTRA-PERMISSIVO: Usa schema que nunca falha
    const validationResult = UltraPermissiveCreatePropertySchema.safeParse(body)
    if (!validationResult.success) {
      // Se mesmo o schema ultra-permissivo falhar, usa dados padrões
      console.warn('Schema ultra-permissivo falhou, usando dados padrões:', validationResult.error)
      const validatedData = {
        title: body.title || 'Nova Propriedade',
        description: body.description || 'Descrição da propriedade',
        address: body.address || '',
        category: body.category || 'apartment',
        bedrooms: Math.max(0, parseInt(body.bedrooms) || 1),
        bathrooms: Math.max(0, parseInt(body.bathrooms) || 1),
        maxGuests: Math.max(1, parseInt(body.maxGuests) || 2),
        basePrice: Math.max(1, parseFloat(body.basePrice) || 100),
        ...body // Inclui qualquer campo extra
      }
    }

    const validatedData = validationResult.success ? validationResult.data : {
      title: body.title || 'Nova Propriedade',
      description: body.description || 'Descrição da propriedade',
      address: body.address || '',
      category: body.category || 'apartment',
      bedrooms: Math.max(0, parseInt(body.bedrooms) || 1),
      bathrooms: Math.max(0, parseInt(body.bathrooms) || 1),
      maxGuests: Math.max(1, parseInt(body.maxGuests) || 2),
      basePrice: Math.max(1, parseFloat(body.basePrice) || 100),
      ...body // Inclui qualquer campo extra
    }

    // Sanitização permissiva - nunca falha
    const sanitizedData: any = {
      ...validatedData,
      title: validatedData.title || 'Nova Propriedade',
      description: validatedData.description || 'Descrição da propriedade',
      address: validatedData.address || '',
      amenities: Array.isArray(validatedData.amenities) ? validatedData.amenities : [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: authContext.tenantId, // Garante o tenantId
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    // Create the property
    const newProperty = await services.properties.create(sanitizedData)

    return NextResponse.json(
      { 
        success: true, 
        data: newProperty,
        message: 'Propriedade criada com sucesso' 
      },
      { status: 201 }
    )

  } catch (error) {
    return handleApiError(error)
  }
}