/**
 * Resolução do canal do dono (docs/blueprint/06 §3.3, 11).
 *
 * Número canônico: `tenants/{tid}/config/owner-channel.ownerWhatsappPhone`, com
 * fallback para `tenants/{tid}/settings/company.phone` (compat). Sempre normalizado.
 */
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { normalizeBlockPhone } from '@/lib/utils/ai-block';

export async function getOwnerWhatsappPhone(tenantId: string): Promise<string | null> {
  try {
    const services = new TenantServiceFactory(tenantId);

    const ownerChannel = await services
      .createService<{ id?: string; ownerWhatsappPhone?: string }>('config')
      .get('owner-channel')
      .catch(() => null);
    if (ownerChannel?.ownerWhatsappPhone) {
      return normalizeBlockPhone(ownerChannel.ownerWhatsappPhone);
    }

    const company = await services
      .createService<{ id?: string; phone?: string }>('settings')
      .get('company')
      .catch(() => null);
    if (company?.phone) {
      return normalizeBlockPhone(company.phone);
    }
  } catch (err) {
    logger.warn('[owner-channel] failed to resolve owner phone', {
      error: err instanceof Error ? err.message : String(err),
      tenantId: tenantId?.substring(0, 8) + '***',
    });
  }
  return null;
}

/** Link profundo canônico para a conversa (docs/blueprint/06 §4.3). */
export function conversationDeepLink(clientPhone: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const path = `/dashboard/conversas?phone=${encodeURIComponent(normalizeBlockPhone(clientPhone))}`;
  return base ? `${base}${path}` : path;
}
