/**
 * POST /api/agent/assistant/message  (contrato 4)
 *
 * Chat livre operador↔IA consultora:
 *  1. grava a mensagem do operador em tenants/{tid}/assistant_chat (role='operator')
 *  2. chama o agente /operate em modo 'analista' (HMAC, igual /api/agent/console)
 *  3. grava a resposta da IA (role='assistant')
 *  4. retorna { ok, reply }
 *
 * Auth Firebase + tenant-scoped. HMAC via AGENT_SHARED_SECRET ("{ts}.{body}").
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { ASSISTANT_CHAT_COLLECTION } from '@/lib/conversation/assistant-chat';

const MessageSchema = z.object({
  text: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const result = MessageSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid data', details: result.error.issues }, { status: 400 });
    }

    const text = sanitizeUserInput(result.data.text);
    if (!text) {
      return NextResponse.json({ error: 'Invalid data', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const services = new TenantServiceFactory(auth.tenantId);
    const chatSvc = services.createService<{ id?: string; role: string; text: string; createdAt: Date }>(
      ASSISTANT_CHAT_COLLECTION
    );

    // 1. Persiste a mensagem do operador.
    await chatSvc
      .create({ role: 'operator', text, createdAt: new Date() } as never)
      .catch((err) => {
        logger.warn('[assistant-message] failed to persist operator message', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

    const agentUrl = process.env.AGENT_SERVICE_URL;
    const agentSecret = process.env.AGENT_SHARED_SECRET;
    if (!agentUrl || !agentSecret) {
      return NextResponse.json(
        { ok: false, reply: 'O agente não está configurado no momento. Tente novamente mais tarde.' },
        { status: 503 }
      );
    }

    // 2. Chama o agente /operate em modo analista (read-only), assinando HMAC.
    const payload = JSON.stringify({
      tenant_id: auth.tenantId,
      message: text,
      mode: 'analista',
    });
    const ts = String(Date.now());
    const sig = crypto
      .createHmac('sha256', agentSecret)
      .update(`${ts}.`, 'utf8')
      .update(payload)
      .digest('hex');

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
      logger.warn('[assistant-message] agent unreachable', {
        error: e instanceof Error ? e.message : 'unknown',
      });
      return NextResponse.json(
        { ok: false, reply: 'Não consegui falar com o agente agora. Verifique se o serviço está online.' },
        { status: 503 }
      );
    }

    if (!agentResp.ok) {
      return NextResponse.json(
        { ok: false, reply: 'O agente retornou um erro ao processar a mensagem. Tente reformular.' },
        { status: 502 }
      );
    }

    const data = await agentResp.json();
    const reply: string = data.reply ?? data.message ?? '';

    // 3. Persiste a resposta da IA (só quando há conteúdo).
    if (reply) {
      await chatSvc
        .create({ role: 'assistant', text: reply, createdAt: new Date() } as never)
        .catch((err) => {
          logger.warn('[assistant-message] failed to persist assistant reply', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    return handleApiError(error);
  }
}
