/**
 * Agent tool: schedule_visit
 *
 * Books a property visit for a lead. Creates a VisitAppointment (status SCHEDULED)
 * that shows up in Dashboard → Agenda. Multi-tenant, HMAC-authed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateAgentRequest } from '@/lib/middleware/agent-auth'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { VisitStatus } from '@/lib/types/visit-appointment'
import { logger } from '@/lib/utils/logger'

const Schema = z.object({
  tenant_id: z.string().min(1),
  property_id: z.string().optional(),
  scheduled_date: z.string().min(1), // ISO date or "YYYY-MM-DD"
  scheduled_time: z.string().min(1), // "HH:MM"
  notes: z.string().optional(),
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

  const { property_id, scheduled_date, scheduled_time, notes, contact } = parsed.data

  try {
    const services = new TenantServiceFactory(tenantId)

    let propertyName = ''
    let propertyAddress = ''
    if (property_id) {
      const p: any = await services.properties.get(property_id).catch(() => null)
      if (p) {
        propertyName = p.title || ''
        propertyAddress = p.address || ''
      }
    }

    const now = new Date()
    const visitId = await services.visits.create({
      clientId: '',
      clientName: contact?.name || 'Cliente',
      clientPhone: contact?.phone || '',
      propertyId: property_id || '',
      propertyName,
      propertyAddress,
      scheduledDate: scheduled_date,
      scheduledTime: scheduled_time,
      duration: 60,
      status: VisitStatus.SCHEDULED,
      notes: notes || '',
      confirmedByClient: true,
      confirmedByAgent: false,
      source: 'whatsapp',
      createdAt: now,
      updatedAt: now,
    } as any)

    logger.info('[agent/schedule-visit] visit scheduled', {
      tenantId: tenantId.substring(0, 8) + '***',
      visitId,
    })

    return NextResponse.json({
      ok: true,
      visit_id: visitId,
      message: `Visita agendada para ${scheduled_date} às ${scheduled_time}${propertyName ? ` — ${propertyName}` : ''}.`,
    })
  } catch (error) {
    logger.error('[agent/schedule-visit] error', error instanceof Error ? error : undefined)
    return NextResponse.json({ ok: false, error: 'Falha ao agendar a visita' }, { status: 500 })
  }
}
