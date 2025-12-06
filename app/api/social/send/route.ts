import { NextRequest, NextResponse } from 'next/server';
import { FacebookService } from '@/lib/services/facebook-service';
import { InstagramService } from '@/lib/services/instagram-service';
import { ConversationService } from '@/lib/services/conversation-service';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { RATE_LIMIT_CONFIG } from '@/lib/facebook/constants';

// In-memory rate limiter (per tenant)
// In production, consider using Redis for distributed rate limiting
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(tenantId: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const windowMs = RATE_LIMIT_CONFIG.windowMs;
    const maxRequests = RATE_LIMIT_CONFIG.maxRequests;

    const key = `tenant:${tenantId}`;
    const existing = rateLimitMap.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
        // New window
        rateLimitMap.set(key, { count: 1, windowStart: now });
        return { allowed: true };
    }

    if (existing.count >= maxRequests) {
        const retryAfterMs = windowMs - (now - existing.windowStart);
        return { allowed: false, retryAfterMs };
    }

    existing.count++;
    return { allowed: true };
}

// Clean up old rate limit entries periodically (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    const windowMs = RATE_LIMIT_CONFIG.windowMs;

    for (const [key, value] of rateLimitMap.entries()) {
        if (now - value.windowStart >= windowMs * 2) {
            rateLimitMap.delete(key);
        }
    }
}, 5 * 60 * 1000);

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const requestId = `social_send_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
        const body = await req.json();
        const { tenantId, conversationId, message } = body;

        logger.info('[SOCIAL-SEND] Request received', {
            requestId,
            tenantId: tenantId?.substring(0, 8) + '***',
            conversationId,
            messageLength: message?.length
        });

        if (!tenantId || !conversationId || !message) {
            return new NextResponse(JSON.stringify({
                error: 'Missing required fields',
                requiredFields: ['tenantId', 'conversationId', 'message']
            }), { status: 400 });
        }

        // Check rate limit
        const rateLimitResult = checkRateLimit(tenantId);
        if (!rateLimitResult.allowed) {
            logger.warn('[SOCIAL-SEND] Rate limit exceeded', {
                requestId,
                tenantId: tenantId?.substring(0, 8) + '***',
                retryAfterMs: rateLimitResult.retryAfterMs
            });

            return new NextResponse(JSON.stringify({
                error: 'Rate limit exceeded',
                retryAfterMs: rateLimitResult.retryAfterMs,
                requestId
            }), {
                status: 429,
                headers: {
                    'Retry-After': String(Math.ceil((rateLimitResult.retryAfterMs || 60000) / 1000))
                }
            });
        }

        // Initialize services
        const facebookService = new FacebookService();
        const instagramService = new InstagramService();
        const conversationService = new ConversationService();

        // 1. Get conversation to find social ID and channel
        const conversation = await conversationService.getById(conversationId, tenantId);

        if (!conversation) {
            logger.warn('[SOCIAL-SEND] Conversation not found', { requestId, conversationId });
            return new NextResponse(JSON.stringify({ error: 'Conversation not found' }), { status: 404 });
        }

        if (!conversation.socialId || (conversation.channel !== 'facebook' && conversation.channel !== 'instagram')) {
            logger.warn('[SOCIAL-SEND] Invalid channel or missing socialId', {
                requestId,
                conversationId,
                channel: conversation.channel,
                hasSocialId: !!conversation.socialId
            });
            return new NextResponse(JSON.stringify({ error: 'Invalid conversation channel or missing social ID' }), { status: 400 });
        }

        // 2. Send message via appropriate service based on channel
        const result = conversation.channel === 'instagram'
            ? await instagramService.sendText(conversation.socialId, message, tenantId)
            : await facebookService.sendText(conversation.socialId, message, tenantId);

        if (!result.success) {
            logger.error('[SOCIAL-SEND] Failed to send message', new Error(result.error || 'Unknown error'), {
                requestId,
                tenantId: tenantId?.substring(0, 8) + '***',
                conversationId,
                channel: conversation.channel
            });
            return new NextResponse(JSON.stringify({
                error: `Failed to send message to ${conversation.channel === 'instagram' ? 'Instagram' : 'Facebook'}`
            }), { status: 500 });
        }

        // 3. Save message to database no formato correto
        const now = new Date();
        const services = new TenantServiceFactory(tenantId);
        await services.messages.create({
            conversationId,
            tenantId,
            // Mensagem manual é sofiaMessage (enviada pelo atendente)
            clientMessage: null,
            clientMessageTimestamp: null,
            sofiaMessage: message,
            sofiaMessageTimestamp: now,
            createdAt: now,
        } as any);

        // Update conversation
        await services.conversations.update(conversationId, {
            lastMessage: message,
            lastMessageAt: now,
            updatedAt: now,
        } as any);

        const processingTime = Date.now() - startTime;
        logger.info('[SOCIAL-SEND] Message sent successfully', {
            requestId,
            tenantId: tenantId?.substring(0, 8) + '***',
            conversationId,
            channel: conversation.channel,
            messageId: result.messageId,
            processingTime
        });

        return new NextResponse(JSON.stringify({
            success: true,
            messageId: result.messageId,
            meta: { requestId, processingTime }
        }), { status: 200 });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error('[SOCIAL-SEND] Error in social send API', error instanceof Error ? error : new Error('Unknown error'), {
            requestId,
            processingTime
        });
        return new NextResponse(JSON.stringify({
            error: 'Internal Server Error',
            requestId
        }), { status: 500 });
    }
}
