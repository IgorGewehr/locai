/**
 * Shared CRM insights — SERVER fetch wrapper.
 *
 * Thin wrapper that loads the tenant's leads and delegates to the pure core in
 * `crm-insights-core.ts`. Keep all computation in the core (it is unit-testable
 * and client-safe); this file only adds the Firestore read.
 *
 * Aggregation pattern mirrors the `dashboard` resource in
 * `app/api/agent/tools/read/route.ts`: sample up to a hard cap (1000) and
 * aggregate in memory to avoid composite-index requirements.
 */
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { Lead } from '@/lib/types/crm';
import {
  computeCrmInsightsFromLeads,
  type CrmInsights,
  type CrmInsightsOpts,
} from './crm-insights-core';

const SAMPLE_CAP = 1000;

// Re-export the public surface so existing importers of '@/lib/analytics/crm-insights'
// (the analytics route and the agent read tool) keep working unchanged.
export { computeCrmInsightsFromLeads, toMillis } from './crm-insights-core';
export type { CrmInsights, CrmInsightsOpts } from './crm-insights-core';

/**
 * Load the tenant's leads and compute the funnel insights. Revenue/funnel
 * metrics all derive from the leads (wonValue, dates, status), so only the
 * leads collection is fetched.
 */
export async function computeCrmInsights(
  tenantId: string,
  opts?: CrmInsightsOpts
): Promise<CrmInsights> {
  const services = new TenantServiceFactory(tenantId);
  const leads = (await services.leads.getAll(SAMPLE_CAP)) as Lead[];
  return computeCrmInsightsFromLeads(leads, opts);
}
