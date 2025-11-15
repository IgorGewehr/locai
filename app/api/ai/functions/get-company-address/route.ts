// app/api/ai/functions/get-company-address/route.ts
// AI Function: Get company/real estate agency address (only tenantId required)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

// Validation schema
const GetCompanyAddressSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required')
})

interface CompanyAddress {
  companyName?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  phone?: string
  email?: string
  website?: string
  workingHours?: string
  googleMapsUrl?: string
  latitude?: number
  longitude?: number
  createdAt?: Date
  updatedAt?: Date
}

/**
 * POST /api/ai/functions/get-company-address
 * Sofia AI Agent retrieves company address to provide location info to customers
 *
 * @example
 * {
 *   "tenantId": "tenant123"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `get_address_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

  try {
    logger.info('[GET-COMPANY-ADDRESS] Starting execution', {
      requestId,
      function: 'get-company-address'
    })

    // Parse and validate
    const body = await request.json()
    const validation = GetCompanyAddressSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('[GET-COMPANY-ADDRESS] Validation failed', {
        requestId,
        errors: validation.error.errors
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: validation.error.errors,
          requestId
        },
        { status: 400 }
      )
    }

    const { tenantId } = validation.data

    logger.info('[GET-COMPANY-ADDRESS] Fetching address', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***'
    })

    // Fetch from Firestore - CORRECTED PATH
    const addressRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('config')
      .doc('company-info')

    const addressDoc = await addressRef.get()

    let address: CompanyAddress | null = null
    let hasAddress = false

    if (addressDoc.exists) {
      const data = addressDoc.data()

      // Map new structure (company-info) to expected structure
      address = {
        companyName: data?.tradeName || data?.legalName, // Map tradeName to companyName
        street: data?.street,
        number: data?.number,
        complement: data?.complement,
        neighborhood: data?.neighborhood,
        city: data?.city,
        state: data?.state,
        zipCode: data?.zipCode,
        country: data?.country || 'Brasil',
        phone: data?.phone,
        email: data?.email,
        website: data?.website,
        workingHours: data?.workingHours, // May not exist in company-info
        googleMapsUrl: data?.googleMapsUrl, // May not exist in company-info
        latitude: data?.latitude, // May not exist in company-info
        longitude: data?.longitude, // May not exist in company-info
        createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : undefined,
        updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate() : undefined
      }
      hasAddress = true

      logger.info('[GET-COMPANY-ADDRESS] Found company info in config/company-info', {
        requestId,
        hasCompanyName: !!address.companyName,
        hasStreet: !!address.street,
        hasCity: !!address.city
      })
    } else {
      logger.info('[GET-COMPANY-ADDRESS] No company info found', {
        requestId
      })
    }

    // Format address string for AI
    let formattedAddress = ''
    if (address && hasAddress) {
      const parts = []

      if (address.companyName) parts.push(address.companyName)
      if (address.street) {
        let streetPart = address.street
        if (address.number) streetPart += `, ${address.number}`
        if (address.complement) streetPart += ` - ${address.complement}`
        parts.push(streetPart)
      }
      if (address.neighborhood) parts.push(address.neighborhood)
      if (address.city && address.state) parts.push(`${address.city} - ${address.state}`)
      if (address.zipCode) parts.push(`CEP: ${address.zipCode}`)
      if (address.phone) parts.push(`Tel: ${address.phone}`)
      if (address.email) parts.push(`Email: ${address.email}`)
      if (address.workingHours) parts.push(`Horário: ${address.workingHours}`)

      formattedAddress = parts.join(', ')
    }

    const processingTime = Date.now() - startTime

    logger.info('[GET-COMPANY-ADDRESS] Address retrieved successfully', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      hasAddress,
      hasCoordinates: !!address?.latitude && !!address?.longitude,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json({
      success: true,
      data: {
        address,
        hasAddress,
        formattedAddress: formattedAddress || 'Endereço não cadastrado'
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime

    logger.error('[GET-COMPANY-ADDRESS] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get company address',
        requestId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/functions/get-company-address
 * Health check and function info
 */
export async function GET() {
  return NextResponse.json({
    function: 'get-company-address',
    version: '1.0.0',
    description: 'AI agent retrieves company/real estate agency address and contact info',
    status: 'operational',
    parameters: {
      required: ['tenantId'],
      optional: []
    },
    returns: {
      address: 'CompanyAddress object with all fields',
      hasAddress: 'boolean',
      formattedAddress: 'Formatted string for AI to use'
    },
    timestamp: new Date().toISOString()
  })
}
