import { NextRequest, NextResponse } from 'next/server'
import { propertyService, propertyQueries } from '@/lib/firebase/firestore'
import { withAuth, AuthUser } from '@/lib/middleware/auth'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit'
import { handleApiError } from '@/lib/utils/api-errors'
import { sanitizeUserInput } from '@/lib/utils/validation'
import { 
  CreatePropertySchema, 
  UpdatePropertySchema, 
  PropertySearchSchema,
  type CreatePropertyInput,
  type UpdatePropertyInput,
  type PropertySearchInput 
} from '@/lib/validation/property-schemas'
import type { Property } from '@/lib/types/property'

// GET /api/properties - List properties with search and filters
export async function GET(request: NextRequest) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.search, async (req) => {
    return withAuth(req, async (req, user: AuthUser) => {
      try {
        const { searchParams } = new URL(req.url)
        
        // Parse and validate query parameters
        const validationResult = PropertySearchSchema.safeParse({
          page: searchParams.get('page'),
          limit: searchParams.get('limit'),
          search: searchParams.get('search'),
          location: searchParams.get('location'),
          bedrooms: searchParams.get('bedrooms'),
          maxGuests: searchParams.get('maxGuests'),
          minPrice: searchParams.get('minPrice'),
          maxPrice: searchParams.get('maxPrice'),
          amenities: searchParams.get('amenities'),
          category: searchParams.get('category'),
          isActive: searchParams.get('isActive'),
          isFeatured: searchParams.get('isFeatured'),
          allowsPets: searchParams.get('allowsPets'),
          checkIn: searchParams.get('checkIn'),
          checkOut: searchParams.get('checkOut'),
          sortBy: searchParams.get('sortBy'),
          sortOrder: searchParams.get('sortOrder'),
        })

        if (!validationResult.success) {
          return NextResponse.json(
            { 
              error: 'Parâmetros inválidos', 
              code: 'VALIDATION_ERROR',
              details: validationResult.error.flatten() 
            },
            { status: 400 }
          )
        }

        const params = validationResult.data
        let properties: Property[] = []

        // Apply tenant isolation
        const tenantFilter = { tenantId: user.tenantId }

        // Build search filters
        if (params.location || params.bedrooms || params.maxGuests || params.amenities?.length) {
          const filters = {
            ...tenantFilter,
            location: params.location,
            bedrooms: params.bedrooms,
            maxGuests: params.maxGuests,
            amenities: params.amenities,
            category: params.category,
            allowsPets: params.allowsPets,
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            checkIn: params.checkIn,
            checkOut: params.checkOut,
          }

          properties = await propertyQueries.searchProperties(filters)
        } else if (params.isActive === true) {
          properties = await propertyQueries.getActiveProperties()
          // Filter by tenant
          properties = properties.filter(p => p.tenantId === user.tenantId)
        } else if (params.isFeatured === true) {
          properties = await propertyService.getAll()
          // Filter by tenant and featured
          properties = properties.filter(p => p.tenantId === user.tenantId && p.isFeatured)
        } else {
          properties = await propertyService.getAll()
          // Filter by tenant
          properties = properties.filter(p => p.tenantId === user.tenantId)
        }

        // Apply text search if provided
        if (params.search) {
          const searchTerm = sanitizeUserInput(params.search).toLowerCase()
          properties = properties.filter(property =>
            property.title.toLowerCase().includes(searchTerm) ||
            property.description.toLowerCase().includes(searchTerm) ||
            property.address.toLowerCase().includes(searchTerm)
          )
        }

        // Apply active filter if specified
        if (params.isActive !== undefined) {
          properties = properties.filter(p => p.isActive === params.isActive)
        }

        // Apply sorting
        if (params.sortBy) {
          properties.sort((a, b) => {
            let aVal: any, bVal: any
            
            switch (params.sortBy) {
              case 'price':
                aVal = a.basePrice
                bVal = b.basePrice
                break
              case 'createdAt':
                aVal = a.createdAt
                bVal = b.createdAt
                break
              case 'title':
                aVal = a.title.toLowerCase()
                bVal = b.title.toLowerCase()
                break
              case 'maxGuests':
                aVal = a.maxGuests
                bVal = b.maxGuests
                break
              default:
                return 0
            }

            if (params.sortOrder === 'desc') {
              return bVal > aVal ? 1 : -1
            } else {
              return aVal > bVal ? 1 : -1
            }
          })
        }

        // Apply pagination
        const startIndex = (params.page - 1) * params.limit
        const endIndex = startIndex + params.limit
        const paginatedProperties = properties.slice(startIndex, endIndex)

        return NextResponse.json({
          success: true,
          data: {
            properties: paginatedProperties,
            pagination: {
              page: params.page,
              limit: params.limit,
              total: properties.length,
              totalPages: Math.ceil(properties.length / params.limit),
              hasNext: endIndex < properties.length,
              hasPrev: params.page > 1,
            },
          },
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  })
}

// POST /api/properties - Create a new property
export async function POST(request: NextRequest) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.write, async (req) => {
    return withAuth(req, async (req, user: AuthUser) => {
      try {
        const body = await req.json()
        
        // Validate input
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

        const propertyData = validationResult.data

        // Sanitize text fields
        const sanitizedProperty: Omit<Property, 'id'> = {
          ...propertyData,
          title: sanitizeUserInput(propertyData.title),
          description: sanitizeUserInput(propertyData.description),
          address: sanitizeUserInput(propertyData.address),
          amenities: propertyData.amenities.map(a => sanitizeUserInput(a)),
          photos: propertyData.photos.map(photo => ({
            ...photo,
            caption: photo.caption ? sanitizeUserInput(photo.caption) : undefined
          })),
          videos: propertyData.videos.map(video => ({
            ...video,
            title: sanitizeUserInput(video.title)
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
          tenantId: user.tenantId, // Ensure tenant isolation
        }

        const propertyId = await propertyService.create(sanitizedProperty)

        return NextResponse.json({
          success: true,
          data: { id: propertyId },
          message: 'Propriedade criada com sucesso',
        }, { status: 201 })

      } catch (error) {
        return handleApiError(error)
      }
    })
  })
}

// PUT /api/properties - Update a property
export async function PUT(request: NextRequest) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.write, async (req) => {
    return withAuth(req, async (req, user: AuthUser) => {
      try {
        const body = await req.json()
        const { id, ...updateData } = body

        if (!id) {
          return NextResponse.json(
            { 
              error: 'ID da propriedade é obrigatório', 
              code: 'MISSING_ID' 
            },
            { status: 400 }
          )
        }

        // Check if property exists and belongs to user's tenant
        const existingProperty = await propertyService.getById(id)
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
        const validationResult = UpdatePropertySchema.safeParse(updateData)
        
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
        await propertyService.update(id, {
          ...validatedData,
          ...sanitizedUpdate,
          updatedAt: new Date(),
          tenantId: user.tenantId, // Ensure tenant ID doesn't change
        })

        return NextResponse.json({
          success: true,
          message: 'Propriedade atualizada com sucesso',
        })

      } catch (error) {
        return handleApiError(error)
      }
    })
  })
}

// DELETE /api/properties - Soft delete a property
export async function DELETE(request: NextRequest) {
  return withRateLimit(request, RATE_LIMIT_CONFIGS.delete, async (req) => {
    return withAuth(req, async (req, user: AuthUser) => {
      try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
          return NextResponse.json(
            { 
              error: 'ID da propriedade é obrigatório', 
              code: 'MISSING_ID' 
            },
            { status: 400 }
          )
        }

        // Check if property exists and belongs to user's tenant
        const existingProperty = await propertyService.getById(id)
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

        // Soft delete by marking as inactive
        await propertyService.update(id, {
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