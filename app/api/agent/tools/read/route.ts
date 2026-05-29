/**
 * Agent tool: read_system
 *
 * Generic, tenant-scoped READ endpoint the Python LangGraph agent (Sofia) uses
 * to inspect the whole system: leads, conversations, properties, reservations,
 * financial transactions, clients and a compact dashboard summary.
 *
 * Auth is identical to the other agent tool endpoints (HMAC `ts.body` or Bearer)
 * via validateAgentRequest. The signed body carries the query so both GET (query
 * string) and POST (JSON body) callers authenticate the same way.
 *
 * Returns compact JSON only (capped fields + capped row counts) to keep the LLM
 * payload small.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateAgentRequest } from '@/lib/middleware/agent-auth'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { logger } from '@/lib/utils/logger'
import { computeCrmInsights, type CrmInsights } from '@/lib/analytics/crm-insights'

const RESOURCES = [
  'leads',
  'conversations',
  'properties',
  'reservations',
  'transactions',
  'clients',
  'dashboard',
  'insights',
] as const

type Resource = (typeof RESOURCES)[number]

const Schema = z.object({
  tenant_id: z.string().min(1),
  resource: z.enum(RESOURCES),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

function toMillis(v: unknown): number | null {
  if (!v) return null
  if (typeof v === 'string') {
    const t = Date.parse(v)
    return Number.isNaN(t) ? null : t
  }
  if (typeof v === 'number') return v
  const anyV = v as { toMillis?: () => number; seconds?: number; getTime?: () => number }
  if (typeof anyV.toMillis === 'function') return anyV.toMillis()
  if (typeof anyV.seconds === 'number') return anyV.seconds * 1000
  if (typeof anyV.getTime === 'function') return anyV.getTime()
  return null
}

function toIso(v: unknown): string | null {
  const ms = toMillis(v)
  return ms === null ? null : new Date(ms).toISOString()
}

/**
 * Derive 2-4 short, data-grounded observations from the computed insights.
 * These are interpretive hints for the analyst LLM — every value comes straight
 * from real aggregates; nothing is invented.
 */
function buildInsightObservations(ci: CrmInsights): string[] {
  const obs: string[] = []
  const o = ci.overview

  if (o.totalLeads > 0) {
    obs.push(
      `Conversão geral de ${o.conversionRate.toFixed(1)}% (${o.wonLeads} ganhos de ${o.totalLeads} leads nos últimos ${ci.period.months} meses).`
    )
  }

  const drops = ci.funnel.filter((f, i) => i > 0 && f.dropOffRate > 0)
  if (drops.length) {
    const worst = drops.reduce((a, b) => (b.dropOffRate > a.dropOffRate ? b : a))
    obs.push(
      `Maior gargalo no funil: queda de ${worst.dropOffRate.toFixed(0)}% ao chegar no estágio "${worst.status}".`
    )
  }

  if (ci.hotLeadsNoFollowUp.count > 0) {
    obs.push(
      `${ci.hotLeadsNoFollowUp.count} lead(s) quente(s) sem retorno há mais de ${ci.hotLeadsNoFollowUp.slaHours}h — risco de perda imediato.`
    )
  }

  const topLost = ci.winLoss.topLostReasons[0]
  if (topLost) {
    obs.push(`Maior motivo de perda: "${topLost.reason}" (${topLost.count}x).`)
  }

  const sources = ci.conversionBySource.filter((s) => s.leads >= 3)
  if (sources.length) {
    const best = sources.reduce((a, b) => (b.conversionRate > a.conversionRate ? b : a))
    obs.push(
      `Fonte que mais converte: "${best.source}" (${best.conversionRate.toFixed(0)}% de ${best.leads} leads).`
    )
  }

  return obs.slice(0, 4)
}

async function buildPayload(resource: Resource, tenantId: string, max: number) {
  const services = new TenantServiceFactory(tenantId)

  switch (resource) {
    case 'leads': {
      const rows = await services.leads.getAll(max)
      return {
        leads: rows.map((l: any) => ({
          id: l.id,
          name: l.name || l.clientName,
          phone: l.phone || l.clientPhone,
          status: l.status,
          temperature: l.temperature,
          score: l.score,
          escalated: !!l.escalation?.active,
          source: l.source,
          createdAt: toIso(l.createdAt || l.firstContactDate),
        })),
        count: rows.length,
      }
    }

    case 'conversations': {
      const rows = await services.conversations.getAll(max)
      return {
        conversations: rows.map((c: any) => ({
          id: c.id,
          clientName: c.clientName || c.extractedInfo?.name,
          phone: c.whatsappPhone,
          channel: c.channel,
          status: c.status,
          stage: c.stage,
          intent: c.intent,
          lastMessageAt: toIso(c.lastMessageAt),
          unreadCount: c.unreadCount,
        })),
        count: rows.length,
      }
    }

    case 'properties': {
      const rows = await services.properties.getAll(max)
      return {
        properties: rows.map((p: any) => ({
          id: p.id,
          title: p.title,
          city: p.city,
          neighborhood: p.neighborhood,
          bedrooms: p.bedrooms,
          maxGuests: p.maxGuests || p.capacity,
          basePrice: p.basePrice,
          status: p.status,
          isActive: p.isActive,
        })),
        count: rows.length,
      }
    }

    case 'reservations': {
      const rows = await services.reservations.getAll(max)
      return {
        reservations: rows.map((r: any) => ({
          id: r.id,
          propertyId: r.propertyId,
          clientId: r.clientId,
          status: r.status,
          checkIn: toIso(r.checkIn),
          checkOut: toIso(r.checkOut),
          guests: r.guests,
          nights: r.nights,
          totalAmount: r.totalAmount,
          paidAmount: r.paidAmount,
          pendingAmount: r.pendingAmount,
          paymentStatus: r.paymentStatus,
          source: r.source,
        })),
        count: rows.length,
      }
    }

    case 'transactions': {
      const rows = await services.transactions.getAll(max)
      return {
        transactions: rows.map((t: any) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          amount: t.amount,
          category: t.category,
          description: typeof t.description === 'string' ? t.description.substring(0, 120) : undefined,
          clientName: t.clientName,
          propertyName: t.propertyName,
          date: toIso(t.paymentDate || t.dueDate || t.date),
        })),
        count: rows.length,
      }
    }

    case 'clients': {
      const rows = await services.clients.getAll(max)
      return {
        clients: rows.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          createdAt: toIso(c.createdAt),
        })),
        count: rows.length,
      }
    }

    case 'dashboard': {
      // Compact summary across the whole system. We sample up to a hard cap per
      // collection and aggregate in memory to avoid composite-index requirements.
      const cap = 1000
      const [leads, conversations, properties, reservations, transactions] = await Promise.all([
        services.leads.getAll(cap),
        services.conversations.getAll(cap),
        services.properties.getAll(cap),
        services.reservations.getAll(cap),
        services.transactions.getAll(cap),
      ])

      const byTemperature = { hot: 0, warm: 0, cold: 0 }
      let escalations = 0
      for (const l of leads as any[]) {
        const temp = l.temperature as keyof typeof byTemperature
        if (temp && temp in byTemperature) byTemperature[temp]++
        if (l.escalation?.active) escalations++
      }

      const activeConversations = (conversations as any[]).filter(
        (c) => c.status === 'active' || c.status === 'waiting_client' || c.status === 'escalated'
      ).length

      const activeProperties = (properties as any[]).filter(
        (p) => p.isActive === true || p.status === 'active' || p.status === 'available'
      ).length

      // Financial: current calendar month income vs expense from transactions.
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
      let monthIncome = 0
      let monthExpense = 0
      for (const t of transactions as any[]) {
        const when = toMillis(t.paymentDate || t.dueDate || t.date)
        if (when === null || when < monthStart || when >= monthEnd) continue
        const amount = Number(t.amount) || 0
        if (t.type === 'income') monthIncome += amount
        else if (t.type === 'expense') monthExpense += amount
      }

      return {
        dashboard: {
          leads: {
            total: leads.length,
            byTemperature,
            escalations,
          },
          conversations: {
            total: conversations.length,
            active: activeConversations,
          },
          properties: {
            total: properties.length,
            active: activeProperties,
          },
          reservations: {
            total: reservations.length,
          },
          financial: {
            month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            income: monthIncome,
            expense: monthExpense,
            net: monthIncome - monthExpense,
          },
        },
      }
    }

    case 'insights': {
      // Analysis-ready CRM funnel for the senior-analyst persona. The heavy
      // arrays are trimmed and short `observations` are derived (from real
      // numbers only — never fabricated) to seed the LLM's reasoning.
      const ci = await computeCrmInsights(tenantId)
      const compact = {
        ...ci,
        hotLeadsNoFollowUp: {
          ...ci.hotLeadsNoFollowUp,
          leads: ci.hotLeadsNoFollowUp.leads.slice(0, 8),
        },
      }
      return {
        insights: compact,
        observations: buildInsightObservations(ci),
      }
    }
  }
}

async function handle(request: NextRequest) {
  const { authenticated, tenantId, body } = await validateAgentRequest(request)

  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Merge query-string params (GET) with signed body so callers can use either.
  const url = new URL(request.url)
  const merged: Record<string, unknown> = { ...body }
  if (!merged.resource && url.searchParams.get('resource')) merged.resource = url.searchParams.get('resource')
  if (!merged.tenant_id && url.searchParams.get('tenantId')) merged.tenant_id = url.searchParams.get('tenantId')
  if (merged.limit === undefined && url.searchParams.get('limit')) merged.limit = url.searchParams.get('limit')
  if (!merged.tenant_id && tenantId) merged.tenant_id = tenantId

  const parsed = Schema.safeParse(merged)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 })
  }

  const { resource, limit, tenant_id } = parsed.data

  try {
    const data = await buildPayload(resource, tenant_id, limit)
    logger.info('[agent/read] completed', {
      tenantId: tenant_id.substring(0, 8) + '***',
      resource,
      limit,
    })
    return NextResponse.json({ ok: true, resource, ...data })
  } catch (error) {
    logger.error('[agent/read] error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ ok: false, error: 'Read failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
