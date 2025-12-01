// lib/utils/admin-notifications.ts
// Utility to send notifications to all admin users
// FIXED: Now uses correct targetUserId (admin's real UID) instead of 'ADMIN' string literal

import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NotificationServiceFactory } from '@/lib/services/notification-service';
import { NotificationType, NotificationPriority, NotificationChannel } from '@/lib/types/notification';
import { logger } from '@/lib/utils/logger';

/**
 * Admin user data interface
 * In Locai, tenantId = userId for all users
 */
interface AdminUser {
  uid: string;
  tenantId: string;
  name?: string;
  email?: string;
}

/**
 * Get all admin users from users collection with complete data
 * Admins are identified by having idog: true
 *
 * FIXED: Now returns full admin data including tenantId for proper notification routing
 */
async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('idog', '==', true));
    const snapshot = await getDocs(q);

    const admins: AdminUser[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        tenantId: doc.id, // In Locai, tenantId = userId
        name: data.name || data.fullName || 'Admin',
        email: data.email
      };
    });

    logger.info('[AdminNotifications] Admin users found', {
      component: 'AdminNotifications',
      count: admins.length,
      adminIds: admins.map(a => a.uid.substring(0, 8) + '***')
    });

    return admins;
  } catch (error) {
    logger.error('[AdminNotifications] Error fetching admin users', error as Error, {
      component: 'AdminNotifications'
    });
    return [];
  }
}

/**
 * Notify all admins when a new user registers
 *
 * FIXED:
 * - Uses NotificationServiceFactory instead of direct instantiation
 * - Uses admin's real UID as targetUserId instead of 'ADMIN' string
 * - Saves notification in admin's tenant collection
 */
export async function notifyAdminsNewUser(data: {
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
}): Promise<void> {
  try {
    const admins = await getAdminUsers();

    if (admins.length === 0) {
      logger.warn('[AdminNotifications] No admin users found to notify', {
        component: 'AdminNotifications',
        event: 'new_user'
      });
      return;
    }

    const title = 'Novo usuário registrado';
    const message = `${data.userName} (${data.userEmail}) acabou de se registrar no plano ${data.plan}`;

    // Send notification to each admin with their REAL userId
    const notificationPromises = admins.map(async admin => {
      const notificationService = NotificationServiceFactory.getInstance(admin.tenantId);

      return notificationService.createNotification({
        targetUserId: admin.uid, // FIXED: Use admin's real UID, not 'ADMIN' string
        targetUserName: admin.name,
        type: NotificationType.ADMIN_NEW_USER_REGISTERED,
        title,
        message,
        entityType: 'system',
        entityId: data.userId,
        entityData: {
          userName: data.userName,
          userEmail: data.userEmail,
          plan: data.plan,
          userId: data.userId
        },
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.DASHBOARD],
        actions: [{
          id: 'view_admin_panel',
          label: 'Ver Painel Admin',
          type: 'primary',
          action: 'navigate',
          config: {
            url: '/dashboard/lkjhg'
          }
        }],
        metadata: {
          source: 'auth_system',
          triggerEvent: 'user_registered'
        }
      });
    });

    await Promise.all(notificationPromises);

    logger.info('[AdminNotifications] New user notifications sent to all admins', {
      component: 'AdminNotifications',
      adminCount: admins.length,
      userId: data.userId,
      userName: data.userName
    });
  } catch (error) {
    logger.error('[AdminNotifications] Error notifying admins of new user', error as Error, {
      component: 'AdminNotifications',
      userId: data.userId
    });
  }
}

/**
 * Notify all admins when a new ticket is created
 *
 * FIXED:
 * - Uses NotificationServiceFactory instead of direct instantiation
 * - Uses admin's real UID as targetUserId instead of 'ADMIN' string
 * - Saves notification in admin's tenant collection
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
    const admins = await getAdminUsers();

    if (admins.length === 0) {
      logger.warn('[AdminNotifications] No admin users found to notify', {
        component: 'AdminNotifications',
        event: 'new_ticket'
      });
      return;
    }

    const title = 'Novo ticket de suporte criado';
    const priorityLabel = data.ticketPriority === 'high' || data.ticketPriority === 'critical'
      ? ` (Prioridade: ${data.ticketPriority.toUpperCase()})`
      : '';
    const message = `${data.userName} criou um ticket: "${data.ticketTitle}"${priorityLabel}`;

    const priority = data.ticketPriority === 'critical' || data.ticketPriority === 'high'
      ? NotificationPriority.HIGH
      : NotificationPriority.MEDIUM;

    // Send notification to each admin with their REAL userId
    const notificationPromises = admins.map(async admin => {
      const notificationService = NotificationServiceFactory.getInstance(admin.tenantId);

      return notificationService.createNotification({
        targetUserId: admin.uid, // FIXED: Use admin's real UID, not 'ADMIN' string
        targetUserName: admin.name,
        type: NotificationType.ADMIN_NEW_TICKET_CREATED,
        title,
        message,
        entityType: 'ticket',
        entityId: data.ticketId,
        entityData: {
          ticketTitle: data.ticketTitle,
          ticketPriority: data.ticketPriority,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail
        },
        priority,
        channels: [NotificationChannel.DASHBOARD],
        actions: [{
          id: 'view_ticket',
          label: 'Ver Ticket',
          type: 'primary',
          action: 'navigate',
          config: {
            url: '/dashboard/lkjhg'
          }
        }],
        metadata: {
          source: 'ticket_system',
          triggerEvent: 'ticket_created'
        }
      });
    });

    await Promise.all(notificationPromises);

    logger.info('[AdminNotifications] New ticket notifications sent to all admins', {
      component: 'AdminNotifications',
      adminCount: admins.length,
      ticketId: data.ticketId,
      ticketTitle: data.ticketTitle,
      priority: data.ticketPriority
    });
  } catch (error) {
    logger.error('[AdminNotifications] Error notifying admins of new ticket', error as Error, {
      component: 'AdminNotifications',
      ticketId: data.ticketId
    });
  }
}

/**
 * Notify all admins when a user responds to a ticket
 *
 * FIXED:
 * - Uses NotificationServiceFactory instead of direct instantiation
 * - Uses admin's real UID as targetUserId instead of 'ADMIN' string
 * - Saves notification in admin's tenant collection
 */
export async function notifyAdminsTicketUserResponse(data: {
  ticketId: string;
  ticketTitle: string;
  userId: string;
  userName: string;
  responsePreview: string;
}): Promise<void> {
  try {
    const admins = await getAdminUsers();

    if (admins.length === 0) {
      logger.warn('[AdminNotifications] No admin users found to notify', {
        component: 'AdminNotifications',
        event: 'ticket_user_response'
      });
      return;
    }

    const title = 'Usuário respondeu ticket';
    const preview = data.responsePreview.length > 100
      ? data.responsePreview.substring(0, 100) + '...'
      : data.responsePreview;
    const message = `${data.userName} respondeu o ticket "${data.ticketTitle}": ${preview}`;

    // Send notification to each admin with their REAL userId
    const notificationPromises = admins.map(async admin => {
      const notificationService = NotificationServiceFactory.getInstance(admin.tenantId);

      return notificationService.createNotification({
        targetUserId: admin.uid, // FIXED: Use admin's real UID, not 'ADMIN' string
        targetUserName: admin.name,
        type: NotificationType.ADMIN_TICKET_USER_RESPONSE,
        title,
        message,
        entityType: 'ticket',
        entityId: data.ticketId,
        entityData: {
          ticketTitle: data.ticketTitle,
          userId: data.userId,
          userName: data.userName,
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
            url: '/dashboard/lkjhg'
          }
        }],
        metadata: {
          source: 'ticket_system',
          triggerEvent: 'ticket_user_response'
        }
      });
    });

    await Promise.all(notificationPromises);

    logger.info('[AdminNotifications] Ticket response notifications sent to all admins', {
      component: 'AdminNotifications',
      adminCount: admins.length,
      ticketId: data.ticketId,
      userName: data.userName
    });
  } catch (error) {
    logger.error('[AdminNotifications] Error notifying admins of ticket response', error as Error, {
      component: 'AdminNotifications',
      ticketId: data.ticketId
    });
  }
}

/**
 * Notify all admins when Sofia AI requests human assistance
 *
 * NEW: Added to handle post-notification AI function properly
 */
export async function notifyAdminsHumanAssistanceRequest(data: {
  phone: string;
  conversationId?: string;
  tenantId: string;
  reason?: string;
}): Promise<void> {
  try {
    const admins = await getAdminUsers();

    if (admins.length === 0) {
      logger.warn('[AdminNotifications] No admin users found to notify', {
        component: 'AdminNotifications',
        event: 'human_assistance_request'
      });
      return;
    }

    const title = 'Cliente solicita atendimento humano';
    const message = data.reason
      ? `Cliente ${data.phone} solicitou atendimento humano: ${data.reason}`
      : `Cliente ${data.phone} solicitou atendimento humano`;

    // Send notification to each admin with their REAL userId
    const notificationPromises = admins.map(async admin => {
      const notificationService = NotificationServiceFactory.getInstance(admin.tenantId);

      return notificationService.createNotification({
        targetUserId: admin.uid,
        targetUserName: admin.name,
        type: NotificationType.SYSTEM_ALERT,
        title,
        message,
        entityType: 'system',
        entityId: data.conversationId || data.phone,
        entityData: {
          phone: data.phone,
          conversationId: data.conversationId,
          tenantId: data.tenantId,
          reason: data.reason
        },
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.DASHBOARD],
        actions: [{
          id: 'view_conversations',
          label: 'Ver Conversas',
          type: 'primary',
          action: 'navigate',
          config: {
            url: '/dashboard/conversas'
          }
        }],
        metadata: {
          source: 'sofia_ai',
          triggerEvent: 'human_assistance_requested'
        }
      });
    });

    await Promise.all(notificationPromises);

    logger.info('[AdminNotifications] Human assistance request notifications sent to all admins', {
      component: 'AdminNotifications',
      adminCount: admins.length,
      phone: data.phone.substring(0, 8) + '***'
    });
  } catch (error) {
    logger.error('[AdminNotifications] Error notifying admins of human assistance request', error as Error, {
      component: 'AdminNotifications',
      phone: data.phone?.substring(0, 8) + '***'
    });
  }
}

// Export getAdminUsers for use in other modules if needed
export { getAdminUsers };
export type { AdminUser };
