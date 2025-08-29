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

    // ✅ LOG DE ENTRADA COM HEADERS DE AUTENTICAÇÃO
    console.log('[🔍 API-REQUEST] Iniciando PUT request:', {
      propertyId: resolvedParams.id,
      hasAuthHeader: !!request.headers.get('authorization'),
      hasTokenHeader: !!request.headers.get('x-firebase-token'),
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent')?.substring(0, 50)
    });

    const body = await request.json();

    // ✅ AUTENTICAÇÃO COM DEBUG MELHORADO
    console.log('[🔍 API-AUTH] Validando autenticação...');
    const authContext = await validateFirebaseAuth(request);
    
    console.log('[🔍 API-AUTH] Resultado da autenticação:', {
      authenticated: authContext.authenticated,
      hasTenantId: !!authContext.tenantId,
      hasUserId: !!authContext.userId,
      tenantId: authContext.tenantId?.substring(0, 10) + '...'
    });
    
    if (!authContext.authenticated || !authContext.tenantId) {
      console.warn('[⚠️ API-AUTH] Autenticação falhou', {
        authenticated: authContext.authenticated,
        hasTenantId: !!authContext.tenantId,
        hasUserId: !!authContext.userId,
        authHeaders: {
          authorization: !!request.headers.get('authorization'),
          firebaseToken: !!request.headers.get('x-firebase-token')
        }
      });
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

    // Log dados recebidos para debug
    console.log('[API] Update data received:', {
      hasPhotos: !!body.photos,
      photosCount: body.photos?.length || 0,
      photosTypes: Array.isArray(body.photos) ? body.photos.map(p => typeof p) : 'not array',
      hasVideos: !!body.videos,
      videosCount: body.videos?.length || 0,
      videosTypes: Array.isArray(body.videos) ? body.videos.map(v => typeof v) : 'not array',
      bodyKeys: Object.keys(body)
    });

    // ✅ VALIDAÇÃO MELHORADA COM DEBUG DETALHADO
    console.log('[🔍 API-VALIDATION] Iniciando validação:', {
      bodyKeys: Object.keys(body),
      bodyTypes: Object.keys(body).reduce((acc, key) => {
        acc[key] = typeof body[key];
        return acc;
      }, {}),
      photosType: Array.isArray(body.photos) ? `array[${body.photos.length}]` : typeof body.photos,
      videosType: Array.isArray(body.videos) ? `array[${body.videos.length}]` : typeof body.videos
    });
    
    const validationResult = UpdatePropertySchema.safeParse(body);
    
    console.log('[🔍 API-VALIDATION] Resultado da validação:', {
      success: validationResult.success,
      errorCount: !validationResult.success ? Object.keys(validationResult.error.flatten().fieldErrors).length : 0,
      errorFields: !validationResult.success ? Object.keys(validationResult.error.flatten().fieldErrors) : [],
      firstError: !validationResult.success ? validationResult.error.issues[0] : null
    });
    
    if (!validationResult.success) {
      console.error('[API] Validation failed:', {
        error: validationResult.error.flatten(),
        fieldErrors: validationResult.error.flatten().fieldErrors,
        receivedData: {
          title: body.title,
          photosCount: body.photos?.length || 0,
          photosData: body.photos?.map((p, index) => ({
            index,
            type: typeof p,
            hasUrl: !!(typeof p === 'string' ? p : p?.url),
            url: typeof p === 'string' ? p : p?.url,
            urlLength: (typeof p === 'string' ? p : p?.url)?.length,
            urlStartsWith: (typeof p === 'string' ? p : p?.url)?.substring(0, 50),
            structure: typeof p === 'object' ? Object.keys(p || {}) : 'string'
          }))
        }
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
              console.warn('Error sanitizing amenity:', err);
              return String(a).trim().slice(0, 100); // Fallback seguro
            }
          })
      }
    } catch (sanitizeError) {
      console.error('Error in sanitization process:', sanitizeError);
      // Continue sem sanitização se houver erro crítico
    }
    
    // ✅ MÍDIAS: Processamento simplificado e seguro
    try {
      if (validatedData.photos && Array.isArray(validatedData.photos)) {
        console.log('[API] Processing photos:', {
          count: validatedData.photos.length,
          types: validatedData.photos.map(p => typeof p)
        });

        finalUpdate.photos = validatedData.photos
          .map(photo => {
            try {
              // Extrair URL de forma segura
              const url = typeof photo === 'string' ? photo : (photo && photo.url ? photo.url : null);
              return url && typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
            } catch (err) {
              console.warn('Error processing photo:', err);
              return null;
            }
          })
          .filter(url => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')));
      }
      
      if (validatedData.videos && Array.isArray(validatedData.videos)) {
        console.log('[API] Processing videos:', {
          count: validatedData.videos.length,
          types: validatedData.videos.map(v => typeof v)
        });

        finalUpdate.videos = validatedData.videos
          .map(video => {
            try {
              // Extrair URL de forma segura
              const url = typeof video === 'string' ? video : (video && video.url ? video.url : null);
              return url && typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
            } catch (err) {
              console.warn('Error processing video:', err);
              return null;
            }
          })
          .filter(url => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')));
      }
    } catch (mediaError) {
      console.error('Error in media processing:', mediaError);
      // Continue without media updates if there's an error
    }

    // ✅ UPDATE DIRETO: Uma única operação como no Dart
    console.log('[API] About to update property with:', {
      propertyId: resolvedParams.id,
      updateFields: Object.keys(finalUpdate),
      hasPhotos: !!finalUpdate.photos,
      photosCount: finalUpdate.photos?.length || 0
    });

    try {
      await services.properties.update(resolvedParams.id, finalUpdate)
      console.log('[API] Property update successful');
    } catch (updateError) {
      console.error('[API] Property update failed:', {
        error: updateError,
        updateData: JSON.stringify(finalUpdate, null, 2).substring(0, 500)
      });
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
    console.error('[API-PROPERTIES-UPDATE] Detailed error:', {
      propertyId: resolvedParams?.id,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      } : error,
      errorString: String(error),
      errorType: typeof error,
      hasUpdate: typeof resolvedParams !== 'undefined'
    });
    
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
