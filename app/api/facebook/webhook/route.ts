import { NextRequest, NextResponse } from 'next/server'
import { FacebookMessageHandler } from '@/lib/facebook/message-handler'
import { ConversationService } from '@/lib/services/conversation-service'
import { MessageType, MessageStatus } from '@/lib/types/conversation'
import { logger } from '@/lib/utils/logger'
import { collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Verify Token should be in env
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'locai_verify_token'

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            logger.info('WEBHOOK_VERIFIED')
            return new NextResponse(challenge, { status: 200 })
        } else {
            return new NextResponse('Forbidden', { status: 403 })
        }
    }

    return new NextResponse('Bad Request', { status: 400 })
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Handle Facebook/Instagram Pages
        if (body.object === 'page' || body.object === 'instagram') {
            for (const entry of body.entry) {
                const pageId = entry.id;
                const tenantId = await findTenantByPageId(pageId);

                if (tenantId) {
                    const handler = new FacebookMessageHandler(tenantId)
                    await handler.handleWebhook(body)
                } else {
                    logger.warn(`No tenant found for Page ID: ${pageId}`)
                }
            }
        }
        // Handle WhatsApp Business Account
        else if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.value && change.value.messages) {
                        const phoneNumberId = change.value.metadata.phone_number_id;
                        const tenantId = await findTenantByPhoneNumberId(phoneNumberId);

                        if (tenantId) {
                            const conversationService = new ConversationService();

                            for (const message of change.value.messages) {
                                // Process incoming WhatsApp message
                                const from = message.from; // Sender phone number
                                const messageId = message.id;
                                const timestamp = new Date(parseInt(message.timestamp) * 1000);

                                let content = '';
                                let type = MessageType.TEXT;

                                if (message.type === 'text') {
                                    content = message.text.body;
                                } else if (message.type === 'image') {
                                    content = message.image.id; // Or fetch URL if needed
                                    type = MessageType.IMAGE;
                                } else {
                                    content = `[${message.type} message]`;
                                }

                                // Find or create conversation
                                let conversation = await conversationService.getByPhone(from, tenantId);

                                if (!conversation) {
                                    const contactName = change.value.contacts?.[0]?.profile?.name || from;
                                    conversation = await conversationService.create({
                                        clientPhone: from,
                                        clientName: contactName,
                                        channel: 'whatsapp',
                                        status: 'active',
                                        unreadCount: 0,
                                        tenantId
                                    });
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
                                }, tenantId);
                            }
                        } else {
                            logger.warn(`No tenant found for WhatsApp Phone ID: ${phoneNumberId}`)
                        }
                    }
                }
            }
        }

        return new NextResponse('EVENT_RECEIVED', { status: 200 })
    } catch (error) {
        logger.error('Error in Facebook webhook:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

// Helper to find tenant by Page ID
async function findTenantByPageId(pageId: string): Promise<string | null> {
    try {
        const settingsQuery = query(
            collectionGroup(db, 'settings'),
            where('facebook.pageId', '==', pageId),
            limit(1)
        );

        const snapshot = await getDocs(settingsQuery);

        if (!snapshot.empty) {
            return snapshot.docs[0].id;
        }

        return null;
    } catch (error) {
        logger.error('Error finding tenant by Page ID:', error);
        return null;
    }
}

// Helper to find tenant by WhatsApp Phone Number ID
async function findTenantByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    try {
        const settingsQuery = query(
            collectionGroup(db, 'settings'),
            where('whatsapp.phoneNumberId', '==', phoneNumberId),
            limit(1)
        );

        const snapshot = await getDocs(settingsQuery);

        if (!snapshot.empty) {
            return snapshot.docs[0].id;
        }

        return null;
    } catch (error) {
        logger.error('Error finding tenant by Phone Number ID:', error);
        return null;
    }
}
