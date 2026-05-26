/**
 * Agent tool: create_client
 *
 * Registers a new client/contact. Only the name is required; everything else
 * is optional. Multi-tenant, HMAC-authed. Used by the operator console and chat.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateAgentRequest } from '@/lib/middleware/agent-auth'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { logger } from '@/lib/utils/logger'

const Schema = z.object({
  tenant_id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  document: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  conversation_id: z.string().optional(),
  contact: z.object({ name: z.string().optional(), phone: z.string().optional() }).optional(),
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

  const { name, phone, email, document, address, notes } = parsed.data

  try {
    const services = new TenantServiceFactory(tenantId)
    const now = new Date()
    const digits = (phone || '').replace(/\D/g, '')
    const noteParts = [notes?.trim(), address?.trim() ? `Endereço: ${address.trim()}` : ''].filter(Boolean)

    const clientData: any = {
      name: name.trim(),
      phone: digits,
      whatsappNumber: digits,
      source: 'manual',
      isActive: true,
      totalReservations: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
    }
    if (email?.trim()) clientData.email = email.trim()
    if (document && document.replace(/\D/g, '')) clientData.document = document.replace(/\D/g, '')
    if (noteParts.length) clientData.notes = noteParts.join(' | ')

    // Check if client with same phone already exists
    let clientId: string
    if (digits) {
      const existing = await services.clients.getWhere('phone', '==', digits)
      if (existing.length > 0) {
        clientId = existing[0].id!
        await services.clients.update(clientId, { ...clientData, createdAt: existing[0].createdAt || now })
      } else {
        clientId = await services.clients.create(clientData)
      }
    } else {
      clientId = await services.clients.create(clientData)
    }

    // Update clientName in conversations matching this phone
    if (digits) {
      const phoneVariants = [digits, `${digits}@s.whatsapp.net`, `${digits}@c.us`]
      for (const variant of phoneVariants) {
        const convos = await services.conversations.getWhere('clientPhone', '==', variant)
        for (const conv of convos) {
          if (conv.id) {
            await services.conversations.update(conv.id, { clientName: name.trim() } as any)
          }
        }
      }
    }

    logger.info('[agent/create-client] client created/updated', {
      tenantId: tenantId.substring(0, 8) + '***',
      clientId,
    })

    return NextResponse.json({
      ok: true,
      client_id: clientId,
      message: `Cliente ${name.trim()} cadastrado com sucesso.`,
    })
  } catch (error) {
    logger.error('[agent/create-client] error', error instanceof Error ? error : undefined)
    return NextResponse.json({ ok: false, error: 'Falha ao cadastrar o cliente' }, { status: 500 })
  }
}
