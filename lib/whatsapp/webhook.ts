import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppWebhookData, WhatsAppWebhookVerification } from '@/lib/types/whatsapp'
import { WhatsAppMessageHandler } from './message-handler'
import { WhatsAppClient } from './client'
import { AIService } from '@/lib/services/ai-service'
import { ConversationService } from '@/lib/services/conversation-service'
import { AutomationService } from '@/lib/services/automation-service'
import { PropertyService } from '@/lib/services/property-service'
import { ReservationService } from '@/lib/services/reservation-service'

export class WhatsAppWebhook {
  private messageHandler: WhatsAppMessageHandler
  private verifyToken: string

  constructor(
    phoneNumberId: string,
    accessToken: string,
    verifyToken: string,
    tenantId: string
  ) {
    this.verifyToken = verifyToken

    // Initialize services
    const whatsappClient = new WhatsAppClient(phoneNumberId, accessToken)
    const aiService = new AIService(tenantId)
    const conversationService = new ConversationService(tenantId)
    const automationService = new AutomationService(tenantId)
    const propertyService = new PropertyService(tenantId)
    const reservationService = new ReservationService(tenantId)

    // Initialize message handler
    this.messageHandler = new WhatsAppMessageHandler(
      whatsappClient,
      aiService,
      conversationService,
      automationService,
      propertyService,
      reservationService
    )
  }

  async handleWebhook(request: NextRequest): Promise<NextResponse> {
    const method = request.method

    try {
      if (method === 'GET') {
        return this.handleVerification(request)
      }

      if (method === 'POST') {
        return this.handleIncomingWebhook(request)
      }

      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      )
    } catch (error) {
      console.error('Webhook error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  private async handleVerification(request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    console.log('Webhook verification request:', { mode, token, challenge })

    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('Webhook verified successfully')
      return new NextResponse(challenge, { status: 200 })
    }

    console.log('Webhook verification failed')
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  private async handleIncomingWebhook(request: NextRequest): Promise<NextResponse> {
    try {
      const body: WhatsAppWebhookData = await request.json()
      
      console.log('Incoming webhook:', JSON.stringify(body, null, 2))

      // Verify webhook signature (recommended for production)
      if (!this.verifyWebhookSignature(request, body)) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }

      // Process webhook entry
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          await this.processWebhookChange(change, body)
        }
      }

      return NextResponse.json({ success: true }, { status: 200 })

    } catch (error) {
      console.error('Error processing webhook:', error)
      
      // Return 200 to prevent WhatsApp from retrying
      return NextResponse.json(
        { error: 'Processing error', message: error.message },
        { status: 200 }
      )
    }
  }

  private async processWebhookChange(change: any, fullBody: WhatsAppWebhookData): Promise<void> {
    const { field, value } = change

    console.log(`Processing change for field: ${field}`)

    switch (field) {
      case 'messages':
        if (value.messages) {
          await this.messageHandler.handleIncomingMessage(fullBody)
        }
        if (value.statuses) {
          await this.messageHandler.handleStatusUpdate(fullBody)
        }
        break

      case 'message_template_status_update':
        await this.handleTemplateStatusUpdate(value)
        break

      case 'phone_number_name_update':
        await this.handlePhoneNumberUpdate(value)
        break

      case 'account_review_update':
        await this.handleAccountReviewUpdate(value)
        break

      case 'business_capability_update':
        await this.handleBusinessCapabilityUpdate(value)
        break

      default:
        console.log(`Unhandled webhook field: ${field}`)
    }
  }

  private verifyWebhookSignature(request: NextRequest, body: any): boolean {
    // In production, you should verify the webhook signature
    // using the X-Hub-Signature-256 header
    
    const signature = request.headers.get('X-Hub-Signature-256')
    if (!signature) {
      console.log('No signature provided, skipping verification for development')
      return true // Skip verification in development
    }

    // Implement signature verification here
    // Example using crypto:
    /*
    const crypto = require('crypto')
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex')
    
    return signature === expectedSignature
    */

    return true // For now, always return true
  }

  private async handleTemplateStatusUpdate(value: any): Promise<void> {
    console.log('Template status update:', value)
    
    // Handle template approval/rejection
    const { event, message_template_id, message_template_name, status } = value
    
    // Update template status in database
    // You can implement template management here
    
    console.log(`Template ${message_template_name} (${message_template_id}) status: ${status}`)
  }

  private async handlePhoneNumberUpdate(value: any): Promise<void> {
    console.log('Phone number update:', value)
    
    // Handle phone number name changes
    const { phone_number_id, display_name, verified_name } = value
    
    // Update phone number info in database
    console.log(`Phone number ${phone_number_id} name updated to: ${display_name}`)
  }

  private async handleAccountReviewUpdate(value: any): Promise<void> {
    console.log('Account review update:', value)
    
    // Handle account review status changes
    const { decision } = value
    
    if (decision === 'APPROVED') {
      console.log('WhatsApp Business account approved')
    } else if (decision === 'REJECTED') {
      console.log('WhatsApp Business account rejected')
    }
  }

  private async handleBusinessCapabilityUpdate(value: any): Promise<void> {
    console.log('Business capability update:', value)
    
    // Handle business capability changes
    const { capabilities } = value
    
    console.log('Business capabilities updated:', capabilities)
  }

  // Health check endpoint
  async healthCheck(): Promise<NextResponse> {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'whatsapp-webhook'
    })
  }

  // Webhook statistics
  async getWebhookStats(): Promise<any> {
    // Return webhook statistics
    return {
      totalMessages: 0, // Implement actual stats
      totalTemplates: 0,
      lastWebhookReceived: new Date().toISOString(),
      status: 'active'
    }
  }
}

// Utility function to create webhook instance
export function createWhatsAppWebhook(tenantId: string): WhatsAppWebhook {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN!

  if (!phoneNumberId || !accessToken || !verifyToken) {
    throw new Error('Missing required WhatsApp configuration')
  }

  return new WhatsAppWebhook(phoneNumberId, accessToken, verifyToken, tenantId)
}

// Webhook security middleware
export function validateWebhookSecurity(request: NextRequest): boolean {
  // Implement additional security checks
  const userAgent = request.headers.get('user-agent')
  const origin = request.headers.get('origin')
  
  // WhatsApp webhooks come from specific IPs and user agents
  // You can implement IP whitelist here
  
  return true // For now, always allow
}

// Rate limiting for webhook endpoints
export class WebhookRateLimiter {
  private requests: Map<string, number[]> = new Map()
  private maxRequests: number = 1000 // per minute
  private windowMs: number = 60 * 1000 // 1 minute

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, [])
    }
    
    const requests = this.requests.get(identifier)!
    
    // Remove old requests
    const recentRequests = requests.filter(time => time > windowStart)
    
    if (recentRequests.length >= this.maxRequests) {
      return false
    }
    
    recentRequests.push(now)
    this.requests.set(identifier, recentRequests)
    
    return true
  }
}

export const webhookRateLimiter = new WebhookRateLimiter()