/**
 * POST /api/agent/assistant/ack  (contrato 5)
 *
 * Marca um owner_alert como 'acknowledged' (+ ackedAt). Chamado pelo botão
 * "Abrir conversa" do card ao abrir o chamado do cliente.
 *
 * Auth Firebase + tenant-scoped (TenantServiceFactory).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { OWNER_ALERTS_COLLECTION, type OwnerAlertDoc } from '@/lib/conversation/assistant-chat';

const AckSchema = z.object({
  alertId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const result = AckSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid data', details: result.error.issues }, { status: 400 });
    }

    const { alertId } = result.data;
    const services = new TenantServiceFactory(auth.tenantId);
    const alertsSvc = services.createService<OwnerAlertDoc>(OWNER_ALERTS_COLLECTION);

    const alert = await alertsSvc.get(alertId);
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    await alertsSvc.update(alertId, {
      status: 'acknowledged',
      ackedAt: new Date(),
    } as never);

    logger.info('[assistant-ack] alert acknowledged', {
      tenantId: auth.tenantId.substring(0, 8) + '***',
      alertId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
