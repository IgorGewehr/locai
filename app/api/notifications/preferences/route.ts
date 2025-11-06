// app/api/notifications/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import type { NotificationPreferences } from '@/lib/types/notification';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId || !authContext.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { tenantId, userId } = authContext;

    logger.info('[Preferences API] Getting notification preferences', {
      tenantId: tenantId.substring(0, 8) + '***',
      userId: userId.substring(0, 8) + '***'
    });

    // Get preferences from Firestore
    const services = new TenantServiceFactory(tenantId);
    const preferencesService = services.createService<NotificationPreferences>('notificationPreferences');

    const preferences = await preferencesService.get(userId);

    // If no preferences exist, return defaults
    if (!preferences) {
      const defaultPreferences: NotificationPreferences = {
        userId,
        email: {
          enabled: true,
          address: authContext.email || '',
          frequency: 'immediate',
          types: []
        },
        dashboard: {
          enabled: true,
          types: []
        },
        whatsapp: {
          enabled: false,
          phoneNumber: '',
          types: []
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: 'America/Sao_Paulo'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return NextResponse.json({
        success: true,
        data: defaultPreferences
      });
    }

    return NextResponse.json({
      success: true,
      data: preferences
    });

  } catch (error) {
    logger.error('[Preferences API] Error getting preferences', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      {
        error: 'Failed to get preferences',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId || !authContext.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { tenantId, userId } = authContext;
    const body = await request.json();

    logger.info('[Preferences API] Updating notification preferences', {
      tenantId: tenantId.substring(0, 8) + '***',
      userId: userId.substring(0, 8) + '***'
    });

    // Validate body structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Prepare preferences data
    const preferencesData: NotificationPreferences = {
      userId,
      email: body.email || { enabled: true, address: authContext.email || '', frequency: 'immediate', types: [] },
      dashboard: body.dashboard || { enabled: true, types: [] },
      whatsapp: body.whatsapp || { enabled: false, phoneNumber: '', types: [] },
      quietHours: body.quietHours || { enabled: false, start: '22:00', end: '08:00', timezone: 'America/Sao_Paulo' },
      updatedAt: new Date()
    };

    // Save to Firestore
    const services = new TenantServiceFactory(tenantId);
    const preferencesService = services.createService<NotificationPreferences>('notificationPreferences');

    // Check if preferences exist
    const existing = await preferencesService.get(userId);

    if (existing) {
      // Update existing
      await preferencesService.update(userId, preferencesData);
      logger.info('[Preferences API] Preferences updated successfully', {
        tenantId: tenantId.substring(0, 8) + '***',
        userId: userId.substring(0, 8) + '***'
      });
    } else {
      // Create new with ID = userId
      preferencesData.createdAt = new Date();
      await preferencesService.create(preferencesData, userId);
      logger.info('[Preferences API] Preferences created successfully', {
        tenantId: tenantId.substring(0, 8) + '***',
        userId: userId.substring(0, 8) + '***'
      });
    }

    // Invalidate cache so next notification fetch will get fresh data
    const { NotificationService } = await import('@/lib/services/notification-service');
    NotificationService.invalidatePreferencesCache(tenantId, userId);

    return NextResponse.json({
      success: true,
      data: preferencesData
    });

  } catch (error) {
    logger.error('[Preferences API] Error updating preferences', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      {
        error: 'Failed to update preferences',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/preferences/test
 * Test notification delivery with current preferences
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId || !authContext.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { tenantId, userId, email } = authContext;

    logger.info('[Preferences API] Testing notification delivery', {
      tenantId: tenantId.substring(0, 8) + '***',
      userId: userId.substring(0, 8) + '***'
    });

    // Get preferences
    const services = new TenantServiceFactory(tenantId);
    const preferencesService = services.createService<NotificationPreferences>('notificationPreferences');
    const preferences = await preferencesService.get(userId);

    // Test email if enabled
    let emailResult = null;
    if (preferences?.email?.enabled && email) {
      const { EmailService } = await import('@/lib/services/email-service');
      const sent = await EmailService.sendTest(email);
      emailResult = { success: sent, channel: 'email' };
    }

    return NextResponse.json({
      success: true,
      results: {
        email: emailResult
      }
    });

  } catch (error) {
    logger.error('[Preferences API] Error testing notification', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      {
        error: 'Failed to test notification',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    );
  }
}
