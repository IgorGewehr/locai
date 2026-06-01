/**
 * GET /api/agent/assistant/feed?limit=50  (contrato 3)
 *
 * Feed do canal do Assistente Sofia: merge de
 *  - owner_alerts (chamados → kind='alert', com ageMinutes derivado de createdAt)
 *  - assistant_chat (chat livre operador↔IA → kind='message')
 * ordenado ASC por createdAt. unread = nº de alertas com status='sent'.
 *
 * Auth Firebase + tenant-scoped (TenantServiceFactory).
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import {
  ASSISTANT_CHAT_COLLECTION,
  OWNER_ALERTS_COLLECTION,
  alertToFeedItem,
  messageToFeedItem,
  toMillis,
  type AssistantChatDoc,
  type FeedItem,
  type OwnerAlertDoc,
} from '@/lib/conversation/assistant-chat';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const rawLimit = Number(request.nextUrl.searchParams.get('limit'));
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX_LIMIT) : DEFAULT_LIMIT;

    const services = new TenantServiceFactory(auth.tenantId);
    const alertsSvc = services.createService<OwnerAlertDoc>(OWNER_ALERTS_COLLECTION);
    const chatSvc = services.createService<AssistantChatDoc>(ASSISTANT_CHAT_COLLECTION);

    // Busca em paralelo; cada coleção pode ainda não existir → trata como vazia.
    const [alerts, messages] = await Promise.all([
      alertsSvc.getAll(MAX_LIMIT).catch(() => [] as OwnerAlertDoc[]),
      chatSvc.getAll(MAX_LIMIT).catch(() => [] as AssistantChatDoc[]),
    ]);

    const nowMs = Date.now();
    const unread = alerts.filter((a) => (a.status || 'sent') === 'sent').length;

    const items: FeedItem[] = [
      ...alerts.map((a) => alertToFeedItem(a, nowMs)),
      ...messages.map((m) => messageToFeedItem(m)),
    ];

    // Ordena ASC por createdAt (ms). Itens sem data (ms=0) ficam no início.
    items.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));

    // Mantém os mais recentes respeitando o limite, preservando a ordem ASC.
    const limited = items.length > limit ? items.slice(items.length - limit) : items;

    return NextResponse.json({ ok: true, items: limited, unread });
  } catch (error) {
    logger.error('[assistant-feed] failed', error instanceof Error ? error : undefined);
    return handleApiError(error);
  }
}
