/**
 * Enfileira uma task diferida no worker (Firebase Functions).
 *
 * v1: POST fire-and-forget HTTP para o worker (`DEFERRED_TASK_WORKER_URL`),
 * assinado com a mesma HMAC do agente (`AGENT_SHARED_SECRET`). O doc 08 fixa
 * Cloud Tasks como a evolução de produção (retry/backoff/OIDC); o contrato do
 * payload `{tenantId, conversationId, taskId}` é o mesmo nos dois caminhos.
 */
import crypto from 'crypto';
import { logger } from '@/lib/utils/logger';

export async function enqueueDeferredTask(args: {
  tenantId: string;
  conversationId: string;
  taskId: string;
}): Promise<void> {
  const workerUrl = process.env.DEFERRED_TASK_WORKER_URL;
  const secret = process.env.AGENT_SHARED_SECRET;
  if (!workerUrl || !secret) {
    logger.warn('⚠️ DEFERRED_TASK_WORKER_URL/AGENT_SHARED_SECRET ausentes — task criada mas NÃO enfileirada', {
      tenantId: args.tenantId?.substring(0, 8) + '***',
      taskId: args.taskId,
    });
    return;
  }
  const payload = JSON.stringify(args);
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.`, 'utf8').update(payload).digest('hex');

  // Fire-and-forget: não bloqueia a resposta do defer-task ao agente.
  void fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Signature': sig,
      'X-Agent-Timestamp': ts,
    },
    body: payload,
    signal: AbortSignal.timeout(10_000),
  }).catch((err) => {
    logger.warn('❌ Falha ao enfileirar deferred task', {
      error: err instanceof Error ? err.message : String(err),
      taskId: args.taskId,
    });
  });
}
