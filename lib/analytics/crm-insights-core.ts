/**
 * Shared CRM insights — PURE CORE (no data fetching, client-safe).
 *
 * `computeCrmInsightsFromLeads` takes an already-loaded array of leads and
 * computes an honest, fully-real analysis of the sales funnel. NO fabricated
 * numbers: any metric that would require acquisition cost / ad-spend (ROI, cost
 * per lead, cost per conversion) is returned as literal `null` and
 * `costDataAvailable` is always `false`.
 *
 * This file imports ONLY types + date-fns, so it is safe to bundle into a
 * client component (e.g. a dashboard panel that already loaded the leads). The
 * server-side fetch wrapper lives in `crm-insights.ts`.
 *
 * Dates may be Firestore Timestamp / Date / string / number — `toMillis` is a
 * self-contained copy of the helper used by the read tool.
 */
import { subMonths } from 'date-fns';
import { Lead, LeadStatus, LeadTemperature } from '@/lib/types/crm';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export interface CrmInsightsOpts {
  periodMonths?: number; // default 6 — janela para filtrar leads por createdAt
  slaHours?: number; // default 24 — limite p/ "leads quentes sem retorno"
}

export interface CrmInsights {
  period: { months: number; from: string; to: string }; // ISO
  generatedAt: string; // ISO
  costDataAvailable: false; // sempre false — não há ad-spend/custo no sistema

  overview: {
    totalLeads: number;
    wonLeads: number;
    lostLeads: number;
    openLeads: number;
    conversionRate: number;
    averageScore: number;
    totalRevenue: number;
    averageTicket: number;
  };

  funnel: Array<{
    status: LeadStatus;
    count: number;
    pctOfTotal: number;
    dropOffRate: number;
  }>;

  conversionByTemperature: Array<{
    temperature: LeadTemperature;
    leads: number;
    won: number;
    conversionRate: number;
  }>;

  conversionBySource: Array<{
    source: string;
    leads: number;
    won: number;
    conversionRate: number;
    revenue: number;
    avgConversionTimeDays: number | null;
    roi: null;
    costPerLead: null;
    costPerConversion: null;
  }>;

  responseTime: {
    avgResponseMinutes: number | null;
    sampleSize: number;
  };

  conversionTime: {
    avgDaysToConvert: number | null;
    sampleSize: number;
  };

  winLoss: {
    won: number;
    lost: number;
    winRate: number;
    topLostReasons: Array<{ reason: string; count: number }>;
  };

  hotLeadsNoFollowUp: {
    slaHours: number;
    count: number;
    leads: Array<{
      id: string;
      name: string;
      score: number;
      hoursSinceLastContact: number;
    }>;
  };

  revenue: {
    currentMonth: { month: string; revenue: number; wonCount: number };
    monthlyTrend: Array<{
      month: string;
      leads: number;
      won: number;
      revenue: number;
      averageScore: number;
    }>;
  };
}

/**
 * Self-contained copy of the read-tool `toMillis` helper. Dates can be a
 * Firestore Timestamp, a Date, an ISO string or a number.
 */
export function toMillis(v: unknown): number | null {
  if (!v) return null;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof v === 'number') return v;
  const anyV = v as { toMillis?: () => number; seconds?: number; getTime?: () => number };
  if (typeof anyV.toMillis === 'function') return anyV.toMillis();
  if (typeof anyV.seconds === 'number') return anyV.seconds * 1000;
  if (typeof anyV.getTime === 'function') return anyV.getTime();
  return null;
}

function monthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Pure CRM funnel analysis from an already-loaded array of leads.
 * `now` is injectable for deterministic testing; defaults to the current time.
 */
export function computeCrmInsightsFromLeads(
  leads: Lead[],
  opts?: CrmInsightsOpts,
  now: Date = new Date()
): CrmInsights {
  const periodMonths = opts?.periodMonths ?? 6;
  const slaHours = opts?.slaHours ?? 24;

  const nowMs = now.getTime();
  const windowStart = subMonths(now, periodMonths);
  const windowStartMs = windowStart.getTime();

  const leadsInWindow = leads.filter((l) => {
    const ms = toMillis(l.createdAt);
    return ms !== null && ms >= windowStartMs;
  });

  const totalLeads = leadsInWindow.length;
  const isWon = (l: Lead) => l.status === LeadStatus.WON;
  const isLost = (l: Lead) => l.status === LeadStatus.LOST;

  const wonLeads = leadsInWindow.filter(isWon).length;
  const lostLeads = leadsInWindow.filter(isLost).length;
  const openLeads = totalLeads - wonLeads - lostLeads;

  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
  const averageScore =
    totalLeads > 0
      ? leadsInWindow.reduce((sum, l) => sum + (l.score || 0), 0) / totalLeads
      : 0;
  const totalRevenue = leadsInWindow
    .filter(isWon)
    .reduce((sum, l) => sum + (l.wonValue || 0), 0);
  const averageTicket = wonLeads > 0 ? totalRevenue / wonLeads : 0;

  // ---- Funnel (linear stages) ----
  const funnelStages: LeadStatus[] = [
    LeadStatus.NEW,
    LeadStatus.CONTACTED,
    LeadStatus.QUALIFIED,
    LeadStatus.OPPORTUNITY,
    LeadStatus.NEGOTIATION,
    LeadStatus.WON,
  ];
  const statusCounts = leadsInWindow.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<LeadStatus, number>);

  const funnel = funnelStages.map((status, index) => {
    const count = statusCounts[status] || 0;
    const pctOfTotal = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
    let dropOffRate = 0;
    if (index > 0) {
      const prevCount = statusCounts[funnelStages[index - 1]] || 0;
      dropOffRate = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;
    }
    return { status, count, pctOfTotal, dropOffRate };
  });

  // ---- Conversion by temperature ----
  const temps: LeadTemperature[] = ['cold', 'warm', 'hot'];
  const conversionByTemperature = temps.map((temperature) => {
    const inTemp = leadsInWindow.filter((l) => l.temperature === temperature);
    const leadsCount = inTemp.length;
    const won = inTemp.filter(isWon).length;
    return {
      temperature,
      leads: leadsCount,
      won,
      conversionRate: leadsCount > 0 ? (won / leadsCount) * 100 : 0,
    };
  });

  // ---- Conversion by source ----
  const sourceMap = new Map<string, Lead[]>();
  for (const l of leadsInWindow) {
    const source = (l.source as string) || 'unknown';
    const arr = sourceMap.get(source);
    if (arr) arr.push(l);
    else sourceMap.set(source, [l]);
  }

  const conversionDays = (l: Lead): number | null => {
    const conv = toMillis(l.convertedToClientAt);
    const first = toMillis(l.firstContactDate);
    if (conv === null || first === null) return null;
    const diff = (conv - first) / DAY_MS;
    return diff >= 0 ? diff : null;
  };

  const conversionBySource = Array.from(sourceMap.entries()).map(([source, group]) => {
    const wonGroup = group.filter(isWon);
    const leadsCount = group.length;
    const won = wonGroup.length;
    const revenue = wonGroup.reduce((sum, l) => sum + (l.wonValue || 0), 0);
    const convDaysList = wonGroup
      .map(conversionDays)
      .filter((d): d is number => d !== null);
    const avgConversionTimeDays =
      convDaysList.length > 0
        ? convDaysList.reduce((s, d) => s + d, 0) / convDaysList.length
        : null;
    return {
      source,
      leads: leadsCount,
      won,
      conversionRate: leadsCount > 0 ? (won / leadsCount) * 100 : 0,
      revenue,
      avgConversionTimeDays,
      roi: null as null,
      costPerLead: null as null,
      costPerConversion: null as null,
    };
  });

  // ---- Response time (avg over leads with averageResponseTime > 0) ----
  const respList = leadsInWindow
    .map((l) => l.averageResponseTime)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const responseTime = {
    avgResponseMinutes:
      respList.length > 0
        ? respList.reduce((s, v) => s + v, 0) / respList.length
        : null,
    sampleSize: respList.length,
  };

  // ---- Conversion time (global, over WON with valid dates) ----
  const allConvDays = leadsInWindow
    .filter(isWon)
    .map(conversionDays)
    .filter((d): d is number => d !== null);
  const conversionTime = {
    avgDaysToConvert:
      allConvDays.length > 0
        ? allConvDays.reduce((s, d) => s + d, 0) / allConvDays.length
        : null,
    sampleSize: allConvDays.length,
  };

  // ---- Win/loss ----
  const winRate = wonLeads + lostLeads > 0 ? (wonLeads / (wonLeads + lostLeads)) * 100 : 0;
  const lostReasonMap = new Map<string, { reason: string; count: number }>();
  for (const l of leadsInWindow) {
    const raw = l.lostReason;
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    const existing = lostReasonMap.get(key);
    if (existing) existing.count += 1;
    else lostReasonMap.set(key, { reason: trimmed, count: 1 });
  }
  const topLostReasons = Array.from(lostReasonMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ---- Hot leads with no follow-up ----
  const slaMs = slaHours * HOUR_MS;
  const hotCandidates = leadsInWindow
    .filter((l) => l.temperature === 'hot' && !isWon(l) && !isLost(l))
    .map((l) => {
      const lastMs = toMillis(l.lastContactDate) ?? toMillis(l.firstContactDate);
      if (lastMs === null) return null;
      const elapsed = nowMs - lastMs;
      if (elapsed <= slaMs) return null;
      return {
        id: l.id,
        name: l.name || l.clientName || '',
        score: l.score || 0,
        hoursSinceLastContact: Math.round(elapsed / HOUR_MS),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.hoursSinceLastContact - a.hoursSinceLastContact);

  const hotLeadsNoFollowUp = {
    slaHours,
    count: hotCandidates.length,
    leads: hotCandidates.slice(0, 20),
  };

  // ---- Revenue (current month + monthly trend) ----
  const currentMonthKey = monthKey(nowMs);
  let currentMonthRevenue = 0;
  let currentMonthWon = 0;
  for (const l of leadsInWindow.filter(isWon)) {
    const conv = toMillis(l.convertedToClientAt);
    if (conv === null) continue;
    if (monthKey(conv) === currentMonthKey) {
      currentMonthRevenue += l.wonValue || 0;
      currentMonthWon += 1;
    }
  }

  // Build the last `periodMonths` month buckets in chronological asc order.
  const trendBuckets: Array<{ key: string }> = [];
  for (let i = periodMonths - 1; i >= 0; i--) {
    trendBuckets.push({ key: monthKey(subMonths(now, i).getTime()) });
  }

  const monthlyTrend = trendBuckets.map(({ key }) => {
    const createdInMonth = leadsInWindow.filter((l) => {
      const ms = toMillis(l.createdAt);
      return ms !== null && monthKey(ms) === key;
    });
    const wonInMonth = leadsInWindow.filter((l) => {
      if (!isWon(l)) return false;
      const conv = toMillis(l.convertedToClientAt);
      return conv !== null && monthKey(conv) === key;
    });
    const revenue = wonInMonth.reduce((s, l) => s + (l.wonValue || 0), 0);
    const avgScore =
      createdInMonth.length > 0
        ? createdInMonth.reduce((s, l) => s + (l.score || 0), 0) / createdInMonth.length
        : 0;
    return {
      month: key,
      leads: createdInMonth.length,
      won: wonInMonth.length,
      revenue,
      averageScore: avgScore,
    };
  });

  return {
    period: {
      months: periodMonths,
      from: windowStart.toISOString(),
      to: now.toISOString(),
    },
    generatedAt: now.toISOString(),
    costDataAvailable: false,
    overview: {
      totalLeads,
      wonLeads,
      lostLeads,
      openLeads,
      conversionRate,
      averageScore,
      totalRevenue,
      averageTicket,
    },
    funnel,
    conversionByTemperature,
    conversionBySource,
    responseTime,
    conversionTime,
    winLoss: {
      won: wonLeads,
      lost: lostLeads,
      winRate,
      topLostReasons,
    },
    hotLeadsNoFollowUp,
    revenue: {
      currentMonth: {
        month: currentMonthKey,
        revenue: currentMonthRevenue,
        wonCount: currentMonthWon,
      },
      monthlyTrend,
    },
  };
}
