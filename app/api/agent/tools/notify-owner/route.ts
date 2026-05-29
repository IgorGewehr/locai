/**
 * Agent tool: notify_owner (v2 — canal IA↔Dono, docs/blueprint/06 §4).
 *
 * Quando a Sofia escala (cliente quer fechar / pede humano / fora do alcance),
 * dispara o handoff para o dono:
 *  - Trilho A: WhatsApp pessoal do dono com resumo + deep-link ("chama AGORA")
 *  - owner_alerts (auditoria + base do re-ping)
 *  - estado da conversa → AGUARDANDO_HUMANO + ownerAlertedAt
 *  - escalation.active no lead → aparece no topo de "Precisam de você" (UI atual)
 * Idempotente por turno (SET NX EX). Auth HMAC via validateAgentRequest.
 *
 * MVP do handoff: o humano é avisado e cai na conversa com o resumo da IA. O
 * trilho push (notification-service) e o re-ping com escalada são complementos.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAgentRequest } from '@/lib/middleware/agent-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { getRedisClient } from '@/lib/redis/client';
import { logger } from '@/lib/utils/logger';
import { sendWhatsAppText } from '@/lib/whatsapp/outbound';
import { getOwnerWhatsappPhone, conversationDeepLink } from '@/lib/conversation/owner-channel';
import { setConversationState } from '@/lib/conversation/state';
import { derivePhoneFromConversationId } from '@/lib/conversation/resume';
import { normalizeBlockPhone } from '@/lib/utils/ai-block';

const Schema = z.object({
  tenant_id: z.string().min(1),
  property_id: z.string().optional(),
  client_summary: z.string().min(1),
  conversation_id: z.string().optional(),
  contact: z.object({ name: z.string().optional(), phone: z.string().optional() }).optional(),
  reason: z.enum(['closing', 'escalation', 'other']).optional().default('escalation'),
  severity: z.enum(['high', 'critical']).optional(),
});

/** true se este alerta já foi disparado neste turno (janela curta). */
async function alreadyAlerted(tenantId: string, key: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const res = await redis.set(`alert_sent:${tenantId}:${key}`, '1', 'EX', 90, 'NX');
    return res === null;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const { authenticated, tenantId, body } = await validateAgentRequest(request);
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 });
  }

  const { property_id, client_summary, conversation_id, contact, reason } = parsed.data;
  const severity = parsed.data.severity || (reason === 'closing' ? 'critical' : 'high');

  // Telefone do cliente: do conversation_id ({tid}:{phone}) ou do contact.
  const clientPhone = conversation_id
    ? derivePhoneFromConversationId(conversation_id, contact?.phone)
    : contact?.phone || '';

  const services = new TenantServiceFactory(tenantId);

  // Idempotência por turno
  const dedupKey = `${conversation_id || clientPhone || 'unknown'}:${reason}`;
  if (await alreadyAlerted(tenantId, dedupKey)) {
    logger.info('[notify-owner] alerta duplicado no turno — no-op', { tenantId: tenantId.substring(0, 8) + '***' });
    return NextResponse.json({ ok: true, dedup: true });
  }

  const ownerPhone = await getOwnerWhatsappPhone(tenantId);
  const deepLink = clientPhone ? conversationDeepLink(clientPhone) : '';

  // Título do imóvel (se houver) só para enriquecer a mensagem
  let propertyTitle = '';
  if (property_id) {
    try {
      const p = (await services.properties.get(property_id)) as { title?: string } | null;
      propertyTitle = p?.title || '';
    } catch {
      /* opcional */
    }
  }

  const channels: string[] = [];

  // owner_alerts (auditoria + base do re-ping)
  let alertId: string | undefined;
  try {
    const alerts = services.createService('owner_alerts');
    alertId = await alerts.create({
      tenantId,
      conversationId: conversation_id || '',
      clientPhone: clientPhone ? normalizeBlockPhone(clientPhone) : '',
      propertyId: property_id || null,
      reason,
      severity,
      summary: client_summary,
      deepLink,
      status: ownerPhone ? 'sent' : 'no_owner_phone',
      repingCount: 0,
      createdAt: new Date(),
    } as never);
  } catch (err) {
    logger.warn('[notify-owner] failed to log owner_alert', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Trilho A — WhatsApp pessoal do dono
  if (ownerPhone) {
    const head = reason === 'closing' ? '🔴 FECHAMENTO — chama AGORA' : '🟠 Atenção — precisa de você';
    const lines = [
      head,
      '',
      client_summary,
      propertyTitle ? `Imóvel: ${propertyTitle}` : '',
      contact?.name ? `Cliente: ${contact.name}` : '',
      deepLink ? `Abrir conversa: ${deepLink}` : '',
    ].filter(Boolean);
    await sendWhatsAppText(tenantId, ownerPhone, lines.join('\n')).catch(() => {});
    channels.push('whatsapp');
  } else {
    logger.warn('[notify-owner] sem ownerWhatsappPhone — handoff só via dashboard', {
      tenantId: tenantId.substring(0, 8) + '***',
    });
  }

  // Estado → AGUARDANDO_HUMANO + ownerAlertedAt (a IA para de responder; humano assume)
  if (clientPhone) {
    await setConversationState(tenantId, clientPhone, 'AGUARDANDO_HUMANO', { ownerAlertedAt: new Date() }).catch(() => {});
  }

  // Trilho C — escalation.active no lead → topo de "Precisam de você" na UI atual
  if (clientPhone) {
    try {
      const leads = await services.leads.getWhere('phone', '==', clientPhone);
      const lead = leads[0] || (await services.leads.getWhere('clientPhone', '==', clientPhone))[0];
      if (lead?.id) {
        await services.leads.update(lead.id, {
          escalation: { active: true, at: new Date(), reason: client_summary.substring(0, 200) },
        } as never);
        channels.push('dashboard');
      }
    } catch (err) {
      logger.warn('[notify-owner] failed to flag lead escalation', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('[notify-owner] handoff disparado', {
    tenantId: tenantId.substring(0, 8) + '***',
    reason,
    severity,
    channels,
  });
  return NextResponse.json({ ok: true, alertId, channels, ownerNotified: !!ownerPhone });
}
