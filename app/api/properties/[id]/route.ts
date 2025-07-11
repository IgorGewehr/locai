import { NextRequest, NextResponse } from 'next/server'
import { propertyService } from '@/lib/firebase/firestore'
import { withAuth, AuthUser } from '@/lib/middleware/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { UpdatePropertySchema } from '@/lib/validation/property-schemas'
import type { Property } from '@/lib/types/property'

// GET /api/properties/[id] - Get a single property by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.read, async (req) => {
    return withAuth(req, async (req, user: AuthUser) => {
      try {
        if (!params.id) {
          return NextResponse.json(
            { 
              error: 'ID da propriedade é obrigatório', 
              code: 'MISSING_ID' 
            },
            { status: 400 }
          )
        }

        const property = await propertyService.getById(params.id)

        if (!property) {
          return NextResponse.json(
            { 
              error: 'Propriedade não encontrada', 
              code: 'NOT_FOUND' 
            },
            { status: 404 }
          )
        }

        // Ensure tenant isolation
        if (property.tenantId !== user.tenantId) {
          return NextResponse.json(
            { 
              error: 'Acesso negado', 
              code: 'FORBIDDEN' 
            },
            { status: 403 }
          )
        }

        return NextResponse.json({
          success: true,
          data: property,
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  })
}

// PUT /api/properties/[id] - Update a property by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.write, async (req) => {
    return withAuth(req, async (req, user: AuthUser) => {
      try {
        if (!params.id) {
          return NextResponse.json(
            { 
              error: 'ID da propriedade é obrigatório', 
              code: 'MISSING_ID' 
            },
            { status: 400 }
          )
        }

        const body = await req.json()

        // Check if property exists and belongs to user's tenant
        const existingProperty = await propertyService.getById(params.id)
        if (!existingProperty) {
          return NextResponse.json(
            { 
              error: 'Propriedade não encontrada', 
              code: 'NOT_FOUND' 
            },
            { status: 404 }
          )
        }

        // Ensure tenant isolation
        if (existingProperty.tenantId !== user.tenantId) {
          return NextResponse.json(
            { 
              error: 'Acesso negado', 
              code: 'FORBIDDEN' 
            },
            { status: 403 }
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
            caption: photo.caption ? sanitizeUserInput(photo.caption) : undefined
          }))
        }
        if (validatedData.videos) {
          sanitizedUpdate.videos = validatedData.videos.map(video => ({
            ...video,
            title: sanitizeUserInput(video.title)
          }))
        }

        // Update property
        await propertyService.update(params.id, {
          ...validatedData,
          ...sanitizedUpdate,
          updatedAt: new Date(),
          tenantId: user.tenantId, // Ensure tenant ID doesn't change
        })

        // Get updated property
        const updatedProperty = await propertyService.getById(params.id)

        return NextResponse.json({
          success: true,
          data: updatedProperty,
          message: 'Propriedade atualizada com sucesso',
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  })
}

// DELETE /api/properties/[id] - Soft delete a property by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.delete, async (req) => {
    return withAuth(req, async (req, user: AuthUser) => {
      try {
        if (!params.id) {
          return NextResponse.json(
            { 
              error: 'ID da propriedade é obrigatório', 
              code: 'MISSING_ID' 
            },
            { status: 400 }
          )
        }

        // Check if property exists and belongs to user's tenant
        const existingProperty = await propertyService.getById(params.id)
        if (!existingProperty) {
          return NextResponse.json(
            { 
              error: 'Propriedade não encontrada', 
              code: 'NOT_FOUND' 
            },
            { status: 404 }
          )
        }

        // Ensure tenant isolation
        if (existingProperty.tenantId !== user.tenantId) {
          return NextResponse.json(
            { 
              error: 'Acesso negado', 
              code: 'FORBIDDEN' 
            },
            { status: 403 }
          )
        }

        // Check if property has active reservations
        // TODO: Add check for active reservations before deletion

        // Soft delete by marking as inactive
        await propertyService.update(params.id, {
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
    })
  })
}

// PATCH /api/properties/[id] - Partially update a property
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.write, async (req) => {
    return withAuth(req, async (req, user: AuthUser) => {
      try {
        if (!params.id) {
          return NextResponse.json(
            { 
              error: 'ID da propriedade é obrigatório', 
              code: 'MISSING_ID' 
            },
            { status: 400 }
          )
        }

        const body = await req.json()

        // Check if property exists and belongs to user's tenant
        const existingProperty = await propertyService.getById(params.id)
        if (!existingProperty) {
          return NextResponse.json(
            { 
              error: 'Propriedade não encontrada', 
              code: 'NOT_FOUND' 
            },
            { status: 404 }
          )
        }

        // Ensure tenant isolation
        if (existingProperty.tenantId !== user.tenantId) {
          return NextResponse.json(
            { 
              error: 'Acesso negado', 
              code: 'FORBIDDEN' 
            },
            { status: 403 }
          )
        }

        // Handle specific patch operations
        const allowedOperations = ['toggleActive', 'toggleFeatured', 'updatePricing', 'updateAvailability']
        const operation = body.operation

        if (!operation || !allowedOperations.includes(operation)) {
          return NextResponse.json(
            { 
              error: 'Operação inválida', 
              code: 'INVALID_OPERATION' 
            },
            { status: 400 }
          )
        }

        let updateData: Partial<Property> = {
          updatedAt: new Date(),
        }

        switch (operation) {
          case 'toggleActive':
            updateData.isActive = !existingProperty.isActive
            break

          case 'toggleFeatured':
            updateData.isFeatured = !existingProperty.isFeatured
            break

          case 'updatePricing':
            if (body.basePrice !== undefined) {
              if (typeof body.basePrice !== 'number' || body.basePrice <= 0) {
                return NextResponse.json(
                  { 
                    error: 'Preço base inválido', 
                    code: 'INVALID_PRICE' 
                  },
                  { status: 400 }
                )
              }
              updateData.basePrice = body.basePrice
            }
            if (body.customPricing !== undefined) {
              updateData.customPricing = body.customPricing
            }
            break

          case 'updateAvailability':
            if (body.unavailableDates !== undefined) {
              if (!Array.isArray(body.unavailableDates)) {
                return NextResponse.json(
                  { 
                    error: 'Datas indisponíveis inválidas', 
                    code: 'INVALID_DATES' 
                  },
                  { status: 400 }
                )
              }
              updateData.unavailableDates = body.unavailableDates.map((d: string) => new Date(d))
            }
            break
        }

        // Update property
        await propertyService.update(params.id, updateData)

        // Get updated property
        const updatedProperty = await propertyService.getById(params.id)

        return NextResponse.json({
          success: true,
          data: updatedProperty,
          message: 'Propriedade atualizada com sucesso',
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  })
}