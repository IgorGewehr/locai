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
import { logger } from '@/lib/utils/logger'

const Schema = z.object({
  tenant_id: z.string().min(1),
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  bedrooms: z.number().int().positive().optional(),
  guests: z.number().int().positive().optional(),
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

  const { checkin, checkout, bedrooms, guests, max_results } = parsed.data
  const checkinDate = new Date(checkin)
  const checkoutDate = new Date(checkout)

  if (checkoutDate <= checkinDate) {
    return NextResponse.json({ error: 'checkout must be after checkin' }, { status: 400 })
  }

  try {
    // Use existing searchProperties which queries Firestore with filters
    const result = await searchProperties(
      {
        bedrooms,
        guests,
        checkIn: checkin,
        checkOut: checkout,
      },
      tenantId
    )

    const allProperties = result?.properties || []

    // Build clean response for the LLM
    const items = await Promise.all(
      allProperties.map(async (p: any) => {
        // Check iCal availability if property has an import URL
        let icalAvailable = true
        if (p.iCalImportUrl && p.iCalSyncEnabled) {
          try {
            const events = await iCalParserService.fetchAndParse(p.iCalImportUrl)
            icalAvailable = !events.some((e: any) => {
              const eStart = new Date(e.startDate)
              const eEnd = new Date(e.endDate)
              return eStart < checkoutDate && eEnd > checkinDate
            })
          } catch {
            // If iCal fetch fails, don't block the property
          }
        }

        if (!icalAvailable) return null

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

    logger.info('[agent/search-properties] completed', {
      tenantId: tenantId.substring(0, 8) + '***',
      found: available.length,
      checkin,
      checkout,
    })

    return NextResponse.json({
      ok: true,
      properties: available,
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
