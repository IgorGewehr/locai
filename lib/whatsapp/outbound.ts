/**
 * Saída de WhatsApp via microserviço Baileys — orquestrador único de envio.
 *
 * Centraliza as chamadas a `POST {WHATSAPP_MICROSERVICE_URL}/api/v1/messages/{tenantId}/send`
 * que antes estavam inline no webhook. Reusado pelo `dispatchToAgent` (resposta
 * reativa da Sofia) e, na Fase 1, pelo fluxo `/resume` (re-engajamento proativo).
 * Ver `docs/blueprint/01-agente-proativo-stateful.md §4`.
 */
import { logger } from '@/lib/utils/logger';

const SEND_TIMEOUT_MS = 10_000;
const MAX_MEDIA = 5;
const VIDEO_RE = /\.(mp4|mov|avi|webm)/i;

function microserviceConfig(): { url: string; apiKey: string } | null {
  const url = process.env.WHATSAPP_MICROSERVICE_URL;
  const apiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY;
  if (!url || !apiKey) {
    logger.warn('⚠️ WHATSAPP_MICROSERVICE_URL/API_KEY ausentes — envio ignorado');
    return null;
  }
  return { url, apiKey };
}

async function postSend(tenantId: string, body: Record<string, unknown>): Promise<void> {
  const cfg = microserviceConfig();
  if (!cfg) return;
  await fetch(`${cfg.url}/api/v1/messages/${tenantId}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
}

/** Envia uma mensagem de texto ao cliente. */
export async function sendWhatsAppText(tenantId: string, to: string, message: string): Promise<void> {
  if (!to || !message) return;
  await postSend(tenantId, { to, message });
}

/**
 * Envia até 5 mídias (imagem/vídeo, detectado pela extensão da URL).
 * Erros por mídia são logados e não interrompem as demais.
 */
export async function sendWhatsAppMedia(tenantId: string, to: string, urls: string[]): Promise<void> {
  if (!to || !urls?.length) return;
  for (const url of urls.slice(0, MAX_MEDIA)) {
    try {
      await postSend(tenantId, { to, type: VIDEO_RE.test(url) ? 'video' : 'image', url });
    } catch (err) {
      logger.warn('⚠️ Falha ao enviar mídia', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
