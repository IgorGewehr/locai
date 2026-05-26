/**
 * Agent tool: report_issue
 *
 * Opens a support/maintenance ticket for an existing tenant (e.g. something broke
 * in a rented property), persists it (support_tickets) and notifies the owner via
 * WhatsApp. Multi-tenant, HMAC-authed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateAgentRequest } from '@/lib/middleware/agent-auth'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { createSettingsService } from '@/lib/services/settings-service'
import { logger } from '@/lib/utils/logger'

const Schema = z.object({
  tenant_id: z.string().min(1),
  issue: z.string().min(1),
  property_id: z.string().optional(),
  urgency: z.enum(['baixa', 'media', 'alta']).optional(),
  conversation_id: z.string().optional(),
  contact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
})

const URGENCY_LABEL: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }

export async function POST(request: NextRequest) {
  const { authenticated, tenantId, body } = await validateAgentRequest(request)
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 })
  }

  const { issue, property_id, urgency, contact } = parsed.data

  try {
    const services = new TenantServiceFactory(tenantId)
    const settingsService = createSettingsService(tenantId)

    let propertyName = ''
    if (property_id) {
      const p: any = await services.properties.get(property_id).catch(() => null)
      if (p) propertyName = p.title || ''
    }

    const now = new Date()
    const ticketId = await services.createService('support_tickets').create({
      issue,
      propertyId: property_id || '',
      propertyName,
      urgency: urgency || 'media',
      status: 'open',
      clientName: contact?.name || 'Cliente',
      clientPhone: contact?.phone || '',
      source: 'whatsapp',
      createdAt: now,
      updatedAt: now,
    } as any)

    // Notify the owner via WhatsApp (best-effort)
    try {
      const tenantSettings: any = await settingsService.getSettings(tenantId).catch(() => null)
      const ownerPhone: string = tenantSettings?.company?.phone || ''
      const microserviceUrl = process.env.WHATSAPP_MICROSERVICE_URL
      const apiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY
      if (ownerPhone && microserviceUrl && apiKey) {
        const text =
          `Chamado de suporte aberto\n\n` +
          `Cliente: ${contact?.name || 'Cliente'} (${contact?.phone || 'não informado'})\n` +
          (propertyName ? `Imóvel: ${propertyName}\n` : '') +
          `Urgência: ${URGENCY_LABEL[urgency || 'media']}\n\n` +
          `Problema: ${issue}`
        await fetch(`${microserviceUrl}/api/v1/messages/${tenantId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ to: ownerPhone, type: 'text', text }),
          signal: AbortSignal.timeout(10_000),
        })
      }
    } catch (notifyErr) {
      logger.warn('[agent/report-issue] owner notify failed (ticket still saved)', {
        error: notifyErr instanceof Error ? notifyErr.message : 'unknown',
      })
    }

    logger.info('[agent/report-issue] ticket opened', {
      tenantId: tenantId.substring(0, 8) + '***',
      ticketId,
    })

    return NextResponse.json({
      ok: true,
      ticket_id: ticketId,
      message: 'Chamado de suporte registrado e equipe avisada.',
    })
  } catch (error) {
    logger.error('[agent/report-issue] error', error instanceof Error ? error : undefined)
    return NextResponse.json({ ok: false, error: 'Falha ao registrar o chamado' }, { status: 500 })
  }
}
