/**
 * Conversation state machine — Fase 1 do blueprint (docs/blueprint/01).
 *
 * `state` é o campo NOVO de roteamento da conversa (quem fala: IA, humano, ou
 * ninguém). É um SUPERSET do takeover manual já existente (`ai-block.ts`): a flag
 * `ai_blocked` continua sendo a fonte autoritativa do estado `MANUAL`, de modo que
 * o comportamento de takeover de hoje é preservado bit a bit.
 *
 * Fonte de verdade durável: Firestore `conversations/{id}.state`.
 * Cache quente de roteamento: Redis `conv_state:{tenantId}:{normalizedPhone}` (TTL).
 *
 * Toda escrita de `state` passa por `setConversationState()`. Ninguém escreve o
 * campo direto. Ver `00-overview.md §4.1` e `01-agente-proativo-stateful.md §2`.
 */
import { getRedisClient } from '@/lib/redis/client';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { aiBlockKey, isAiBlocked, normalizeBlockPhone } from '@/lib/utils/ai-block';

export type ConversationState =
  | 'ATIVA'
  | 'IA_TRABALHANDO'
  | 'AGUARDANDO_HUMANO'
  | 'MANUAL'
  | 'FECHAMENTO'
  | 'ENCERRADA';

const ALL_STATES: readonly ConversationState[] = [
  'ATIVA',
  'IA_TRABALHANDO',
  'AGUARDANDO_HUMANO',
  'MANUAL',
  'FECHAMENTO',
  'ENCERRADA',
];

// Cache quente; o webhook sempre tem fallback no Firestore, então o TTL só
// controla quão cedo voltamos a pagar uma leitura do Firestore.
const STATE_TTL_SECONDS = 6 * 60 * 60;

function convStateKey(tenantId: string, phone: string): string {
  return `conv_state:${tenantId}:${normalizeBlockPhone(phone)}`;
}

function isConversationState(v: unknown): v is ConversationState {
  return typeof v === 'string' && (ALL_STATES as readonly string[]).includes(v);
}

export interface ConversationStatePatch {
  activeTaskId?: string | null;
  closingMode?: 'ia' | 'owner' | null;
  ownerAlertedAt?: Date | null;
}

/**
 * Transição de estado. Escreve no Firestore (fonte de verdade) e no Redis (cache),
 * e sincroniza a flag `ai_blocked` quando entra em `MANUAL`.
 *
 * `phone` é bruto; a chave Redis é normalizada internamente. O documento de
 * conversa é localizado por `clientPhone` (mesmo critério do webhook).
 *
 * Não há transação distribuída Firestore↔Redis: o Firestore é a fonte durável e o
 * Redis é best-effort com TTL + fallback. Por segurança NÃO limpamos `ai_blocked`
 * em transições que saem de `MANUAL` — o desbloqueio é uma ação explícita do
 * operador (rota `/api/ai/block-conversation`), preservando o controle humano.
 */
export async function setConversationState(
  tenantId: string,
  phone: string,
  next: ConversationState,
  patch?: ConversationStatePatch,
): Promise<void> {
  // 1. Firestore — fonte de verdade durável
  try {
    const services = new TenantServiceFactory(tenantId);
    const convs = await services.conversations.getWhere('clientPhone', '==', phone);
    const conv = convs[0];
    if (conv?.id) {
      const update: Record<string, unknown> = { state: next, stateUpdatedAt: new Date() };
      if (patch?.activeTaskId !== undefined) update.activeTaskId = patch.activeTaskId;
      if (patch?.closingMode !== undefined) update.closingMode = patch.closingMode;
      if (patch?.ownerAlertedAt !== undefined) update.ownerAlertedAt = patch.ownerAlertedAt;
      await services.conversations.update(conv.id, update as never);
    } else {
      logger.warn('[conv-state] conversation not found — state set in Redis only', {
        tenantId: tenantId?.substring(0, 8) + '***',
        next,
      });
    }
  } catch (err) {
    logger.warn('[conv-state] Firestore state update failed (continuing with Redis)', {
      error: err instanceof Error ? err.message : String(err),
      tenantId: tenantId?.substring(0, 8) + '***',
    });
  }

  // 2. Redis — cache quente + 3. sincroniza ai_blocked ao entrar em MANUAL
  try {
    const redis = getRedisClient();
    await redis.set(convStateKey(tenantId, phone), next, 'EX', STATE_TTL_SECONDS);
    if (next === 'MANUAL') {
      await redis.set(aiBlockKey(tenantId, phone), 'true');
    }
  } catch (err) {
    logger.warn('[conv-state] Redis state set failed', {
      error: err instanceof Error ? err.message : String(err),
      tenantId: tenantId?.substring(0, 8) + '***',
    });
  }
}

/**
 * Lê o estado de roteamento. Ordem: flag de takeover (`MANUAL` autoritativo) →
 * cache Redis → Firestore → default `ATIVA`. Garante que enquanto o operador
 * tiver bloqueado a IA, o estado é sempre `MANUAL` (comportamento de hoje).
 */
export async function getConversationState(
  tenantId: string,
  phone: string,
): Promise<ConversationState> {
  // 1. Takeover manual é autoritativo
  try {
    if (await isAiBlocked(tenantId, phone)) return 'MANUAL';
  } catch {
    /* fall through */
  }

  // 2. Cache quente
  try {
    const redis = getRedisClient();
    const cached = await redis.get(convStateKey(tenantId, phone));
    if (isConversationState(cached)) return cached;
  } catch {
    /* fall through */
  }

  // 3. Fallback Firestore
  try {
    const services = new TenantServiceFactory(tenantId);
    const convs = await services.conversations.getWhere('clientPhone', '==', phone);
    const s = (convs[0] as { state?: unknown } | undefined)?.state;
    if (isConversationState(s)) return s;
  } catch {
    /* fall through */
  }

  // 4. Default
  return 'ATIVA';
}
