import { FacebookService } from '@/lib/services/facebook-service'
import { ConversationService } from '@/lib/services/conversation-service'
import { AIService } from '@/lib/services/ai-service-stub'
import { MessageType, MessageStatus, ConversationStatus, ConversationStage, ConversationIntent, ConversationPriority } from '@/lib/types/conversation'
import { logger } from '@/lib/utils/logger'

export class FacebookMessageHandler {
    private facebookService: FacebookService
    private conversationService: ConversationService
    private aiService: AIService
    private tenantId: string

    constructor(
        tenantId: string,
        facebookService?: FacebookService,
        conversationService?: ConversationService,
        aiService?: AIService
    ) {
        this.tenantId = tenantId
        this.facebookService = facebookService || new FacebookService()
        this.conversationService = conversationService || new ConversationService()
        this.aiService = aiService || new AIService(tenantId)
    }

    async handleWebhook(body: any): Promise<void> {
        try {
            if (body.object === 'page' || body.object === 'instagram') {
                for (const entry of body.entry) {
                    const webhookEvent = entry.messaging[0]
                    const senderId = webhookEvent.sender.id

                    // Check if it's a message
                    if (webhookEvent.message) {
                        await this.handleMessage(senderId, webhookEvent.message, body.object === 'instagram' ? 'instagram' : 'facebook')
                    }
                }
            }
        } catch (error) {
            logger.error('Error handling Facebook webhook:', error)
            throw error
        }
    }

    private async handleMessage(senderId: string, message: any, channel: 'facebook' | 'instagram'): Promise<void> {
        try {
            // 1. Find or create conversation
            let conversation = await this.conversationService.findBySocialId(senderId, channel, this.tenantId)

            if (!conversation) {
                // Get user profile for name
                const profile = await this.facebookService.getUserProfile(senderId, this.tenantId)
                const clientName = `${profile.firstName} ${profile.lastName}`.trim()

                conversation = await this.conversationService.createNewSocial(senderId, channel, clientName, this.tenantId)
            }

            // 2. Determine message type and content
            let content = message.text || ''
            let type = MessageType.TEXT
            let mediaUrl = undefined

            if (message.attachments && message.attachments.length > 0) {
                const attachment = message.attachments[0]
                const attachmentType = attachment.type

                switch (attachmentType) {
                    case 'image':
                        type = MessageType.IMAGE
                        content = 'Imagem recebida'
                        mediaUrl = attachment.payload.url
                        break
                    case 'video':
                        type = MessageType.VIDEO
                        content = 'Vídeo recebido'
                        mediaUrl = attachment.payload.url
                        break
                    case 'audio':
                        type = MessageType.AUDIO
                        content = 'Áudio recebido'
                        mediaUrl = attachment.payload.url
                        break
                    case 'file':
                        type = MessageType.DOCUMENT
                        content = 'Arquivo recebido'
                        mediaUrl = attachment.payload.url
                        break
                    case 'location':
                        type = MessageType.LOCATION
                        content = 'Localização recebida'
                        break
                    default:
                        type = MessageType.TEXT
                        content = 'Anexo recebido'
                }
            }

            // 3. Save incoming message
            const savedMessage = await this.conversationService.addMessage(
                conversation.id,
                {
                    content,
                    type,
                    direction: 'inbound',
                    socialMessageId: message.mid,
                    channel: channel,
                    timestamp: new Date(),
                    status: MessageStatus.RECEIVED,
                    isFromAI: false,
                    mediaUrl // Add mediaUrl to message if available (assuming Message type supports it or we add it to metadata)
                },
                this.tenantId
            )

            // 4. Process with AI
            // Only process text messages for now, unless we have vision capabilities
            if (type === MessageType.TEXT && message.text) {
                const aiResponse = await this.aiService.processMessage(message.text, conversation)

                if (aiResponse.content) {
                    // Send response via Facebook/Instagram
                    await this.facebookService.sendText(senderId, aiResponse.content, this.tenantId)

                    // Save AI response to database
                    await this.conversationService.addMessage(
                        conversation.id,
                        {
                            content: aiResponse.content,
                            type: MessageType.TEXT,
                            direction: 'outbound',
                            isFromAI: true,
                            channel: channel,
                            timestamp: new Date(),
                            status: MessageStatus.SENT
                        },
                        this.tenantId
                    )
                }
            }

        } catch (error) {
            logger.error('Error processing Facebook message:', error)
        }
    }
}
