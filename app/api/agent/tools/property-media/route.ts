/**
 * Agent tool: get_property_media
 * Returns additional photos and videos for a specific property.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateAgentRequest } from '@/lib/middleware/agent-auth'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { logger } from '@/lib/utils/logger'

const Schema = z.object({
  tenant_id: z.string().min(1),
  property_id: z.string().min(1),
  media_type: z.enum(['photos', 'videos', 'all']).default('all'),
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

  const { property_id, media_type } = parsed.data

  try {
    const services = new TenantServiceFactory(tenantId)
    const property = await services.properties.get(property_id)

    if (!property) {
      return NextResponse.json({ ok: false, error: 'Property not found' }, { status: 404 })
    }

    const photos: string[] = (property.photos || []).slice(1) // skip main photo (already shown)
    const videos: string[] = property.videos || []

    let media_urls: string[] = []
    if (media_type === 'photos') media_urls = photos
    else if (media_type === 'videos') media_urls = videos
    else media_urls = [...photos, ...videos]

    logger.info('[agent/property-media] completed', {
      tenantId: tenantId.substring(0, 8) + '***',
      property_id,
      photos: photos.length,
      videos: videos.length,
    })

    return NextResponse.json({
      ok: true,
      property_id,
      title: property.title,
      photos,
      videos,
      media_urls,
      description: property.description,
      amenities: property.amenities || [],
    })
  } catch (error) {
    logger.error('[agent/property-media] error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json({ ok: false, error: 'Failed to fetch media' }, { status: 500 })
  }
}
