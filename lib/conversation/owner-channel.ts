/**
 * Resolução do canal do dono (docs/blueprint/06 §3.3, 11).
 *
 * Número canônico: `tenants/{tid}/config/owner-channel.ownerWhatsappPhone`, com
 * fallback para `tenants/{tid}/config/company-info.phone` — o path REAL que a
 * página de Empresa grava. Sempre normalizado.
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

    // Fallback: config/company-info.phone — path REAL que a UI de Empresa grava.
    const company = await services
      .createService<{ id?: string; phone?: string }>('config')
      .get('company-info')
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
