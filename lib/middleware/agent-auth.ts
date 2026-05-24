/**
 * Authenticate requests from the Python agent (HMAC or bearer token).
 * Returns the parsed body along with auth result (body consumed once here).
 */
import crypto from 'crypto'
import { NextRequest } from 'next/server'

interface AgentAuthResult {
  authenticated: boolean
  tenantId: string
  body: Record<string, unknown>
}

export async function validateAgentRequest(request: NextRequest): Promise<AgentAuthResult> {
  const secret = process.env.AGENT_SHARED_SECRET
  if (!secret) {
    return { authenticated: false, tenantId: '', body: {} }
  }

  const rawBody = await request.text()
  let body: Record<string, unknown> = {}
  try { body = JSON.parse(rawBody) } catch { /* empty body */ }

  const tenantId = (body.tenant_id as string) || ''

  // Bearer token (dev / simple path)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === secret) {
    return { authenticated: true, tenantId, body }
  }

  // HMAC signature
  const sig = request.headers.get('X-Agent-Signature')
  const ts = request.headers.get('X-Agent-Timestamp')
  if (!sig || !ts) return { authenticated: false, tenantId, body }

  // Reject stale requests (>60s)
  if (Math.abs(Date.now() - Number(ts)) > 60_000) {
    return { authenticated: false, tenantId, body }
  }

  const expected = crypto.createHmac('sha256', secret).update(`${ts}.`, 'utf8').update(rawBody).digest('hex')
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return { authenticated: false, tenantId, body }
  }

  return { authenticated: true, tenantId, body }
}
