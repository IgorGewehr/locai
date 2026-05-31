import { NextRequest } from 'next/server';
import { handleAgentRequest } from '@/lib/agent/dispatch';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

/**
 * Agent tool: knowledge base search.
 *
 * Lightweight first version: substring matching across the tenant's
 * `policies`, `companyInfo` and FAQs. Replace with a real vector search
 * (lib/rag) when traffic warrants it.
 */

export async function POST(req: NextRequest) {
  return handleAgentRequest(req, {
    search: async (params, { tenantId }) => {
      if (!params.query) throw new Error('query required');
      const services = new TenantServiceFactory(tenantId);
      const settings = services.settings;
      // Settings service exposes tenantSettings — pull the policies + company info.
      const [policies, company] = await Promise.all([
        settings.getPolicies?.().catch(() => null),
        settings.getCompanyInfo?.().catch(() => null),
      ]);

      const docs: { source: string; text: string }[] = [];
      if (policies) {
        for (const [k, v] of Object.entries(policies)) {
          if (typeof v === 'string') docs.push({ source: `policy.${k}`, text: v });
        }
      }
      if (company) {
        for (const [k, v] of Object.entries(company)) {
          if (typeof v === 'string') docs.push({ source: `company.${k}`, text: v });
        }
      }
      const q = String(params.query).toLowerCase();
      const matched = docs
        .map((d) => ({ ...d, score: d.text.toLowerCase().includes(q) ? 1 : 0 }))
        .filter((d) => d.score > 0)
        .slice(0, params.k ?? 5);
      return { matches: matched };
    },
  });
}
