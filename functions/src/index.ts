/**
 * Registro das Firebase Functions do Locai.
 * Fase 1: worker de tasks proativas (defer/resume). Próximas fases adicionam
 * webhooks de pagamento/contrato aqui (docs/blueprint/08).
 */
import { onRequest } from 'firebase-functions/v2/https';

export { taskWorker } from './tasks/taskWorker';
export { deferredTasksWatchdog } from './tasks/watchdog';

/** Health check — valida o pipeline de deploy (`firebase deploy --only functions`). */
export const health = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'locai-functions' });
});
