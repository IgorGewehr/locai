/**
 * Calendar Sync Manual Trigger API
 *
 * POST /api/calendar/sync/[propertyId]
 * Manually triggers calendar synchronization for a specific property
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify-auth';
import { calendarSyncService } from '@/lib/services/calendar-sync-service';
import { logger } from '@/lib/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    // Await params before accessing properties (Next.js 15 requirement)
    const { propertyId } = await params;

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID é obrigatório' },
        { status: 400 }
      );
    }

    // Verify authentication
    const authResult = await verifyAuth(request);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { tenantId } = authResult.user;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID não encontrado' },
        { status: 400 }
      );
    }

    logger.info('Manual calendar sync triggered', {
      propertyId,
      tenantId,
    });

    // Trigger sync
    const result = await calendarSyncService.syncProperty(propertyId, tenantId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sincronização falhou',
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: {
        eventsProcessed: result.eventsProcessed,
        eventsImported: result.eventsImported,
        periodsCreated: result.periodsCreated,
        periodsUpdated: result.periodsUpdated,
        duration: result.duration,
        syncedAt: result.syncedAt,
      },
      message: `Sincronização concluída: ${result.eventsImported} evento(s) importado(s)`,
    });
  } catch (error) {
    // Get propertyId safely for error logging
    const { propertyId } = await params;

    logger.error('Error in manual calendar sync API', {
      propertyId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao sincronizar calendário',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
