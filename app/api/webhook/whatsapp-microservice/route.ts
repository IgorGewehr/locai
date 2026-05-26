import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { logger } from '@/lib/utils/logger'
import { WhatsAppStatusService } from '@/lib/services/whatsapp-status-service'
import { deduplicationCache } from '@/lib/cache/deduplication-cache'

/**
 * Webhook para receber mensagens do WhatsApp Microservice.
 * Eventos `message` são persistidos no Firestore via /api/webhook/client-message.
 * Atendimento manual — Sofia/IA não responde automaticamente.
 *
 * Fluxo: WhatsApp -> Microservice -> Este Webhook -> client-message -> Firestore
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
            // 1. Persist message to Firestore (for dashboard + history)
            await persistIncomingMessage(body.tenantId, body.data)

            // 2. Check if AI is blocked for this conversation before dispatching
            const clientFrom: string = body.data?.from || ''
            const normalizedFrom = clientFrom.replace(/@(c\.us|lid|g\.us|s\.whatsapp\.net)$/i, '')
            const redis = (await import('@/lib/redis/client')).getRedisClient()
            const blockKey = `ai_blocked:${body.tenantId}:${normalizedFrom}`
            const isBlocked = await redis.get(blockKey)

            if (isBlocked) {
                logger.info('🚫 AI blocked for this conversation, skipping agent dispatch', {
                    tenantId: body.tenantId?.substring(0, 8) + '***',
                    phone: normalizedFrom.substring(0, 6) + '***',
                })
            } else {
                // 3. Dispatch to AI agent (fire-and-forget)
                dispatchToAgent(body.tenantId, body.data).catch((err: unknown) => {
                    logger.error('❌ Agent dispatch error', {
                        error: err instanceof Error ? err.message : String(err),
                        tenantId: body.tenantId?.substring(0, 8) + '***',
                    })
                })
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
 * no Redis. Sem chamada para N8N — atendimento é manual.
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

        if (await deduplicationCache.checkAndMark(tenantId, messageId)) {
            logger.info('🔁 Message already processed, skipping', {
                tenantId: tenantId?.substring(0, 8) + '***',
                messageId: messageId?.substring(0, 8) + '***'
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
 * Dispatch incoming message to the Python LangGraph agent.
 *
 * The agent will:
 * 1. Build conversation history from Firestore
 * 2. Run the LangGraph property-search flow
 * 3. Send the AI response back via the whatsapp_microservice
 */
async function dispatchToAgent(tenantId: string, messageData: any) {
    const agentUrl = process.env.AGENT_SERVICE_URL
    const agentSecret = process.env.AGENT_SHARED_SECRET
    const microserviceUrl = process.env.WHATSAPP_MICROSERVICE_URL
    const microserviceApiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY

    if (!agentUrl || !agentSecret) {
        logger.warn('⚠️ AGENT_SERVICE_URL or AGENT_SHARED_SECRET not set — AI response skipped')
        return
    }

    const clientPhone: string = messageData.from || ''
    const replyJid: string = messageData.replyJid || clientPhone // Original JID for sending replies
    const message: string = messageData.message || messageData.text || ''
    const messageId: string = messageData.messageId || messageData.id || ''

    if (!clientPhone || !message) return

    // Fetch recent conversation history from Firestore
    let history: Array<{ role: string; content: string }> = []
    try {
        const { TenantServiceFactory } = await import('@/lib/firebase/firestore-v2')
        const services = new TenantServiceFactory(tenantId)
        // Get conversation by phone (field is `clientPhone`, set in client-message/route.ts)
        const conversations = await services.conversations.getWhere('clientPhone', '==', clientPhone)
        const conv = conversations[0]
        if (conv?.id) {
            const recentMessages = await services.messages.getMany(
                [{ field: 'conversationId', operator: '==', value: conv.id }],
                { orderBy: [{ field: 'createdAt', direction: 'desc' }], limit: 20 }
            )
            // Reverse to chronological order and flatten client/sofia pairs into role-based history
            for (const msg of recentMessages.reverse()) {
                if ((msg as any).clientMessage) {
                    history.push({ role: 'user', content: (msg as any).clientMessage })
                }
                if ((msg as any).sofiaMessage) {
                    history.push({ role: 'assistant', content: (msg as any).sofiaMessage })
                }
            }
        }
    } catch (err) {
        logger.warn('⚠️ Failed to load conversation history for agent', {
            error: err instanceof Error ? err.message : String(err),
        })
    }

    // Sign request with HMAC
    const crypto = await import('crypto')
    const payload = JSON.stringify({
        tenant_id: tenantId,
        conversation_id: `${tenantId}:${clientPhone}`,
        message_id: messageId,
        message,
        history,
        contact: { phone: clientPhone },
    })
    const ts = String(Date.now())
    const sig = crypto.createHmac('sha256', agentSecret).update(`${ts}.`, 'utf8').update(payload).digest('hex')

    const agentResp = await fetch(`${agentUrl}/process`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Agent-Signature': sig,
            'X-Agent-Timestamp': ts,
        },
        body: payload,
        signal: AbortSignal.timeout(55_000),
    })

    if (!agentResp.ok) {
        logger.error('❌ Agent returned error', { status: agentResp.status })
        return
    }

    const agentResult = await agentResp.json()
    const finalResponse: string = agentResult.final_response || ''
    const mediaUrls: string[] = agentResult.media_urls || []

    if (!finalResponse) {
        // Send a fallback so the user doesn't get silence
        if (microserviceUrl && microserviceApiKey) {
            await fetch(`${microserviceUrl}/api/v1/messages/${tenantId}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${microserviceApiKey}`,
                },
                body: JSON.stringify({ to: replyJid, message: 'Desculpa, tive um probleminha aqui. Pode repetir?' }),
                signal: AbortSignal.timeout(10_000),
            }).catch(() => {})
        }
        return
    }

    // Persist Sofia's response to Firestore (before sending to WhatsApp so it shows in Conversas)
    try {
        const { TenantServiceFactory } = await import('@/lib/firebase/firestore-v2')
        const svc = new TenantServiceFactory(tenantId)
        const convs = await svc.conversations.getWhere('clientPhone', '==', clientPhone)
        const convId = convs[0]?.id
        if (convId) {
            const now = new Date()
            await svc.messages.create({
                conversationId: convId,
                tenantId,
                clientMessage: null,
                clientMessageTimestamp: null,
                sofiaMessage: finalResponse,
                sofiaMessageTimestamp: now,
                createdAt: now,
                ...(mediaUrls.length > 0 && { sofiaMediaUrls: mediaUrls }),
            } as any)
            await svc.conversations.update(convId, {
                lastMessageAt: now,
                lastMessage: finalResponse.substring(0, 200),
                lastMessageFrom: 'sofia',
                updatedAt: now,
            } as any)
        }
    } catch (err) {
        logger.warn('Failed to persist agent response', {
            error: err instanceof Error ? err.message : String(err),
        })
    }

    // Send AI response back via whatsapp_microservice
    if (microserviceUrl && microserviceApiKey) {
        await fetch(`${microserviceUrl}/api/v1/messages/${tenantId}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${microserviceApiKey}`,
            },
            body: JSON.stringify({ to: replyJid, message: finalResponse }),
            signal: AbortSignal.timeout(10_000),
        })

        // Send media files if any (images/videos)
        for (const url of mediaUrls.slice(0, 5)) {
            const isVideo = url.match(/\.(mp4|mov|avi|webm)/i)
            await fetch(`${microserviceUrl}/api/v1/messages/${tenantId}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${microserviceApiKey}`,
                },
                body: JSON.stringify({
                    to: replyJid,
                    type: isVideo ? 'video' : 'image',
                    url,
                }),
                signal: AbortSignal.timeout(10_000),
            })
        }
    }

    logger.info('✅ Agent response dispatched', {
        tenantId: tenantId?.substring(0, 8) + '***',
        hasResponse: !!finalResponse,
        mediaCount: mediaUrls.length,
        intent: agentResult.intent,
    })
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