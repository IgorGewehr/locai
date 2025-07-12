import { NextRequest, NextResponse } from 'next/server'
import { propertyService } from '@/lib/firebase/firestore'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { CreatePropertySchema } from '@/lib/validation/property-schemas'
import type { Property } from '@/lib/types/property'

// GET /api/properties - List all properties
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')

    // Get properties with basic filtering
    const properties = await propertyService.getAll()

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
      tenantId: process.env.NEXT_PUBLIC_TENANT_ID || 'default',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Create the property
    const newProperty = await propertyService.create(sanitizedData)

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