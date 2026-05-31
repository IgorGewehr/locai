/**
 * Helper to dispatch an action-style payload from the locai/agent.
 *
 * The Python client always POSTs `{ action: string, params: object }` to a
 * tool endpoint. Each route handler defines a map of action → handler and
 * uses `dispatch` to route + return the standardized envelope.
 */

import { NextRequest } from 'next/server';
import { verifyAgentInbound, agentOk, agentErr } from './hmac';

type Handler = (params: any, ctx: { tenantId: string }) => Promise<any>;

export async function handleAgentRequest(
  req: NextRequest,
  actions: Record<string, Handler>
) {
  const auth = await verifyAgentInbound(req);
  if (!auth.ok) return agentErr(auth.reason, auth.status);

  let parsed: { action?: string; params?: any };
  try {
    parsed = JSON.parse(auth.rawBody);
  } catch {
    return agentErr('Invalid JSON body', 400);
  }
  const action = parsed.action;
  const params = parsed.params || {};
  if (!action) return agentErr('Missing action', 400);
  const handler = actions[action];
  if (!handler) return agentErr(`Unknown action: ${action}`, 400);

  try {
    const data = await handler(params, { tenantId: auth.tenantId });
    return agentOk(data);
  } catch (err: any) {
    return agentErr(err?.message || 'Internal error', 500);
  }
}
