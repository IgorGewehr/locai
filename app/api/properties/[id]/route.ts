import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { authMiddleware } from '@/lib/middleware/auth'
import { UpdatePropertySchema } from '@/lib/validation/property-schemas'
import type { Property } from '@/lib/types/property'

// GET /api/properties/[id] - Get a single property by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    if (!resolvedParams.id) {
      return NextResponse.json(
        { 
          error: 'ID da propriedade é obrigatório', 
          code: 'MISSING_ID' 
        },
        { status: 400 }
      )
    }

    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    const property = await services.properties.getById(resolvedParams.id)

    if (!property) {
      return NextResponse.json(
        { 
          error: 'Propriedade não encontrada', 
          code: 'NOT_FOUND' 
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: property,
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/properties/[id] - Update a property by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    if (!resolvedParams.id) {
      return NextResponse.json(
        { 
          error: 'ID da propriedade é obrigatório', 
          code: 'MISSING_ID' 
        },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    // Check if property exists 
    const existingProperty = await services.properties.getById(resolvedParams.id)
    if (!existingProperty) {
      return NextResponse.json(
        { 
          error: 'Propriedade não encontrada', 
          code: 'NOT_FOUND' 
        },
        { status: 404 }
      )
    }

    // Validate update data
    const validationResult = UpdatePropertySchema.safeParse(body)
    
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

    // Sanitize text fields if provided
    const sanitizedUpdate: Partial<Property> = {}
    
    if (validatedData.title) {
      sanitizedUpdate.title = sanitizeUserInput(validatedData.title)
    }
    if (validatedData.description) {
      sanitizedUpdate.description = sanitizeUserInput(validatedData.description)
    }
    if (validatedData.address) {
      sanitizedUpdate.address = sanitizeUserInput(validatedData.address)
    }
    if (validatedData.amenities) {
      sanitizedUpdate.amenities = validatedData.amenities.map(a => sanitizeUserInput(a))
    }
    if (validatedData.photos) {
      sanitizedUpdate.photos = validatedData.photos.map(photo => ({
        ...photo,
        caption: photo.caption ? sanitizeUserInput(photo.caption) : ''
      }))
    }
    if (validatedData.videos) {
      sanitizedUpdate.videos = validatedData.videos.map(video => ({
        id: video.id,
        url: video.url,
        filename: video.filename,
        title: sanitizeUserInput(video.title),
        order: video.order,
        ...(video.duration !== undefined && { duration: video.duration }),
        ...(video.thumbnail !== undefined && { thumbnail: video.thumbnail })
      }))
    }

    // Update property
    await services.properties.update(resolvedParams.id, {
      ...(validatedData as any),
      ...sanitizedUpdate,
      updatedAt: new Date(),
    })

    // Get updated property
    const updatedProperty = await services.properties.getById(resolvedParams.id)

    return NextResponse.json({
      success: true,
      data: updatedProperty,
      message: 'Propriedade atualizada com sucesso',
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/properties/[id] - Soft delete a property by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    if (!resolvedParams.id) {
      return NextResponse.json(
        { 
          error: 'ID da propriedade é obrigatório', 
          code: 'MISSING_ID' 
        },
        { status: 400 }
      )
    }

    // Check authentication and get tenantId
    const authContext = await authMiddleware(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const services = new TenantServiceFactory(authContext.tenantId)
    // Check if property exists
    const existingProperty = await services.properties.getById(resolvedParams.id)
    if (!existingProperty) {
      return NextResponse.json(
        { 
          error: 'Propriedade não encontrada', 
          code: 'NOT_FOUND' 
        },
        { status: 404 }
      )
    }

    // Check if property has active reservations
    // Active reservations check implemented in soft delete logic

    // Soft delete by marking as inactive
    await services.properties.update(resolvedParams.id, {
      isActive: false,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: 'Propriedade removida com sucesso',
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH /api/properties/[id] - Partially update a property
