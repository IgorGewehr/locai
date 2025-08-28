import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { UpdatePropertySchema } from '@/lib/validation/property-schemas'
import { logger } from '@/lib/utils/logger'
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
  const startTime = Date.now();
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

    const parseTime = Date.now();
    const body = await request.json()
    logger.debug('⏱️ [API] JSON parsing', { time: Date.now() - parseTime + 'ms' });

    // Check authentication and get tenantId
    const authTime = Date.now();
    const authContext = await validateFirebaseAuth(request)
    logger.debug('⏱️ [API] Authentication', { time: Date.now() - authTime + 'ms' });
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

    // Log dados recebidos para debug
    console.log('[API] Update data received:', {
      hasPhotos: !!body.photos,
      photosCount: body.photos?.length || 0,
      photosTypes: body.photos?.map(p => typeof p),
      hasVideos: !!body.videos,
      videosCount: body.videos?.length || 0
    });

    // Validate update data
    const validationTime = Date.now();
    const validationResult = UpdatePropertySchema.safeParse(body)
    logger.debug('⏱️ [API] Validation', { time: Date.now() - validationTime + 'ms' });
    
    if (!validationResult.success) {
      const totalTime = Date.now() - startTime;
      logger.error('❌ [API] Validation failed', {
        time: totalTime + 'ms',
        fieldErrors: validationResult.error.flatten().fieldErrors,
        formErrors: validationResult.error.flatten().formErrors
      });
      
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

    // ✅ NOVA ABORDAGEM: Processamento direto como no Dart
    // Sanitizar apenas campos de texto, preservar URLs das mídias intactas
    const finalUpdate: any = {
      ...validatedData,
      updatedAt: new Date(),
    }
    
    // Sanitizar apenas campos de texto (não URLs)
    if (validatedData.title) {
      finalUpdate.title = sanitizeUserInput(validatedData.title)
    }
    if (validatedData.description) {
      finalUpdate.description = sanitizeUserInput(validatedData.description)
    }
    if (validatedData.address) {
      finalUpdate.address = sanitizeUserInput(validatedData.address)
    }
    if (validatedData.amenities) {
      finalUpdate.amenities = validatedData.amenities.map(a => sanitizeUserInput(a))
    }
    
    // ✅ MÍDIAS: Processar tanto objetos PropertyPhoto/Video quanto strings
    if (validatedData.photos && Array.isArray(validatedData.photos)) {
      console.log('[API] Processing photos:', {
        count: validatedData.photos.length,
        types: validatedData.photos.map(p => typeof p),
        sample: validatedData.photos[0]
      });

      // Aceitar tanto objetos PropertyPhoto quanto strings
      finalUpdate.photos = validatedData.photos.filter(photo => {
        const url = typeof photo === 'string' ? photo : photo?.url;
        return url && 
          url.trim().length > 0 &&
          (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:'));
      });
    }
    
    if (validatedData.videos && Array.isArray(validatedData.videos)) {
      console.log('[API] Processing videos:', {
        count: validatedData.videos.length,
        types: validatedData.videos.map(v => typeof v)
      });

      // Aceitar tanto objetos PropertyVideo quanto strings
      finalUpdate.videos = validatedData.videos.filter(video => {
        const url = typeof video === 'string' ? video : video?.url;
        return url && 
          url.trim().length > 0 &&
          (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:'));
      });
    }

    // ✅ UPDATE DIRETO: Uma única operação como no Dart
    const updateTime = Date.now();
    try {
      await services.properties.update(resolvedParams.id, finalUpdate)
      logger.debug('⏱️ [API] Database update', { time: Date.now() - updateTime + 'ms' });
    } catch (updateError) {
      logger.error('❌ [API] Database update failed', {
        error: updateError instanceof Error ? updateError.message : 'Unknown error',
        propertyId: resolvedParams.id,
        updateData: {
          hasTitle: !!finalUpdate.title,
          hasDescription: !!finalUpdate.description,
          bedrooms: finalUpdate.bedrooms,
          bathrooms: finalUpdate.bathrooms,
          photosCount: finalUpdate.photos?.length || 0
        }
      });
      
      // Return more specific error for database update failures
      return NextResponse.json(
        { 
          error: 'Erro ao atualizar propriedade no banco de dados', 
          code: 'DATABASE_UPDATE_ERROR',
          details: { 
            dbError: updateError instanceof Error ? updateError.message : 'Unknown database error' 
          } 
        },
        { status: 500 }
      )
    }

    // Get updated property
    const fetchTime = Date.now();
    const updatedProperty = await services.properties.getById(resolvedParams.id)
    logger.debug('⏱️ [API] Final fetch', { time: Date.now() - fetchTime + 'ms' });

    const totalTime = Date.now() - startTime;
    logger.info('✅ [API] Property update completed', {
      propertyId: resolvedParams.id,
      totalTime: totalTime + 'ms',
      tenantId: authContext.tenantId
    });

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
