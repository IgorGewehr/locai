/**
 * Agent tool: get_property_map
 * Returns a Google Maps static map image URL for a specific property.
 * Geocodes the property location and returns a static map URL.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateAgentRequest } from '@/lib/middleware/agent-auth'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { logger } from '@/lib/utils/logger'

const Schema = z.object({
  tenant_id: z.string().min(1),
  property_id: z.string().min(1),
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

  const { property_id } = parsed.data

  try {
    const services = new TenantServiceFactory(tenantId)
    const property = await services.properties.get(property_id)

    if (!property) {
      return NextResponse.json({ ok: false, error: 'Property not found' }, { status: 404 })
    }

    const location = (property as any).location
    if (!location) {
      return NextResponse.json({ ok: false, error: 'Property has no location info' }, { status: 400 })
    }

    const mapsKey = process.env.MAPS_KEY
    if (!mapsKey) {
      return NextResponse.json({ ok: false, error: 'Maps service not configured' }, { status: 503 })
    }

    // Geocode the address
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${mapsKey}`
    const geoResp = await fetch(geocodeUrl)
    const geoData = await geoResp.json()

    if (!geoData.results?.length) {
      logger.warn('[agent/property-map] geocoding returned no results', {
        tenantId: tenantId.substring(0, 8) + '***',
        property_id,
        location,
      })
      return NextResponse.json({ ok: false, error: 'Could not locate address on map' }, { status: 404 })
    }

    const { lat, lng } = geoData.results[0].geometry.location

    // Generate static map URL
    const mapParams = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: '15',
      size: '600x400',
      maptype: 'roadmap',
      markers: `color:red|${lat},${lng}`,
      key: mapsKey,
    })
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?${mapParams.toString()}`
    const media_urls = [staticMapUrl]

    logger.info('[agent/property-map] completed', {
      tenantId: tenantId.substring(0, 8) + '***',
      property_id,
      coordinates: { lat, lng },
    })

    return NextResponse.json({
      ok: true,
      property_id,
      title: property.title,
      location,
      city: (property as any).city,
      neighborhood: (property as any).neighborhood,
      coordinates: { lat, lng },
      media_urls,
    })
  } catch (error) {
    logger.error('[agent/property-map] error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json({ ok: false, error: 'Failed to generate map' }, { status: 500 })
  }
}
