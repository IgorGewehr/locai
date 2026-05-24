/**
 * Agent tool: get_airbnb_link
 * Returns the Airbnb booking URL for a property.
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
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const { property_id } = parsed.data

  try {
    const services = new TenantServiceFactory(tenantId)
    const property = await services.properties.get(property_id)

    if (!property) {
      return NextResponse.json({ ok: false, error: 'Property not found' }, { status: 404 })
    }

    const airbnbUrl = property.airbnbPropertyId
      ? `https://www.airbnb.com.br/rooms/${property.airbnbPropertyId}`
      : null

    logger.info('[agent/airbnb-link] completed', {
      tenantId: tenantId.substring(0, 8) + '***',
      property_id,
      has_airbnb: !!airbnbUrl,
    })

    return NextResponse.json({
      ok: true,
      property_id,
      title: property.title,
      airbnb_url: airbnbUrl,
      has_direct_booking: !!airbnbUrl,
    })
  } catch (error) {
    logger.error('[agent/airbnb-link] error', { error: error instanceof Error ? error.message : 'Unknown' })
    return NextResponse.json({ ok: false, error: 'Failed to fetch link' }, { status: 500 })
  }
}
