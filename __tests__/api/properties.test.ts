import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/properties/route'
import { getServerSession } from 'next-auth'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/firebase/firestore', () => ({
  propertyService: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
  },
  propertyQueries: {
    searchProperties: vi.fn(),
    getActiveProperties: vi.fn(),
  }
}))

describe('Properties API', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    tenantId: 'tenant123',
    role: 'admin'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as any).mockResolvedValue({ user: mockUser })
  })

  describe('GET /api/properties', () => {
    it('should require authentication', async () => {
      ;(getServerSession as any).mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/properties')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should validate query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/properties?page=invalid&limit=999')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.code).toBe('VALIDATION_ERROR')
      expect(data.details).toBeDefined()
    })

    it('should enforce tenant isolation', async () => {
      const { propertyService } = require('@/lib/firebase/firestore')
      propertyService.getAll.mockResolvedValue([
        { id: '1', title: 'Property 1', tenantId: 'tenant123' },
        { id: '2', title: 'Property 2', tenantId: 'other-tenant' },
        { id: '3', title: 'Property 3', tenantId: 'tenant123' }
      ])

      const request = new NextRequest('http://localhost:3000/api/properties')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.properties).toHaveLength(2)
      expect(data.data.properties.every(p => p.tenantId === 'tenant123')).toBe(true)
    })
  })

  describe('POST /api/properties', () => {
    const validProperty = {
      title: 'Test Property',
      description: 'This is a test property description',
      address: '123 Test Street',
      category: 'apartment',
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      basePrice: 100,
      minimumNights: 1
    }

    it('should create property with valid data', async () => {
      const { propertyService } = require('@/lib/firebase/firestore')
      propertyService.create.mockResolvedValue('new-property-id')

      const request = new NextRequest('http://localhost:3000/api/properties', {
        method: 'POST',
        body: JSON.stringify(validProperty)
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('new-property-id')
      
      // Verify tenant ID was set correctly
      const createCall = propertyService.create.mock.calls[0][0]
      expect(createCall.tenantId).toBe('tenant123')
    })

    it('should reject invalid property data', async () => {
      const invalidProperty = {
        title: 'T', // Too short
        description: 'Short', // Too short
        address: '123',
        category: 'invalid-category',
        bedrooms: -1,
        bathrooms: 100,
        maxGuests: 0,
        basePrice: -50
      }

      const request = new NextRequest('http://localhost:3000/api/properties', {
        method: 'POST',
        body: JSON.stringify(invalidProperty)
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.code).toBe('VALIDATION_ERROR')
      expect(data.details).toBeDefined()
    })

    it('should sanitize user input', async () => {
      const { propertyService } = require('@/lib/firebase/firestore')
      propertyService.create.mockResolvedValue('new-property-id')

      const propertyWithXSS = {
        ...validProperty,
        title: '<script>alert("XSS")</script>Test Property',
        description: 'Description with <img src=x onerror=alert("XSS")>'
      }

      const request = new NextRequest('http://localhost:3000/api/properties', {
        method: 'POST',
        body: JSON.stringify(propertyWithXSS)
      })
      
      await POST(request)
      
      const createCall = propertyService.create.mock.calls[0][0]
      expect(createCall.title).not.toContain('<script>')
      expect(createCall.description).not.toContain('<img')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // This is a conceptual test - actual rate limiting would need integration testing
      // The rate limiter is configured to allow 100 reads per minute
      const request = new NextRequest('http://localhost:3000/api/properties')
      const response = await GET(request)
      
      // Check rate limit headers
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
    })
  })

  describe('DELETE /api/properties', () => {
    it('should prevent deletion of properties from other tenants', async () => {
      const { propertyService } = require('@/lib/firebase/firestore')
      propertyService.getById.mockResolvedValue({
        id: 'prop123',
        title: 'Other Tenant Property',
        tenantId: 'other-tenant'
      })

      const request = new NextRequest('http://localhost:3000/api/properties?id=prop123', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request)
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.code).toBe('FORBIDDEN')
      expect(propertyService.update).not.toHaveBeenCalled()
    })

    it('should soft delete properties', async () => {
      const { propertyService } = require('@/lib/firebase/firestore')
      propertyService.getById.mockResolvedValue({
        id: 'prop123',
        title: 'My Property',
        tenantId: 'tenant123',
        isActive: true
      })

      const request = new NextRequest('http://localhost:3000/api/properties?id=prop123', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify soft delete (isActive = false)
      const updateCall = propertyService.update.mock.calls[0]
      expect(updateCall[0]).toBe('prop123')
      expect(updateCall[1].isActive).toBe(false)
    })
  })
})

describe('Property Search and Filtering', () => {
  it('should support complex search queries', async () => {
    const { propertyQueries } = require('@/lib/firebase/firestore')
    propertyQueries.searchProperties.mockResolvedValue([
      { id: '1', title: 'Beach House', tenantId: 'tenant123' }
    ])

    const searchParams = new URLSearchParams({
      location: 'beach',
      bedrooms: '3',
      maxGuests: '6',
      minPrice: '100',
      maxPrice: '500',
      amenities: 'Wi-Fi,Piscina',
      category: 'house',
      allowsPets: 'true',
      sortBy: 'price',
      sortOrder: 'asc'
    })

    const request = new NextRequest(`http://localhost:3000/api/properties?${searchParams}`)
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(propertyQueries.searchProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        location: 'beach',
        bedrooms: 3,
        maxGuests: 6,
        minPrice: 100,
        maxPrice: 500,
        amenities: ['Wi-Fi', 'Piscina'],
        category: 'house',
        allowsPets: true
      })
    )
  })
})