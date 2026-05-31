import { NextRequest } from 'next/server';
import { handleAgentRequest } from '@/lib/agent/dispatch';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

/**
 * Daily-spend gate. `check` returns whether the tenant can run more agent
 * calls today; `record` accumulates the cost of a finished run so the cap
 * can actually fire.
 *
 * Spend is tracked per UTC day at
 * tenants/{tenantId}/agent_budget/{YYYY-MM-DD}. A `cap` of 0 means "no cap"
 * (always allowed) — set a real cap there to enforce a hard daily limit.
 */

const DAY_KEY = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

async function readBudget(tenantId: string) {
  const services = new TenantServiceFactory(tenantId);
  const day = DAY_KEY();
  const doc = (await services.createService('agent_budget').get(day)) as any;
  const usdToday = Number(doc?.usdToday ?? 0);
  const cap = Number(doc?.cap ?? 0);
  return { day, services, usdToday, cap };
}

export async function POST(req: NextRequest) {
  return handleAgentRequest(req, {
    check: async (_params, { tenantId }) => {
      const { usdToday, cap } = await readBudget(tenantId);
      const allowed = cap <= 0 || usdToday < cap;
      return { allowed, usdToday, cap };
    },

    record: async (params, { tenantId }) => {
      const cost = Number(params?.cost_usd ?? 0);
      const tokens = Number(params?.tokens ?? 0);
      const { day, services, usdToday, cap } = await readBudget(tenantId);
      const usdNext = Math.round((usdToday + (Number.isFinite(cost) ? cost : 0)) * 1e6) / 1e6;

      const svc = services.createService('agent_budget');
      const existing = await svc.get(day);
      if (existing) {
        await svc.update(day, { usdToday: usdNext, updatedAt: new Date().toISOString() } as any);
      } else {
        await svc.create({
          id: day,
          usdToday: usdNext,
          cap,
          updatedAt: new Date().toISOString(),
        } as any);
      }

      return { usdToday: usdNext, cap, tokens };
    },
  });
}
