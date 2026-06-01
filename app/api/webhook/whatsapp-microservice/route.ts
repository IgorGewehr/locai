import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { logger } from '@/lib/utils/logger'
import { WhatsAppStatusService } from '@/lib/services/whatsapp-status-service'
import { deduplicationCache } from '@/lib/cache/deduplication-cache'
import { dispatchToAgent } from '@/lib/agent/dispatchToAgent'

/**
 * Webhook para receber mensagens do WhatsApp Microservice.
 *
 * Fluxo:
 *   WhatsApp -> Microservice -> Este Webhook -> locai/agent (Python+LangGraph)
 *      -> agent processa, chama tools, envia resposta via /api/conversations/send
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
            const expectedSignature = 'sha256=' + crypto
                .createHmac('sha256', secret)
                .update(rawBody, 'utf8')
                .digest('hex')

            if (signature === expectedSignature) {
                authenticated = true
                logger.info('✅ Microservice authenticated via HMAC signature', {
                    tenantId: tenantId?.substring(0, 8) + '***'
                })
            } else {
                logger.warn('🔍 HMAC signature mismatch', {
                    received: signature,
                    expected: expectedSignature,
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
            await processIncomingMessageViaAgent(body.tenantId, body.data)
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
 * 🚀 NOVO PADRÃO: encaminhar a mensagem para o agent LangGraph.
 *
 * Fire-and-forget. O agent processa internamente, chama as tools que precisar
 * e dispara a resposta de volta via /api/conversations/send.
 */
async function processIncomingMessageViaAgent(tenantId: string, messageData: any) {
    try {
        const messageId = messageData.messageId || messageData.id
        const clientPhone = messageData.from
        const message = messageData.message || messageData.text

        if (!messageId || !clientPhone || !message || message.trim() === '') {
            logger.warn('⚠️ Invalid message data, skipping', {
                tenantId: tenantId?.substring(0, 8) + '***',
            })
            return
        }

        if (deduplicationCache.isDuplicate(tenantId, messageId)) {
            logger.info('🔁 Message already processed, skipping', {
                tenantId: tenantId?.substring(0, 8) + '***',
                messageId: messageId?.substring(0, 8) + '***',
            })
            return
        }
        deduplicationCache.markAsProcessed(tenantId, messageId)

        await dispatchToAgent(tenantId, {
            conversationId: messageData.conversationId || `wa_${tenantId}_${clientPhone}`,
            messageId,
            recipientId: clientPhone,
            channel: 'whatsapp',
            contactName: messageData.contactName || messageData.pushName || clientPhone,
            contactPhone: clientPhone,
            message,
            history: [],
        })

        logger.info('✅ Message dispatched to LangGraph agent', {
            tenantId: tenantId?.substring(0, 8) + '***',
            messageId: messageId?.substring(0, 8) + '***',
        })
    } catch (error) {
        logger.error('❌ Error dispatching to LangGraph agent:', {
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
