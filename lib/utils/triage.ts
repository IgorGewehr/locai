import type { Lead } from '@/lib/types/crm';
import { LeadStatus } from '@/lib/types/crm';

/**
 * Status de triagem — sinal único e profissional (sem emojis) que dirige
 * todo o destaque visual na Triagem Inteligente e na aba de Conversas.
 */
export type TriageStatus = 'needs_you' | 'cooling' | 'closing' | 'hot' | 'warm' | 'cold';

export interface TriageConfig {
  /** Rótulo em PT-BR exibido ao usuário. */
  label: string;
  /** Cor de acento (barra lateral, dot, chip). */
  color: string;
  /** Prioridade no ranking de urgência (menor = mais urgente). */
  priority: number;
}

export const TRIAGE_CONFIG: Record<TriageStatus, TriageConfig> = {
  needs_you: { label: 'Precisa de você', color: '#ef4444', priority: 1 },
  cooling: { label: 'Esfriando', color: '#f59e0b', priority: 2 },
  closing: { label: 'Fechando', color: '#10b981', priority: 3 },
  hot: { label: 'Quente', color: '#fb923c', priority: 4 },
  warm: { label: 'Morno', color: '#6366f1', priority: 5 },
  cold: { label: 'Frio', color: '#64748b', priority: 6 },
};

/** Horas desde uma data (tolerante a Date, Firestore Timestamp ou string/number). */
export function hoursSince(date: unknown): number {
  if (!date) return Infinity;
  let ms: number;
  if (date instanceof Date) ms = date.getTime();
  else if (typeof (date as any)?.toDate === 'function') ms = (date as any).toDate().getTime();
  else if (typeof (date as any)?.seconds === 'number') ms = (date as any).seconds * 1000;
  else if (typeof date === 'string' || typeof date === 'number') ms = new Date(date).getTime();
  else return Infinity;
  if (Number.isNaN(ms)) return Infinity;
  return (Date.now() - ms) / (1000 * 60 * 60);
}

const COOLING_THRESHOLD_HOURS = 2;
const ACTIVE_STATUSES = new Set<LeadStatus>([
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.OPPORTUNITY,
  LeadStatus.NEGOTIATION,
]);

/**
 * Computa o status de triagem de um lead por prioridade:
 * escalação > esfriando > fechando > quente > morno > frio.
 */
export function computeTriageStatus(lead: Lead): TriageStatus {
  // 1. A IA pediu intervenção humana — máxima prioridade.
  if (lead.escalation?.active) return 'needs_you';

  const isActive = ACTIVE_STATUSES.has(lead.status);
  const idleHours = hoursSince(lead.lastContactDate);

  // 2. Esfriando: quente/morno parado há mais que o limiar.
  if (isActive && (lead.temperature === 'hot' || lead.temperature === 'warm') && idleHours >= COOLING_THRESHOLD_HOURS) {
    return 'cooling';
  }

  // 3. Fechando: em negociação ou oportunidade com alta probabilidade.
  const prob = lead.aiInsights?.conversionProbability ?? 0;
  if (lead.status === LeadStatus.NEGOTIATION || (lead.status === LeadStatus.OPPORTUNITY && prob >= 0.6)) {
    return 'closing';
  }

  // 4-6. Temperatura pura.
  if (lead.temperature === 'hot') return 'hot';
  if (lead.temperature === 'warm') return 'warm';
  return 'cold';
}

/**
 * Score de urgência para ordenação. Combina prioridade do status (peso maior)
 * com o score do lead, de modo que dentro de um mesmo status o de maior score sobe.
 */
export function triageUrgencyScore(lead: Lead): number {
  const status = computeTriageStatus(lead);
  const { priority } = TRIAGE_CONFIG[status];
  // priority 1 → base 6000, priority 6 → base 1000; + score (0-100) como desempate.
  return (7 - priority) * 1000 + (lead.score ?? 0);
}

/** Ordena leads por urgência (mais urgente primeiro). */
export function sortLeadsByUrgency(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => triageUrgencyScore(b) - triageUrgencyScore(a));
}

/** Rótulo "há X" para tempo ocioso, em PT-BR. */
export function idleLabel(date: unknown): string {
  const h = hoursSince(date);
  if (!Number.isFinite(h)) return '';
  if (h < 1) {
    const min = Math.max(1, Math.round(h * 60));
    return `há ${min} min`;
  }
  if (h < 24) return `há ${Math.round(h)}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
}
