// lib/utils/notification-triggers.ts
// Utility functions to trigger notifications for critical events

import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority, NotificationChannel } from '@/lib/types/notification'
import { logger } from '@/lib/utils/logger'
import type { ConversationHeader } from '@/lib/types/conversation'

/**
 * Trigger notification when a new conversation is created
 */
export async function triggerNewConversationNotification(
  tenantId: string,
  conversation: ConversationHeader,
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.CONVERSATION_STARTED,
      title: '💬 Nova Conversa',
      message: `Nova conversa iniciada ${conversation.clientName ? `com ${conversation.clientName}` : ''} (${conversation.clientPhone}). Total de mensagens: ${conversation.messageCount || 0}.`,
      entityType: 'ticket',
      entityId: conversation.id || '',
      entityData: {
        clientName: conversation.clientName,
        clientPhone: conversation.clientPhone,
        messageCount: conversation.messageCount,
        status: conversation.status
      },
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_conversations',
        label: 'Ver Conversas',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard/conversas'
        }
      }],
      metadata: {
        source: 'conversation_system',
        triggerEvent: 'conversation_started',
        conversationId: conversation.id
      }
    })

    logger.info('[Notification Trigger] New conversation notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      conversationId: conversation.id,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send new conversation notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      conversationId: conversation.id
    })
    // Don't throw - notification failure shouldn't break the main flow
  }
}

/**
 * Trigger notification when a reservation is created
 */
export async function triggerReservationCreatedNotification(
  tenantId: string,
  reservationId: string,
  data: {
    propertyName: string
    clientName: string
    checkIn: Date
    checkOut: Date
    totalAmount: number
    guests: number
    nights: number
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.RESERVATION_CREATED,
      title: '🎉 Nova Reserva Criada',
      message: `Reserva confirmada para ${data.propertyName} de ${data.checkIn.toLocaleDateString('pt-BR')} até ${data.checkOut.toLocaleDateString('pt-BR')}. Cliente: ${data.clientName}. Total: R$ ${data.totalAmount.toFixed(2)}.`,
      entityType: 'reservation',
      entityId: reservationId,
      entityData: data,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_reservation',
        label: 'Ver Reserva',
        type: 'primary',
        action: 'navigate',
        config: {
          url: `/dashboard/reservations/${reservationId}`
        }
      }],
      metadata: {
        source: 'reservation_api',
        triggerEvent: 'reservation_created',
        reservationId
      }
    })

    logger.info('[Notification Trigger] Reservation created notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      reservationId,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send reservation notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      reservationId
    })
  }
}

/**
 * Trigger notification when a payment is received
 */
export async function triggerPaymentReceivedNotification(
  tenantId: string,
  transactionId: string,
  data: {
    amount: number
    paymentMethod: string
    category: string
    description: string
    propertyName?: string
    clientName?: string
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.PAYMENT_RECEIVED,
      title: '💰 Pagamento Recebido',
      message: `Pagamento de R$ ${data.amount.toFixed(2)} recebido${data.clientName ? ` de ${data.clientName}` : ''}${data.propertyName ? ` (${data.propertyName})` : ''}. Método: ${data.paymentMethod}.`,
      entityType: 'payment',
      entityId: transactionId,
      entityData: data,
      priority: data.amount >= 1000 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_transactions',
        label: 'Ver Transações',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard/transactions'
        }
      }],
      metadata: {
        source: 'transaction_api',
        triggerEvent: 'payment_received',
        transactionId
      }
    })

    logger.info('[Notification Trigger] Payment received notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      transactionId,
      amount: data.amount,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send payment notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      transactionId
    })
  }
}

/**
 * Trigger notification when a lead reaches a qualified stage
 */
export async function triggerLeadQualifiedNotification(
  tenantId: string,
  leadId: string,
  data: {
    leadName: string
    leadPhone: string
    score: number
    stage: string
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.TICKET_ASSIGNED, // Using closest match
      title: '🎯 Lead Qualificado',
      message: `${data.leadName} atingiu o estágio "${data.stage}" com score de ${data.score}. Agende um follow-up!`,
      entityType: 'ticket',
      entityId: leadId,
      entityData: data,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_crm',
        label: 'Ver CRM',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard/crm'
        }
      }],
      metadata: {
        source: 'crm_system',
        triggerEvent: 'lead_qualified',
        leadId
      }
    })

    logger.info('[Notification Trigger] Lead qualified notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      leadId,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send lead qualified notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      leadId
    })
  }
}

/**
 * Trigger notification for urgent system events
 */
export async function triggerUrgentSystemNotification(
  tenantId: string,
  title: string,
  message: string,
  data: Record<string, any>,
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.SYSTEM_ALERT,
      title: `⚠️ ${title}`,
      message,
      entityType: 'system',
      entityId: 'system-alert',
      entityData: data,
      priority: NotificationPriority.CRITICAL,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_dashboard',
        label: 'Ver Dashboard',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard'
        }
      }],
      metadata: {
        source: 'system',
        triggerEvent: 'urgent_alert'
      }
    })

    logger.info('[Notification Trigger] Urgent system notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      title,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send urgent system notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      title
    })
  }
}

// ============================================================================
// AI FUNCTION NOTIFICATION TRIGGERS
// These triggers are designed to be called from AI functions in /api/ai/functions/
// ============================================================================

/**
 * Trigger notification when a new lead is created via AI
 * Used by: /api/ai/functions/create-lead
 */
export async function triggerLeadCreatedNotification(
  tenantId: string,
  leadId: string,
  data: {
    clientName?: string
    clientPhone: string
    clientEmail?: string
    location?: string
    guests?: number
    budget?: number
    checkInDate?: string
    interest?: string
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    const clientDisplay = data.clientName || data.clientPhone
    let message = `Novo lead ${clientDisplay} criado`

    if (data.location) message += ` - Interesse em ${data.location}`
    if (data.guests) message += ` para ${data.guests} hóspedes`
    if (data.budget) message += `. Orçamento: R$ ${data.budget.toLocaleString('pt-BR')}`

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.CONVERSATION_STARTED,
      title: '🆕 Novo Lead Criado',
      message,
      entityType: 'ticket',
      entityId: leadId,
      entityData: data,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_crm',
        label: 'Ver no CRM',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard/crm'
        }
      }],
      metadata: {
        source: 'ai_function',
        triggerEvent: 'lead_created',
        leadId
      }
    })

    logger.info('[Notification Trigger] Lead created notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      leadId,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send lead created notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      leadId
    })
  }
}

/**
 * Trigger notification when a meeting is scheduled via AI
 * Used by: /api/ai/functions/schedule-meeting
 */
export async function triggerMeetingScheduledNotification(
  tenantId: string,
  meetingId: string,
  data: {
    clientName?: string
    clientPhone: string
    meetingDate: string
    meetingTime: string
    meetingType?: string
    duration?: number
    location?: string
    notes?: string
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    const clientDisplay = data.clientName || data.clientPhone
    const typeLabel = data.meetingType || 'reunião'
    const message = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} com ${clientDisplay} agendada para ${data.meetingDate} às ${data.meetingTime}${data.location ? ` em ${data.location}` : ''}.`

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.AGENDA_EVENT_CREATED,
      title: '📅 Reunião Agendada',
      message,
      entityType: 'agenda',
      entityId: meetingId,
      entityData: data,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_agenda',
        label: 'Ver Agenda',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard/agenda'
        }
      }],
      metadata: {
        source: 'ai_function',
        triggerEvent: 'meeting_scheduled',
        meetingId
      }
    })

    logger.info('[Notification Trigger] Meeting scheduled notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      meetingId,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send meeting scheduled notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      meetingId
    })
  }
}

/**
 * Trigger notification when a property visit is scheduled via AI
 * Used by: /api/ai/functions/schedule-visit
 */
export async function triggerVisitScheduledNotification(
  tenantId: string,
  visitId: string,
  data: {
    propertyId: string
    propertyName: string
    clientName?: string
    clientPhone: string
    visitDate: string
    visitTime: string
    guests?: number
    notes?: string
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    const clientDisplay = data.clientName || data.clientPhone
    const message = `Visita à propriedade ${data.propertyName} agendada para ${data.visitDate} às ${data.visitTime} com ${clientDisplay}${data.guests ? ` (${data.guests} pessoas)` : ''}.`

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.AGENDA_EVENT_CREATED,
      title: '🏠 Visita Agendada',
      message,
      entityType: 'agenda',
      entityId: visitId,
      entityData: data,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_agenda',
        label: 'Ver Agenda',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard/agenda'
        }
      }],
      metadata: {
        source: 'ai_function',
        triggerEvent: 'visit_scheduled',
        visitId,
        propertyId: data.propertyId
      }
    })

    logger.info('[Notification Trigger] Visit scheduled notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      visitId,
      propertyId: data.propertyId,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send visit scheduled notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      visitId
    })
  }
}

/**
 * Trigger notification when a payment link is created via AI
 * Used by: /api/ai/functions/create-payment-link
 */
export async function triggerPaymentLinkCreatedNotification(
  tenantId: string,
  billingId: string,
  data: {
    amount: number
    description: string
    clientName?: string
    clientPhone?: string
    clientEmail?: string
    propertyName?: string
    reservationId?: string
    dueDate?: string
    paymentUrl: string
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    const clientDisplay = data.clientName || data.clientPhone || data.clientEmail || 'cliente'
    const message = `Link de pagamento de R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} criado para ${clientDisplay}${data.propertyName ? ` - ${data.propertyName}` : ''}. ${data.dueDate ? `Vencimento: ${data.dueDate}.` : ''}`

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.PAYMENT_DUE_REMINDER,
      title: '💳 Link de Pagamento Criado',
      message,
      entityType: 'payment',
      entityId: billingId,
      entityData: {
        ...data,
        paymentUrlShort: data.paymentUrl.substring(0, 50) + '...'
      },
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      actions: [
        {
          id: 'view_payment',
          label: 'Ver Cobrança',
          type: 'primary',
          action: 'navigate',
          config: {
            url: '/dashboard/financeiro/cobrancas'
          }
        }
      ],
      metadata: {
        source: 'ai_function',
        triggerEvent: 'payment_link_created',
        billingId,
        reservationId: data.reservationId
      }
    })

    logger.info('[Notification Trigger] Payment link created notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      billingId,
      amount: data.amount,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send payment link created notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      billingId
    })
  }
}

/**
 * Trigger notification when a PIX QR code is generated via AI
 * Used by: /api/ai/functions/generate-pix-qrcode
 */
export async function triggerPixQrCodeGeneratedNotification(
  tenantId: string,
  pixId: string,
  data: {
    amount: number
    description: string
    clientName?: string
    clientPhone?: string
    propertyName?: string
    reservationId?: string
    expiresInMinutes?: number
    expiresAt?: string
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    const clientDisplay = data.clientName || data.clientPhone || 'cliente'
    const expiryInfo = data.expiresInMinutes
      ? `Expira em ${data.expiresInMinutes} minutos.`
      : data.expiresAt
        ? `Expira em ${data.expiresAt}.`
        : ''

    const message = `QR Code PIX de R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerado para ${clientDisplay}${data.propertyName ? ` - ${data.propertyName}` : ''}. ${expiryInfo}`

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.PAYMENT_DUE_REMINDER,
      title: '📱 QR Code PIX Gerado',
      message,
      entityType: 'payment',
      entityId: pixId,
      entityData: data,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_transactions',
        label: 'Ver Transações',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard/financeiro/transacoes'
        }
      }],
      metadata: {
        source: 'ai_function',
        triggerEvent: 'pix_qrcode_generated',
        pixId,
        reservationId: data.reservationId
      }
    })

    logger.info('[Notification Trigger] PIX QR code generated notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      pixId,
      amount: data.amount,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send PIX QR code generated notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      pixId
    })
  }
}

/**
 * Trigger notification when a follow-up is scheduled via AI
 * Used by: /api/ai/functions/follow-up-lead
 */
export async function triggerFollowUpScheduledNotification(
  tenantId: string,
  leadId: string,
  data: {
    clientName?: string
    clientPhone: string
    followUpType: string
    scheduledFor: string
    priority?: string
    notes?: string
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    const clientDisplay = data.clientName || data.clientPhone
    const message = `Follow-up (${data.followUpType}) agendado com ${clientDisplay} para ${data.scheduledFor}${data.priority ? `. Prioridade: ${data.priority}` : ''}.`

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.AGENDA_EVENT_REMINDER,
      title: '📞 Follow-up Agendado',
      message,
      entityType: 'ticket',
      entityId: leadId,
      entityData: data,
      priority: data.priority === 'high' || data.priority === 'urgent'
        ? NotificationPriority.HIGH
        : NotificationPriority.MEDIUM,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_crm',
        label: 'Ver no CRM',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard/crm'
        }
      }],
      metadata: {
        source: 'ai_function',
        triggerEvent: 'follow_up_scheduled',
        leadId
      }
    })

    logger.info('[Notification Trigger] Follow-up scheduled notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      leadId,
      followUpType: data.followUpType,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send follow-up scheduled notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      leadId
    })
  }
}

/**
 * Trigger notification when a reservation is modified via AI
 * Used by: /api/ai/functions/modify-reservation
 */
export async function triggerReservationModifiedNotification(
  tenantId: string,
  reservationId: string,
  data: {
    propertyName?: string
    clientName?: string
    clientPhone?: string
    originalCheckIn?: string
    originalCheckOut?: string
    newCheckIn?: string
    newCheckOut?: string
    originalGuests?: number
    newGuests?: number
    originalPrice?: number
    newPrice?: number
    changesDescription?: string
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    const clientDisplay = data.clientName || data.clientPhone || 'Cliente'

    // Build changes list
    const changes: string[] = []
    if (data.newCheckIn && data.newCheckIn !== data.originalCheckIn) {
      changes.push(`Check-in: ${data.originalCheckIn} → ${data.newCheckIn}`)
    }
    if (data.newCheckOut && data.newCheckOut !== data.originalCheckOut) {
      changes.push(`Check-out: ${data.originalCheckOut} → ${data.newCheckOut}`)
    }
    if (data.newGuests && data.newGuests !== data.originalGuests) {
      changes.push(`Hóspedes: ${data.originalGuests} → ${data.newGuests}`)
    }
    if (data.newPrice && data.newPrice !== data.originalPrice) {
      changes.push(`Valor: R$ ${data.originalPrice?.toLocaleString('pt-BR')} → R$ ${data.newPrice.toLocaleString('pt-BR')}`)
    }

    const changesText = changes.length > 0
      ? changes.join('. ')
      : data.changesDescription || 'Dados atualizados'

    const message = `Reserva ${data.propertyName ? `de ${data.propertyName} ` : ''}para ${clientDisplay} foi modificada. ${changesText}.`

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.AGENDA_EVENT_UPDATED,
      title: '✏️ Reserva Modificada',
      message,
      entityType: 'reservation',
      entityId: reservationId,
      entityData: data,
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_reservation',
        label: 'Ver Reserva',
        type: 'primary',
        action: 'navigate',
        config: {
          url: `/dashboard/reservations/${reservationId}`
        }
      }],
      metadata: {
        source: 'ai_function',
        triggerEvent: 'reservation_modified',
        reservationId,
        changesCount: changes.length
      }
    })

    logger.info('[Notification Trigger] Reservation modified notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      reservationId,
      changesCount: changes.length,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send reservation modified notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      reservationId
    })
  }
}

/**
 * Trigger notification when a reservation is cancelled via AI
 * Used by: /api/ai/functions/cancel-reservation
 */
export async function triggerReservationCancelledNotification(
  tenantId: string,
  reservationId: string,
  data: {
    propertyName?: string
    clientName?: string
    clientPhone?: string
    checkIn?: string
    checkOut?: string
    totalPrice?: number
    refundAmount?: number
    cancelReason?: string
    cancelledBy?: string
  },
  targetUserId: string,
  targetUserEmail?: string
): Promise<void> {
  try {
    const notificationService = NotificationServiceFactory.getInstance(tenantId)

    const clientDisplay = data.clientName || data.clientPhone || 'Cliente'

    let message = `Reserva ${data.propertyName ? `de ${data.propertyName} ` : ''}para ${clientDisplay} foi cancelada`

    if (data.checkIn && data.checkOut) {
      message += ` (${data.checkIn} - ${data.checkOut})`
    }

    if (data.refundAmount !== undefined && data.refundAmount > 0) {
      message += `. Reembolso: R$ ${data.refundAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    } else if (data.totalPrice) {
      message += `. Valor original: R$ ${data.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }

    if (data.cancelReason) {
      message += `. Motivo: ${data.cancelReason}`
    }

    message += '.'

    await notificationService.createNotification({
      targetUserId,
      targetUserName: targetUserEmail,
      type: NotificationType.AGENDA_EVENT_CANCELLED,
      title: '❌ Reserva Cancelada',
      message,
      entityType: 'reservation',
      entityId: reservationId,
      entityData: data,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_reservations',
        label: 'Ver Reservas',
        type: 'primary',
        action: 'navigate',
        config: {
          url: '/dashboard/reservations'
        }
      }],
      metadata: {
        source: 'ai_function',
        triggerEvent: 'reservation_cancelled',
        reservationId,
        hasRefund: (data.refundAmount ?? 0) > 0,
        cancelledBy: data.cancelledBy || 'ai_agent'
      }
    })

    logger.info('[Notification Trigger] Reservation cancelled notification sent', {
      tenantId: tenantId.substring(0, 8) + '***',
      reservationId,
      refundAmount: data.refundAmount,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })
  } catch (error) {
    logger.error('[Notification Trigger] Failed to send reservation cancelled notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId: tenantId.substring(0, 8) + '***',
      reservationId
    })
  }
}
