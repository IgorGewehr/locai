import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppClient } from '@/lib/whatsapp/whatsapp-client-factory';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

const sendN8NMessageSchema = z.object({
    tenantId: z.string().min(1),
    clientPhone: z.string().regex(/^\d+$/),
    finalMessage: z.string().min(1),
    mediaUrl: z.string().url().optional(),
});

// POST /api/whatsapp/send-n8n - Send message from N8N workflow
export async function POST(request: NextRequest) {
    try {
        // ✅ AUTENTICAÇÃO N8N (API KEY)
        const authHeader = request.headers.get('Authorization');
        const expectedKey = process.env.N8N_API_KEY;

        if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== expectedKey) {
            logger.warn('❌ [N8N-WhatsApp] Unauthorized request', {
                hasAuth: !!authHeader,
                headerStart: authHeader?.substring(0, 10)
            });

            return NextResponse.json({
                success: false,
                error: 'Unauthorized - Valid N8N API key required'
            }, { status: 401 });
        }

        const body = await request.json();

        // ✅ VALIDAR INPUT
        const validation = sendN8NMessageSchema.safeParse(body);
        if (!validation.success) {
            logger.error('❌ [N8N-WhatsApp] Validation failed', {
                errors: validation.error.flatten()
            });

            return NextResponse.json({
                success: false,
                error: 'Validation failed',
                details: validation.error.flatten()
            }, { status: 400 });
        }

        const { tenantId, clientPhone, finalMessage, mediaUrl } = validation.data;

        logger.info('📤 [N8N-WhatsApp] Processing send request', {
            tenantId: tenantId.substring(0, 8) + '***',
            clientPhone: clientPhone.substring(0, 6) + '***',
            messageLength: finalMessage.length,
            hasMedia: !!mediaUrl
        });

        // ✅ CRIAR WHATSAPP CLIENT
        const whatsappClient = createWhatsAppClient(tenantId);

        // ✅ VERIFICAR CONEXÃO
        const status = await whatsappClient.getConnectionStatus();
        if (!status.connected) {
            logger.warn('⚠️ [N8N-WhatsApp] WhatsApp not connected', {
                tenantId: tenantId.substring(0, 8) + '***',
                status: status.status
            });

            return NextResponse.json({
                success: false,
                error: 'WhatsApp not connected',
                status: status.status
            }, { status: 400 });
        }

        // ✅ ENVIAR MENSAGEM
        if (mediaUrl) {
            await whatsappClient.sendImage(clientPhone, mediaUrl, finalMessage);
            logger.info('✅ [N8N-WhatsApp] Image message sent', {
                tenantId: tenantId.substring(0, 8) + '***',
                clientPhone: clientPhone.substring(0, 6) + '***'
            });
        } else {
            await whatsappClient.sendText(clientPhone, finalMessage);
            logger.info('✅ [N8N-WhatsApp] Text message sent', {
                tenantId: tenantId.substring(0, 8) + '***',
                clientPhone: clientPhone.substring(0, 6) + '***'
            });
        }

        return NextResponse.json({
            success: true,
            messageId: `n8n_${Date.now()}`,
            message: 'Message sent successfully via N8N workflow',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ [N8N-WhatsApp] Error sending message:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json({
            success: false,
            error: 'Failed to send message',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}