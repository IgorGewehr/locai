import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppClient } from '@/lib/whatsapp/client'
import { WhatsAppMessageHandler } from '@/lib/whatsapp/message-handler'
import { AIService } from '@/lib/services/ai-service'
import { AutomationService } from '@/lib/services/automation-service'
import { WhatsAppWebhookData } from '@/lib/types/whatsapp'

// Initialize services
const tenantId = process.env.TENANT_ID || 'default'
const whatsappClient = new WhatsAppClient(
  process.env.WHATSAPP_PHONE_NUMBER_ID!,
  process.env.WHATSAPP_ACCESS_TOKEN!
)
const aiService = new AIService(tenantId)
const automationService = new AutomationService(tenantId, whatsappClient, aiService)
const messageHandler = new WhatsAppMessageHandler(
  whatsappClient,
  aiService,
  undefined as any, // conversationService will be injected
  automationService,
  undefined as any, // propertyService will be injected
  undefined as any  // reservationService will be injected
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log('WhatsApp webhook verification:', { mode, token, challenge })

    if (!mode || !token || !challenge) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify the webhook
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified successfully')
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    console.log('WhatsApp webhook verification failed')
    return NextResponse.json(
      { error: 'Invalid verification token' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error in WhatsApp webhook verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppWebhookData = await request.json()
    
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2))

    // Validate webhook structure
    if (!body.entry || !Array.isArray(body.entry) || body.entry.length === 0) {
      console.log('Invalid webhook structure - no entries')
      return NextResponse.json({ success: true }) // Return success to avoid retries
    }

    // Process each entry
    for (const entry of body.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) {
        continue
      }

      for (const change of entry.changes) {
        if (change.field !== 'messages') {
          continue
        }

        const value = change.value
        
        // Process incoming messages
        if (value.messages && Array.isArray(value.messages)) {
          for (const message of value.messages) {
            try {
              console.log(`Processing message from ${message.from}: ${message.text?.body || message.type}`)
              
              // Create webhook data for message handler
              const messageWebhookData: WhatsAppWebhookData = {
                object: body.object,
                entry: [{
                  id: entry.id,
                  changes: [{
                    value: {
                      messaging_product: value.messaging_product,
                      metadata: value.metadata,
                      contacts: value.contacts,
                      messages: [message]
                    },
                    field: 'messages'
                  }]
                }]
              }

              await messageHandler.handleIncomingMessage(messageWebhookData)
            } catch (error) {
              console.error(`Error processing message ${message.id}:`, error)
              
              // Send error message to user
              try {
                await whatsappClient.sendText(
                  message.from,
                  'Desculpe, ocorreu um erro temporário. Nossa equipe foi notificada. Tente novamente em alguns instantes.'
                )
              } catch (sendError) {
                console.error('Failed to send error message:', sendError)
              }
            }
          }
        }

        // Process message status updates
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            try {
              console.log(`Processing status update for message ${status.id}: ${status.status}`)
              
              // Create webhook data for status handler
              const statusWebhookData: WhatsAppWebhookData = {
                object: body.object,
                entry: [{
                  id: entry.id,
                  changes: [{
                    value: {
                      messaging_product: value.messaging_product,
                      metadata: value.metadata,
                      statuses: [status]
                    },
                    field: 'messages'
                  }]
                }]
              }

              await messageHandler.handleStatusUpdate(statusWebhookData)
            } catch (error) {
              console.error(`Error processing status ${status.id}:`, error)
            }
          }
        }

        // Process errors if any
        if (value.errors && Array.isArray(value.errors)) {
          for (const error of value.errors) {
            console.error('WhatsApp API error:', error)
            
            const errorWebhookData: WhatsAppWebhookData = {
              object: body.object,
              entry: [{
                id: entry.id,
                changes: [{
                  value: {
                    messaging_product: value.messaging_product,
                    metadata: value.metadata,
                    errors: [error]
                  },
                  field: 'messages'
                }]
              }]
            }

            await messageHandler.handleError(errorWebhookData)
          }
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    
    // Return success to avoid webhook retries for parsing errors
    return NextResponse.json({ success: true })
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}