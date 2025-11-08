// app/api/notifications/[id]/route.ts
// Individual notification actions

import { NextRequest, NextResponse } from 'next/server'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { logger } from '@/lib/utils/logger'

/**
 * PATCH /api/notifications/[id]
 * Mark notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId || !authContext.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { tenantId } = authContext
    const { id: notificationId } = params

    logger.info('[Notifications API] Marking notification as read', {
      tenantId: tenantId.substring(0, 8) + '***',
      notificationId
    })

    // Mark as read
    const notificationService = NotificationServiceFactory.getInstance(tenantId)
    await notificationService.markAsRead(notificationId)

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    })

  } catch (error) {
    logger.error('[Notifications API] Error marking notification as read', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        error: 'Failed to mark notification as read',
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
 * DELETE /api/notifications/[id]
 * Delete notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId || !authContext.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { tenantId } = authContext
    const { id: notificationId } = params

    logger.info('[Notifications API] Deleting notification', {
      tenantId: tenantId.substring(0, 8) + '***',
      notificationId
    })

    // Delete notification
    const notificationService = NotificationServiceFactory.getInstance(tenantId)
    await notificationService.deleteNotification(notificationId)

    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    })

  } catch (error) {
    logger.error('[Notifications API] Error deleting notification', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        error: 'Failed to delete notification',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    )
  }
}
