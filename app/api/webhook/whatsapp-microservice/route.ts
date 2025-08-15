import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { logger } from '@/lib/utils/logger'

/**
 * Webhook para receber mensagens do WhatsApp Microservice no DigitalOcean
 * Este endpoint é chamado quando mensagens chegam no microserviço
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verificar assinatura do webhook para segurança
    const signature = request.headers.get('X-Webhook-Signature')
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET
    
    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex')
      
      if (signature !== expectedSignature) {
        logger.error('❌ Invalid webhook signature from microservice')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }
    
    logger.info('📨 Received webhook from WhatsApp microservice', {
      event: body.event,
      tenantId: body.tenantId
    })

    // Processar diferentes tipos de eventos
    if (body.event === 'message') {
      await processIncomingMessage(body.tenantId, body.data)
    } else if (body.event === 'status_change') {
      await processStatusChange(body.tenantId, body.data)
    } else if (body.event === 'qr_code') {
      await processQRCode(body.tenantId, body.data)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully' 
    })

  } catch (error) {
    logger.error('❌ WhatsApp microservice webhook error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process webhook' 
      },
      { status: 500 }
    )
  }
}

/**
 * Processar mensagem recebida do microserviço
 */
async function processIncomingMessage(tenantId: string, messageData: any) {
  try {
    logger.info('📨 Processing incoming message from microservice', {
      tenantId,
      from: messageData.from?.substring(0, 6) + '***',
      messageId: messageData.id
    })

    // Aqui você pode integrar com seu sistema de processamento de mensagens
    // Por exemplo, chamar seu AI agent para responder automaticamente
    
    // Formato esperado do messageData:
    // {
    //   from: "+5511999999999",
    //   id: "message-id",
    //   timestamp: 1692123456789,
    //   text: "Mensagem do usuário",
    //   type: "text"
    // }

    // TODO: Integrar com o sistema de mensagens existente
    // const messageHandler = new MessageHandler(tenantId)
    // await messageHandler.handleIncomingMessage(messageData)
    
  } catch (error) {
    logger.error('❌ Error processing incoming message:', error)
  }
}

/**
 * Processar mudança de status (conectado, desconectado, etc.)
 */
async function processStatusChange(tenantId: string, statusData: any) {
  try {
    logger.info('🔄 Processing status change from microservice', {
      tenantId,
      status: statusData.status,
      event: statusData.event
    })

    // Formato esperado do statusData:
    // {
    //   status: "connected" | "disconnected" | "qr" | "connecting",
    //   phoneNumber: "+5511999999999", // se conectado
    //   event: "connected" | "disconnected" | "session_lost"
    // }

    // TODO: Atualizar status no dashboard, notificar usuário, etc.
    
  } catch (error) {
    logger.error('❌ Error processing status change:', error)
  }
}

/**
 * Processar QR code recebido
 */
async function processQRCode(tenantId: string, qrData: any) {
  try {
    logger.info('🔲 Processing QR code from microservice', {
      tenantId,
      hasQR: !!qrData.qrCode
    })

    // Formato esperado do qrData:
    // {
    //   qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    //   sessionId: "session-id"
    // }

    // TODO: Armazenar QR code para exibir no dashboard
    // TODO: Notificar frontend via WebSocket se necessário
    
  } catch (error) {
    logger.error('❌ Error processing QR code:', error)
  }
}

/**
 * Verificação de webhook (similar ao padrão do WhatsApp Business API)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verificar token de validação
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'locai-webhook-verify'
  
  if (mode === 'subscribe' && token === expectedToken && challenge) {
    logger.info('✅ Webhook validation successful')
    return new Response(challenge, { status: 200 })
  }

  logger.warn('❌ Webhook validation failed')
  return NextResponse.json(
    { error: 'Validation failed' },
    { status: 403 }
  )
}