import { NextRequest } from 'next/server';
import { handleAgentRequest } from '@/lib/agent/dispatch';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

/**
 * Agent tool: CRM leads (operator/analyst use).
 *
 * Pipeline stages reflect the new business model:
 *   new → contacted → qualified → presentation → proposal → negotiation
 *       → closing → handed_off (WON, customer went to Airbnb to close)
 *       → lost
 *
 * The agent never marks a lead 'won' on its own — only 'handed_off' when it
 * has shared the Airbnb link AND the customer expressed intent to close.
 */

const ALLOWED_STAGES = new Set([
  'new', 'contacted', 'qualified', 'presentation', 'proposal',
  'negotiation', 'closing', 'handed_off', 'lost',
]);

export async function POST(req: NextRequest) {
  return handleAgentRequest(req, {
    list_leads: async (params, { tenantId }) => {
      const services = new TenantServiceFactory(tenantId);
      let items: any[] = await services.leads.getAll(500);
      if (params.stage) items = items.filter((l) => l.stage === params.stage);
      if (params.assignedTo) items = items.filter((l) => l.assignedTo === params.assignedTo);
      const limit = Math.max(1, Math.min(100, params.limit ?? 50));
      return { total: items.length, items: items.slice(0, limit) };
    },

    search_leads: async (params, { tenantId }) => {
      if (!params.query) throw new Error('query required');
      const services = new TenantServiceFactory(tenantId);
      const items: any[] = await services.leads.getAll(500);
      const q = String(params.query).toLowerCase();
      const matched = items.filter((l) => {
        const hay = `${l.name || ''} ${l.email || ''} ${l.phone || ''}`.toLowerCase();
        return hay.includes(q);
      });
      const limit = Math.max(1, Math.min(50, params.limit ?? 10));
      return { total: matched.length, items: matched.slice(0, limit) };
    },

    update_lead_stage: async (params, { tenantId }) => {
      if (!params.id) throw new Error('id required');
      if (!ALLOWED_STAGES.has(params.stage)) {
        throw new Error(`Invalid stage: ${params.stage}`);
      }
      const services = new TenantServiceFactory(tenantId);
      await services.leads.update(params.id, {
        stage: params.stage,
        notes: params.notes || undefined,
      } as any);
      return { id: params.id, stage: params.stage };
    },
  });
}
