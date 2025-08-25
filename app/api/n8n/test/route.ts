import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Endpoint de teste para validar integração com N8N
 * 
 * GET: Verifica configuração e status
 * POST: Simula envio de mensagem para N8N
 */

// GET /api/n8n/test - Verificar configuração
export async function GET(request: NextRequest) {
    try {
        const config = {
            n8n: {
                webhookUrl: !!process.env.N8N_WEBHOOK_URL,
                webhookSecret: !!process.env.N8N_WEBHOOK_SECRET,
                apiKey: !!process.env.N8N_API_KEY,
            },
            whatsapp: {
                microserviceUrl: !!process.env.WHATSAPP_MICROSERVICE_URL,
                microserviceApiKey: !!process.env.WHATSAPP_MICROSERVICE_API_KEY,
                webhookSecret: !!process.env.WHATSAPP_WEBHOOK_SECRET,
            }
        };

        const allConfigured = Object.values(config.n8n).every(v => v) && 
                             Object.values(config.whatsapp).every(v => v);

        logger.info('🔍 [N8N Test] Configuration check', {
            allConfigured,
            config
        });

        return NextResponse.json({
            success: true,
            configured: allConfigured,
            config,
            endpoints: {
                incoming: '/api/webhook/whatsapp-microservice',
                outgoing: '/api/whatsapp/send-n8n',
                functions: '/api/ai/functions/*'
            },
            flow: {
                step1: 'WhatsApp Microservice → POST /api/webhook/whatsapp-microservice',
                step2: 'Frontend → N8N Webhook (configurado em N8N_WEBHOOK_URL)',
                step3: 'N8N processa mensagem',
                step4: 'N8N → POST /api/whatsapp/send-n8n (com N8N_API_KEY)',
                step5: 'Frontend → WhatsApp Microservice (envia resposta)'
            },
            status: allConfigured ? 'ready' : 'missing_configuration'
        });

    } catch (error) {
        logger.error('❌ [N8N Test] Error checking configuration', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json({
            success: false,
            error: 'Configuration check failed'
        }, { status: 500 });
    }
}

// POST /api/n8n/test - Simular envio de mensagem
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenantId = 'test-tenant', message = 'Test message from N8N integration', simulate = false } = body;

        logger.info('🧪 [N8N Test] Starting integration test', {
            tenantId,
            message,
            simulate
        });

        // Verificar configuração primeiro
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
        const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

        if (!n8nWebhookUrl || !n8nSecret) {
            return NextResponse.json({
                success: false,
                error: 'N8N not configured',
                details: {
                    hasWebhookUrl: !!n8nWebhookUrl,
                    hasSecret: !!n8nSecret
                }
            }, { status: 400 });
        }

        // Se for simulação, apenas retornar o que seria enviado
        if (simulate) {
            const payload = {
                tenantId,
                data: {
                    from: '5511999999999',
                    message: message,
                    messageId: `test_${Date.now()}`,
                    timestamp: new Date().toISOString()
                },
                event: 'message',
                source: 'test-endpoint',
                webhookTimestamp: new Date().toISOString()
            };

            return NextResponse.json({
                success: true,
                simulated: true,
                wouldSendTo: n8nWebhookUrl,
                payload,
                headers: {
                    'Content-Type': 'application/json',
                    'x-webhook-signature': '***hidden***',
                    'X-Tenant-ID': tenantId,
                    'User-Agent': 'LocAI-Frontend/1.0'
                }
            });
        }

        // Enviar mensagem real para N8N
        const payload = {
            tenantId,
            data: {
                from: '5511999999999',
                message: message,
                messageId: `test_${Date.now()}`,
                timestamp: new Date().toISOString()
            },
            event: 'message',
            source: 'test-endpoint',
            webhookTimestamp: new Date().toISOString()
        };

        logger.info('📤 [N8N Test] Sending test message to N8N', {
            url: n8nWebhookUrl.substring(0, 50) + '...',
            tenantId
        });

        const n8nResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-webhook-signature': n8nSecret,
                'X-Tenant-ID': tenantId,
                'User-Agent': 'LocAI-Frontend/1.0'
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000) // 10s timeout
        });

        const responseText = await n8nResponse.text().catch(() => '');
        let responseJson;
        try {
            responseJson = JSON.parse(responseText);
        } catch {
            responseJson = { rawResponse: responseText };
        }

        if (n8nResponse.ok) {
            logger.info('✅ [N8N Test] Test message sent successfully', {
                status: n8nResponse.status,
                tenantId
            });

            return NextResponse.json({
                success: true,
                message: 'Test message sent to N8N successfully',
                n8nResponse: {
                    status: n8nResponse.status,
                    statusText: n8nResponse.statusText,
                    data: responseJson
                },
                nextStep: 'Check N8N workflow logs and wait for response at /api/whatsapp/send-n8n'
            });
        } else {
            logger.error('❌ [N8N Test] N8N rejected test message', {
                status: n8nResponse.status,
                response: responseText
            });

            return NextResponse.json({
                success: false,
                error: 'N8N rejected the message',
                n8nResponse: {
                    status: n8nResponse.status,
                    statusText: n8nResponse.statusText,
                    data: responseJson
                }
            }, { status: 400 });
        }

    } catch (error) {
        logger.error('❌ [N8N Test] Test failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json({
            success: false,
            error: 'Test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}