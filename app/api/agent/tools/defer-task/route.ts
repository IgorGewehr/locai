/**
 * Agent tool endpoint: defer_and_work → cria uma task diferida.
 *
 * Chamado pelo executor do agente quando a Sofia decide "esperar um segundinho".
 * Fluxo (docs/blueprint/01 §4.3):
 *   1. cria a task (idempotente por conversationId+originMessageId)
 *   2. transiciona a conversa para IA_TRABALHANDO {activeTaskId}
 *   3. envia AGORA a frase humana (client_message) e a persiste
 *   4. enfileira a task no worker (Functions)
 * Auth HMAC idêntica às demais tools (validateAgentRequest).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAgentRequest } from '@/lib/middleware/agent-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { setConversationState } from '@/lib/conversation/state';
import { createDeferredTask, type DeferredTaskType } from '@/lib/conversation/deferred-tasks';
import { enqueueDeferredTask } from '@/lib/conversation/enqueue';
import { sendWhatsAppText } from '@/lib/whatsapp/outbound';

const Schema = z.object({
  tenant_id: z.string().min(1),
  conversation_id: z.string().min(1),
  message_id: z.string().optional().default(''),
  contact: z.object({ phone: z.string().optional() }).optional(),
  client_message: z.string().min(1),
  task_type: z.enum(['property_research', 'ask_owner', 'closing_prep', 'other']),
  task_payload: z.record(z.unknown()).optional().default({}),
  resume_hint: z.string().optional().nullable(),
});

/** Deriva o telefone do conversation_id ({tenantId}:{phone}) ou do contact. */
function derivePhone(conversationId: string, contactPhone?: string): string {
  const idx = conversationId.indexOf(':');
  if (idx >= 0) return conversationId.slice(idx + 1);
  return contactPhone || '';
}

async function persistSofiaMessage(tenantId: string, clientPhone: string, message: string): Promise<void> {
  try {
    const svc = new TenantServiceFactory(tenantId);
    const convs = await svc.conversations.getWhere('clientPhone', '==', clientPhone);
    const convId = convs[0]?.id;
    if (!convId) return;
    const now = new Date();
    await svc.messages.create({
      conversationId: convId,
      tenantId,
      clientMessage: null,
      clientMessageTimestamp: null,
      sofiaMessage: message,
      sofiaMessageTimestamp: now,
      createdAt: now,
    } as never);
    await svc.conversations.update(convId, {
      lastMessageAt: now,
      lastMessage: message.substring(0, 200),
      lastMessageFrom: 'sofia',
      updatedAt: now,
    } as never);
  } catch (err) {
    logger.warn('[defer-task] failed to persist holding message', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handle(request: NextRequest) {
  const { authenticated, body } = await validateAgentRequest(request);
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 });
  }

  const { tenant_id, conversation_id, message_id, contact, client_message, task_type, task_payload, resume_hint } =
    parsed.data;
  const phone = derivePhone(conversation_id, contact?.phone);
  if (!phone) {
    return NextResponse.json({ error: 'Could not derive phone' }, { status: 400 });
  }

  try {
    // 1. Cria a task (idempotente por conversationId+originMessageId)
    const task = await createDeferredTask(tenant_id, {
      conversationId: conversation_id,
      clientPhone: phone,
      taskType: task_type as DeferredTaskType,
      clientMessage: client_message,
      payload: task_payload,
      resumeHint: resume_hint ?? null,
      originMessageId: message_id || null,
    });

    // Já existia (reentrega) → não reenvia nem re-enfileira.
    if (task.status !== 'queued') {
      logger.info('[defer-task] dedup — task já existente', { tenantId: tenant_id.substring(0, 8) + '***', taskId: task.taskId });
      return NextResponse.json({ deferred: true, taskId: task.taskId, dedup: true });
    }

    // 2. Estado → IA_TRABALHANDO
    await setConversationState(tenant_id, phone, 'IA_TRABALHANDO', { activeTaskId: task.taskId });

    // 3. Envia AGORA a frase humana + persiste
    await sendWhatsAppText(tenant_id, phone, client_message).catch(() => {});
    await persistSofiaMessage(tenant_id, phone, client_message);

    // 4. Enfileira no worker (fire-and-forget)
    await enqueueDeferredTask({ tenantId: tenant_id, conversationId: conversation_id, taskId: task.taskId });

    logger.info('[defer-task] task criada e enfileirada', {
      tenantId: tenant_id.substring(0, 8) + '***',
      taskId: task.taskId,
      taskType: task_type,
    });
    return NextResponse.json({ deferred: true, taskId: task.taskId, state: 'IA_TRABALHANDO' });
  } catch (err) {
    logger.error('[defer-task] error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ deferred: false, error: 'defer failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}
