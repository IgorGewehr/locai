#!/usr/bin/env tsx
/**
 * Test script to validate notification system
 * Usage: npx tsx scripts/test-notification-system.ts <tenantId> <userId>
 */

import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority, NotificationChannel } from '@/lib/types/notification'

async function testNotificationSystem(tenantId: string, userId: string) {
  console.log('🔔 Testing Notification System')
  console.log('================================')
  console.log(`Tenant ID: ${tenantId}`)
  console.log(`User ID: ${userId}`)
  console.log('')

  try {
    // Get notification service
    const service = NotificationServiceFactory.getInstance(tenantId)
    console.log('✅ NotificationService created')

    // Create test notification
    console.log('\n📝 Creating test notification...')
    const notificationId = await service.createNotification({
      targetUserId: userId,
      targetUserName: 'Test User',
      type: NotificationType.SYSTEM_ALERT,
      title: '🧪 Test Notification',
      message: 'This is a test notification created by the test script',
      entityType: 'system',
      entityId: 'test-' + Date.now(),
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.DASHBOARD],
      metadata: {
        source: 'test_script',
        triggerEvent: 'manual_test'
      }
    })
    console.log(`✅ Notification created: ${notificationId}`)

    // Fetch notifications
    console.log('\n📥 Fetching user notifications...')
    const notifications = await service.getUserNotifications(userId, { limit: 5 })
    console.log(`✅ Found ${notifications.length} notifications`)

    notifications.forEach((notif, index) => {
      console.log(`\n  ${index + 1}. ${notif.title}`)
      console.log(`     ID: ${notif.id}`)
      console.log(`     Type: ${notif.type}`)
      console.log(`     Priority: ${notif.priority}`)
      console.log(`     Read: ${notif.readAt ? 'Yes' : 'No'}`)
      console.log(`     Created: ${notif.createdAt.toISOString()}`)
    })

    // Get unread count
    console.log('\n📊 Checking unread count...')
    const unreadCount = await service.getUnreadCount(userId)
    console.log(`✅ Unread notifications: ${unreadCount}`)

    // Mark test notification as read
    console.log(`\n✔️  Marking notification ${notificationId} as read...`)
    await service.markAsRead(notificationId)
    console.log('✅ Notification marked as read')

    // Check unread count again
    const newUnreadCount = await service.getUnreadCount(userId)
    console.log(`✅ New unread count: ${newUnreadCount}`)

    console.log('\n================================')
    console.log('✅ All tests passed!')
    console.log('================================')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

// Get command line arguments
const tenantId = process.argv[2]
const userId = process.argv[3]

if (!tenantId || !userId) {
  console.error('Usage: npx tsx scripts/test-notification-system.ts <tenantId> <userId>')
  console.error('Example: npx tsx scripts/test-notification-system.ts tenant123 user456')
  process.exit(1)
}

testNotificationSystem(tenantId, userId)
