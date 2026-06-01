import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';

const ConsoleSchema = z.object({
  message: z.string().min(1).max(4000),
  mode: z.enum(['operador', 'analista']).default('operador'),
});

/**
 * POST /api/agent/console
 * Operator console: forwards the user's command/question to the Python agent's
 * /operate endpoint (HMAC-signed) and returns its reply.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const result = ConsoleSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid data', details: result.error.issues }, { status: 400 });
    }

    const agentUrl = process.env.LOCAI_AGENT_URL || process.env.AGENT_SERVICE_URL;
    const agentSecret = process.env.AGENT_SHARED_SECRET;
    if (!agentUrl || !agentSecret) {
      return NextResponse.json(
        { reply: 'O agente não está configurado no momento. Tente novamente mais tarde.' },
        { status: 503 }
      );
    }

    const payload = JSON.stringify({
      tenant_id: auth.tenantId,
      message: result.data.message,
      mode: result.data.mode,
    });
    const ts = String(Date.now());
    const sig = crypto.createHmac('sha256', agentSecret).update(`${ts}.`, 'utf8').update(payload).digest('hex');

    let agentResp: Response;
    try {
      agentResp = await fetch(`${agentUrl}/operate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Signature': sig,
          'X-Agent-Timestamp': ts,
        },
        body: payload,
        signal: AbortSignal.timeout(55_000),
      });
    } catch (e) {
      logger.warn('[agent-console] agent unreachable', { error: e instanceof Error ? e.message : 'unknown' });
      return NextResponse.json(
        { reply: 'Não consegui falar com o agente agora. Verifique se o serviço está online.' },
        { status: 503 }
      );
    }

    if (!agentResp.ok) {
      return NextResponse.json(
        { reply: 'O agente retornou um erro ao processar o comando. Tente reformular.' },
        { status: 502 }
      );
    }

    const data = await agentResp.json();
    return NextResponse.json({ reply: data.reply ?? data.message ?? '' });
  } catch (error) {
    return handleApiError(error);
  }
}
