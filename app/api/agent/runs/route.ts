import { NextRequest } from 'next/server';
import { handleAgentRequest } from '@/lib/agent/dispatch';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

/**
 * Sink for agentRuns telemetry posted by the Python agent.
 * Stored under tenants/{tenantId}/agent_runs/{runId}.
 */

export async function POST(req: NextRequest) {
  return handleAgentRequest(req, {
    // The Python side POSTs the raw run object as the body — no `action` field.
    // To stay compatible with the dispatch contract we accept either the
    // dispatch-shaped body (action='persist') OR fall back to treating the
    // entire payload as the run.
    persist: async (params, { tenantId }) => {
      const services = new TenantServiceFactory(tenantId);
      const runId = params.id || params.runId || `run_${Date.now()}`;
      // We store via setDoc-like create; using update if exists for partial follow-ups
      // (groundedness scores arrive after the initial persist).
      const existing = await services.createService('agent_runs').get(runId);
      if (existing) {
        await services.createService('agent_runs').update(runId, params as any);
      } else {
        await services.createService('agent_runs').create({ ...params, id: runId } as any);
      }
      return { id: runId, ok: true };
    },
  });
}
