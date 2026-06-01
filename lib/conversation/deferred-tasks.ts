/**
 * Tasks diferidas do agente proativo — camada de dados (Fase 1 do blueprint).
 *
 * Quando a Sofia diz "espera um segundinho", uma task é criada aqui com
 * `status: 'queued'`; um worker (Firebase Functions, próximo incremento) a
 * executa e chama o `/resume` do agente. Modelo canônico em
 * `docs/blueprint/00-overview.md §4.3`.
 *
 * NOTA: este módulo é a camada de dados (lado locai). Ele só passa a ser
 * exercitado quando a rota `/api/agent/tools/defer-task` e o worker existirem —
 * até lá nenhuma conversa entra em `IA_TRABALHANDO`, então nada fica "preso".
 */
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { normalizeBlockPhone } from '@/lib/utils/ai-block';

export type DeferredTaskType = 'property_research' | 'ask_owner' | 'closing_prep' | 'other';
export type DeferredTaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

export interface DeferredTask {
  id?: string;
  taskId: string;
  conversationId: string;
  clientPhone: string; // normalizado
  taskType: DeferredTaskType;
  status: DeferredTaskStatus;
  payload: Record<string, unknown>;
  clientMessage: string; // a frase "espera um segundinho" já enviada ao cliente
  resumeHint: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  originMessageId: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  resumedAt: Date | null;
}

const COLLECTION = 'deferred_tasks';

function svc(tenantId: string) {
  return new TenantServiceFactory(tenantId).createService<DeferredTask>(COLLECTION);
}

export interface CreateDeferredTaskInput {
  conversationId: string;
  clientPhone: string;
  taskType: DeferredTaskType;
  clientMessage: string;
  payload?: Record<string, unknown>;
  resumeHint?: string | null;
  originMessageId?: string | null;
}

/**
 * Cria uma task diferida. Idempotente por `(conversationId, originMessageId)`:
 * se já existe uma task para o mesmo evento de origem, retorna-a em vez de
 * duplicar (evita re-trabalho quando o webhook reentrega).
 */
export async function createDeferredTask(
  tenantId: string,
  input: CreateDeferredTaskInput,
): Promise<DeferredTask> {
  const service = svc(tenantId);

  if (input.originMessageId) {
    try {
      const existing = await service.getWhere('originMessageId', '==', input.originMessageId);
      const match = existing.find((t) => t.conversationId === input.conversationId);
      if (match?.id) {
        logger.info('[deferred-task] idempotent hit — reusing task', {
          tenantId: tenantId?.substring(0, 8) + '***',
          taskId: match.id,
        });
        return { ...match, taskId: match.taskId || match.id };
      }
    } catch {
      /* sem índice/sem match — segue criando */
    }
  }

  const now = new Date();
  const data: DeferredTask = {
    taskId: '',
    conversationId: input.conversationId,
    clientPhone: normalizeBlockPhone(input.clientPhone),
    taskType: input.taskType,
    status: 'queued',
    payload: input.payload ?? {},
    clientMessage: input.clientMessage,
    resumeHint: input.resumeHint ?? null,
    result: null,
    error: null,
    attempts: 0,
    originMessageId: input.originMessageId ?? null,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    resumedAt: null,
  };

  const id = await service.create(data as never);
  await service.update(id, { taskId: id } as never);
  return { ...data, id, taskId: id };
}

export async function getDeferredTask(tenantId: string, taskId: string): Promise<DeferredTask | null> {
  return (await svc(tenantId).get(taskId)) as DeferredTask | null;
}

export async function markTaskRunning(tenantId: string, taskId: string): Promise<void> {
  await svc(tenantId).update(taskId, { status: 'running', startedAt: new Date() } as never);
}

export async function markTaskDone(
  tenantId: string,
  taskId: string,
  result: Record<string, unknown>,
): Promise<void> {
  await svc(tenantId).update(taskId, { status: 'done', result, finishedAt: new Date() } as never);
}

export async function markTaskFailed(tenantId: string, taskId: string, error: string): Promise<void> {
  await svc(tenantId).update(taskId, { status: 'failed', error, finishedAt: new Date() } as never);
}

export async function markTaskResumed(tenantId: string, taskId: string): Promise<void> {
  await svc(tenantId).update(taskId, { resumedAt: new Date() } as never);
}
