/**
 * Owner answer — o dono responde a um `ask_owner` (pelo dashboard, autenticado).
 *
 * Fecha o loop do ask_owner: grava a resposta como result da task, chama o agente
 * `/resume` (Sofia re-engaja o cliente com a info do dono) e despacha (envia +
 * transiciona estado), idempotente. Ver docs/blueprint/06 §6.1.
 *
 * NOTA: a UI para o dono digitar a resposta (lista de perguntas pendentes) é o
 * complemento de front a fazer; este endpoint é o backend pronto para ela.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';
import { getDeferredTask, markTaskDone } from '@/lib/conversation/deferred-tasks';
import {
  callAgentResume,
  dispatchResume,
  derivePhoneFromConversationId,
  loadConversationHistory,
} from '@/lib/conversation/resume';
import type { ConversationState } from '@/lib/conversation/state';

const Schema = z.object({
  task_id: z.string().min(1),
  answer: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const tenantId = auth.tenantId;

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.issues }, { status: 400 });
    }
    const { task_id, answer } = parsed.data;

    const task = await getDeferredTask(tenantId, task_id);
    if (!task) {
      return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 });
    }
    if (task.taskType !== 'ask_owner') {
      return NextResponse.json({ error: 'Task não é do tipo ask_owner' }, { status: 400 });
    }
    if (task.status !== 'running' && task.status !== 'queued') {
      return NextResponse.json({ error: `Task já ${task.status}`, status: task.status }, { status: 409 });
    }

    // 1. Resposta do dono vira o resultado da task
    const result = { owner_answer: answer, answered: true };
    await markTaskDone(tenantId, task_id, result);

    // 2. Sofia re-engaja o cliente com a info do dono
    const phone = derivePhoneFromConversationId(task.conversationId, task.clientPhone);
    const history = await loadConversationHistory(tenantId, phone);
    const resume = await callAgentResume({
      tenantId,
      conversationId: task.conversationId,
      taskId: task_id,
      taskType: 'ask_owner',
      result,
      resumeHint: task.resumeHint,
      history,
    });

    // 3. Despacha (idempotente) + transiciona estado
    await dispatchResume({
      tenantId,
      conversationId: task.conversationId,
      phone,
      taskId: task_id,
      finalResponse: resume.final_response,
      mediaUrls: resume.media_urls,
      nextState: ((resume.next_state as ConversationState) || 'ATIVA'),
    });

    // 4. Marca o alerta como resolvido (best-effort)
    try {
      const alerts = new TenantServiceFactory(tenantId).createService<{ id?: string; status?: string }>('owner_alerts');
      const open = await alerts.getWhere('taskId', '==', task_id);
      for (const a of open as Array<{ id?: string }>) {
        if (a.id) await alerts.update(a.id, { status: 'resolved', resolvedAt: new Date() } as never);
      }
    } catch {
      /* best-effort */
    }

    logger.info('[owner-answer] ask_owner respondido e cliente re-engajado', {
      tenantId: tenantId.substring(0, 8) + '***',
      taskId: task_id,
    });
    return NextResponse.json({ ok: true, reply: resume.final_response });
  } catch (error) {
    logger.error('[owner-answer] error', error instanceof Error ? error : new Error(String(error)));
    return handleApiError(error);
  }
}
