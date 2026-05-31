import { NextRequest } from 'next/server';
import { handleAgentRequest } from '@/lib/agent/dispatch';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

/**
 * Agent tool: client memory (rolling 1-line facts about the contact).
 *
 * Implementation: a short text appended to `clients/{id}.aiSummary`. We cap
 * to ~5 lines to keep token bounded; the agent never sees explicit facts —
 * just the concatenated summary.
 */

function _appendBoundedSummary(existing: string, line: string, max = 5): string {
  const lines = (existing || '').split('\n').filter(Boolean);
  lines.push(line);
  return lines.slice(-max).join('\n');
}

export async function POST(req: NextRequest) {
  return handleAgentRequest(req, {
    recall: async (params, { tenantId }) => {
      if (!params.clientId) throw new Error('clientId required');
      const services = new TenantServiceFactory(tenantId);
      const c: any = await services.clients.get(params.clientId);
      if (!c) return { aiSummary: '' };
      return { aiSummary: c.aiSummary || '' };
    },

    remember: async (params, { tenantId }) => {
      if (!params.clientId) throw new Error('clientId required');
      if (!params.text) throw new Error('text required');
      const date = new Date().toISOString().slice(0, 10);
      const services = new TenantServiceFactory(tenantId);
      const c: any = await services.clients.get(params.clientId);
      if (!c) throw new Error('Client not found');
      const next = _appendBoundedSummary(c.aiSummary || '', `${date}: ${params.text}`);
      await services.clients.update(params.clientId, { aiSummary: next } as any);
      return { aiSummary: next };
    },
  });
}
