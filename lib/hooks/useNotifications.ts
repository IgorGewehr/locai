// lib/hooks/useNotifications.ts
// Custom hook for managing notifications with real-time updates

import { useState, useEffect, useCallback } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/lib/hooks/useAuth'
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { logger } from '@/lib/utils/logger'
import type { Notification, NotificationType } from '@/lib/types/notification'

interface UseNotificationsOptions {
  unreadOnly?: boolean
  limit?: number
  type?: NotificationType
  autoSubscribe?: boolean
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: Error | null
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    unreadOnly = false,
    limit = 20,
    type,
    autoSubscribe = true
  } = options

  const { tenantId } = useTenant()  // ✅ CORRETO: tenantId, não tenant
  const { user } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const notificationService = tenantId
    ? NotificationServiceFactory.getInstance(tenantId)
    : null

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!notificationService || !user?.uid) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [fetchedNotifications, count] = await Promise.all([
        notificationService.getUserNotifications(user.uid, {
          unreadOnly,
          limit,
          type
        }),
        notificationService.getUnreadCount(user.uid)
      ])

      setNotifications(fetchedNotifications)
      setUnreadCount(count)

      logger.debug('[useNotifications] Notifications fetched', {
        count: fetchedNotifications.length,
        unreadCount: count
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch notifications')
      setError(error)
      logger.error('[useNotifications] Failed to fetch notifications', error)
    } finally {
      setLoading(false)
    }
  }, [notificationService, user?.uid, unreadOnly, limit, type])

  // Real-time subscription
  useEffect(() => {
    if (!autoSubscribe || !notificationService || !user?.uid) {
      fetchNotifications()
      return
    }

    setLoading(true)

    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        const newUnreadCount = newNotifications.filter(n => !n.readAt).length

        setNotifications(newNotifications.slice(0, limit))
        setUnreadCount(newUnreadCount)
        setLoading(false)

        logger.debug('[useNotifications] Real-time update received', {
          count: newNotifications.length,
          unreadCount: newUnreadCount
        })
      },
      { unreadOnly, limit }
    )

    return () => {
      unsubscribe()
      logger.debug('[useNotifications] Subscription cleanup')
    }
  }, [notificationService, user?.uid, autoSubscribe, unreadOnly, limit, fetchNotifications])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!notificationService) return

    try {
      await notificationService.markAsRead(notificationId)
      logger.info('[useNotifications] Notification marked as read', { notificationId })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark as read')
      logger.error('[useNotifications] Failed to mark notification as read', error, {
        notificationId
      })
      throw error
    }
  }, [notificationService])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!notificationService || !user?.uid) return

    try {
      await notificationService.markAllAsRead(user.uid)
      logger.info('[useNotifications] All notifications marked as read')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark all as read')
      logger.error('[useNotifications] Failed to mark all as read', error)
      throw error
    }
  }, [notificationService, user?.uid])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!notificationService) return

    try {
      await notificationService.deleteNotification(notificationId)
      logger.info('[useNotifications] Notification deleted', { notificationId })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete notification')
      logger.error('[useNotifications] Failed to delete notification', error, {
        notificationId
      })
      throw error
    }
  }, [notificationService])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  }
}
