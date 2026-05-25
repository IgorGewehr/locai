import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { resolveLeadEscalation } from '@/lib/services/lead-lookup';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/crm/leads/[id]/resolve-escalation
 * Marca a escalação de um lead como resolvida (humano assumiu o atendimento).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Lead id is required' }, { status: 400 });
    }

    await resolveLeadEscalation(auth.tenantId, id);

    logger.info('[RESOLVE-ESCALATION] Escalation resolved', {
      tenantId: auth.tenantId.substring(0, 8) + '***',
      leadId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
