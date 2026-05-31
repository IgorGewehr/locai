/**
 * HMAC verification for inbound calls from the locai/agent (Python) service.
 *
 * Mirrors the auth scheme implemented in locai/agent/app/auth.py:
 *   message    = `${timestamp_ms}.${tenantId}.${rawBody}`
 *   signature  = hex(HMAC-SHA256(AGENT_SHARED_SECRET, message))
 *
 * Headers expected on every request:
 *   x-agent-signature   — hex digest
 *   x-agent-timestamp   — ms since epoch (string)
 *   x-tenant-id         — tenant scoping all reads/writes
 *
 * Tolerates ±5min skew. Replay protection is best-effort (in-memory TTL
 * cache per Node process). The Python side has its own replay cache.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const MAX_SKEW_MS = 5 * 60 * 1000;
const NONCE_TTL_MS = MAX_SKEW_MS + 60 * 1000;
const NONCE_MAX_ENTRIES = 10_000;

const _seenNonces = new Map<string, number>();

function _evictNonces(now: number) {
  for (const [k, exp] of _seenNonces) {
    if (exp <= now) _seenNonces.delete(k);
  }
  if (_seenNonces.size > NONCE_MAX_ENTRIES) {
    const sorted = [...(_seenNonces.entries() as any)].sort((a, b) => a[1] - b[1]);
    const drop = Math.max(1, Math.floor(sorted.length / 5));
    for (let i = 0; i < drop; i++) _seenNonces.delete(sorted[i][0]);
  }
}

export interface AgentAuthOk {
  ok: true;
  tenantId: string;
  rawBody: string;
}
export interface AgentAuthErr {
  ok: false;
  status: number;
  reason: string;
}
export type AgentAuthResult = AgentAuthOk | AgentAuthErr;

export async function verifyAgentInbound(req: NextRequest): Promise<AgentAuthResult> {
  const sig = req.headers.get('x-agent-signature');
  const tsHeader = req.headers.get('x-agent-timestamp');
  const tenantId = req.headers.get('x-tenant-id');

  if (!sig || !tsHeader || !tenantId) {
    return { ok: false, status: 401, reason: 'Missing signature headers' };
  }

  const ts = Number(tsHeader);
  if (!Number.isFinite(ts)) {
    return { ok: false, status: 401, reason: 'Invalid timestamp header' };
  }
  const now = Date.now();
  if (Math.abs(now - ts) > MAX_SKEW_MS) {
    return { ok: false, status: 401, reason: 'Timestamp skew exceeds window' };
  }

  const secret = process.env.AGENT_SHARED_SECRET;
  if (!secret) {
    return { ok: false, status: 500, reason: 'AGENT_SHARED_SECRET not configured' };
  }

  const rawBody = await req.text();
  const message = `${ts}.${tenantId}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex');

  // Length-mismatched timingSafeEqual throws — bail safely.
  let valid = false;
  try {
    valid = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    valid = false;
  }
  if (!valid) {
    return { ok: false, status: 401, reason: 'Invalid signature' };
  }

  // Replay cache (per-process best-effort)
  const nonceKey = crypto.createHash('sha256').update(sig).digest('hex');
  const existing = _seenNonces.get(nonceKey);
  if (existing && existing > now) {
    return { ok: false, status: 409, reason: 'Replay detected' };
  }
  _seenNonces.set(nonceKey, now + NONCE_TTL_MS);
  if (_seenNonces.size > NONCE_MAX_ENTRIES) _evictNonces(now);

  return { ok: true, tenantId, rawBody };
}

/**
 * Standard JSON envelope for agent tool responses. The Python client expects
 * `{ ok: true, data }` on success and `{ ok: false, error }` on failure.
 */
export function agentOk<T>(data: T) {
  return NextResponse.json({ ok: true, data });
}
export function agentErr(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
