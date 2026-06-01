import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentInbound, agentOk, agentErr } from '@/lib/agent/hmac';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { whatsappMicroserviceClient } from '@/lib/whatsapp/microservice-client';
import { FacebookService } from '@/lib/services/facebook-service';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/conversations/send
 *
 * Outbound message sink for the LangGraph agent (and internal Locai routes).
 * The Python agent (`agent/app/tools/client.py`) POSTs EVERY outbound reply
 * here — text, media and the Airbnb hand-off link. Without this route those
 * calls 404 and the customer never receives anything.
 *
 * Two authentication paths are accepted:
 *   1. HMAC (client.py) — headers `x-agent-signature` / `x-agent-timestamp` /
 *      `x-tenant-id`, verified by `verifyAgentInbound` exactly like the other
 *      `/api/agent/*` routes. The body carries `tenantId` too.
 *   2. Internal server-to-server (e.g. `/api/agent/tools/conversations`) —
 *      header `x-internal-call: '1'`, no signature, same Next.js process.
 *
 * Canonical body contract (matches what client.py actually sends):
 *   { tenantId, conversationId, recipientId, channel, content, type,
 *     mediaUrls?, caption? }
 *
 * Dispatch:
 *   - whatsapp           → whatsappMicroserviceClient.sendMessage(...)
 *   - facebook/instagram → FacebookService (mirrors /api/social/send logic)
 *
 * Response envelope `{ ok, data }` — the format the Python client expects
 * (`_post` reads `data.ok` and returns `data.data`).
 */
export async function POST(req: NextRequest) {
  const isInternal = req.headers.get('x-internal-call') === '1';

  let tenantId: string | undefined;
  let rawBody: string;

  if (isInternal) {
    // Server-to-server call inside the same process — no HMAC. Tenant is read
    // from the body or the x-tenant-id header.
    rawBody = await req.text();
    tenantId = req.headers.get('x-tenant-id') || undefined;
  } else {
    const auth = await verifyAgentInbound(req);
    if (auth.ok === false) {
      return agentErr(auth.reason, auth.status);
    }
    rawBody = auth.rawBody;
    tenantId = auth.tenantId;
  }

  let body: any;
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {
    return agentErr('Invalid JSON body', 400);
  }

  // Body may also carry tenantId (client.py always sends it). The HMAC header
  // is authoritative when present; fall back to the body for internal calls.
  tenantId = tenantId || body.tenantId;

  const {
    conversationId,
    recipientId,
    channel,
    content,
    type = 'text',
    mediaUrls,
    caption,
  } = body || {};

  if (!tenantId) return agentErr('tenantId is required', 400);
  if (!conversationId) return agentErr('conversationId is required', 400);
  if (!recipientId) return agentErr('recipientId is required', 400);
  if (!channel) return agentErr('channel is required', 400);

  const media: string[] = Array.isArray(mediaUrls) ? mediaUrls : [];
  const hasMedia = media.length > 0;

  if (!content && !hasMedia) {
    return agentErr('content or mediaUrls is required', 400);
  }

  try {
    const services = new TenantServiceFactory(tenantId);

    // 1. Persist the outbound message (mirrors [id]/messages POST shape).
    const now = new Date();
    const message = {
      conversationId,
      content: content || caption || '',
      type,
      isFromAI: true,
      direction: 'outbound',
      channel,
      recipientId,
      mediaUrls: hasMedia ? media : [],
      caption: caption || '',
      timestamp: now,
      metadata: {},
      tenantId,
    };
    const messageId = await services.messages.create(message as any);

    // 2. Dispatch to the right channel.
    let dispatched = false;

    if (channel === 'whatsapp') {
      dispatched = await whatsappMicroserviceClient.sendMessage(
        tenantId,
        recipientId,
        content || caption || '',
        hasMedia ? media[0] : undefined
      );
    } else if (channel === 'facebook' || channel === 'instagram') {
      // Mirrors /api/social/send: send via the Facebook Graph API. The
      // recipientId is the social (PSID/IGSID) scoped to the page.
      const facebookService = new FacebookService();
      if (hasMedia) {
        const result = await facebookService.sendImage(recipientId, media[0], tenantId);
        dispatched = result.success;
        if (caption || content) {
          // Send the accompanying text after the image, best-effort.
          await facebookService.sendText(recipientId, content || caption || '', tenantId);
        }
      } else {
        const result = await facebookService.sendText(recipientId, content || '', tenantId);
        dispatched = result.success;
      }
    } else {
      return agentErr(`Unsupported channel: ${channel}`, 400);
    }

    if (!dispatched) {
      logger.error('[CONVERSATIONS-SEND] Dispatch failed', undefined, {
        tenantId: tenantId.substring(0, 8) + '***',
        conversationId,
        channel,
      });
      return agentErr('Failed to dispatch message to channel', 502);
    }

    logger.info('[CONVERSATIONS-SEND] Message sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      conversationId,
      channel,
      type,
      hasMedia,
      messageId,
    });

    const data = { messageId, channel, sent: true };
    // Internal callers only check resp.ok; the agent reads `{ ok, data }`.
    return isInternal ? NextResponse.json({ ok: true, data }) : agentOk(data);
  } catch (error) {
    logger.error(
      '[CONVERSATIONS-SEND] Error sending message',
      error instanceof Error ? error : new Error('Unknown error'),
      { tenantId: tenantId?.substring(0, 8) + '***', conversationId, channel }
    );
    return agentErr(error instanceof Error ? error.message : 'Internal error', 500);
  }
}
