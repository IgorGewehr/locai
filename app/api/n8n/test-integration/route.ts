import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Endpoint para testar integração completa com N8N
 * Simula o fluxo completo: Mensagem → N8N → Processamento → Resposta
 */

// GET /api/n8n/test-integration - Verificar configuração
export async function GET(request: NextRequest) {
    const config = {
        webhookUrl: process.env.N8N_WEBHOOK_URL,
        hasSecret: !!process.env.N8N_WEBHOOK_SECRET,
        hasApiKey: !!process.env.N8N_API_KEY,
        webhookConfigured: !!process.env.N8N_WEBHOOK_URL && process.env.N8N_WEBHOOK_URL.includes('n8n.cloud'),
        details: {
            webhookDomain: process.env.N8N_WEBHOOK_URL ? new URL(process.env.N8N_WEBHOOK_URL).hostname : null,
            isN8NCloud: process.env.N8N_WEBHOOK_URL?.includes('n8n.cloud'),
            secretLength: process.env.N8N_WEBHOOK_SECRET?.length || 0,
            apiKeyLength: process.env.N8N_API_KEY?.length || 0
        }
    };

    return NextResponse.json({
        success: true,
        message: 'Configuração N8N',
        configured: config.webhookConfigured && config.hasSecret && config.hasApiKey,
        config
    });
}

// POST /api/n8n/test-integration - Testar envio para N8N
export async function POST(request: NextRequest) {
    const testId = `n8n_test_${Date.now()}`;
    
    try {
        const body = await request.json();
        const { 
            message = 'Olá, gostaria de alugar um apartamento na praia',
            tenantId = 'test-tenant',
            clientPhone = '5511999999999',
            testType = 'simple' // simple, search, reservation
        } = body;

        logger.info('🧪 [N8N-TEST] Iniciando teste de integração', {
            testId,
            testType,
            message: message.substring(0, 50),
            n8nUrl: process.env.N8N_WEBHOOK_URL?.substring(0, 50) + '...'
        });

        // Preparar payload baseado no tipo de teste
        let testPayload;
        
        switch(testType) {
            case 'search':
                testPayload = {
                    tenantId,
                    data: {
                        from: clientPhone,
                        message: 'Quero um apartamento com 2 quartos na praia grande',
                        messageId: `${testId}_search`,
                        timestamp: new Date().toISOString()
                    },
                    event: 'message',
                    source: 'integration-test',
                    testId,
                    expectedAction: 'search_properties'
                };
                break;
                
            case 'reservation':
                testPayload = {
                    tenantId,
                    data: {
                        from: clientPhone,
                        message: 'Quero fazer uma reserva para o próximo fim de semana',
                        messageId: `${testId}_reservation`,
                        timestamp: new Date().toISOString()
                    },
                    event: 'message',
                    source: 'integration-test',
                    testId,
                    expectedAction: 'check_availability'
                };
                break;
                
            default:
                testPayload = {
                    tenantId,
                    data: {
                        from: clientPhone,
                        message,
                        messageId: `${testId}_simple`,
                        timestamp: new Date().toISOString()
                    },
                    event: 'message',
                    source: 'integration-test',
                    testId
                };
        }

        // Enviar para N8N
        const n8nUrl = process.env.N8N_WEBHOOK_URL;
        const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

        if (!n8nUrl || !n8nSecret) {
            return NextResponse.json({
                success: false,
                error: 'N8N não configurado',
                details: {
                    hasUrl: !!n8nUrl,
                    hasSecret: !!n8nSecret
                }
            }, { status: 400 });
        }

        logger.info('📤 [N8N-TEST] Enviando payload para N8N', {
            testId,
            url: n8nUrl.substring(0, 50) + '...',
            payloadSize: JSON.stringify(testPayload).length
        });

        const startTime = Date.now();
        
        const n8nResponse = await fetch(n8nUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-webhook-signature': n8nSecret,
                'X-Tenant-ID': tenantId,
                'X-Test-ID': testId,
                'User-Agent': 'LocAI-Frontend-Test/1.0'
            },
            body: JSON.stringify(testPayload),
            signal: AbortSignal.timeout(15000) // 15s timeout
        });

        const responseTime = Date.now() - startTime;
        const responseText = await n8nResponse.text().catch(() => '');
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { rawResponse: responseText };
        }

        logger.info(`${n8nResponse.ok ? '✅' : '❌'} [N8N-TEST] Resposta do N8N`, {
            testId,
            status: n8nResponse.status,
            responseTime: `${responseTime}ms`,
            ok: n8nResponse.ok
        });

        if (n8nResponse.ok) {
            return NextResponse.json({
                success: true,
                message: 'Teste enviado com sucesso para N8N',
                testId,
                n8nResponse: {
                    status: n8nResponse.status,
                    statusText: n8nResponse.statusText,
                    responseTime: `${responseTime}ms`,
                    data: responseData
                },
                payload: testPayload,
                instructions: {
                    step1: '✅ Mensagem enviada para N8N',
                    step2: '⏳ Aguarde o N8N processar',
                    step3: '📥 N8N deve chamar /api/whatsapp/send-n8n',
                    step4: '📱 Resposta será enviada ao WhatsApp',
                    monitoring: `grep "${testId}" logs/app.log`
                }
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'N8N rejeitou a mensagem',
                testId,
                n8nResponse: {
                    status: n8nResponse.status,
                    statusText: n8nResponse.statusText,
                    responseTime: `${responseTime}ms`,
                    data: responseData
                },
                troubleshooting: {
                    checkWebhook: 'Verifique se o webhook está ativo no N8N',
                    checkSecret: 'Confirme se x-webhook-signature está configurado',
                    checkWorkflow: 'Verifique se o workflow está publicado',
                    logs: `grep "${testId}" logs/app.log`
                }
            }, { status: 400 });
        }

    } catch (error) {
        logger.error('❌ [N8N-TEST] Erro no teste', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
        });

        return NextResponse.json({
            success: false,
            error: 'Falha no teste de integração',
            details: error instanceof Error ? error.message : 'Unknown error',
            possibleCauses: [
                'N8N webhook offline',
                'URL incorreta',
                'Timeout na conexão',
                'Workflow não publicado'
            ]
        }, { status: 500 });
    }
}