import { NextRequest, NextResponse } from 'next/server';
import { FacebookService } from '@/lib/services/facebook-service';
import { ConversationService } from '@/lib/services/conversation-service';
import { logger } from '@/lib/utils/logger';
import { MessageType, MessageStatus } from '@/lib/types/conversation';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tenantId, conversationId, message } = body;

        if (!tenantId || !conversationId || !message) {
            return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        // Initialize services
        const facebookService = new FacebookService();
        const conversationService = new ConversationService();

        // 1. Get conversation to find social ID and channel
        const conversation = await conversationService.getById(conversationId, tenantId);

        if (!conversation) {
            return new NextResponse(JSON.stringify({ error: 'Conversation not found' }), { status: 404 });
        }

        if (!conversation.socialId || (conversation.channel !== 'facebook' && conversation.channel !== 'instagram')) {
            return new NextResponse(JSON.stringify({ error: 'Invalid conversation channel or missing social ID' }), { status: 400 });
        }

        // 2. Send message via Facebook Graph API
        const result = await facebookService.sendText(conversation.socialId, message, tenantId);

        if (!result.success) {
            logger.error('Failed to send Facebook message', new Error(String(result.error)), { tenantId, conversationId });
            return new NextResponse(JSON.stringify({ error: 'Failed to send message to Facebook/Instagram' }), { status: 500 });
        }

        // 3. Save message to database
        await conversationService.addMessage(
            conversationId,
            {
                content: message,
                type: MessageType.TEXT,
                direction: 'outbound',
                channel: conversation.channel,
                timestamp: new Date(),
                status: MessageStatus.SENT,
                socialMessageId: result.messageId,
                isFromAI: false
            },
            tenantId
        );

        return new NextResponse(JSON.stringify({ success: true, messageId: result.messageId }), { status: 200 });

    } catch (error) {
        logger.error('Error in social send API:', error);
        return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
