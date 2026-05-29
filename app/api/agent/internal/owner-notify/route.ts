/**
 * Owner notify (interno) — chamado pelo WORKER para um `ask_owner`.
 *
 * Resolve o número pessoal do dono, envia a pergunta da Sofia no WhatsApp (com
 * deep-link para a conversa) e registra um `owner_alerts`. A conversa do CLIENTE
 * permanece em IA_TRABALHANDO até o dono responder (via /api/agent/owner-answer),
 * que dispara o /resume. Ver docs/blueprint/06 §6.1. Auth HMAC (validateAgentRequest).
 *
 * v1: trilho WhatsApp + owner_alerts. Os trilhos push e o re-ping com escalada
 * (doc 06 §4.2/§4.5) ficam para o restante do doc 06.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAgentRequest } from '@/lib/middleware/agent-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { sendWhatsAppText } from '@/lib/whatsapp/outbound';
import { getOwnerWhatsappPhone, conversationDeepLink } from '@/lib/conversation/owner-channel';

const Schema = z.object({
  tenant_id: z.string().min(1),
  conversation_id: z.string().min(1),
  task_id: z.string().min(1),
  question: z.string().min(1),
  client_phone: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const { authenticated, body } = await validateAgentRequest(request);
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 });
  }

  const { tenant_id, conversation_id, task_id, question, client_phone } = parsed.data;

  const ownerPhone = await getOwnerWhatsappPhone(tenant_id);
  const deepLink = conversationDeepLink(client_phone);

  // Registra o alerta sempre (auditoria + base do re-ping futuro).
  try {
    const svc = new TenantServiceFactory(tenant_id).createService('owner_alerts');
    await svc.create({
      tenantId: tenant_id,
      conversationId: conversation_id,
      taskId: task_id,
      reason: 'ask_owner',
      severity: 'high',
      question,
      deepLink,
      status: ownerPhone ? 'sent' : 'no_owner_phone',
      repingCount: 0,
      createdAt: new Date(),
    } as never);
  } catch (err) {
    logger.warn('[owner-notify] failed to log owner_alert', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (!ownerPhone) {
    // Sem número do dono configurado: não dá pra notificar. A conversa segue em
    // IA_TRABALHANDO e o watchdog a destrava após o limite do ask_owner.
    logger.warn('[owner-notify] sem ownerWhatsappPhone — dono não notificado', {
      tenantId: tenant_id.substring(0, 8) + '***',
      taskId: task_id,
    });
    return NextResponse.json({ ok: false, reason: 'no_owner_phone' });
  }

  const message =
    `Sofia precisa de você 👀\n\n"${question}"\n\n` +
    `Responda direto no painel para a Sofia retomar com o cliente:\n${deepLink}`;
  await sendWhatsAppText(tenant_id, ownerPhone, message).catch(() => {});

  logger.info('[owner-notify] dono notificado (ask_owner)', {
    tenantId: tenant_id.substring(0, 8) + '***',
    taskId: task_id,
  });
  return NextResponse.json({ ok: true });
}
