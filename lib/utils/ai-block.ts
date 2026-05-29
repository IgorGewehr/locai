/**
 * AI conversation block (manual-takeover) helpers.
 *
 * When an operator takes over a conversation, we set a Redis flag so the AI agent
 * stops auto-replying for that phone. The key/normalization here is the single
 * source of truth shared by:
 *   - app/api/ai/block-conversation/route.ts        (set/clear/read the flag)
 *   - app/api/webhook/whatsapp-microservice/route.ts (skip agent when blocked)
 *
 * Keep all reads/writes going through these helpers so the key format and phone
 * normalization can never drift between the writer and the reader.
 */
import { getRedisClient } from '@/lib/redis/client';

/**
 * Normalize a phone to the canonical form used for block keys:
 * strip WhatsApp JID suffixes (@c.us, @lid, @g.us, @s.whatsapp.net) and ensure
 * the Brazilian country code (55) prefix.
 */
export function normalizeBlockPhone(phone: string): string {
  let normalized = phone.replace(/@(c\.us|lid|g\.us|s\.whatsapp\.net)$/i, '');
  if (!normalized.startsWith('55')) {
    normalized = '55' + normalized;
  }
  return normalized;
}

/** Redis key for the AI-block flag of a given tenant + phone. */
export function aiBlockKey(tenantId: string, phone: string): string {
  return `ai_blocked:${tenantId}:${normalizeBlockPhone(phone)}`;
}

/**
 * Returns true if the AI agent is currently blocked (manual mode) for this
 * conversation. Fails open (returns false) — callers treat an unavailable Redis
 * as "not blocked" so customers are never left without a reply.
 */
export async function isAiBlocked(tenantId: string, phone: string): Promise<boolean> {
  const redis = getRedisClient();
  const value = await redis.get(aiBlockKey(tenantId, phone));
  return value === 'true';
}
