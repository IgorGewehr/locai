/**
 * Owner re-ping (interno) — re-alerta o dono sobre um owner_alert ainda não
 * atendido (docs/blueprint/06 §4.6). Chamado pelo watchdog (Functions).
 *
 * Regras:
 *  - se a conversa já está MANUAL/ENCERRADA (humano assumiu) → marca o alerta
 *    'acknowledged' e NÃO re-alerta.
 *  - senão, re-envia o alerta no WhatsApp do dono (tom escalado) e incrementa
 *    repingCount; ao atingir maxRepings, marca 'gave_up'.
 * Auth HMAC via validateAgentRequest.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAgentRequest } from '@/lib/middleware/agent-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { sendWhatsAppText } from '@/lib/whatsapp/outbound';
import { getOwnerWhatsappPhone } from '@/lib/conversation/owner-channel';
import { getConversationState } from '@/lib/conversation/state';
import { derivePhoneFromConversationId } from '@/lib/conversation/resume';

const MAX_REPINGS = 3;

const Schema = z.object({
  tenant_id: z.string().min(1),
  alert_id: z.string().min(1),
});

interface OwnerAlert {
  id?: string;
  conversationId?: string;
  clientPhone?: string;
  summary?: string;
  deepLink?: string;
  status?: string;
  repingCount?: number;
}

export async function POST(request: NextRequest) {
  const { authenticated, body } = await validateAgentRequest(request);
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 });
  }
  const { tenant_id, alert_id } = parsed.data;

  const alertsSvc = new TenantServiceFactory(tenant_id).createService<OwnerAlert>('owner_alerts');
  const alert = await alertsSvc.get(alert_id);
  if (!alert || alert.status !== 'sent') {
    return NextResponse.json({ ok: true, skipped: 'not_pending' });
  }

  const phone = alert.clientPhone || derivePhoneFromConversationId(alert.conversationId || '');

  // Humano já assumiu? (estado MANUAL = takeover; ENCERRADA = fechada) → ack e para.
  if (phone) {
    const state = await getConversationState(tenant_id, phone);
    if (state === 'MANUAL' || state === 'ENCERRADA') {
      await alertsSvc.update(alert_id, { status: 'acknowledged', ackedAt: new Date() } as never);
      return NextResponse.json({ ok: true, acknowledged: true });
    }
  }

  const repingCount = (alert.repingCount || 0) + 1;
  if (repingCount > MAX_REPINGS) {
    await alertsSvc.update(alert_id, { status: 'gave_up' } as never);
    return NextResponse.json({ ok: true, gaveUp: true });
  }

  const ownerPhone = await getOwnerWhatsappPhone(tenant_id);
  if (ownerPhone) {
    const msg =
      `🔴 Ainda esperando você — cliente quente parado.\n\n` +
      `${alert.summary || ''}\n` +
      (alert.deepLink ? `Abrir: ${alert.deepLink}` : '');
    await sendWhatsAppText(tenant_id, ownerPhone, msg).catch(() => {});
  }
  await alertsSvc.update(alert_id, { repingCount, lastRepingAt: new Date() } as never);

  logger.info('[owner-reping] re-alerta enviado', {
    tenantId: tenant_id.substring(0, 8) + '***',
    alertId: alert_id,
    repingCount,
  });
  return NextResponse.json({ ok: true, repingCount });
}
