/**
 * Worker de tasks proativas (1º código de Functions — docs/blueprint/08 §2.1).
 *
 * Disparado por HTTP (v1: o `defer-task` do locai faz POST assinado; a evolução
 * de produção é Cloud Tasks com OIDC, doc 08 §4). Fluxo:
 *   1. verifica HMAC
 *   2. claimOnce(taskId) — queued→running atômico (idempotente vs reentrega)
 *   3. executa a task conforme taskType
 *   4. markDone(result)
 *   5. chama o agente /resume → repassa ao locai /resume-dispatch (envia + transiciona estado)
 * Se algo falhar, faz um /resume-dispatch de FALLBACK para não estancar a conversa
 * em IA_TRABALHANDO.
 */
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { verify } from '../lib/hmac';
import { claimOnce, markDone, markFailed, loadHistory } from '../lib/admin';
import { callResume, callResumeDispatch, callSearchProperties, callOwnerNotify } from '../lib/http';

const FALLBACK_MESSAGE =
  'Desculpa, demorei mais que o esperado aqui. Me dá só mais um instante que eu já te retorno!';

function env(name: string): string {
  return process.env[name] || '';
}

function derivePhone(conversationId: string, fallback: string): string {
  const idx = conversationId.indexOf(':');
  return idx >= 0 ? conversationId.slice(idx + 1) : fallback;
}

export const taskWorker = onRequest(
  { timeoutSeconds: 120, memory: '512MiB', maxInstances: 10, region: 'southamerica-east1' },
  async (req, res) => {
    const secret = env('AGENT_SHARED_SECRET');
    const agentUrl = env('AGENT_SERVICE_URL');
    const locaiUrl = env('LOCAI_API_URL');

    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body ?? {});
    if (!verify(secret, rawBody, req.get('X-Agent-Signature'), req.get('X-Agent-Timestamp'))) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    let tenantId = '';
    let conversationId = '';
    let taskId = '';
    try {
      const parsed = JSON.parse(rawBody) as { tenantId: string; conversationId: string; taskId: string };
      tenantId = parsed.tenantId;
      conversationId = parsed.conversationId;
      taskId = parsed.taskId;
    } catch {
      res.status(400).json({ error: 'invalid body' });
      return;
    }
    if (!tenantId || !conversationId || !taskId) {
      res.status(400).json({ error: 'missing fields' });
      return;
    }

    // 2. Claim atômico — reentrega vira no-op
    const task = await claimOnce(tenantId, taskId);
    if (!task) {
      logger.info('[taskWorker] skip — task inexistente ou já reivindicada', { taskId });
      res.status(200).json({ ok: true, skipped: true });
      return;
    }

    const rawPhone = derivePhone(conversationId, task.clientPhone);

    // ask_owner: NÃO roda LLM nem resume agora. Alerta o dono e deixa a task
    // 'running' aguardando a resposta — que chega por /api/agent/owner-answer e
    // dispara o /resume. (Sem timeout de execução; o watchdog cobre o caso de
    // nunca ser respondida.) Ver docs/blueprint/06 §6.1.
    if (task.taskType === 'ask_owner') {
      const question = String(
        (task.payload?.question as string) || task.clientMessage || 'Pergunta do atendimento',
      );
      try {
        await callOwnerNotify(locaiUrl, secret, {
          tenant_id: tenantId,
          conversation_id: conversationId,
          task_id: taskId,
          question,
          client_phone: rawPhone,
        });
        res.status(200).json({ ok: true, awaiting: 'owner' });
      } catch (e) {
        logger.error('[taskWorker] owner-notify falhou — destravando conversa', {
          taskId,
          error: e instanceof Error ? e.message : String(e),
        });
        await markFailed(tenantId, taskId, e instanceof Error ? e.message : String(e));
        await callResumeDispatch(locaiUrl, secret, {
          tenant_id: tenantId,
          conversation_id: conversationId,
          task_id: taskId,
          final_response: FALLBACK_MESSAGE,
          media_urls: [],
          next_state: 'ATIVA',
        }).catch(() => {});
        res.status(500).json({ ok: false });
      }
      return;
    }

    // 3. Executa a task
    let result: Record<string, unknown>;
    try {
      if (task.taskType === 'property_research') {
        const criteria = (task.payload?.criteria as Record<string, unknown>) || task.payload || {};
        result = await callSearchProperties(locaiUrl, secret, tenantId, criteria);
      } else {
        // ask_owner depende do canal IA↔Dono (doc 06) e closing_prep do doc 02;
        // até lá, devolvemos um resultado gracioso para a Sofia retomar sem estancar.
        result = { handled: false, taskType: task.taskType, note: 'worker específico ainda não implementado' };
      }
      await markDone(tenantId, taskId, result);
    } catch (e) {
      result = { found: false, reason: 'error' };
      await markFailed(tenantId, taskId, e instanceof Error ? e.message : String(e));
    }

    // 4+5. Resume + dispatch (com fallback que nunca deixa a conversa presa)
    try {
      const history = await loadHistory(tenantId, rawPhone);
      const resume = await callResume(agentUrl, secret, {
        tenant_id: tenantId,
        conversation_id: conversationId,
        task_id: taskId,
        task_type: task.taskType,
        result,
        resume_hint: task.resumeHint,
        history,
      });
      await callResumeDispatch(locaiUrl, secret, {
        tenant_id: tenantId,
        conversation_id: conversationId,
        task_id: taskId,
        final_response: resume.final_response,
        media_urls: resume.media_urls || [],
        next_state: resume.next_state || 'ATIVA',
      });
      res.status(200).json({ ok: true });
    } catch (e) {
      logger.error('[taskWorker] resume falhou — dispatch de fallback', {
        taskId,
        error: e instanceof Error ? e.message : String(e),
      });
      await callResumeDispatch(locaiUrl, secret, {
        tenant_id: tenantId,
        conversation_id: conversationId,
        task_id: taskId,
        final_response: FALLBACK_MESSAGE,
        media_urls: [],
        next_state: 'ATIVA',
      }).catch(() => {});
      res.status(500).json({ ok: false });
    }
  },
);
