import { NextRequest, NextResponse } from 'next/server'
import { FacebookMessageHandler } from '@/lib/facebook/message-handler'
import { ConversationService } from '@/lib/services/conversation-service'
import { MessageType, MessageStatus } from '@/lib/types/conversation'
import { logger } from '@/lib/utils/logger'
import { collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { WEBHOOK_RETRY_CONFIG, CACHE_CONFIG } from '@/lib/facebook/constants';
import crypto from 'crypto';

// Verify Token - configured in Meta Developer Console
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || process.env.N8N_WEBHOOK_SECRET || 'locai_verify_token'

/**
 * Validate the signature of incoming webhook requests from Meta
 * This is REQUIRED for App Review approval
 *
 * Meta signs all webhook payloads with x-hub-signature-256 header
 * We must validate this signature using our App Secret
 */
function validateWebhookSignature(
    signature: string | null,
    payload: string
): { valid: boolean; error?: string } {
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appSecret) {
        logger.warn('[Facebook Webhook] FACEBOOK_APP_SECRET not configured - signature validation skipped');
        // Em desenvolvimento, permitir sem validação, mas logar warning
        if (process.env.NODE_ENV === 'development') {
            return { valid: true };
        }
        return { valid: false, error: 'App secret not configured' };
    }

    if (!signature) {
        logger.warn('[Facebook Webhook] Missing x-hub-signature-256 header');
        return { valid: false, error: 'Missing signature header' };
    }

    // O header vem no formato: sha256=<signature>
    const signatureParts = signature.split('=');
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
        logger.warn('[Facebook Webhook] Invalid signature format');
        return { valid: false, error: 'Invalid signature format' };
    }

    const receivedSignature = signatureParts[1];

    // Calcular a assinatura esperada
    const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(payload, 'utf8')
        .digest('hex');

    // Usar comparação de tempo constante para prevenir timing attacks
    const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
        logger.warn('[Facebook Webhook] Invalid signature - payload may have been tampered');
        return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
}

// Cache for tenant lookups (pageId -> tenantId)
// This reduces Firestore queries for high-volume webhooks
const tenantCache = new Map<string, { tenantId: string; expiresAt: number }>();

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    context: string,
    config = WEBHOOK_RETRY_CONFIG
): Promise<T> {
    let lastError: Error | null = null;
    let delay = config.initialDelayMs;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < config.maxRetries) {
                logger.warn(`[Webhook Retry] ${context} failed, attempt ${attempt}/${config.maxRetries}`, {
                    error: lastError.message,
                    nextRetryMs: delay
                });

                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
            }
        }
    }

    logger.error(`[Webhook Retry] ${context} failed after ${config.maxRetries} attempts`, lastError!);
    throw lastError;
}

/**
 * GET /api/facebook/webhook
 * Webhook verification endpoint for Meta
 */
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    logger.info('[Facebook Webhook] Verification request', { mode, hasToken: !!token, hasChallenge: !!challenge })

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            logger.info('[Facebook Webhook] Verification successful')
            return new NextResponse(challenge, { status: 200 })
        } else {
            logger.warn('[Facebook Webhook] Verification failed - token mismatch')
            return new NextResponse('Forbidden', { status: 403 })
        }
    }

    return new NextResponse('Bad Request', { status: 400 })
}

/**
 * POST /api/facebook/webhook
 * Receives webhook events from Facebook/Instagram
 *
 * IMPORTANTE: Este endpoint valida a assinatura x-hub-signature-256
 * enviada pela Meta para garantir autenticidade das requisições.
 * Isso é OBRIGATÓRIO para aprovação no App Review.
 */
export async function POST(req: NextRequest) {
    try {
        // Ler o body como texto para validação de assinatura
        const rawBody = await req.text();

        // Validar assinatura HMAC-SHA256 da Meta
        const signature = req.headers.get('x-hub-signature-256');
        const signatureValidation = validateWebhookSignature(signature, rawBody);

        if (!signatureValidation.valid) {
            logger.error('[Facebook Webhook] Signature validation failed', {
                error: signatureValidation.error,
                hasSignature: !!signature
            });

            // Em produção, rejeitar requisições com assinatura inválida
            // Retornar 401 para assinatura inválida (Meta vai parar de enviar)
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Parse do body após validação
        const body = JSON.parse(rawBody);

        logger.info('[Facebook Webhook] Received event', {
            object: body.object,
            entryCount: body.entry?.length || 0,
            signatureValid: true
        })

        // Handle Facebook Messenger / Instagram DM
        if (body.object === 'page' || body.object === 'instagram') {
            await handleMessagingEvent(body)
        }
        // Handle WhatsApp Business Account
        else if (body.object === 'whatsapp_business_account') {
            await handleWhatsAppEvent(body)
        }
        else {
            logger.warn('[Facebook Webhook] Unknown object type:', body.object)
        }

        // Always return 200 quickly to acknowledge receipt
        // Facebook will retry if we don't respond within 20 seconds
        return new NextResponse('EVENT_RECEIVED', { status: 200 })

    } catch (error) {
        logger.error('[Facebook Webhook] Error processing event:', error)
        // Still return 200 to prevent Facebook from retrying
        // Log the error but don't block the webhook
        return new NextResponse('EVENT_RECEIVED', { status: 200 })
    }
}

/**
 * Handle Facebook Messenger and Instagram DM events
 */
async function handleMessagingEvent(body: any): Promise<void> {
    // MVP: O fio FB/IG para a Sofia ANTIGA (ai-service-stub → sofia-agent-v3) está
    // DESATIVADO. O webhook continua respondendo 200 (acknowledge) para a Meta, mas
    // não roteia nada para a IA legada. Será religado ao agente LangGraph no futuro.
    logger.info('[Facebook Webhook] FB/IG desativado no MVP - evento de mensagem ignorado (Sofia antiga off)', {
        object: body?.object,
        entryCount: body?.entry?.length || 0
    })
    return

    // eslint-disable-next-line no-unreachable
    for (const entry of body.entry || []) {
        const pageId = entry.id
        const messaging = entry.messaging || []

        // Skip if no messaging events
        if (messaging.length === 0) {
            logger.debug('[Facebook Webhook] No messaging events in entry', { pageId })
            continue
        }

        // Find tenant for this page
        const tenantId = await findTenantByPageId(pageId)

        if (!tenantId) {
            logger.warn('[Facebook Webhook] No tenant found for page', {
                pageId,
                eventCount: messaging.length
            })
            continue
        }

        logger.info('[Facebook Webhook] Processing messaging events', {
            tenantId: tenantId.substring(0, 8) + '***',
            pageId,
            eventCount: messaging.length,
            channel: body.object
        })

        // Process with FacebookMessageHandler with retry logic
        try {
            await withRetry(
                async () => {
                    const handler = new FacebookMessageHandler(tenantId)
                    await handler.handleWebhook(body)
                },
                `Processing ${body.object} message for tenant ${tenantId.substring(0, 8)}***`
            );
        } catch (error) {
            // Error already logged by withRetry
            // Continue processing other entries
        }
    }
}

/**
 * Handle WhatsApp Business Account events
 */
async function handleWhatsAppEvent(body: any): Promise<void> {
    for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
            if (!change.value?.messages) continue

            const phoneNumberId = change.value.metadata?.phone_number_id
            if (!phoneNumberId) continue

            const tenantId = await findTenantByPhoneNumberId(phoneNumberId)

            if (!tenantId) {
                logger.warn('[Facebook Webhook] No tenant found for WhatsApp phone', { phoneNumberId })
                continue
            }

            const conversationService = new ConversationService()

            for (const message of change.value.messages) {
                try {
                    const from = message.from
                    const messageId = message.id
                    const timestamp = new Date(parseInt(message.timestamp) * 1000)

                    let content = ''
                    let type = MessageType.TEXT

                    if (message.type === 'text') {
                        content = message.text.body
                    } else if (message.type === 'image') {
                        content = message.image.id
                        type = MessageType.IMAGE
                    } else {
                        content = `[${message.type} message]`
                    }

                    // Find or create conversation
                    let conversation = await conversationService.findByPhone(from, tenantId)

                    if (!conversation) {
                        const contactName = change.value.contacts?.[0]?.profile?.name || from
                        conversation = await conversationService.createNew(from, tenantId, contactName)
                    }

                    // Add message
                    await conversationService.addMessage(conversation.id, {
                        content,
                        type,
                        direction: 'inbound',
                        channel: 'whatsapp',
                        timestamp,
                        status: MessageStatus.DELIVERED,
                        socialMessageId: messageId,
                        isFromAI: false
                    }, tenantId)

                } catch (error) {
                    logger.error('[Facebook Webhook] Error processing WhatsApp message:', error)
                }
            }
        }
    }
}

/**
 * Find tenant by Facebook Page ID
 * Uses caching to reduce Firestore queries
 */
async function findTenantByPageId(pageId: string): Promise<string | null> {
    try {
        // Check cache first
        const cached = tenantCache.get(`page:${pageId}`)
        if (cached && cached.expiresAt > Date.now()) {
            return cached.tenantId
        }

        const cacheTtl = CACHE_CONFIG.tenantLookupTtlMs;

        // Query Firestore
        const settingsQuery = query(
            collectionGroup(db, 'settings'),
            where('facebook.pageId', '==', pageId),
            limit(1)
        )

        const snapshot = await getDocs(settingsQuery)

        if (!snapshot.empty) {
            // Extract tenantId from document path: tenants/{tenantId}/settings/{settingsId}
            const docPath = snapshot.docs[0].ref.path
            const pathParts = docPath.split('/')
            const tenantIndex = pathParts.indexOf('tenants')

            let tenantId: string | null = null
            if (tenantIndex !== -1 && pathParts[tenantIndex + 1]) {
                tenantId = pathParts[tenantIndex + 1]
            } else {
                // Fallback: use document ID
                tenantId = snapshot.docs[0].id
            }

            if (tenantId) {
                // Cache the result
                tenantCache.set(`page:${pageId}`, {
                    tenantId,
                    expiresAt: Date.now() + cacheTtl
                })
            }

            return tenantId
        }

        // Also check Instagram settings (page might be connected via Instagram)
        const instagramQuery = query(
            collectionGroup(db, 'settings'),
            where('instagram.pageId', '==', pageId),
            limit(1)
        )

        const instagramSnapshot = await getDocs(instagramQuery)

        if (!instagramSnapshot.empty) {
            const docPath = instagramSnapshot.docs[0].ref.path
            const pathParts = docPath.split('/')
            const tenantIndex = pathParts.indexOf('tenants')

            let tenantId: string | null = null
            if (tenantIndex !== -1 && pathParts[tenantIndex + 1]) {
                tenantId = pathParts[tenantIndex + 1]
            } else {
                tenantId = instagramSnapshot.docs[0].id
            }

            if (tenantId) {
                tenantCache.set(`page:${pageId}`, {
                    tenantId,
                    expiresAt: Date.now() + cacheTtl
                })
            }

            return tenantId
        }

        return null

    } catch (error) {
        logger.error('[Facebook Webhook] Error finding tenant by Page ID:', error)
        return null
    }
}

/**
 * Find tenant by WhatsApp Phone Number ID
 */
async function findTenantByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    try {
        // Check cache first
        const cached = tenantCache.get(`phone:${phoneNumberId}`)
        if (cached && cached.expiresAt > Date.now()) {
            return cached.tenantId
        }

        const cacheTtl = CACHE_CONFIG.tenantLookupTtlMs;

        const settingsQuery = query(
            collectionGroup(db, 'settings'),
            where('whatsapp.phoneNumberId', '==', phoneNumberId),
            limit(1)
        )

        const snapshot = await getDocs(settingsQuery)

        if (!snapshot.empty) {
            const docPath = snapshot.docs[0].ref.path
            const pathParts = docPath.split('/')
            const tenantIndex = pathParts.indexOf('tenants')

            let tenantId: string | null = null
            if (tenantIndex !== -1 && pathParts[tenantIndex + 1]) {
                tenantId = pathParts[tenantIndex + 1]
            } else {
                tenantId = snapshot.docs[0].id
            }

            if (tenantId) {
                tenantCache.set(`phone:${phoneNumberId}`, {
                    tenantId,
                    expiresAt: Date.now() + cacheTtl
                })
            }

            return tenantId
        }

        return null

    } catch (error) {
        logger.error('[Facebook Webhook] Error finding tenant by Phone Number ID:', error)
        return null
    }
}
