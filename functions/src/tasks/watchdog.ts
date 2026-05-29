/**
 * Watchdog de tasks órfãs (docs/blueprint/01 §6.2, 08).
 *
 * Uma conversa pode ficar presa em IA_TRABALHANDO se o worker morrer antes de
 * chamar /resume, ou se um `ask_owner` nunca for respondido. Este cron varre as
 * `deferred_tasks` ainda abertas e, passado o limite, marca `failed` e força um
 * resume-dispatch de fallback (estado → ATIVA) para destravar o cliente.
 *
 * Idempotente: o resume-dispatch usa o gate `resume_done:{tenantId}:{taskId}`,
 * então se o worker e o watchdog correrem juntos, só um efetiva.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { db, toMillis } from '../lib/admin';
import { callResumeDispatch, callOwnerReping } from '../lib/http';

const PROPERTY_MAX_MS = 5 * 60 * 1000; // property_research/closing_prep/other em curso > 5min = órfã
const ASK_OWNER_MAX_MS = 12 * 60 * 60 * 1000; // ask_owner sem resposta > 12h = desiste graciosamente
const SCAN_LIMIT = 200;

const FALLBACK_MESSAGE =
  'Oi! Acho que me embolei aqui e não consegui finalizar o que ia te mostrar. Pode me lembrar o que você procurava? Quero te ajudar direitinho.';

function env(name: string): string {
  return process.env[name] || '';
}

export const deferredTasksWatchdog = onSchedule(
  { schedule: 'every 5 minutes', region: 'southamerica-east1', timeoutSeconds: 120 },
  async () => {
    const secret = env('AGENT_SHARED_SECRET');
    const locaiUrl = env('LOCAI_API_URL');
    const now = Date.now();

    // collectionGroup pega deferred_tasks de todos os tenants; tenantId vem do path.
    const snap = await db
      .collectionGroup('deferred_tasks')
      .where('status', 'in', ['queued', 'running'])
      .limit(SCAN_LIMIT)
      .get();

    let rescued = 0;
    for (const doc of snap.docs) {
      const t = doc.data() as {
        taskType?: string;
        conversationId?: string;
        taskId?: string;
        startedAt?: unknown;
        createdAt?: unknown;
      };
      const tenantId = doc.ref.path.split('/')[1];
      const startedMs = toMillis(t.startedAt) ?? toMillis(t.createdAt) ?? now;
      const maxMs = t.taskType === 'ask_owner' ? ASK_OWNER_MAX_MS : PROPERTY_MAX_MS;
      if (now - startedMs < maxMs) continue;

      try {
        await doc.ref.update({ status: 'failed', error: 'watchdog timeout', finishedAt: new Date() });
        await callResumeDispatch(locaiUrl, secret, {
          tenant_id: tenantId,
          conversation_id: t.conversationId || '',
          task_id: t.taskId || doc.id,
          final_response: FALLBACK_MESSAGE,
          media_urls: [],
          next_state: 'ATIVA',
        });
        rescued++;
      } catch (e) {
        logger.error('[watchdog] falha ao destravar task', {
          taskId: t.taskId || doc.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (rescued > 0) logger.info('[watchdog] tasks órfãs destravadas', { rescued, scanned: snap.size });

    // Re-ping de owner_alerts ainda 'sent' (dono não atendeu). O locai decide se
    // re-alerta, reconhece (humano assumiu) ou desiste (maxRepings).
    const REPING_AFTER_MS = 6 * 60 * 1000;
    try {
      const alerts = await db
        .collectionGroup('owner_alerts')
        .where('status', '==', 'sent')
        .limit(SCAN_LIMIT)
        .get();
      let repinged = 0;
      for (const doc of alerts.docs) {
        const a = doc.data() as { lastRepingAt?: unknown; createdAt?: unknown };
        const tenantId = doc.ref.path.split('/')[1];
        const lastMs = toMillis(a.lastRepingAt) ?? toMillis(a.createdAt) ?? now;
        if (now - lastMs < REPING_AFTER_MS) continue;
        await callOwnerReping(locaiUrl, secret, { tenant_id: tenantId, alert_id: doc.id }).catch(() => {});
        repinged++;
      }
      if (repinged > 0) logger.info('[watchdog] owner_alerts re-pingados', { repinged });
    } catch (e) {
      logger.error('[watchdog] falha no scan de owner_alerts', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
);
