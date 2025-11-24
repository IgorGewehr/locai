// lib/utils/admin-notifications.ts
// Utility to send notifications to all admin users

import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NotificationService } from '@/lib/services/notification-service';
import { logger } from '@/lib/utils/logger';

/**
 * Get all admin user IDs from users collection
 * Admins are identified by having idog: true
 */
async function getAdminUserIds(): Promise<string[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('idog', '==', true));
    const snapshot = await getDocs(q);

    const adminIds = snapshot.docs.map(doc => doc.id);

    logger.info('📋 [AdminNotifications] Admin users found', {
      component: 'AdminNotifications',
      count: adminIds.length,
      adminIds: adminIds.map(id => id.substring(0, 8) + '***')
    });

    return adminIds;
  } catch (error) {
    logger.error('❌ [AdminNotifications] Error fetching admin users', error as Error, {
      component: 'AdminNotifications'
    });
    return [];
  }
}

/**
 * Notify all admins when a new user registers
 */
export async function notifyAdminsNewUser(data: {
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
}): Promise<void> {
  try {
    const adminIds = await getAdminUserIds();

    if (adminIds.length === 0) {
      logger.warn('⚠️ [AdminNotifications] No admin users found to notify', {
        component: 'AdminNotifications',
        event: 'new_user'
      });
      return;
    }

    // Send notification to each admin
    const notificationPromises = adminIds.map(async adminId => {
      const notificationService = new NotificationService(adminId);
      return notificationService.createAdminNewUserNotification(data);
    });

    await Promise.all(notificationPromises);

    logger.info('✅ [AdminNotifications] New user notifications sent to all admins', {
      component: 'AdminNotifications',
      adminCount: adminIds.length,
      userId: data.userId,
      userName: data.userName
    });
  } catch (error) {
    logger.error('❌ [AdminNotifications] Error notifying admins of new user', error as Error, {
      component: 'AdminNotifications',
      userId: data.userId
    });
  }
}

/**
 * Notify all admins when a new ticket is created
 */
export async function notifyAdminsNewTicket(data: {
  ticketId: string;
  ticketTitle: string;
  ticketPriority: string;
  userId: string;
  userName: string;
  userEmail: string;
}): Promise<void> {
  try {
    const adminIds = await getAdminUserIds();

    if (adminIds.length === 0) {
      logger.warn('⚠️ [AdminNotifications] No admin users found to notify', {
        component: 'AdminNotifications',
        event: 'new_ticket'
      });
      return;
    }

    // Send notification to each admin
    const notificationPromises = adminIds.map(async adminId => {
      const notificationService = new NotificationService(adminId);
      return notificationService.createAdminNewTicketNotification(data);
    });

    await Promise.all(notificationPromises);

    logger.info('✅ [AdminNotifications] New ticket notifications sent to all admins', {
      component: 'AdminNotifications',
      adminCount: adminIds.length,
      ticketId: data.ticketId,
      ticketTitle: data.ticketTitle,
      priority: data.ticketPriority
    });
  } catch (error) {
    logger.error('❌ [AdminNotifications] Error notifying admins of new ticket', error as Error, {
      component: 'AdminNotifications',
      ticketId: data.ticketId
    });
  }
}

/**
 * Notify all admins when a user responds to a ticket
 */
export async function notifyAdminsTicketUserResponse(data: {
  ticketId: string;
  ticketTitle: string;
  userId: string;
  userName: string;
  responsePreview: string;
}): Promise<void> {
  try {
    const adminIds = await getAdminUserIds();

    if (adminIds.length === 0) {
      logger.warn('⚠️ [AdminNotifications] No admin users found to notify', {
        component: 'AdminNotifications',
        event: 'ticket_user_response'
      });
      return;
    }

    // Send notification to each admin
    const notificationPromises = adminIds.map(async adminId => {
      const notificationService = new NotificationService(adminId);
      return notificationService.createAdminTicketUserResponseNotification(data);
    });

    await Promise.all(notificationPromises);

    logger.info('✅ [AdminNotifications] Ticket response notifications sent to all admins', {
      component: 'AdminNotifications',
      adminCount: adminIds.length,
      ticketId: data.ticketId,
      userName: data.userName
    });
  } catch (error) {
    logger.error('❌ [AdminNotifications] Error notifying admins of ticket response', error as Error, {
      component: 'AdminNotifications',
      ticketId: data.ticketId
    });
  }
}
