// app/api/notifications/mark-all-read/route.ts
// Mark all notifications as read

import { NextRequest, NextResponse } from 'next/server'
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth'
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/notifications/mark-all-read
 * Mark all user notifications as read
 */
export async function POST(request: NextRequest) {
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

    logger.info('[Notifications API] Marking all notifications as read', {
      tenantId: tenantId.substring(0, 8) + '***',
      userId: userId.substring(0, 8) + '***'
    })

    // Mark all as read
    const notificationService = NotificationServiceFactory.getInstance(tenantId)
    await notificationService.markAllAsRead(userId)

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    })

  } catch (error) {
    logger.error('[Notifications API] Error marking all notifications as read', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        error: 'Failed to mark all notifications as read',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    )
  }
}
