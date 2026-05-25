import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import type { Lead } from '@/lib/types/crm';
import { logger } from '@/lib/utils/logger';

/**
 * Normaliza telefone brasileiro: remove sufixos do WhatsApp e garante o DDI 55.
 * Mesma lógica usada em block-conversation para manter consistência entre sistemas.
 */
export function normalizeBrazilPhone(phone: string): string {
  let normalized = phone.replace(/@(c\.us|lid|g\.us|s\.whatsapp\.net)$/i, '').replace(/\D/g, '');
  if (!normalized.startsWith('55')) {
    normalized = '55' + normalized;
  }
  return normalized;
}

/** Variações plausíveis do telefone para lidar com formatos divergentes no Firestore. */
function phoneCandidates(phone: string): string[] {
  const withDdi = normalizeBrazilPhone(phone);
  const withoutDdi = withDdi.startsWith('55') ? withDdi.slice(2) : withDdi;
  const raw = phone.replace(/@(c\.us|lid|g\.us|s\.whatsapp\.net)$/i, '');
  return Array.from(new Set([withDdi, withoutDdi, raw]));
}

/**
 * Encontra um lead pelo telefone (tenant-scoped), tentando variações de formato
 * nos campos `phone` e `clientPhone`. Retorna o primeiro match ou null.
 */
export async function findLeadByPhone(tenantId: string, phone: string): Promise<Lead | null> {
  if (!tenantId || !phone) return null;
  const services = new TenantServiceFactory(tenantId);
  const candidates = phoneCandidates(phone);

  for (const field of ['phone', 'clientPhone'] as const) {
    for (const candidate of candidates) {
      const matches = await services.leads.getWhere(field, '==', candidate, undefined, 1);
      if (matches.length > 0) return matches[0];
    }
  }
  return null;
}

/**
 * Marca escalação no lead (a IA pediu intervenção humana). Idempotente:
 * se já houver escalação ativa, apenas atualiza o motivo/horário.
 */
export async function setLeadEscalation(tenantId: string, phone: string, reason?: string): Promise<boolean> {
  const lead = await findLeadByPhone(tenantId, phone);
  if (!lead) {
    logger.warn('[lead-lookup] No lead found to escalate', {
      tenantId: tenantId.substring(0, 8) + '***',
      phone: phone.substring(0, 8) + '***',
    });
    return false;
  }
  const services = new TenantServiceFactory(tenantId);
  await services.leads.update(lead.id, {
    escalation: {
      active: true,
      at: new Date(),
      reason: reason || undefined,
    },
  } as Partial<Lead>);
  return true;
}

/** Resolve (limpa) a escalação de um lead. */
export async function resolveLeadEscalation(tenantId: string, leadId: string): Promise<void> {
  const services = new TenantServiceFactory(tenantId);
  await services.leads.update(leadId, {
    escalation: {
      active: false,
      at: new Date(),
      resolvedAt: new Date(),
    },
  } as Partial<Lead>);
}
