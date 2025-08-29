import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { CreatePropertySchema } from '@/lib/validation/property-schemas'
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

    // Validate the request body
    const validationResult = CreatePropertySchema.safeParse(body)
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
      title: sanitizeUserInput(validatedData.title),
      description: sanitizeUserInput(validatedData.description),
      address: sanitizeUserInput(validatedData.address),
      amenities: validatedData.amenities?.map(a => sanitizeUserInput(a)) || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
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