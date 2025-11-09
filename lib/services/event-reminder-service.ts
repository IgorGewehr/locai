// lib/services/event-reminder-service.ts
// Background service to monitor upcoming agenda events and send notifications

import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority, NotificationChannel } from '@/lib/types/notification'
import { logger } from '@/lib/utils/logger'

interface AgendaEvent {
  id: string
  tenantId: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  userId: string
  userName?: string
  type?: string
  location?: string
  attendees?: string[]
  reminded?: boolean // Flag to track if reminder was sent
}

export class EventReminderService {
  private static instance: EventReminderService | null = null
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private readonly CHECK_INTERVAL = 60 * 1000 // 1 minute
  private readonly REMINDER_WINDOW_MINUTES = 30 // Alert 30 minutes before event

  private constructor() {}

  static getInstance(): EventReminderService {
    if (!EventReminderService.instance) {
      EventReminderService.instance = new EventReminderService()
    }
    return EventReminderService.instance
  }

  /**
   * Start the background reminder service
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[EventReminder] Service already running', {
        component: 'EventReminderService'
      })
      return
    }

    logger.info('[EventReminder] Starting event reminder service', {
      component: 'EventReminderService',
      checkInterval: `${this.CHECK_INTERVAL / 1000}s`,
      reminderWindow: `${this.REMINDER_WINDOW_MINUTES}min`
    })

    this.isRunning = true

    // Run immediately on start
    this.checkUpcomingEvents().catch(error => {
      logger.error('[EventReminder] Error in initial check', error as Error, {
        component: 'EventReminderService'
      })
    })

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkUpcomingEvents().catch(error => {
        logger.error('[EventReminder] Error in periodic check', error as Error, {
          component: 'EventReminderService'
        })
      })
    }, this.CHECK_INTERVAL)
  }

  /**
   * Stop the background reminder service
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    logger.info('[EventReminder] Stopping event reminder service', {
      component: 'EventReminderService'
    })

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.isRunning = false
  }

  /**
   * Check for upcoming events across all tenants
   */
  private async checkUpcomingEvents(): Promise<void> {
    try {
      const now = new Date()
      const reminderTime = new Date(now.getTime() + this.REMINDER_WINDOW_MINUTES * 60 * 1000)

      // Query all tenants (simplified - in production you'd track active tenants)
      // For now, we'll focus on a specific tenant approach
      const tenants = await this.getActiveTenants()

      logger.debug('[EventReminder] Checking upcoming events', {
        component: 'EventReminderService',
        tenantsCount: tenants.length,
        currentTime: now.toISOString(),
        reminderTime: reminderTime.toISOString()
      })

      for (const tenantId of tenants) {
        await this.checkTenantEvents(tenantId, now, reminderTime)
      }
    } catch (error) {
      logger.error('[EventReminder] Failed to check upcoming events', error as Error, {
        component: 'EventReminderService'
      })
    }
  }

  /**
   * Check events for a specific tenant
   */
  private async checkTenantEvents(
    tenantId: string,
    now: Date,
    reminderTime: Date
  ): Promise<void> {
    try {
      // Query agenda events that:
      // 1. Start time is between now and reminderTime
      // 2. Have not been reminded yet
      const eventsRef = collection(db, `tenants/${tenantId}/agenda`)
      const q = query(
        eventsRef,
        where('startDate', '>', Timestamp.fromDate(now)),
        where('startDate', '<=', Timestamp.fromDate(reminderTime)),
        where('reminded', '==', false)
      )

      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        return
      }

      logger.info('[EventReminder] Found upcoming events for tenant', {
        component: 'EventReminderService',
        tenantId: tenantId.substring(0, 8) + '***',
        eventsCount: snapshot.size
      })

      const notificationService = NotificationServiceFactory.getInstance(tenantId)

      for (const doc of snapshot.docs) {
        const event = {
          id: doc.id,
          tenantId,
          ...doc.data(),
          startDate: doc.data().startDate?.toDate(),
          endDate: doc.data().endDate?.toDate()
        } as AgendaEvent

        await this.sendEventReminder(notificationService, event, now)
      }
    } catch (error) {
      logger.error('[EventReminder] Failed to check tenant events', error as Error, {
        component: 'EventReminderService',
        tenantId: tenantId.substring(0, 8) + '***'
      })
    }
  }

  /**
   * Send reminder notification for an event
   */
  private async sendEventReminder(
    notificationService: any,
    event: AgendaEvent,
    now: Date
  ): Promise<void> {
    try {
      const minutesUntilEvent = Math.round(
        (event.startDate.getTime() - now.getTime()) / (60 * 1000)
      )

      const title = '⏰ Lembrete de Evento'
      const message = `"${event.title}" começa em ${minutesUntilEvent} minutos (${event.startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}). ${event.location ? `Local: ${event.location}.` : ''}`

      await notificationService.createNotification({
        targetUserId: event.userId,
        targetUserName: event.userName,
        type: NotificationType.AGENDA_EVENT_REMINDER,
        title,
        message,
        entityType: 'agenda',
        entityId: event.id,
        entityData: {
          eventTitle: event.title,
          eventDate: event.startDate,
          eventType: event.type,
          location: event.location,
          minutesUntilEvent
        },
        priority: minutesUntilEvent <= 10 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
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
          source: 'event_reminder_service',
          triggerEvent: 'agenda_event_reminder',
          eventId: event.id,
          minutesUntilEvent
        }
      })

      // Mark event as reminded (you'd need to implement this update)
      // await updateDoc(doc(db, `tenants/${event.tenantId}/agenda`, event.id), { reminded: true })

      logger.info('[EventReminder] Sent event reminder', {
        component: 'EventReminderService',
        tenantId: event.tenantId.substring(0, 8) + '***',
        eventId: event.id,
        eventTitle: event.title,
        minutesUntilEvent
      })
    } catch (error) {
      logger.error('[EventReminder] Failed to send event reminder', error as Error, {
        component: 'EventReminderService',
        eventId: event.id,
        eventTitle: event.title
      })
    }
  }

  /**
   * Get list of active tenants
   * In production, this would query a tenants collection
   * For now, returns a placeholder
   */
  private async getActiveTenants(): Promise<string[]> {
    // TODO: Implement proper tenant discovery
    // For now, you could:
    // 1. Query a 'tenants' collection
    // 2. Use environment variable
    // 3. Track active tenants in memory

    // Placeholder - replace with actual tenant IDs
    const tenantIds: string[] = []

    // Example: Get from environment or config
    if (process.env.ACTIVE_TENANT_IDS) {
      tenantIds.push(...process.env.ACTIVE_TENANT_IDS.split(','))
    }

    return tenantIds
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean
    checkInterval: number
    reminderWindowMinutes: number
  } {
    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL,
      reminderWindowMinutes: this.REMINDER_WINDOW_MINUTES
    }
  }
}

// Singleton export
export const eventReminderService = EventReminderService.getInstance()
