import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { logger } from '@/lib/utils/logger'
import { WhatsAppStatusService } from '@/lib/services/whatsapp-status-service'
import { deduplicationCache } from '@/lib/cache/deduplication-cache'

/**
 * Webhook para receber mensagens do WhatsApp Microservice no DigitalOcean
 * Este endpoint é chamado quando mensagens chegam no microserviço
 *
 * NOVA VERSÃO: Integrada com N8N Workflow
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
            await processIncomingMessageViaN8N(body.tenantId, body.data)
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
 * 🚀 NOVA FUNÇÃO: Processar mensagem enviando para N8N Workflow
 */
async function processIncomingMessageViaN8N(tenantId: string, messageData: any) {
    try {
        const messageId = messageData.messageId || messageData.id;
        const clientPhone = messageData.from;
        const message = messageData.message || messageData.text;

        // ✅ VALIDAÇÕES BÁSICAS (mantém as mesmas do código original)
        if (!messageId || !clientPhone || !message || message.trim() === '') {
            logger.warn('⚠️ Invalid message data, skipping', {
                tenantId: tenantId?.substring(0, 8) + '***',
                hasMessageId: !!messageId,
                hasClientPhone: !!clientPhone,
                hasMessage: !!message
            });
            return;
        }

        // Filtro adicional: ignorar mensagens muito curtas que podem ser ruído
        if (message.trim().length < 2) {
            logger.info('📞 Message too short, ignoring', {
                tenantId: tenantId?.substring(0, 8) + '***',
                clientPhone: clientPhone?.substring(0, 6) + '***',
                messageLength: message.length
            });
            return;
        }

        logger.info('📨 Processing incoming message via N8N', {
            tenantId: tenantId?.substring(0, 8) + '***',
            from: clientPhone?.substring(0, 6) + '***',
            messageId: messageId?.substring(0, 8) + '***',
            messageLength: message.length
        })

        // ✅ SISTEMA DE DEDUPLICAÇÃO (mantém igual)
        if (deduplicationCache.isDuplicate(tenantId, messageId)) {
            logger.info('🔁 Message already processed, skipping', {
                tenantId: tenantId?.substring(0, 8) + '***',
                messageId: messageId?.substring(0, 8) + '***'
            });
            return;
        }

        deduplicationCache.markAsProcessed(tenantId, messageId);

        // 🚀 NOVA LÓGICA: Chamar N8N Workflow
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
        const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

        if (!n8nWebhookUrl || !n8nSecret) {
            logger.error('❌ N8N configuration missing', {
                hasWebhookUrl: !!n8nWebhookUrl,
                hasSecret: !!n8nSecret,
                tenantId: tenantId?.substring(0, 8) + '***'
            });

            // ⚠️ FALLBACK para Sofia Agent (manter funcionalidade atual)
            logger.warn('⚠️ N8N not configured, falling back to Sofia Agent');
            return await processWithSofiaFallback(tenantId, messageData);
        }

        logger.info('🚀 Sending message to N8N workflow', {
            url: n8nWebhookUrl.substring(0, 50) + '...',
            tenantId: tenantId?.substring(0, 8) + '***'
        });

        // 🎯 PAYLOAD para N8N (exatamente como esperado pelo webhook node)
        const n8nPayload = {
            tenantId,
            data: {
                from: clientPhone,
                message: message,
                messageId: messageId,
                timestamp: new Date().toISOString()
            },
            event: 'message',
            source: 'whatsapp-microservice',
            webhookTimestamp: new Date().toISOString()
        };

        const n8nResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-webhook-signature': n8nSecret, // N8N vai validar isso (minúsculo!)
                'X-Tenant-ID': tenantId,
                'User-Agent': 'LocAI-Frontend/1.0'
            },
            body: JSON.stringify(n8nPayload),
            signal: AbortSignal.timeout(30000) // 30s timeout
        });

        if (n8nResponse.ok) {
            logger.info('✅ Message sent to N8N successfully', {
                tenantId: tenantId?.substring(0, 8) + '***',
                clientPhone: clientPhone?.substring(0, 6) + '***',
                messageId: messageId?.substring(0, 8) + '***',
                status: n8nResponse.status
            });

            // 🎉 N8N vai processar e depois chamar /api/whatsapp/send-n8n
            // Não precisamos fazer mais nada aqui!

        } else {
            const errorText = await n8nResponse.text().catch(() => 'Unable to read error response');
            throw new Error(`N8N responded with ${n8nResponse.status}: ${errorText}`);
        }

    } catch (error) {
        logger.error('❌ Error calling N8N workflow:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            tenantId: tenantId?.substring(0, 8) + '***',
            stack: error instanceof Error ? error.stack?.substring(0, 200) : undefined
        });

        // ⚠️ FALLBACK em caso de erro com N8N
        logger.warn('⚠️ N8N call failed, falling back to Sofia Agent');
        return await processWithSofiaFallback(tenantId, messageData);
    }
}

/**
 * 🛡️ FUNÇÃO DE FALLBACK: Manter Sofia Agent funcionando se N8N falhar
 */
async function processWithSofiaFallback(tenantId: string, messageData: any) {
    try {
        const messageId = messageData.messageId || messageData.id;
        const clientPhone = messageData.from;
        const message = messageData.message || messageData.text;

        logger.info('🤖 Processing with Sofia Agent fallback', {
            tenantId: tenantId?.substring(0, 8) + '***',
            clientPhone: clientPhone?.substring(0, 6) + '***'
        });

        // Importar Sofia Agent dinamicamente
        const { sofiaAgent } = await import('@/lib/ai-agent/sofia-agent');

        const response = await sofiaAgent.processMessage({
            message,
            clientPhone,
            tenantId,
            metadata: {
                source: 'whatsapp-microservice-fallback',
                priority: 'high',
                skipHeavyProcessing: true,
                messageId,
                bypassDeduplication: true
            }
        });

        // Verificar se resposta não está vazia
        if (!response.reply || response.reply.trim() === '') {
            logger.warn('⚠️ Empty response from Sofia fallback', {
                tenantId: tenantId?.substring(0, 8) + '***',
                clientPhone: clientPhone?.substring(0, 6) + '***'
            });
            return;
        }

        // Enviar resposta via microservice
        await sendResponseToMicroservice({
            tenantId,
            to: clientPhone,
            message: response.reply,
            originalMessageId: messageId
        });

        logger.info('✅ Sofia fallback message processed successfully', {
            tenantId: tenantId?.substring(0, 8) + '***',
            clientPhone: clientPhone?.substring(0, 6) + '***',
            responseTime: response.responseTime,
            replyLength: response.reply.length
        });

    } catch (error) {
        logger.error('❌ Sofia fallback also failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            tenantId: tenantId?.substring(0, 8) + '***'
        });
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
 * 📤 FUNÇÃO PARA FALLBACK: Enviar resposta de volta ao microservice WhatsApp
 */
async function sendResponseToMicroservice(params: {
    tenantId: string
    to: string
    message: string
    originalMessageId: string
}) {
    try {
        const microserviceUrl = process.env.WHATSAPP_MICROSERVICE_URL
        const apiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY

        if (!microserviceUrl) {
            logger.warn('⚠️ WHATSAPP_MICROSERVICE_URL not configured, skipping response')
            return
        }

        const response = await fetch(`${microserviceUrl}/api/v1/messages/${params.tenantId}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Tenant-ID': params.tenantId
            },
            body: JSON.stringify({
                to: params.to,
                message: params.message,
                type: 'text'
            }),
            // Timeout agressivo para não bloquear webhook
            signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()

        logger.info('✅ Fallback response sent to microservice', {
            tenantId: params.tenantId,
            to: params.to.substring(0, 6) + '***',
            messageId: result.messageId,
            originalMessageId: params.originalMessageId
        })

    } catch (error) {
        logger.error('❌ Error sending fallback response to microservice:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            tenantId: params.tenantId,
            to: params.to.substring(0, 6) + '***'
        })
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