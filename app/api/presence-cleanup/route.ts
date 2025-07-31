import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { authMiddleware } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/utils/rate-limiter';
import { handleApiError } from '@/lib/utils/api-errors';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    await rateLimiters.api.checkLimit({
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      headers: request.headers
    });

    // Check authentication
    const authContext = await authMiddleware(request);

    if (!authContext.authenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId, tenantId } = authContext;

    logger.info('Presence cleanup requested', {
      userId,
      tenantId,
      component: 'PresenceCleanupAPI',
      operation: 'POST'
    });

    // Parse request body for cleanup parameters
    const body = await request.json().catch(() => ({}));
    const { 
      cleanupType = 'inactive_sessions',
      maxAge = 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      batchSize = 100 
    } = body;

    let cleanedCount = 0;

    switch (cleanupType) {
      case 'inactive_sessions':
        cleanedCount = await cleanupInactiveSessions(tenantId, maxAge, batchSize);
        break;
      
      case 'expired_contexts':
        cleanedCount = await cleanupExpiredContexts(tenantId, maxAge, batchSize);
        break;
      
      case 'old_conversations':
        cleanedCount = await cleanupOldConversations(tenantId, maxAge, batchSize);
        break;
      
      case 'all':
        const sessions = await cleanupInactiveSessions(tenantId, maxAge, batchSize);
        const contexts = await cleanupExpiredContexts(tenantId, maxAge, batchSize);
        const conversations = await cleanupOldConversations(tenantId, maxAge, batchSize);
        cleanedCount = sessions + contexts + conversations;
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid cleanup type' },
          { status: 400 }
        );
    }

    logger.info('Presence cleanup completed', {
      userId,
      tenantId,
      cleanupType,
      cleanedCount,
      component: 'PresenceCleanupAPI'
    });

    return NextResponse.json({
      success: true,
      cleanupType,
      cleanedCount,
      message: `Cleaned up ${cleanedCount} records`
    });

  } catch (error) {
    logger.error('Presence cleanup error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      component: 'PresenceCleanupAPI',
      operation: 'POST'
    });

    return handleApiError(error);
  }
}

/**
 * Clean up inactive WhatsApp sessions
 */
async function cleanupInactiveSessions(tenantId: string, maxAge: number, batchSize: number): Promise<number> {
  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    const cutoffTime = new Date(Date.now() - maxAge);
    
    const sessionsRef = adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('whatsapp_sessions');

    const snapshot = await sessionsRef
      .where('lastActivity', '<', cutoffTime)
      .where('status', '!=', 'active')
      .limit(batchSize)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    
    logger.info('Cleaned up inactive sessions', {
      tenantId,
      count: snapshot.size,
      cutoffTime: cutoffTime.toISOString()
    });

    return snapshot.size;
  } catch (error) {
    logger.error('Error cleaning up inactive sessions', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return 0;
  }
}

/**
 * Clean up expired conversation contexts
 */
async function cleanupExpiredContexts(tenantId: string, maxAge: number, batchSize: number): Promise<number> {
  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    const cutoffTime = new Date(Date.now() - maxAge);
    
    const contextsRef = adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('conversation_contexts');

    const snapshot = await contextsRef
      .where('lastInteraction', '<', cutoffTime)
      .limit(batchSize)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    
    logger.info('Cleaned up expired contexts', {
      tenantId,
      count: snapshot.size,
      cutoffTime: cutoffTime.toISOString()
    });

    return snapshot.size;
  } catch (error) {
    logger.error('Error cleaning up expired contexts', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return 0;
  }
}

/**
 * Clean up old conversations (archive, don't delete)
 */
async function cleanupOldConversations(tenantId: string, maxAge: number, batchSize: number): Promise<number> {
  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    const cutoffTime = new Date(Date.now() - maxAge);
    
    const conversationsRef = adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('conversations');

    const snapshot = await conversationsRef
      .where('lastMessageAt', '<', cutoffTime)
      .where('archived', '!=', true)
      .limit(batchSize)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        archived: true,
        archivedAt: new Date(),
        archivedReason: 'auto_cleanup'
      });
    });

    await batch.commit();
    
    logger.info('Archived old conversations', {
      tenantId,
      count: snapshot.size,
      cutoffTime: cutoffTime.toISOString()
    });

    return snapshot.size;
  } catch (error) {
    logger.error('Error archiving old conversations', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authContext = await authMiddleware(request);

    if (!authContext.authenticated) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { tenantId } = authContext;

    // Get cleanup statistics
    const { adminDb } = await import('@/lib/firebase/admin');
    const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours

    const [sessionsSnapshot, contextsSnapshot, conversationsSnapshot] = await Promise.all([
      adminDb
        .collection('tenants')
        .doc(tenantId)
        .collection('whatsapp_sessions')
        .where('lastActivity', '<', cutoffTime)
        .where('status', '!=', 'active')
        .get(),
      
      adminDb
        .collection('tenants')
        .doc(tenantId)
        .collection('conversation_contexts')
        .where('lastInteraction', '<', cutoffTime)
        .get(),
      
      adminDb
        .collection('tenants')
        .doc(tenantId)
        .collection('conversations')
        .where('lastMessageAt', '<', cutoffTime)
        .where('archived', '!=', true)
        .get()
    ]);

    return NextResponse.json({
      success: true,
      statistics: {
        inactiveSessions: sessionsSnapshot.size,
        expiredContexts: contextsSnapshot.size,
        oldConversations: conversationsSnapshot.size,
        total: sessionsSnapshot.size + contextsSnapshot.size + conversationsSnapshot.size
      },
      cutoffTime: cutoffTime.toISOString()
    });

  } catch (error) {
    logger.error('Error getting cleanup statistics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      component: 'PresenceCleanupAPI',
      operation: 'GET'
    });

    return handleApiError(error);
  }
}