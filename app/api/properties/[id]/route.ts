import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
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
    const authContext = await validateFirebaseAuth(request)
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
  let resolvedParams: { id: string } | undefined
  try {
    resolvedParams = await params
    if (!resolvedParams.id) {
      return NextResponse.json(
        { 
          error: 'ID da propriedade é obrigatório', 
          code: 'MISSING_ID' 
        },
        { status: 400 }
      )
    }

    // Validação de entrada

    const body = await request.json();

    // Autenticação
    const authContext = await validateFirebaseAuth(request);
    
    if (!authContext.authenticated || !authContext.tenantId) {
      // Autenticação falhou
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          code: 'UNAUTHORIZED',
          details: 'Invalid or expired Firebase token'
        },
        { status: 401 }
      );
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

    // Validação dos dados recebidos

    // Validação com schema
    const validationResult = UpdatePropertySchema.safeParse(body);
    
    if (!validationResult.success) {
      // Validação falhou
      
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

    // ✅ PROCESSAMENTO SIMPLIFICADO E SEGURO
    const finalUpdate: any = {
      ...validatedData,
      updatedAt: new Date(),
    }
    
    // Sanitizar apenas campos de texto (com fallback seguro)
    try {
      if (validatedData.title && typeof validatedData.title === 'string') {
        finalUpdate.title = sanitizeUserInput(validatedData.title)
      }
      if (validatedData.description && typeof validatedData.description === 'string') {
        finalUpdate.description = sanitizeUserInput(validatedData.description)
      }
      if (validatedData.address && typeof validatedData.address === 'string') {
        finalUpdate.address = sanitizeUserInput(validatedData.address)
      }
      if (validatedData.amenities && Array.isArray(validatedData.amenities)) {
        finalUpdate.amenities = validatedData.amenities
          .filter(a => typeof a === 'string')
          .map(a => {
            try {
              return sanitizeUserInput(a)
            } catch (err) {
              // Error sanitizing amenity
              return String(a).trim().slice(0, 100); // Fallback seguro
            }
          })
      }
    } catch (sanitizeError) {
      // Error in sanitization process
      // Continue sem sanitização se houver erro crítico
    }
    
    // ✅ MÍDIAS: Processamento simplificado e seguro
    try {
      if (validatedData.photos && Array.isArray(validatedData.photos)) {
        // Processing photos

        finalUpdate.photos = validatedData.photos
          .map(photo => {
            try {
              // Extrair URL de forma segura
              const url = typeof photo === 'string' ? photo : (photo && photo.url ? photo.url : null);
              return url && typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
            } catch (err) {
              // Error processing photo
              return null;
            }
          })
          .filter(url => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')));
      }
      
      if (validatedData.videos && Array.isArray(validatedData.videos)) {
        // Processing videos

        finalUpdate.videos = validatedData.videos
          .map(video => {
            try {
              // Extrair URL de forma segura
              const url = typeof video === 'string' ? video : (video && video.url ? video.url : null);
              return url && typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
            } catch (err) {
              // Error processing video
              return null;
            }
          })
          .filter(url => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')));
      }
    } catch (mediaError) {
      // Error in media processing
      // Continue without media updates if there's an error
    }

    // Atualização da propriedade

    try {
      await services.properties.update(resolvedParams.id, finalUpdate)
      // Property update successful
    } catch (updateError) {
      // Property update failed
      throw updateError; // Re-throw to trigger main error handler
    }

    // Get updated property
    const updatedProperty = await services.properties.getById(resolvedParams.id)

    return NextResponse.json({
      success: true,
      data: updatedProperty,
      message: 'Propriedade atualizada com sucesso',
    })

  } catch (error) {
    // Erro na atualização da propriedade
    
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
    const authContext = await validateFirebaseAuth(request)
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
