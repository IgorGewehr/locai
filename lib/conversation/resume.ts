/**
 * Núcleo de re-engajamento (defer/resume) — lado locai.
 *
 * `callAgentResume` chama o agente `POST /resume` (HMAC). `dispatchResume` aplica
 * o resultado: persiste a mensagem da Sofia, envia ao cliente, transiciona o
 * estado e marca a task como resumida — idempotente por `resume_done:{tenant}:{taskId}`.
 *
 * Reusado por: `/api/agent/internal/resume-dispatch` (caminho do worker, que já
 * chamou o /resume) e `/api/agent/owner-answer` (caminho do dono, que chama o
 * /resume aqui). Ver docs/blueprint/01 §5-§6 e 06 §6.
 */
import crypto from 'crypto';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { getRedisClient } from '@/lib/redis/client';
import { logger } from '@/lib/utils/logger';
import { setConversationState, type ConversationState } from '@/lib/conversation/state';
import { markTaskResumed } from '@/lib/conversation/deferred-tasks';
import { sendWhatsAppText, sendWhatsAppMedia } from '@/lib/whatsapp/outbound';
import { toMillis } from '@/lib/analytics/crm-insights-core';

export interface ResumeOutput {
  final_response: string | null;
  media_urls: string[];
  next_state: string | null;
}

/** Telefone a partir do conversation_id ({tenantId}:{phone}) ou de um fallback. */
export function derivePhoneFromConversationId(conversationId: string, fallback?: string): string {
  const idx = conversationId.indexOf(':');
  if (idx >= 0) return conversationId.slice(idx + 1);
  return fallback || '';
}

/** Reconstrói o histórico (mesma lógica do dispatchToAgent): conversa por clientPhone → mensagens. */
export async function loadConversationHistory(
  tenantId: string,
  clientPhone: string,
): Promise<Array<{ role: string; content: string }>> {
  const history: Array<{ role: string; content: string }> = [];
  try {
    const services = new TenantServiceFactory(tenantId);
    const convs = await services.conversations.getWhere('clientPhone', '==', clientPhone);
    const conv = convs[0];
    if (!conv?.id) return history;
    const all = await services.messages.getWhere('conversationId', '==', conv.id);
    // Ordena por createdAt (asc) em memória e pega as últimas 20 — evita exigir
    // índice composto e o tipo de orderBy do getMany.
    const recent = [...(all as Array<{ createdAt?: unknown; clientMessage?: string; sofiaMessage?: string }>)]
      .sort((a, b) => (toMillis(a.createdAt) ?? 0) - (toMillis(b.createdAt) ?? 0))
      .slice(-20);
    for (const m of recent) {
      if (m.clientMessage) history.push({ role: 'user', content: m.clientMessage });
      if (m.sofiaMessage) history.push({ role: 'assistant', content: m.sofiaMessage });
    }
  } catch (err) {
    logger.warn('[resume] failed to load history', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return history;
}

/** Chama o agente POST /resume e devolve a resposta de re-engajamento. */
export async function callAgentResume(args: {
  tenantId: string;
  conversationId: string;
  taskId: string;
  taskType: string;
  result: Record<string, unknown>;
  resumeHint?: string | null;
  history: Array<{ role: string; content: string }>;
}): Promise<ResumeOutput> {
  const agentUrl = process.env.AGENT_SERVICE_URL;
  const secret = process.env.AGENT_SHARED_SECRET;
  if (!agentUrl || !secret) throw new Error('AGENT_SERVICE_URL/AGENT_SHARED_SECRET not set');

  const payload = JSON.stringify({
    tenant_id: args.tenantId,
    conversation_id: args.conversationId,
    task_id: args.taskId,
    task_type: args.taskType,
    result: args.result,
    resume_hint: args.resumeHint ?? null,
    history: args.history,
  });
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.`, 'utf8').update(payload).digest('hex');

  const resp = await fetch(`${agentUrl}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Agent-Signature': sig, 'X-Agent-Timestamp': ts },
    body: payload,
    signal: AbortSignal.timeout(55_000),
  });
  if (!resp.ok) throw new Error(`/resume returned ${resp.status}`);
  const data = await resp.json();
  return {
    final_response: data.final_response ?? null,
    media_urls: data.media_urls ?? [],
    next_state: data.next_state ?? null,
  };
}

async function persistSofiaMessage(
  tenantId: string,
  clientPhone: string,
  message: string,
  mediaUrls: string[],
): Promise<void> {
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
      ...(mediaUrls.length > 0 && { sofiaMediaUrls: mediaUrls }),
    } as never);
    await svc.conversations.update(convId, {
      lastMessageAt: now,
      lastMessage: message.substring(0, 200),
      lastMessageFrom: 'sofia',
      updatedAt: now,
    } as never);
  } catch (err) {
    logger.warn('[resume] failed to persist message', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Aplica o resultado do /resume: idempotente, persiste + envia + transiciona estado
 * + marca a task resumida. Retorna false se foi um no-op (duplicado).
 */
export async function dispatchResume(args: {
  tenantId: string;
  conversationId: string;
  phone: string;
  taskId: string;
  finalResponse: string | null;
  mediaUrls: string[];
  nextState: ConversationState;
}): Promise<boolean> {
  // Idempotência contra reentrega (worker) ou duplo-clique (dono).
  try {
    const redis = getRedisClient();
    const res = await redis.set(`resume_done:${args.tenantId}:${args.taskId}`, '1', 'EX', 3600, 'NX');
    if (res === null) {
      logger.info('[resume] duplicate dispatch — no-op', { taskId: args.taskId });
      return false;
    }
  } catch {
    /* Redis indisponível: prossegue (melhor entregar do que estancar). */
  }

  if (args.finalResponse) {
    await persistSofiaMessage(args.tenantId, args.phone, args.finalResponse, args.mediaUrls);
    await sendWhatsAppText(args.tenantId, args.phone, args.finalResponse);
    if (args.mediaUrls.length > 0) {
      await sendWhatsAppMedia(args.tenantId, args.phone, args.mediaUrls);
    }
  }
  await setConversationState(args.tenantId, args.phone, args.nextState, { activeTaskId: null });
  await markTaskResumed(args.tenantId, args.taskId).catch(() => {});
  return true;
}
