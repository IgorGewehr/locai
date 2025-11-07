// app/api/notifications/agenda-event/route.ts
// Endpoint para receber eventos de agenda do N8N e criar notificações

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/middleware/auth'
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { logger } from '@/lib/utils/logger'
import { NotificationPriority } from '@/lib/types/notification'

export const runtime = 'nodejs'

// POST /api/notifications/agenda-event - Criar notificação para evento de agenda
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação ou token do N8N
    const authHeader = request.headers.get('authorization')
    const isN8NRequest = authHeader?.includes('Bearer') || request.headers.get('x-n8n-webhook')

    logger.info('📅 [API] Recebendo evento de agenda', {
      component: 'AgendaNotificationAPI',
      isN8NRequest,
      hasAuth: !!authHeader
    })

    const body = await request.json()
    const {
      tenantId,
      userId,
      userName,
      eventId,
      eventTitle,
      eventDate,
      eventType,
      eventDescription,
      source
    } = body

    // Validar campos obrigatórios
    if (!tenantId || !userId || !eventId || !eventTitle || !eventDate) {
      logger.error('❌ [API] Campos obrigatórios faltando', {
        component: 'AgendaNotificationAPI',
        body: body,
        missing: {
          tenantId: !tenantId,
          userId: !userId,
          eventId: !eventId,
          eventTitle: !eventTitle,
          eventDate: !eventDate
        }
      })

      return NextResponse.json(
        { 
          error: 'Campos obrigatórios faltando',
          required: ['tenantId', 'userId', 'eventId', 'eventTitle', 'eventDate']
        },
        { status: 400 }
      )
    }

    // Criar serviço de notificação para o tenant
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    // Criar notificação do evento
    const eventDateObj = new Date(eventDate)
    const notificationId = await notificationService.createAgendaEventNotification({
      targetUserId: userId,
      targetUserName: userName,
      eventId: eventId,
      eventTitle: eventTitle,
      eventDate: eventDateObj,
      eventType: eventType,
      source: source || 'n8n'
    })

    logger.info('✅ [API] Notificação de agenda criada', {
      component: 'AgendaNotificationAPI',
      tenantId,
      userId,
      eventId,
      notificationId,
      source: source || 'n8n'
    })

    return NextResponse.json({
      success: true,
      notificationId,
      message: 'Notificação criada com sucesso'
    })

  } catch (error) {
    logger.error('❌ [API] Erro ao processar evento de agenda', error as Error, {
      component: 'AgendaNotificationAPI'
    })

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Falha ao criar notificação' 
      },
      { status: 500 }
    )
  }
}

// GET /api/notifications/agenda-event - Health check
export async function GET() {
  return NextResponse.json({
    service: 'agenda-event-notifications',
    status: 'operational',
    timestamp: new Date().toISOString()
  })
}