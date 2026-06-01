/**
 * Dispatcher: send an inbound conversation message to the locai/agent service.
 *
 * Usage from a webhook handler:
 *
 *   await dispatchToAgent(tenantId, {
 *     conversationId, messageId, recipientId, channel: 'whatsapp',
 *     contactName, contactPhone, message,
 *   });
 *
 * The agent replies asynchronously: it processes the run, then dispatches
 * the final text back via /api/conversations/send. The webhook does NOT need
 * to await the agent's text answer.
 */

import crypto from 'crypto';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { extractPhotoUrls } from '@/lib/types/property';
import { logger } from '@/lib/utils/logger';

interface DispatchInput {
  conversationId: string;
  messageId: string;
  recipientId: string;
  channel: 'whatsapp' | 'facebook' | 'instagram' | 'web';
  contactName: string;
  contactPhone?: string;
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

function _sign(tenantId: string, raw: string): { sig: string; ts: string } {
  const secret = process.env.AGENT_SHARED_SECRET || '';
  const ts = Date.now().toString();
  const message = `${ts}.${tenantId}.${raw}`;
  const sig = crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex');
  return { sig, ts };
}

async function _buildTenantContext(tenantId: string) {
  const services = new TenantServiceFactory(tenantId);

  // Pull lightweight properties summary so the agent can answer "what do you
  // have?" without a tool round-trip on every conversation.
  let propertiesSummary: any[] = [];
  try {
    const props: any[] = await services.properties.getAll(40);
    propertiesSummary = props
      .filter((p) => p.isActive !== false)
      .slice(0, 40)
      .map((p) => ({
        id: p.id,
        title: p.title,
        neighborhood: p.neighborhood,
        city: p.city,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        maxGuests: p.maxGuests,
        basePrice: p.basePrice,
        photo: extractPhotoUrls(p.photos || p.photos_legacy)[0] || null,
        airbnbUrl: !!p.airbnbUrl, // boolean only — agent should call share_airbnb_link, not paste from prompt
      }));
  } catch (err) {
    logger.warn('agent.context.properties_fetch_failed', { error: (err as Error).message });
  }

  // Pull tenant settings for company info, working hours and visit settings.
  let companyName: string | undefined;
  let companyDescription: string | undefined;
  let workingHours: any[] | undefined;
  let visitSettings: any | undefined;
  let companyAddress: any | undefined;
  try {
    const settings = services.settings;
    const company = await settings.getCompanyInfo?.().catch(() => null);
    if (company) {
      companyName = company.name || company.razaoSocial || company.tradeName;
      companyDescription = company.description;
      companyAddress = company.address || {
        city: company.city,
        state: company.state,
        neighborhood: company.neighborhood,
      };
    }
    const visitSchedules: any[] = await services.visitSchedules.getAll(1).catch(() => []);
    if (visitSchedules?.[0]?.workingHours) {
      const wh = visitSchedules[0].workingHours;
      const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      workingHours = order.map((k) => wh[k] || { isWorkingDay: false });
      visitSettings = {
        visitDurationDefault: visitSchedules[0].visitDurationDefault,
        visitBufferTime: visitSchedules[0].visitBufferTime,
        maxVisitsPerDay: visitSchedules[0].maxVisitsPerDay,
      };
    }
  } catch (err) {
    logger.warn('agent.context.settings_fetch_failed', { error: (err as Error).message });
  }

  // A cidade de atuação é SEMPRE a da sede (clientes operam localmente).
  const operatingCity = companyAddress?.city || companyAddress?.cidade || '';

  return {
    tenant_name: companyName,
    tenant_description: companyDescription,
    tenant_address: companyAddress,
    operating_city: operatingCity,
    working_hours: workingHours,
    visit_settings: visitSettings,
    properties_summary: propertiesSummary,
    current_date: new Date().toISOString().slice(0, 10),
  };
}

async function loadAgentSettings(tenantId: string): Promise<{
  tone: string;
  specialInstructions: string;
  customRules: string[];
} | null> {
  try {
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');
    const { getApp } = await import('firebase/app');
    const db = getFirestore(getApp());
    const ref = doc(db, `tenants/${tenantId}/config/agent-settings`);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      logger.info('agent.settings.not_found', { tenantId: tenantId.slice(0, 8) + '***' });
      return null;
    }
    const data = snap.data();
    return {
      tone: data.tone || 'friendly',
      specialInstructions: data.specialInstructions || '',
      customRules: Array.isArray(data.customRules) ? data.customRules : [],
    };
  } catch (err) {
    logger.warn('agent.settings.load_failed', { error: (err as Error).message });
    return null;
  }
}

export async function dispatchToAgent(tenantId: string, input: DispatchInput): Promise<void> {
  const baseUrl = process.env.LOCAI_AGENT_URL || 'http://localhost:8090';
  const [ctx, agentSettings] = await Promise.all([
    _buildTenantContext(tenantId),
    loadAgentSettings(tenantId),
  ]);

  const payload: Record<string, unknown> = {
    message_id: input.messageId,
    conversation_id: input.conversationId,
    message: input.message,
    contact_name: input.contactName,
    contact_phone: input.contactPhone,
    channel: input.channel,
    recipient_id: input.recipientId,
    history: input.history || [],
    use_case: 'imobiliario',
    tone: agentSettings?.tone || 'friendly',
    ...ctx,
  };

  if (agentSettings?.specialInstructions) {
    payload.special_instructions = agentSettings.specialInstructions;
  }
  if (agentSettings?.customRules?.length) {
    payload.custom_rules = agentSettings.customRules;
  }

  const raw = JSON.stringify(payload);
  const { sig, ts } = _sign(tenantId, raw);

  // Fire-and-forget — the agent will dispatch its final text via
  // /api/conversations/send when it's done. We still await to surface 4xx/5xx
  // errors in logs, but with a short timeout.
  try {
    const resp = await fetch(`${baseUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-signature': sig,
        'x-agent-timestamp': ts,
        'x-tenant-id': tenantId,
      },
      body: raw,
      signal: AbortSignal.timeout(45000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      logger.error('agent.dispatch.bad_status', { status: resp.status, body: text.slice(0, 200) });
    } else {
      logger.info('agent.dispatch.ok', { tenantId: tenantId.slice(0, 8) + '***' });
    }
  } catch (err: any) {
    logger.error('agent.dispatch.error', { error: err?.message });
  }
}
