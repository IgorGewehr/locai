// lib/utils/notification-triggers.ts
// Utility functions to trigger notifications for critical events

import { NotificationServiceFactory } from '@/lib/services/notification-service'
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
      type: 'conversation_started' as any,
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
      priority: 'medium' as any,
      channels: ['dashboard', 'email'] as any[],
      recipientEmail: targetUserEmail,
      actionUrl: `/dashboard/conversas`,
      actionLabel: 'Ver Conversas',
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
 * (Already implemented inline in reservations API, but provided here for reference)
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
      type: 'reservation_created' as any,
      title: '🎉 Nova Reserva Criada',
      message: `Reserva confirmada para ${data.propertyName} de ${data.checkIn.toLocaleDateString('pt-BR')} até ${data.checkOut.toLocaleDateString('pt-BR')}. Cliente: ${data.clientName}. Total: R$ ${data.totalAmount.toFixed(2)}.`,
      entityType: 'reservation',
      entityId: reservationId,
      entityData: data,
      priority: 'high' as any,
      channels: ['dashboard', 'email'] as any[],
      recipientEmail: targetUserEmail,
      actionUrl: `/dashboard/reservations/${reservationId}`,
      actionLabel: 'Ver Reserva',
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
 * (Already implemented inline in transactions API, but provided here for reference)
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
      type: 'payment_received' as any,
      title: '💰 Pagamento Recebido',
      message: `Pagamento de R$ ${data.amount.toFixed(2)} recebido${data.clientName ? ` de ${data.clientName}` : ''}${data.propertyName ? ` (${data.propertyName})` : ''}. Método: ${data.paymentMethod}.`,
      entityType: 'payment',
      entityId: transactionId,
      entityData: data,
      priority: data.amount >= 1000 ? 'high' as any : 'medium' as any,
      channels: ['dashboard', 'email'] as any[],
      recipientEmail: targetUserEmail,
      actionUrl: `/dashboard/transactions`,
      actionLabel: 'Ver Transações',
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
      type: 'lead_qualified' as any,
      title: '🎯 Lead Qualificado',
      message: `${data.leadName} atingiu o estágio "${data.stage}" com score de ${data.score}. Agende um follow-up!`,
      entityType: 'ticket',
      entityId: leadId,
      entityData: data,
      priority: 'high' as any,
      channels: ['dashboard', 'email'] as any[],
      recipientEmail: targetUserEmail,
      actionUrl: `/dashboard/crm`,
      actionLabel: 'Ver CRM',
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
      type: 'system_alert' as any,
      title: `⚠️ ${title}`,
      message,
      entityType: 'system',
      entityId: 'system-alert',
      entityData: data,
      priority: 'urgent' as any,
      channels: ['dashboard', 'email'] as any[],
      recipientEmail: targetUserEmail,
      actionUrl: `/dashboard`,
      actionLabel: 'Ver Dashboard',
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
