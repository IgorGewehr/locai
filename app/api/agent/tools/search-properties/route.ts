/**
 * Agent tool: search_available_properties
 *
 * Called by the Python LangGraph agent to search for available properties.
 * Reuses the existing searchProperties function + checks iCal availability.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateAgentRequest } from '@/lib/middleware/agent-auth'
import { searchProperties } from '@/lib/ai/tenant-aware-agent-functions'
import { iCalParserService } from '@/lib/services/ical-parser-service'
import { AvailabilityService } from '@/lib/services/availability-service'
import { logger } from '@/lib/utils/logger'

const Schema = z.object({
  tenant_id: z.string().min(1),
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  location: z.string().optional(),
  bedrooms: z.number().int().positive().optional(),
  guests: z.number().int().positive().optional(),
  max_price: z.number().positive().optional(),
  max_results: z.number().int().min(1).max(5).default(3),
})

export async function POST(request: NextRequest) {
  const { authenticated, tenantId, body } = await validateAgentRequest(request)

  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 })
  }

  const { checkin, checkout, location, bedrooms, guests, max_price, max_results } = parsed.data
  const checkinDate = new Date(checkin)
  const checkoutDate = new Date(checkout)

  if (checkoutDate <= checkinDate) {
    return NextResponse.json({ error: 'checkout must be after checkin' }, { status: 400 })
  }

  try {
    // Use existing searchProperties which queries Firestore with filters
    const result = await searchProperties(
      {
        location,
        bedrooms,
        guests,
        maxPrice: max_price,
        checkIn: checkin,
        checkOut: checkout,
      },
      tenantId
    )

    const allProperties = result?.properties || []

    // Internal availability service: covers manual properties + confirmed/pending
    // reservations + blocked periods (iCal alone does NOT cover manual bookings).
    const availabilityService = new AvailabilityService(tenantId)

    // Build clean response for the LLM
    const items = await Promise.all(
      allProperties.map(async (p: any) => {
        // Run iCal check (external platforms) and internal availability check in parallel.
        const icalCheck = (async (): Promise<boolean> => {
          // Check iCal availability if property has an import URL
          if (p.iCalImportUrl && p.iCalSyncEnabled) {
            try {
              const events = await iCalParserService.fetchAndParse(p.iCalImportUrl)
              return !events.some((e: any) => {
                const eStart = new Date(e.startDate)
                const eEnd = new Date(e.endDate)
                return eStart < checkoutDate && eEnd > checkinDate
              })
            } catch {
              // If iCal fetch fails, don't block the property
              return true
            }
          }
          return true
        })()

        const internalCheck = (async (): Promise<boolean> => {
          try {
            return await availabilityService.checkAvailability(p.id, checkinDate, checkoutDate)
          } catch (err) {
            logger.warn('[agent/search-properties] internal availability check failed', {
              propertyId: p.id,
              error: err instanceof Error ? err.message : 'Unknown',
            })
            // On error, don't block the property (avoid fabricating unavailability).
            return true
          }
        })()

        const [icalAvailable, internalAvailable] = await Promise.all([icalCheck, internalCheck])

        // Discard properties that are unavailable by EITHER source.
        if (!icalAvailable || !internalAvailable) return null

        const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24))
        const totalPrice = (p.basePrice || 0) * nights + (p.cleaningFee || 0)

        // Build Airbnb link if airbnbPropertyId is set
        const airbnbUrl = p.airbnbPropertyId
          ? `https://www.airbnb.com.br/rooms/${p.airbnbPropertyId}`
          : null

        return {
          id: p.id,
          title: p.title,
          description: p.description?.substring(0, 300),
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          max_guests: p.maxGuests || p.capacity,
          base_price_per_night: p.basePrice,
          cleaning_fee: p.cleaningFee,
          total_for_period: totalPrice,
          nights,
          amenities: (p.amenities || []).slice(0, 6),
          main_photo: (p.photos || [])[0] || null,
          airbnb_url: airbnbUrl,
          city: p.city,
          neighborhood: p.neighborhood,
        }
      })
    )

    const available = items.filter(Boolean).slice(0, max_results)

    // Collect main photos so they are sent as WhatsApp images automatically
    const media_urls = available
      .map((p: any) => p.main_photo)
      .filter(Boolean)

    logger.info('[agent/search-properties] completed', {
      tenantId: tenantId.substring(0, 8) + '***',
      found: available.length,
      mainPhotos: media_urls.length,
      checkin,
      checkout,
    })

    return NextResponse.json({
      ok: true,
      properties: available,
      media_urls,
      checkin,
      checkout,
      total_found: available.length,
    })
  } catch (error) {
    logger.error('[agent/search-properties] error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json({ ok: false, error: 'Search failed' }, { status: 500 })
  }
}
