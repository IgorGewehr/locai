import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { logger } from '@/lib/utils/logger'
import { WhatsAppStatusService } from '@/lib/services/whatsapp-status-service'
import { deduplicationCache } from '@/lib/cache/deduplication-cache'

/**
 * Webhook para receber mensagens do WhatsApp Microservice no DigitalOcean
 * Este endpoint é chamado quando mensagens chegam no microserviço
 */
export async function POST(request: NextRequest) {
  try {
    // Ler o body como text primeiro para preservar o formato original
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)
    
    // Autenticação para microservice - aceita tanto API Key quanto HMAC signature
    const authHeader = request.headers.get('Authorization')
    const signature = request.headers.get('X-Webhook-Signature')
    const tenantId = request.headers.get('X-Tenant-ID')
    const apiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET
    
    let authenticated = false
    
    // Método 1: Verificar API Key (mais simples)
    if (authHeader && authHeader.startsWith('Bearer ') && apiKey) {
      const token = authHeader.slice(7)
      if (token === apiKey) {
        authenticated = true
        logger.info('✅ Microservice authenticated via API Key', {
          tenantId: tenantId?.substring(0, 8) + '***'
        })
      }
    }
    
    // Método 2: Verificar HMAC signature (fallback)
    if (!authenticated && secret && signature) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('hex')
      
      if (signature === expectedSignature) {
        authenticated = true
        logger.info('✅ Microservice authenticated via HMAC signature', {
          tenantId: tenantId?.substring(0, 8) + '***'
        })
      } else {
        // Debug para entender a diferença
        logger.warn('🔍 HMAC signature mismatch', {
          received: signature,
          expected: expectedSignature,
          rawBodyLength: rawBody.length,
          tenantId: tenantId?.substring(0, 8) + '***'
        })
      }
    }
    
    // Rejeitar se não autenticado
    if (!authenticated) {
      logger.error('❌ Microservice authentication failed', {
        hasAuthHeader: !!authHeader,
        hasSignature: !!signature,
        hasApiKey: !!apiKey,
        hasSecret: !!secret,
        tenantId: tenantId?.substring(0, 8) + '***'
      })
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'Valid API Key or HMAC signature required'
        },
        { status: 401 }
      )
    }
    
    logger.info('📨 Received webhook from WhatsApp microservice', {
      event: body.event,
      tenantId: body.tenantId
    })

    // Atualizar status via service antes de processar eventos
    WhatsAppStatusService.updateStatusFromWebhook(body.tenantId, {
      event: body.event,
      ...body.data
    });

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
    const messageId = messageData.messageId || messageData.id;
    const clientPhone = messageData.from;
    const message = messageData.message || messageData.text;

    // Validações básicas para evitar loops
    if (!messageId || !clientPhone || !message || message.trim() === '') {
      logger.warn('⚠️ Invalid message data, skipping', {
        tenantId: tenantId?.substring(0, 8) + '***',
        hasMessageId: !!messageId,
        hasClientPhone: !!clientPhone,
        hasMessage: !!message
      });
      return;
    }

    // Filtro adicional: ignorar mensagens muito curtas que podem ser ruído
    if (message.trim().length < 2) {
      logger.info('📞 Message too short, ignoring', {
        tenantId: tenantId?.substring(0, 8) + '***',
        clientPhone: clientPhone?.substring(0, 6) + '***',
        messageLength: message.length
      });
      return;
    }

    logger.info('📨 Processing incoming message from microservice', {
      tenantId: tenantId?.substring(0, 8) + '***',
      from: clientPhone?.substring(0, 6) + '***',
      messageId: messageId?.substring(0, 8) + '***',
      messageLength: message.length
    })

    // REATIVADO: Sistema de deduplicação usando cache centralizado
    if (deduplicationCache.isDuplicate(tenantId, messageId)) {
      logger.info('🔁 Message already processed, skipping', {
        tenantId: tenantId?.substring(0, 8) + '***',
        messageId: messageId?.substring(0, 8) + '***'
      });
      return; // Ignorar mensagem duplicada
    }
    
    // Marcar mensagem como processada
    deduplicationCache.markAsProcessed(tenantId, messageId);
    
    logger.info('✅ Processing new message', {
      tenantId: tenantId?.substring(0, 8) + '***',
      clientPhone: clientPhone?.substring(0, 6) + '***',
      messageLength: message.length,
      messageId: messageId?.substring(0, 8) + '***'
    });

    // Integração com Sofia Agent para processamento automático
    const { sofiaAgent } = await import('@/lib/ai-agent/sofia-agent');
    
    const response = await sofiaAgent.processMessage({
      message,
      clientPhone,
      tenantId,
      metadata: {
        source: 'whatsapp-microservice',
        priority: 'high',
        skipHeavyProcessing: true,
        messageId,
        bypassDeduplication: true // Flag para indicar bypass
      }
    });

    // Verificar se resposta não está vazia (evitar envio de respostas vazias)
    if (!response.reply || response.reply.trim() === '') {
      logger.warn('⚠️ Empty response from Sofia, skipping send', {
        tenantId: tenantId?.substring(0, 8) + '***',
        clientPhone: clientPhone?.substring(0, 6) + '***',
        messageId: messageId?.substring(0, 8) + '***'
      });
      return;
    }

    // Enviar resposta de volta ao microservice
    await sendResponseToMicroservice({
      tenantId,
      to: clientPhone,
      message: response.reply,
      originalMessageId: messageId
    });

    logger.info('✅ Message processed and response sent', {
      tenantId: tenantId?.substring(0, 8) + '***',
      clientPhone: clientPhone?.substring(0, 6) + '***',
      responseTime: response.responseTime,
      functionsExecuted: response.functionsExecuted.length,
      replyLength: response.reply?.length || 0,
      stage: response.metadata?.stage
    });
    
  } catch (error) {
    logger.error('❌ Error processing incoming message:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId?.substring(0, 8) + '***',
      messageId: messageData.messageId?.substring(0, 8) + '***'
    });
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
 * Enviar resposta de volta ao microservice WhatsApp
 */
async function sendResponseToMicroservice(params: {
  tenantId: string
  to: string
  message: string
  originalMessageId: string
}) {
  try {
    const microserviceUrl = process.env.WHATSAPP_MICROSERVICE_URL
    const apiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY
    
    if (!microserviceUrl) {
      logger.warn('⚠️ WHATSAPP_MICROSERVICE_URL not configured, skipping response')
      return
    }

    const response = await fetch(`${microserviceUrl}/api/v1/messages/${params.tenantId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Tenant-ID': params.tenantId
      },
      body: JSON.stringify({
        to: params.to,
        message: params.message,
        type: 'text'
      }),
      // Timeout agressivo para não bloquear webhook
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    
    logger.info('✅ Response sent to microservice', {
      tenantId: params.tenantId,
      to: params.to.substring(0, 6) + '***',
      messageId: result.messageId,
      originalMessageId: params.originalMessageId
    })

  } catch (error) {
    logger.error('❌ Error sending response to microservice:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: params.tenantId,
      to: params.to.substring(0, 6) + '***'
    })
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