// lib/validations/notification-schemas.ts
// Zod validation schemas for notification system

import { z } from 'zod'
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus
} from '@/lib/types/notification'

// Base notification data schema
export const NotificationDataSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  targetUserName: z.string().optional(),
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: 'Invalid notification type' })
  }),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  entityType: z.enum(['agenda', 'ticket', 'reservation', 'payment', 'system'], {
    errorMap: () => ({ message: 'Invalid entity type' })
  }),
  entityId: z.string().min(1, 'Entity ID is required'),
  entityData: z.record(z.any()).optional(),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.MEDIUM),
  channels: z.array(z.nativeEnum(NotificationChannel)).default([NotificationChannel.DASHBOARD]),
  scheduledFor: z.date().optional(),
  actions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['primary', 'secondary', 'danger']),
    action: z.enum(['navigate', 'api_call', 'dismiss']),
    config: z.object({
      url: z.string().optional(),
      apiEndpoint: z.string().optional(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
      params: z.record(z.any()).optional()
    })
  })).optional(),
  metadata: z.record(z.any()).optional()
})

// Notification preferences schema
export const NotificationPreferencesSchema = z.object({
  userId: z.string().min(1),
  email: z.object({
    enabled: z.boolean().default(true),
    address: z.string().email('Invalid email address'),
    frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).default('immediate'),
    types: z.array(z.nativeEnum(NotificationType)).default([])
  }).optional(),
  dashboard: z.object({
    enabled: z.boolean().default(true),
    types: z.array(z.nativeEnum(NotificationType)).default([])
  }).optional(),
  whatsapp: z.object({
    enabled: z.boolean().default(false),
    phoneNumber: z.string().optional(),
    types: z.array(z.nativeEnum(NotificationType)).default([])
  }).optional(),
  quietHours: z.object({
    enabled: z.boolean().default(false),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').default('22:00'),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').default('08:00'),
    timezone: z.string().default('America/Sao_Paulo')
  }).optional()
})

// Query parameters schema for GET /api/notifications
export const GetNotificationsQuerySchema = z.object({
  unreadOnly: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(NotificationType).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  offset: z.number().int().min(0).default(0)
})

// Firestore document validation (for data integrity)
export const FirestoreNotificationSchema = z.object({
  tenantId: z.string().min(1),
  targetUserId: z.string().min(1),
  targetUserName: z.string().optional(),
  type: z.nativeEnum(NotificationType),
  title: z.string(),
  message: z.string(),
  entityType: z.enum(['agenda', 'ticket', 'reservation', 'payment', 'system']),
  entityId: z.string(),
  entityData: z.record(z.any()).optional(),
  status: z.nativeEnum(NotificationStatus),
  priority: z.nativeEnum(NotificationPriority),
  channels: z.array(z.nativeEnum(NotificationChannel)),
  deliveryStatus: z.record(z.nativeEnum(NotificationChannel), z.object({
    status: z.enum(['pending', 'sent', 'delivered', 'failed', 'read']),
    sentAt: z.any().optional(), // Firestore Timestamp
    deliveredAt: z.any().optional(),
    error: z.string().optional(),
    attempts: z.number().int().min(0),
    lastAttemptAt: z.any().optional()
  })),
  createdAt: z.any(), // Firestore Timestamp
  scheduledFor: z.any().optional(),
  sentAt: z.any().optional(),
  readAt: z.any().optional(),
  expiresAt: z.any().optional(),
  actions: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional()
})

// Validation helper functions
export function validateNotificationData(data: unknown) {
  return NotificationDataSchema.safeParse(data)
}

export function validateNotificationPreferences(data: unknown) {
  return NotificationPreferencesSchema.safeParse(data)
}

export function validateGetNotificationsQuery(data: unknown) {
  return GetNotificationsQuerySchema.safeParse(data)
}

export function validateFirestoreNotification(data: unknown) {
  return FirestoreNotificationSchema.safeParse(data)
}
