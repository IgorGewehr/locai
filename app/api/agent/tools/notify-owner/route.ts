/**
 * Agent tool: notify_owner
 *
 * Notifies the property owner via WhatsApp that a client wants to close a deal.
 * Phone comes exclusively from Firestore tenant settings (company.phone) — multi-tenant safe.
 * Configure in: Dashboard → Settings → Company → Phone.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateAgentRequest } from '@/lib/middleware/agent-auth'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { createSettingsService } from '@/lib/services/settings-service'
import { logger } from '@/lib/utils/logger'

const Schema = z.object({
  tenant_id: z.string().min(1),
  property_id: z.string().min(1),
  client_summary: z.string().min(1),
  conversation_id: z.string().optional(),
  contact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
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

  const { property_id, client_summary, contact } = parsed.data

  try {
    const services = new TenantServiceFactory(tenantId)
    const settingsService = createSettingsService(tenantId)

    const [property, tenantSettings] = await Promise.all([
      services.properties.get(property_id),
      settingsService.getSettings(tenantId).catch(() => null),
    ])

    if (!property) {
      return NextResponse.json({ ok: false, error: 'Property not found' }, { status: 404 })
    }

    // Phone read exclusively from Firestore — no env var fallback (multi-tenant)
    const ownerPhone: string = (tenantSettings as any)?.company?.phone || ''

    if (!ownerPhone) {
      logger.warn('[agent/notify-owner] owner phone not configured in tenant settings', {
        tenantId: tenantId.substring(0, 8) + '***',
      })
      return NextResponse.json({
        ok: false,
        error: 'Telefone do proprietário não configurado. Acesse Dashboard → Configurações → Empresa → Telefone.',
      }, { status: 400 })
    }

    const clientName = contact?.name || 'Cliente'
    const clientPhone = contact?.phone || 'não informado'
    const notificationText =
      `🏡 *Interesse em imóvel!*\n\n` +
      `*Imóvel:* ${property.title}\n` +
      `*Cliente:* ${clientName} (${clientPhone})\n\n` +
      `*Resumo:* ${client_summary}\n\n` +
      `_Acesse o painel para ver a conversa completa._`

    const microserviceUrl = process.env.WHATSAPP_MICROSERVICE_URL
    const apiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY

    if (!microserviceUrl || !apiKey) {
      logger.error('[agent/notify-owner] WHATSAPP_MICROSERVICE_URL or API_KEY not configured')
      return NextResponse.json({ ok: false, error: 'WhatsApp service not configured' }, { status: 500 })
    }

    const sendResp = await fetch(`${microserviceUrl}/api/v1/messages/${tenantId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to: ownerPhone, type: 'text', text: notificationText }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!sendResp.ok) {
      logger.error('[agent/notify-owner] microservice rejected send', {
        status: sendResp.status,
        tenantId: tenantId.substring(0, 8) + '***',
      })
      return NextResponse.json({ ok: false, error: 'Failed to send notification' }, { status: 502 })
    }

    logger.info('[agent/notify-owner] owner notified', {
      tenantId: tenantId.substring(0, 8) + '***',
      property_id,
    })

    return NextResponse.json({
      ok: true,
      message: 'Proprietário notificado com sucesso',
      property_title: property.title,
    })
  } catch (error) {
    logger.error('[agent/notify-owner] error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return NextResponse.json({ ok: false, error: 'Notification failed' }, { status: 500 })
  }
}
