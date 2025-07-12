import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppClient } from '@/lib/whatsapp/client'
import { WhatsAppMessageHandler } from '@/lib/whatsapp/message-handler'
import { AIService } from '@/lib/services/ai-service'
import { AutomationService } from '@/lib/services/automation-service'
import { ConversationService } from '@/lib/services/conversation-service'
import { PropertyService } from '@/lib/services/property-service'
import { ReservationService } from '@/lib/services/reservation-service'
import { WhatsAppWebhookData, WhatsAppWebhookEntry, WhatsAppWebhookChange } from '@/lib/types/whatsapp'
import { rateLimiters } from '@/lib/utils/rate-limiter'
import { ErrorHandler, ValidationError } from '@/lib/utils/error-handler'
import { sanitizeUserInput, validateJSON } from '@/lib/utils/validation'
import { handleApiError } from '@/lib/utils/api-errors'
import crypto from 'crypto'
import { z } from 'zod'
import { getTenantId } from '@/lib/utils/tenant'

// Initialize services
const tenantId = getTenantId()
const whatsappClient = new WhatsAppClient(
  process.env.WHATSAPP_PHONE_NUMBER_ID!,
  process.env.WHATSAPP_ACCESS_TOKEN!
)
const aiService = new AIService(tenantId)
const conversationService = new ConversationService()
const propertyService = new PropertyService()
const reservationService = new ReservationService()
const automationService = new AutomationService(tenantId, whatsappClient, aiService)
const messageHandler = new WhatsAppMessageHandler(
  whatsappClient,
  aiService,
  conversationService,
  automationService,
  propertyService,
  reservationService
)

// Message deduplication cache (stores message IDs for 5 minutes)
const processedMessages = new Map<string, number>()
const MESSAGE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Clean up old message IDs periodically
setInterval(() => {
  const now = Date.now()
  for (const [messageId, timestamp] of processedMessages.entries()) {
    if (now - timestamp > MESSAGE_CACHE_TTL) {
      processedMessages.delete(messageId)
    }
  }
}, 60 * 1000) // Run every minute

// Webhook payload validation schemas
const WebhookEntrySchema = z.object({
  id: z.string(),
  changes: z.array(z.object({
    value: z.object({
      messaging_product: z.string(),
      metadata: z.object({
        display_phone_number: z.string(),
        phone_number_id: z.string(),
      }),
      contacts: z.array(z.object({
        profile: z.object({ name: z.string() }),
        wa_id: z.string(),
      })).optional(),
      messages: z.array(z.any()).optional(),
      statuses: z.array(z.any()).optional(),
      errors: z.array(z.any()).optional(),
    }),
    field: z.string(),
  })),
})

const WebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(WebhookEntrySchema),
})

// Verify webhook signature
function verifyWebhookSignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get('x-hub-signature-256')
  if (!signature) {
    return false
  }

  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex')

  const providedSignature = signature.replace('sha256=', '')

  // Use timing-safe comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  )

  if (!isValid) {
    }

  return isValid
}

// Log webhook event
async function logWebhookEvent(
  type: 'received' | 'processed' | 'error',
  data: any,
  error?: any
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    tenantId,
    data,
    error: error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : undefined,
  }

  // In production, send to logging service
  // TODO: Add proper logging - Webhook Event

  // Store critical events in Firestore for auditing
  // TODO: Implement proper logging service
  if (type === 'error' || (type === 'processed' && data.messageId)) {
    try {
      // await conversationService.db.collection('webhook_logs').add(logEntry)
      // TODO: Add proper logging - Webhook log
    } catch (logError) {
      // TODO: Add proper logging - Logging error
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    await logWebhookEvent('received', {
      method: 'GET',
      params: { mode, token: token ? '***' : null, challenge: challenge ? '***' : null },
    })

    if (!mode || !token || !challenge) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Sanitize challenge parameter
    const sanitizedChallenge = sanitizeUserInput(challenge)

    // Verify the webhook
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      await logWebhookEvent('processed', {
        method: 'GET',
        result: 'webhook_verified',
      })

      return new NextResponse(sanitizedChallenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    await logWebhookEvent('error', {
      method: 'GET',
      error: 'invalid_verification_token',
    })

    return NextResponse.json(
      { error: 'Invalid verification token' },
      { status: 403 }
    )
  } catch (error) {
    await logWebhookEvent('error', { method: 'GET' }, error)
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify webhook signature
    if (!verifyWebhookSignature(request, rawBody)) {
      await logWebhookEvent('error', {
        method: 'POST',
        error: 'invalid_signature',
      })
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse and validate JSON
    let body: WhatsAppWebhookData
    try {
      body = validateJSON(rawBody)
    } catch (error) {
      await logWebhookEvent('error', {
        method: 'POST',
        error: 'invalid_json',
      })
      return NextResponse.json({ success: true }) // Return success to avoid retries
    }

    // Validate webhook payload structure
    try {
      WebhookPayloadSchema.parse(body)
    } catch (validationError) {
      await logWebhookEvent('error', {
        method: 'POST',
        error: 'invalid_payload_structure',
        details: validationError,
      })
      return NextResponse.json({ success: true }) // Return success to avoid retries
    }

    await logWebhookEvent('received', {
      method: 'POST',
      object: body.object,
      entryCount: body.entry?.length || 0,
    })

    // Validate webhook structure
    if (!body.entry || !Array.isArray(body.entry) || body.entry.length === 0) {
      await logWebhookEvent('error', {
        method: 'POST',
        error: 'no_entries',
      })
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
              // Check for duplicate message
              if (processedMessages.has(message.id)) {
                await logWebhookEvent('processed', {
                  messageId: message.id,
                  result: 'duplicate_skipped',
                })
                continue
              }

              // Rate limiting check
              try {
                await rateLimiters.whatsapp.checkLimit({
                  phone: message.from,
                })
              } catch (rateLimitError) {
                await logWebhookEvent('error', {
                  messageId: message.id,
                  error: 'rate_limit_exceeded',
                  phone: message.from,
                })

                // Send rate limit message
                await whatsappClient.sendText(
                  message.from,
                  'Você está enviando muitas mensagens. Por favor, aguarde um momento antes de enviar mais mensagens.'
                )
                continue
              }

              // Mark message as processed
              processedMessages.set(message.id, Date.now())

              await logWebhookEvent('processed', {
                messageId: message.id,
                from: message.from,
                type: message.type,
                text: message.text?.body ? sanitizeUserInput(message.text.body).substring(0, 100) : undefined,
              })

              // Create webhook data for message handler
              const messageWebhookData: WhatsAppWebhookData = {
                object: body.object,
                entry: [{
                  id: entry.id,
                  changes: [{
                    value: {
                      messaging_product: value.messaging_product,
                      metadata: value.metadata,
                      contacts: value.contacts || [],
                      messages: [message]
                    },
                    field: 'messages'
                  }]
                }]
              }

              // Process with timeout
              await ErrorHandler.withTimeout(
                async () => await messageHandler.handleIncomingMessage(messageWebhookData),
                30000, // 30 seconds timeout
                `Message processing for ${message.id}`
              )

            } catch (error) {
              await logWebhookEvent('error', {
                messageId: message.id,
                from: message.from,
              }, error)

              // Send error message to user
              try {
                await whatsappClient.sendText(
                  message.from,
                  'Desculpe, ocorreu um erro temporário. Nossa equipe foi notificada. Tente novamente em alguns instantes.'
                )
              } catch (sendError) {
                }
            }
          }
        }

        // Process message status updates
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            try {
              await logWebhookEvent('processed', {
                statusId: status.id,
                status: status.status,
                recipient: status.recipient_id,
              })

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
              await logWebhookEvent('error', {
                statusId: status.id,
              }, error)
            }
          }
        }

        // Process errors if any
        if ((value as any).errors && Array.isArray((value as any).errors)) {
          for (const error of (value as any).errors) {
            await logWebhookEvent('error', {
              whatsappError: error,
              metadata: value.metadata,
            })

            const errorWebhookData: WhatsAppWebhookData = {
              object: body.object,
              entry: [{
                id: entry.id,
                changes: [{
                  value: {
                    messaging_product: value.messaging_product,
                    metadata: value.metadata,
                    contacts: [],
                    messages: [],
                    ...{ errors: [error] }
                  } as any,
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
    await logWebhookEvent('error', { method: 'POST' }, error)

    // For critical errors, still return success to avoid infinite webhook retries
    // but log the error for investigation
    return NextResponse.json({ success: true })
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}