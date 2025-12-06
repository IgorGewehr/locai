import { FacebookService } from '@/lib/services/facebook-service'
import { InstagramService } from '@/lib/services/instagram-service'
import { ConversationService } from '@/lib/services/conversation-service'
import { AIService } from '@/lib/services/ai-service-stub'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { MessageType } from '@/lib/types/conversation'
import { logger } from '@/lib/utils/logger'

/**
 * FacebookMessageHandler
 *
 * Handles incoming webhook events from both Facebook Messenger and Instagram DMs.
 * Processes messages, saves to database, generates AI responses, and sends replies.
 */
export class FacebookMessageHandler {
    private facebookService: FacebookService
    private instagramService: InstagramService
    private conversationService: ConversationService
    private aiService: AIService
    private tenantId: string

    constructor(
        tenantId: string,
        facebookService?: FacebookService,
        instagramService?: InstagramService,
        conversationService?: ConversationService,
        aiService?: AIService
    ) {
        this.tenantId = tenantId
        this.facebookService = facebookService || new FacebookService()
        this.instagramService = instagramService || new InstagramService()
        this.conversationService = conversationService || new ConversationService()
        this.aiService = aiService || new AIService(tenantId)
    }

    /**
     * Handle incoming webhook from Facebook/Instagram
     */
    async handleWebhook(body: any): Promise<void> {
        try {
            // Determine channel type
            const isInstagram = body.object === 'instagram'
            const channel: 'facebook' | 'instagram' = isInstagram ? 'instagram' : 'facebook'

            logger.info(`[MessageHandler] Processing ${channel} webhook`, {
                tenantId: this.tenantId.substring(0, 8) + '***',
                entryCount: body.entry?.length || 0
            })

            for (const entry of body.entry || []) {
                const messaging = entry.messaging || []

                for (const webhookEvent of messaging) {
                    const senderId = webhookEvent.sender?.id

                    if (!senderId) {
                        logger.warn('[MessageHandler] Missing sender ID in webhook event')
                        continue
                    }

                    // Handle incoming message
                    if (webhookEvent.message) {
                        await this.handleMessage(senderId, webhookEvent.message, channel)
                    }

                    // Handle message delivery receipts
                    if (webhookEvent.delivery) {
                        logger.debug('[MessageHandler] Delivery receipt received', {
                            mids: webhookEvent.delivery.mids
                        })
                    }

                    // Handle message read receipts
                    if (webhookEvent.read) {
                        logger.debug('[MessageHandler] Read receipt received', {
                            watermark: webhookEvent.read.watermark
                        })
                    }

                    // Handle postbacks (button clicks, quick replies)
                    if (webhookEvent.postback) {
                        await this.handlePostback(senderId, webhookEvent.postback, channel)
                    }
                }
            }
        } catch (error) {
            logger.error('[MessageHandler] Error handling webhook:', error)
            throw error
        }
    }

    /**
     * Handle incoming message
     */
    private async handleMessage(
        senderId: string,
        message: any,
        channel: 'facebook' | 'instagram'
    ): Promise<void> {
        try {
            logger.info(`[MessageHandler] Processing ${channel} message`, {
                senderId: senderId.substring(0, 8) + '***',
                hasText: !!message.text,
                hasAttachments: !!(message.attachments?.length)
            })

            // 1. Find or create conversation
            let conversation = await this.conversationService.findBySocialId(
                senderId,
                channel,
                this.tenantId
            )

            if (!conversation) {
                // Get user profile for name
                const profile = channel === 'instagram'
                    ? await this.instagramService.getUserProfile(senderId, this.tenantId)
                    : await this.facebookService.getUserProfile(senderId, this.tenantId)

                let clientName: string
                if (!profile) {
                    clientName = `${channel === 'instagram' ? 'Instagram' : 'Facebook'} User`
                } else if (channel === 'instagram') {
                    const igProfile = profile as { username?: string; name?: string }
                    clientName = igProfile.username || igProfile.name || 'Instagram User'
                } else {
                    const fbProfile = profile as { firstName?: string; lastName?: string }
                    clientName = `${fbProfile.firstName || ''} ${fbProfile.lastName || ''}`.trim() || 'Facebook User'
                }

                conversation = await this.conversationService.createNewSocial(
                    senderId,
                    channel,
                    clientName,
                    this.tenantId
                )

                logger.info(`[MessageHandler] Created new ${channel} conversation`, {
                    conversationId: conversation.id,
                    clientName
                })
            }

            // 2. Determine message type and content
            let content = message.text || ''
            let type = MessageType.TEXT
            let mediaUrl: string | undefined

            if (message.attachments && message.attachments.length > 0) {
                const attachment = message.attachments[0]
                const attachmentType = attachment.type

                switch (attachmentType) {
                    case 'image':
                        type = MessageType.IMAGE
                        content = content || 'Imagem recebida'
                        mediaUrl = attachment.payload?.url
                        break
                    case 'video':
                        type = MessageType.VIDEO
                        content = content || 'Vídeo recebido'
                        mediaUrl = attachment.payload?.url
                        break
                    case 'audio':
                        type = MessageType.AUDIO
                        content = content || 'Áudio recebido'
                        mediaUrl = attachment.payload?.url
                        break
                    case 'file':
                        type = MessageType.DOCUMENT
                        content = content || 'Arquivo recebido'
                        mediaUrl = attachment.payload?.url
                        break
                    case 'location':
                        type = MessageType.LOCATION
                        content = 'Localização recebida'
                        break
                    case 'share':
                        // Instagram story/post share
                        type = MessageType.TEXT
                        content = content || 'Conteúdo compartilhado'
                        mediaUrl = attachment.payload?.url
                        break
                    default:
                        type = MessageType.TEXT
                        content = content || 'Anexo recebido'
                }
            }

            // 3. Save incoming message
            const now = new Date()
            const services = new TenantServiceFactory(this.tenantId)

            await services.messages.create({
                conversationId: conversation.id,
                tenantId: this.tenantId,
                clientMessage: content,
                clientMessageTimestamp: now,
                sofiaMessage: null,
                sofiaMessageTimestamp: null,
                createdAt: now,
                ...(mediaUrl && { clientMediaUrls: [mediaUrl] }),
            } as any)

            // Update conversation
            await services.conversations.update(conversation.id!, {
                lastMessage: content,
                lastMessageAt: now,
                isRead: false,
                updatedAt: now,
            } as any)

            // 4. Process with AI (only for text messages)
            if (type === MessageType.TEXT && message.text) {
                try {
                    const aiResponse = await this.aiService.processMessage(message.text, conversation)

                    if (aiResponse.content) {
                        // Send response via appropriate channel
                        const sendResult = channel === 'instagram'
                            ? await this.instagramService.sendText(senderId, aiResponse.content, this.tenantId)
                            : await this.facebookService.sendText(senderId, aiResponse.content, this.tenantId)

                        if (sendResult.success) {
                            // Save AI response to database
                            const aiNow = new Date()
                            await services.messages.create({
                                conversationId: conversation.id,
                                tenantId: this.tenantId,
                                clientMessage: null,
                                clientMessageTimestamp: null,
                                sofiaMessage: aiResponse.content,
                                sofiaMessageTimestamp: aiNow,
                                createdAt: aiNow,
                            } as any)

                            // Update conversation
                            await services.conversations.update(conversation.id!, {
                                lastMessage: aiResponse.content,
                                lastMessageAt: aiNow,
                                updatedAt: aiNow,
                            } as any)
                        } else {
                            logger.error(`[MessageHandler] Failed to send ${channel} response`, new Error(sendResult.error || 'Unknown send error'))
                        }
                    }
                } catch (aiError) {
                    logger.error('[MessageHandler] AI processing error', aiError instanceof Error ? aiError : new Error(String(aiError)))
                }
            }

        } catch (error) {
            logger.error('[MessageHandler] Error processing message', error instanceof Error ? error : new Error(String(error)))
        }
    }

    /**
     * Handle postback events (button clicks, quick replies)
     */
    private async handlePostback(
        senderId: string,
        postback: any,
        channel: 'facebook' | 'instagram'
    ): Promise<void> {
        try {
            const payload = postback.payload
            const title = postback.title

            logger.info(`[MessageHandler] Processing ${channel} postback`, {
                senderId: senderId.substring(0, 8) + '***',
                payload,
                title
            })

            // Find conversation
            const conversation = await this.conversationService.findBySocialId(
                senderId,
                channel,
                this.tenantId
            )

            if (!conversation) {
                logger.warn('[MessageHandler] No conversation found for postback')
                return
            }

            // Process postback as a message
            const services = new TenantServiceFactory(this.tenantId)
            const now = new Date()

            await services.messages.create({
                conversationId: conversation.id,
                tenantId: this.tenantId,
                clientMessage: title || payload,
                clientMessageTimestamp: now,
                sofiaMessage: null,
                sofiaMessageTimestamp: null,
                createdAt: now,
            } as any)

            // Process with AI
            const aiResponse = await this.aiService.processMessage(
                title || payload,
                conversation
            )

            if (aiResponse.content) {
                const sendResult = channel === 'instagram'
                    ? await this.instagramService.sendText(senderId, aiResponse.content, this.tenantId)
                    : await this.facebookService.sendText(senderId, aiResponse.content, this.tenantId)

                if (sendResult.success) {
                    const aiNow = new Date()
                    await services.messages.create({
                        conversationId: conversation.id,
                        tenantId: this.tenantId,
                        clientMessage: null,
                        clientMessageTimestamp: null,
                        sofiaMessage: aiResponse.content,
                        sofiaMessageTimestamp: aiNow,
                        createdAt: aiNow,
                    } as any)
                }
            }
        } catch (error) {
            logger.error('[MessageHandler] Error processing postback:', error)
        }
    }
}
