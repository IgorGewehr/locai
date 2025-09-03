// lib/services/notification-service.ts
// Serviço de notificações multi-tenant para agenda e tickets

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { logger } from '@/lib/utils/logger'
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
  NotificationPreferences,
  NotificationDashboard,
  DeliveryStatus
} from '@/lib/types/notification'

export class NotificationService {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  // Criar nova notificação
  async createNotification(data: {
    targetUserId: string
    targetUserName?: string
    type: NotificationType
    title: string
    message: string
    entityType: 'agenda' | 'ticket' | 'reservation' | 'payment' | 'system'
    entityId: string
    entityData?: Record<string, any>
    priority?: NotificationPriority
    channels?: NotificationChannel[]
    scheduledFor?: Date
    actions?: any[]
    metadata?: Record<string, any>
  }): Promise<string> {
    try {
      logger.info('🔔 [Notification] Criando nova notificação', {
        component: 'NotificationService',
        tenantId: this.tenantId,
        type: data.type,
        targetUserId: data.targetUserId,
        entityType: data.entityType,
        entityId: data.entityId
      })

      const notificationData: Omit<Notification, 'id'> = {
        tenantId: this.tenantId,
        targetUserId: data.targetUserId,
        targetUserName: data.targetUserName,
        type: data.type,
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
        entityData: data.entityData,
        status: data.scheduledFor ? NotificationStatus.SCHEDULED : NotificationStatus.SENT,
        priority: data.priority || NotificationPriority.MEDIUM,
        channels: data.channels || [NotificationChannel.DASHBOARD],
        deliveryStatus: this.initializeDeliveryStatus(data.channels || [NotificationChannel.DASHBOARD]),
        createdAt: new Date(),
        scheduledFor: data.scheduledFor,
        sentAt: data.scheduledFor ? undefined : new Date(),
        actions: data.actions,
        metadata: data.metadata
      }

      const docRef = await addDoc(
        collection(db, `tenants/${this.tenantId}/notifications`),
        {
          ...notificationData,
          createdAt: serverTimestamp(),
          scheduledFor: data.scheduledFor ? Timestamp.fromDate(data.scheduledFor) : null,
          sentAt: data.scheduledFor ? null : serverTimestamp()
        }
      )

      logger.info('✅ [Notification] Notificação criada com sucesso', {
        component: 'NotificationService',
        tenantId: this.tenantId,
        notificationId: docRef.id,
        type: data.type
      })

      return docRef.id

    } catch (error) {
      logger.error('❌ [Notification] Erro ao criar notificação', error as Error, {
        component: 'NotificationService',
        tenantId: this.tenantId,
        type: data.type
      })
      throw error
    }
  }

  // Criar notificação para evento de agenda
  async createAgendaEventNotification(data: {
    targetUserId: string
    targetUserName?: string
    eventId: string
    eventTitle: string
    eventDate: Date
    eventType?: string
    source?: string
  }): Promise<string> {
    const title = '📅 Novo evento na agenda'
    const message = `Evento "${data.eventTitle}" foi agendado para ${data.eventDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`

    return await this.createNotification({
      targetUserId: data.targetUserId,
      targetUserName: data.targetUserName,
      type: NotificationType.AGENDA_EVENT_CREATED,
      title,
      message,
      entityType: 'agenda',
      entityId: data.eventId,
      entityData: {
        eventTitle: data.eventTitle,
        eventDate: data.eventDate,
        eventType: data.eventType
      },
      priority: NotificationPriority.MEDIUM,
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
        source: data.source || 'system',
        triggerEvent: 'agenda_event_created'
      }
    })
  }

  // Criar notificação para resposta de ticket
  async createTicketResponseNotification(data: {
    targetUserId: string
    targetUserName?: string
    ticketId: string
    ticketTitle: string
    respondedBy: string
    responsePreview: string
  }): Promise<string> {
    const title = '💬 Nova resposta no seu ticket'
    const message = `${data.respondedBy} respondeu seu ticket "${data.ticketTitle}": ${data.responsePreview.substring(0, 100)}...`

    return await this.createNotification({
      targetUserId: data.targetUserId,
      targetUserName: data.targetUserName,
      type: NotificationType.TICKET_RESPONSE_RECEIVED,
      title,
      message,
      entityType: 'ticket',
      entityId: data.ticketId,
      entityData: {
        ticketTitle: data.ticketTitle,
        respondedBy: data.respondedBy,
        responsePreview: data.responsePreview
      },
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      actions: [{
        id: 'view_ticket',
        label: 'Ver Ticket',
        type: 'primary',
        action: 'navigate',
        config: {
          url: `/dashboard/help`
        }
      }],
      metadata: {
        source: 'ticket_system',
        triggerEvent: 'ticket_response_received'
      }
    })
  }

  // Marcar notificação como lida
  async markAsRead(notificationId: string): Promise<void> {
    try {
      logger.info('👁️ [Notification] Marcando notificação como lida', {
        component: 'NotificationService',
        tenantId: this.tenantId,
        notificationId
      })

      await updateDoc(
        doc(db, `tenants/${this.tenantId}/notifications`, notificationId),
        {
          readAt: serverTimestamp(),
          status: NotificationStatus.READ
        }
      )

      logger.info('✅ [Notification] Notificação marcada como lida', {
        component: 'NotificationService',
        tenantId: this.tenantId,
        notificationId
      })

    } catch (error) {
      logger.error('❌ [Notification] Erro ao marcar notificação como lida', error as Error, {
        component: 'NotificationService',
        tenantId: this.tenantId,
        notificationId
      })
      throw error
    }
  }

  // Marcar todas as notificações como lidas
  async markAllAsRead(userId: string): Promise<void> {
    try {
      logger.info('👁️ [Notification] Marcando todas as notificações como lidas', {
        component: 'NotificationService',
        tenantId: this.tenantId,
        userId
      })

      const q = query(
        collection(db, `tenants/${this.tenantId}/notifications`),
        where('targetUserId', '==', userId),
        where('readAt', '==', null)
      )

      const snapshot = await getDocs(q)
      const batch = []

      for (const docSnap of snapshot.docs) {
        batch.push(
          updateDoc(doc(db, `tenants/${this.tenantId}/notifications`, docSnap.id), {
            readAt: serverTimestamp(),
            status: NotificationStatus.READ
          })
        )
      }

      await Promise.all(batch)

      logger.info('✅ [Notification] Todas as notificações marcadas como lidas', {
        component: 'NotificationService',
        tenantId: this.tenantId,
        userId,
        count: batch.length
      })

    } catch (error) {
      logger.error('❌ [Notification] Erro ao marcar todas as notificações como lidas', error as Error, {
        component: 'NotificationService',
        tenantId: this.tenantId,
        userId
      })
      throw error
    }
  }

  // Buscar notificações do usuário
  async getUserNotifications(
    userId: string, 
    options: {
      unreadOnly?: boolean
      limit?: number
      type?: NotificationType
    } = {}
  ): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, `tenants/${this.tenantId}/notifications`),
        where('targetUserId', '==', userId)
      )

      if (options.unreadOnly) {
        q = query(q, where('readAt', '==', null))
      }

      if (options.type) {
        q = query(q, where('type', '==', options.type))
      }

      q = query(q, orderBy('createdAt', 'desc'))

      if (options.limit) {
        q = query(q, limit(options.limit))
      }

      const snapshot = await getDocs(q)
      const notifications: Notification[] = []

      snapshot.forEach(doc => {
        const data = doc.data()
        notifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          scheduledFor: data.scheduledFor?.toDate(),
          sentAt: data.sentAt?.toDate(),
          readAt: data.readAt?.toDate(),
          expiresAt: data.expiresAt?.toDate()
        } as Notification)
      })

      return notifications

    } catch (error) {
      logger.error('❌ [Notification] Erro ao buscar notificações do usuário', error as Error, {
        component: 'NotificationService',
        tenantId: this.tenantId,
        userId
      })
      throw error
    }
  }

  // Contar notificações não lidas
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, `tenants/${this.tenantId}/notifications`),
        where('targetUserId', '==', userId),
        where('readAt', '==', null)
      )

      const snapshot = await getDocs(q)
      return snapshot.size

    } catch (error) {
      logger.error('❌ [Notification] Erro ao contar notificações não lidas', error as Error, {
        component: 'NotificationService',
        tenantId: this.tenantId,
        userId
      })
      return 0
    }
  }

  // Escutar notificações em tempo real
  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    options: { unreadOnly?: boolean; limit?: number } = {}
  ): () => void {
    try {
      let q = query(
        collection(db, `tenants/${this.tenantId}/notifications`),
        where('targetUserId', '==', userId)
      )

      if (options.unreadOnly) {
        q = query(q, where('readAt', '==', null))
      }

      q = query(q, orderBy('createdAt', 'desc'))

      if (options.limit) {
        q = query(q, limit(options.limit))
      }

      return onSnapshot(q, (snapshot) => {
        const notifications: Notification[] = []

        snapshot.forEach(doc => {
          const data = doc.data()
          notifications.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            scheduledFor: data.scheduledFor?.toDate(),
            sentAt: data.sentAt?.toDate(),
            readAt: data.readAt?.toDate(),
            expiresAt: data.expiresAt?.toDate()
          } as Notification)
        })

        callback(notifications)
      }, (error) => {
        logger.error('❌ [Notification] Erro na subscription de notificações', error, {
          component: 'NotificationService',
          tenantId: this.tenantId,
          userId
        })
      })

    } catch (error) {
      logger.error('❌ [Notification] Erro ao criar subscription de notificações', error as Error, {
        component: 'NotificationService',
        tenantId: this.tenantId,
        userId
      })
      return () => {}
    }
  }

  // Deletar notificação
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await updateDoc(
        doc(db, `tenants/${this.tenantId}/notifications`, notificationId),
        {
          status: NotificationStatus.EXPIRED,
          expiresAt: serverTimestamp()
        }
      )

      logger.info('🗑️ [Notification] Notificação deletada', {
        component: 'NotificationService',
        tenantId: this.tenantId,
        notificationId
      })

    } catch (error) {
      logger.error('❌ [Notification] Erro ao deletar notificação', error as Error, {
        component: 'NotificationService',
        tenantId: this.tenantId,
        notificationId
      })
      throw error
    }
  }

  // Utility: inicializar status de entrega
  private initializeDeliveryStatus(channels: NotificationChannel[]): Record<NotificationChannel, DeliveryStatus> {
    const status: Partial<Record<NotificationChannel, DeliveryStatus>> = {}
    
    channels.forEach(channel => {
      status[channel] = {
        status: 'pending',
        attempts: 0
      }
    })

    return status as Record<NotificationChannel, DeliveryStatus>
  }
}

// Factory para criar instâncias do serviço por tenant
export class NotificationServiceFactory {
  private static instances: Map<string, NotificationService> = new Map()

  static getInstance(tenantId: string): NotificationService {
    if (!this.instances.has(tenantId)) {
      this.instances.set(tenantId, new NotificationService(tenantId))
    }
    return this.instances.get(tenantId)!
  }

  static clearInstance(tenantId: string): void {
    this.instances.delete(tenantId)
  }
}