/**
 * Resume dispatch (interno) — chamado pelo WORKER (Functions) após o agente
 * `/resume`. O worker já tem o final_response/media_urls; aqui aplicamos:
 * persiste + envia ao cliente + transiciona estado + marca task resumida
 * (idempotente). Lógica em `lib/conversation/resume.ts` (compartilhada com o
 * caminho do dono em /api/agent/owner-answer). Auth HMAC via validateAgentRequest.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAgentRequest } from '@/lib/middleware/agent-auth';
import { logger } from '@/lib/utils/logger';
import { dispatchResume, derivePhoneFromConversationId } from '@/lib/conversation/resume';
import type { ConversationState } from '@/lib/conversation/state';

const NEXT_STATES = ['ATIVA', 'FECHAMENTO', 'AGUARDANDO_HUMANO'] as const;

const Schema = z.object({
  tenant_id: z.string().min(1),
  conversation_id: z.string().min(1),
  task_id: z.string().min(1),
  phone: z.string().optional(),
  final_response: z.string().nullable().optional(),
  media_urls: z.array(z.string()).optional().default([]),
  next_state: z.enum(NEXT_STATES).optional().default('ATIVA'),
});

export async function POST(request: NextRequest) {
  const { authenticated, body } = await validateAgentRequest(request);
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 });
  }

  const { tenant_id, conversation_id, task_id, final_response, media_urls, next_state } = parsed.data;
  const phone = derivePhoneFromConversationId(conversation_id, parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ error: 'Could not derive phone' }, { status: 400 });
  }

  try {
    const applied = await dispatchResume({
      tenantId: tenant_id,
      conversationId: conversation_id,
      phone,
      taskId: task_id,
      finalResponse: final_response ?? null,
      mediaUrls: media_urls,
      nextState: next_state as ConversationState,
    });
    logger.info('[resume-dispatch] processado', {
      tenantId: tenant_id.substring(0, 8) + '***',
      taskId: task_id,
      applied,
    });
    return NextResponse.json({ ok: true, applied });
  } catch (err) {
    logger.error('[resume-dispatch] error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ ok: false, error: 'resume-dispatch failed' }, { status: 500 });
  }
}
