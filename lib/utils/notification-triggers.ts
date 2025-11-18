// lib/utils/notification-triggers.ts
// Utility functions to trigger notifications for critical events

import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority, NotificationChannel } from '@/lib/types/notification'
import { logger } from '@/lib/utils/logger'
import type { ConversationHeader } from '@/lib/types/conversation-optimized'

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
