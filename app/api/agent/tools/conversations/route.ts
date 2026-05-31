import { NextRequest } from 'next/server';
import { handleAgentRequest } from '@/lib/agent/dispatch';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';

/**
 * Agent tool: conversations.
 *
 * - send_media        — pushes image/video URLs to the customer (delegates to
 *                       /api/conversations/send which handles channel routing)
 * - share_airbnb_link — fetches the property's Airbnb URL and sends it as a
 *                       text message. The agent should call this whenever a
 *                       customer wants to BOOK / RESERVE — bookings happen
 *                       on Airbnb, never inside locai.
 * - notify_human      — flags the conversation for a human agent.
 */

async function _internalConversationsSend(
  baseUrl: string,
  tenantId: string,
  body: any
): Promise<void> {
  // Re-uses Locai's existing /api/conversations/send route. We POST without
  // an HMAC because this is server-to-server inside the same Next.js process.
  // The internal path carries the tenant via the `x-tenant-id` header (the
  // send route resolves tenantId from this header when x-internal-call is set).
  const url = `${baseUrl}/api/conversations/send`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-call': '1',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify({ tenantId, ...body }),
    cache: 'no-store',
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`conversations/send failed: ${resp.status} ${txt}`);
  }
}

/**
 * Best-effort: when the agent shares the Airbnb link we move the lead linked to
 * this conversation to the terminal `handed_off` stage server-side, without
 * relying on the operator-only CRM tool. Never throws — a failure here must not
 * break the link delivery to the customer.
 */
async function _markLeadHandedOff(
  services: TenantServiceFactory,
  conversationId: string | undefined,
  recipientId: string | undefined
): Promise<void> {
  try {
    // The Lead model is linked to the customer by phone (recipientId for the
    // WhatsApp channel), not by conversationId — leads are created manually in
    // the CRM and carry `phone`/`clientPhone`. We match by phone first and fall
    // back to conversationId in case a lead happens to store it.
    let lead: any | undefined;
    if (recipientId) {
      const byPhone: any[] = await services.leads.getWhere('phone', '==', recipientId);
      lead = byPhone[0];
    }
    if (!lead && conversationId) {
      const byConv: any[] = await services.leads.getWhere('conversationId', '==', conversationId);
      lead = byConv[0];
    }
    if (!lead) {
      logger.info('[share_airbnb_link] no lead linked to this customer, skipping handoff', {
        conversationId,
        recipientId,
      });
      return;
    }
    await services.leads.update(lead.id, { stage: 'handed_off' } as any);
    logger.info('[share_airbnb_link] lead moved to handed_off', {
      conversationId,
      leadId: lead.id,
    });
  } catch (err: any) {
    logger.error(
      '[share_airbnb_link] failed to mark lead handed_off',
      err instanceof Error ? err : new Error(String(err?.message || err)),
      { conversationId }
    );
  }
}

function _baseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const baseUrl = _baseUrl(req);
  return handleAgentRequest(req, {
    send_media: async (params, { tenantId }) => {
      const urls: string[] = params.mediaUrls || [];
      if (urls.length === 0) throw new Error('mediaUrls required');
      // Delegate channel routing to the existing send endpoint.
      await _internalConversationsSend(baseUrl, tenantId, {
        conversationId: params.conversationId,
        recipientId: params.recipientId,
        channel: params.channel,
        type: params.mediaType || 'image',
        mediaUrls: urls,
        caption: params.caption || '',
      });
      return { sent: urls.length };
    },

    share_airbnb_link: async (params, { tenantId }) => {
      if (!params.propertyId) throw new Error('propertyId required');
      const services = new TenantServiceFactory(tenantId);
      const property: any = await services.properties.get(params.propertyId);
      if (!property) throw new Error('Property not found');
      const url = property.airbnbUrl;
      if (!url) {
        return {
          sent: false,
          reason: 'no_airbnb_url',
          message: 'Property has no Airbnb URL configured.',
        };
      }
      const intro = params.message ? `${params.message.trim()}\n\n` : '';
      const content = `${intro}${url}`;
      await _internalConversationsSend(baseUrl, tenantId, {
        conversationId: params.conversationId,
        recipientId: params.recipientId,
        channel: params.channel,
        type: 'text',
        content,
      });
      // Link delivered → advance the linked lead to the terminal CRM stage.
      // Best-effort: never blocks/fails the link delivery above.
      await _markLeadHandedOff(services, params.conversationId, params.recipientId);
      return { sent: true, url };
    },

    notify_human: async (params, { tenantId }) => {
      if (!params.reason) throw new Error('reason required');
      const services = new TenantServiceFactory(tenantId);
      // Best-effort: drop a row in `notifications` so the dashboard picks it up.
      const id = await services.notifications.create({
        type: 'agent_handoff',
        priority: params.priority || 'medium',
        title: 'Atendimento humano solicitado',
        message: params.reason,
        conversationId: params.conversationId || null,
        read: false,
      });
      return { id };
    },
  });
}
