import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { logger } from '@/lib/utils/logger'
import { WhatsAppStatusService } from '@/lib/services/whatsapp-status-service'
import { deduplicationCache } from '@/lib/cache/deduplication-cache'
import { dispatchToAgent } from '@/lib/agent/dispatchToAgent'
import { findLeadByPhone, normalizeBrazilPhone } from '@/lib/services/lead-lookup'

/**
 * Webhook para receber mensagens do WhatsApp Microservice.
 *
 * Para cada evento `message`:
 *  1. Persiste a mensagem no Firestore via /api/webhook/client-message (dashboard + histórico).
 *  2. Despacha para o agente Sofia (LangGraph) em dispatchToAgent() — fire-and-forget;
 *     a resposta da IA é persistida e enviada de volta ao cliente pelo microservice.
 *
 * Fluxo:
 *   WhatsApp -> Microservice -> Este Webhook
 *     -> client-message (Firestore)
 *     -> agente POST /process -> /api/agent/tools/* -> resposta
 *     -> POST {microservice}/api/v1/messages/{tenantId}/send
 *
 * Nota: o agente é o motor de IA atual (substituiu o N8N). A resposta automática
 * só ocorre se AGENT_SERVICE_URL e AGENT_SHARED_SECRET estiverem configurados.
 */
export async function POST(request: NextRequest) {
    try {
        // Ler o body como text primeiro para preservar o formato original
        const rawBody = await request.text()
        const body = JSON.parse(rawBody)

        // ✅ AUTENTICAÇÃO MICROSERVICE - aceita tanto API Key quanto HMAC signature
        const authHeader = request.headers.get('Authorization')
        const signature = request.headers.get('X-Webhook-Signature')
        const tenantId = request.headers.get('X-Tenant-ID')
        const apiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY
        const secret = process.env.WHATSAPP_WEBHOOK_SECRET

        let authenticated = false

        // Método 1: Verificar API Key (mais simples)
        if (authHeader && authHeader.startsWith('Bearer ') && apiKey) {
            const token = authHeader.slice(7)
            if (token === apiKey) {
                authenticated = true
                logger.info('✅ Microservice authenticated via API Key', {
                    tenantId: tenantId?.substring(0, 8) + '***'
                })
            }
        }

        // Método 2: Verificar HMAC signature (fallback)
        if (!authenticated && secret && signature) {
            const expectedHex = crypto
                .createHmac('sha256', secret)
                .update(rawBody, 'utf8')
                .digest('hex')

            // O microservice envia o digest hex puro (sem prefixo). Aceitamos
            // ambos os formatos — com e sem o prefixo `sha256=` — para manter
            // compatibilidade independente de quem assina.
            const normalizedSignature = signature.startsWith('sha256=')
                ? signature.slice('sha256='.length)
                : signature

            if (normalizedSignature === expectedHex) {
                authenticated = true
                logger.info('✅ Microservice authenticated via HMAC signature', {
                    tenantId: tenantId?.substring(0, 8) + '***'
                })
            } else {
                logger.warn('🔍 HMAC signature mismatch', {
                    received: signature,
                    expected: expectedHex,
                    rawBodyLength: rawBody.length,
                    tenantId: tenantId?.substring(0, 8) + '***'
                })
            }
        }

        // Rejeitar se não autenticado
        if (!authenticated) {
            logger.error('❌ Microservice authentication failed', {
                hasAuthHeader: !!authHeader,
                hasSignature: !!signature,
                hasApiKey: !!apiKey,
                hasSecret: !!secret,
                tenantId: tenantId?.substring(0, 8) + '***'
            })
            return NextResponse.json(
                {
                    error: 'Authentication required',
                    message: 'Valid API Key or HMAC signature required'
                },
                { status: 401 }
            )
        }

        logger.info('📨 Received webhook from WhatsApp microservice', {
            event: body.event,
            tenantId: body.tenantId
        })

        // Atualizar status via service antes de processar eventos
        WhatsAppStatusService.updateStatusFromWebhook(body.tenantId, {
            event: body.event,
            ...body.data
        });

        // ✅ PROCESSAR DIFERENTES TIPOS DE EVENTOS
        if (body.event === 'message') {
            // Deduplicação ANTES de qualquer processamento. O microservice pode
            // reentregar o mesmo evento (retry/reconexão); sem este gate, uma
            // reentrega persistiria de novo E dispararia uma SEGUNDA resposta da
            // IA ao cliente. Marcar uma única vez aqui cobre persist + dispatch.
            const messageId: string | undefined = body.data?.messageId || body.data?.id
            if (messageId && await deduplicationCache.checkAndMark(body.tenantId, messageId)) {
                logger.info('🔁 Duplicate message — skipping persist + agent dispatch', {
                    tenantId: body.tenantId?.substring(0, 8) + '***',
                    messageId: messageId?.substring(0, 8) + '***',
                })
            } else {
                // 1. Persist message to Firestore (for dashboard + history)
                await persistIncomingMessage(body.tenantId, body.data)
                // 1b. Garantir que existe um Lead para este telefone (raiz do handoff —
                //     sem Lead, a tela de Atendimentos fica vazia). Fire-and-forget:
                //     idempotente por telefone e nunca bloqueia a resposta da IA.
                ensureLeadExists(body.tenantId, body.data).catch((err: unknown) => {
                    logger.error('❌ ensureLeadExists error', {
                        error: err instanceof Error ? err.message : String(err),
                        tenantId: body.tenantId?.substring(0, 8) + '***',
                    })
                })
                // 2. Dispatch to AI agent (fire-and-forget — does NOT block the webhook response)
                const clientPhone = body.data?.from || ''
                // replyJid is the original JID (e.g. 12345@lid) — MUST be used for
                // sending replies back. `from` may be a resolved phone or a bare LID
                // without suffix, which would be misrouted as @s.whatsapp.net.
                const replyJid = body.data?.replyJid || clientPhone
                const msgText = body.data?.message || body.data?.text || ''
                const msgId = body.data?.messageId || body.data?.id || ''
                const pushName = body.data?.pushName || body.data?.contactName || ''
                if (clientPhone && msgText) {
                    dispatchToAgent(body.tenantId, {
                        conversationId: `${body.tenantId}:${clientPhone}`,
                        messageId: msgId,
                        recipientId: replyJid,
                        contactName: pushName || clientPhone,
                        contactPhone: clientPhone,
                        message: msgText,
                        channel: 'whatsapp',
                        history: [],
                    }).catch((err: unknown) => {
                        logger.error('❌ Agent dispatch error', {
                            error: err instanceof Error ? err.message : String(err),
                            tenantId: body.tenantId?.substring(0, 8) + '***',
                        })
                    })
                }
            }
        } else if (body.event === 'status_change') {
            await processStatusChange(body.tenantId, body.data)
        } else if (body.event === 'qr_code') {
            await processQRCode(body.tenantId, body.data)
        }

        return NextResponse.json({
            success: true,
            message: 'Webhook processed successfully'
        })

    } catch (error) {
        logger.error('❌ WhatsApp microservice webhook error:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process webhook'
            },
            { status: 500 }
        )
    }
}

/**
 * Persistir mensagem entrante delegando para /api/webhook/client-message,
 * que já cuida de criar conversation, salvar message e publicar real-time
 * no Redis. A deduplicação é feita pelo chamador (POST handler) antes desta
 * função, então aqui não repetimos o check.
 */
async function persistIncomingMessage(tenantId: string, messageData: any) {
    try {
        const messageId = messageData.messageId || messageData.id;
        const clientPhone = messageData.from;
        const message = messageData.message || messageData.text;

        if (!messageId || !clientPhone || !message || message.trim() === '') {
            logger.warn('⚠️ Invalid message data, skipping', {
                tenantId: tenantId?.substring(0, 8) + '***',
                hasMessageId: !!messageId,
                hasClientPhone: !!clientPhone,
                hasMessage: !!message
            });
            return;
        }

        const apiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY;
        if (!apiKey) {
            logger.error('❌ WHATSAPP_MICROSERVICE_API_KEY not set — cannot delegate to client-message');
            return;
        }

        // Loopback evita round-trip externo via Cloudflare Tunnel.
        const internalPort = process.env.PORT || '7070';
        const internalUrl = `http://127.0.0.1:${internalPort}/api/webhook/client-message`;

        // Microservice envia `type` ∈ {text,image,video,document}; client-message
        // espera `mediaType` ∈ {image,video,audio,document}. Só repassa quando há
        // mídia de verdade (text vira undefined).
        const allowedMediaTypes = ['image', 'video', 'audio', 'document'] as const;
        const incomingType = messageData.type;
        const mediaType = allowedMediaTypes.includes(incomingType) ? incomingType : undefined;

        const payload = {
            tenantId,
            event: 'message',
            data: {
                from: clientPhone,
                message,
                messageId,
                timestamp: new Date().toISOString(),
                ...(messageData.mediaUrl && { mediaUrl: messageData.mediaUrl }),
                ...(mediaType && { mediaType }),
            }
        };

        const response = await fetch(internalUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'unable to read body');
            logger.error('❌ client-message rejected payload', {
                status: response.status,
                tenantId: tenantId?.substring(0, 8) + '***',
                body: errorText.substring(0, 200),
            });
            return;
        }

        logger.info('✅ Incoming message persisted via client-message', {
            tenantId: tenantId?.substring(0, 8) + '***',
            from: clientPhone?.substring(0, 6) + '***',
            messageId: messageId?.substring(0, 8) + '***',
        });
    } catch (error) {
        logger.error('❌ Error persisting incoming message:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            tenantId: tenantId?.substring(0, 8) + '***',
        });
    }
}

/**
 * Garante que existe um Lead para o telefone que está mandando mensagem.
 *
 * É a RAIZ do handoff: sem um Lead no caminho vivo, a tela de Atendimentos fica
 * vazia e o humano nunca vê a conversa pra assumir. Na 1ª mensagem de um telefone
 * novo cria o Lead (status NEW, source whatsapp, telefone NORMALIZADO via
 * lead-lookup); nas mensagens seguintes só atualiza `lastContactDate`.
 *
 * Idempotente por telefone: usa findLeadByPhone (que testa comDDI/semDDI/raw ×
 * phone/clientPhone) antes de criar, então não duplica Lead.
 *
 * Roda fire-and-forget (chamado com .catch no POST handler) — nunca bloqueia a
 * resposta da IA.
 */
async function ensureLeadExists(tenantId: string, messageData: any) {
    const rawPhone: string = messageData?.from || ''
    if (!tenantId || !rawPhone) return

    try {
        const { TenantServiceFactory } = await import('@/lib/firebase/firestore-v2')
        const { LeadStatus, LeadSource } = await import('@/lib/types/crm')
        const services = new TenantServiceFactory(tenantId)
        const now = new Date()

        // Idempotência: se já existe lead (em qualquer variação de telefone), só
        // atualiza o último contato. NÃO cria de novo.
        const existing = await findLeadByPhone(tenantId, rawPhone)
        if (existing) {
            await services.leads.update(existing.id, {
                lastContactDate: now,
            } as any)
            logger.info('🔄 Lead existente — lastContactDate atualizado', {
                tenantId: tenantId.substring(0, 8) + '***',
                leadId: existing.id,
                phone: rawPhone.substring(0, 6) + '***',
            })
            return
        }

        // Telefone NORMALIZADO consistente (comDDI 55) — mesmo helper usado no
        // resto do sistema, para que o lookup futuro sempre encontre.
        const phone = normalizeBrazilPhone(rawPhone)
        const name: string | undefined = messageData?.name || messageData?.pushName || undefined

        // 1ª mensagem deste telefone → cria o Lead. status NEW, source whatsapp.
        // create() já preenche createdAt/updatedAt e filtra undefineds.
        const leadId = await services.leads.create({
            tenantId,
            name: name || 'Lead WhatsApp',
            phone,
            clientPhone: phone,
            whatsappNumber: rawPhone,
            status: LeadStatus.NEW,
            source: LeadSource.WHATSAPP_AI,
            sourceDetails: 'Primeiro contato via WhatsApp — criado no webhook',
            score: 25,
            temperature: 'cold',
            qualificationCriteria: { budget: false, authority: false, need: false, timeline: false },
            preferences: {},
            firstContactDate: now,
            lastContactDate: now,
            totalInteractions: 1,
            tags: [],
        } as any)

        logger.info('✨ Lead criado no caminho vivo (webhook)', {
            tenantId: tenantId.substring(0, 8) + '***',
            leadId,
            phone: phone.substring(0, 6) + '***',
        })
    } catch (error) {
        logger.error('❌ Error ensuring lead exists:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            tenantId: tenantId?.substring(0, 8) + '***',
        })
    }
}

/**
 * Processar mudança de status (conectado, desconectado, etc.)
 */
async function processStatusChange(tenantId: string, statusData: any) {
    try {
        logger.info('🔄 Processing status change from microservice', {
            tenantId,
            status: statusData.status,
            event: statusData.event
        })

        // TODO: Implementar lógica de atualização de status no dashboard

    } catch (error) {
        logger.error('❌ Error processing status change:', error)
    }
}

/**
 * Processar QR code recebido
 */
async function processQRCode(tenantId: string, qrData: any) {
    try {
        logger.info('🔲 Processing QR code from microservice', {
            tenantId,
            hasQR: !!qrData.qrCode
        })

        // TODO: Implementar armazenamento e notificação do QR code

    } catch (error) {
        logger.error('❌ Error processing QR code:', error)
    }
}

/**
 * Verificação de webhook (similar ao padrão do WhatsApp Business API)
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    // Verificar token de validação
    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'locai-webhook-verify'

    if (mode === 'subscribe' && token === expectedToken && challenge) {
        logger.info('✅ Webhook validation successful')
        return new Response(challenge, { status: 200 })
    }

    logger.warn('❌ Webhook validation failed')
    return NextResponse.json(
        { error: 'Validation failed' },
        { status: 403 }
    )
}