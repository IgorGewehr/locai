// app/api/notifications/route.ts
// Core notification CRUD API

import { NextRequest, NextResponse } from 'next/server'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { logger } from '@/lib/utils/logger'
import type { NotificationType, NotificationPriority } from '@/lib/types/notification'

/**
 * GET /api/notifications
 * Get user notifications with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId || !authContext.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { tenantId, userId } = authContext
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const type = searchParams.get('type') as NotificationType | undefined

    logger.info('[Notifications API] Getting user notifications', {
      tenantId: tenantId.substring(0, 8) + '***',
      userId: userId.substring(0, 8) + '***',
      unreadOnly,
      limit,
      type
    })

    // Get notifications
    const notificationService = NotificationServiceFactory.getInstance(tenantId)
    const notifications = await notificationService.getUserNotifications(userId, {
      unreadOnly,
      limit,
      type
    })

    // Get unread count
    const unreadCount = await notificationService.getUnreadCount(userId)

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length
      }
    })

  } catch (error) {
    logger.error('[Notifications API] Error getting notifications', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        error: 'Failed to get notifications',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Create a new notification (admin/system use)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { tenantId } = authContext
    const body = await request.json()

    const {
      targetUserId,
      targetUserName,
      type,
      title,
      message,
      entityType,
      entityId,
      entityData,
      priority,
      channels,
      scheduledFor,
      actions,
      metadata
    } = body

    // Validate required fields
    if (!targetUserId || !type || !title || !message || !entityType || !entityId) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
          required: ['targetUserId', 'type', 'title', 'message', 'entityType', 'entityId']
        },
        { status: 400 }
      )
    }

    logger.info('[Notifications API] Creating notification', {
      tenantId: tenantId.substring(0, 8) + '***',
      type,
      targetUserId: targetUserId.substring(0, 8) + '***'
    })

    // Create notification
    const notificationService = NotificationServiceFactory.getInstance(tenantId)
    const notificationId = await notificationService.createNotification({
      targetUserId,
      targetUserName,
      type,
      title,
      message,
      entityType,
      entityId,
      entityData,
      priority,
      channels,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      actions,
      metadata
    })

    logger.info('[Notifications API] Notification created successfully', {
      tenantId: tenantId.substring(0, 8) + '***',
      notificationId
    })

    return NextResponse.json({
      success: true,
      data: {
        notificationId
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('[Notifications API] Error creating notification', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        error: 'Failed to create notification',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    )
  }
}
