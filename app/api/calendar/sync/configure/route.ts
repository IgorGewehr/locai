/**
 * Calendar Sync Configuration API
 *
 * POST /api/calendar/sync/configure
 * Creates a new calendar sync configuration for a property
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify-auth';
import { calendarSyncService } from '@/lib/services/calendar-sync-service';
import { logger } from '@/lib/utils/logger';
import { CalendarSyncSource } from '@/lib/types/calendar-sync';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { tenantId, uid } = authResult.user;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID não encontrado' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { propertyId, iCalUrl, source, syncFrequency } = body;

    // Validate required fields
    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID é obrigatório' },
        { status: 400 }
      );
    }

    if (!iCalUrl) {
      return NextResponse.json(
        { error: 'iCal URL é obrigatória' },
        { status: 400 }
      );
    }

    // Validate iCal URL format
    if (!iCalUrl.includes('.ics')) {
      return NextResponse.json(
        { error: 'URL de iCal inválida. Deve conter .ics' },
        { status: 400 }
      );
    }

    // Validate source
    const validSources = Object.values(CalendarSyncSource);
    if (source && !validSources.includes(source)) {
      return NextResponse.json(
        { error: 'Source inválido' },
        { status: 400 }
      );
    }

    // Validate sync frequency
    const validFrequencies = ['hourly', 'daily', 'manual'];
    if (syncFrequency && !validFrequencies.includes(syncFrequency)) {
      return NextResponse.json(
        { error: 'Frequência de sincronização inválida' },
        { status: 400 }
      );
    }

    logger.info('Creating calendar sync configuration', {
      propertyId,
      tenantId,
      source: source || CalendarSyncSource.AIRBNB,
    });

    // Create sync configuration
    const configId = await calendarSyncService.createSyncConfiguration(
      propertyId,
      tenantId,
      uid,
      iCalUrl,
      source || CalendarSyncSource.AIRBNB,
      syncFrequency || 'daily'
    );

    // Trigger initial sync
    try {
      await calendarSyncService.syncProperty(propertyId, tenantId);
      logger.info('Initial sync triggered successfully', { propertyId, configId });
    } catch (syncError) {
      logger.warn('Initial sync failed, but configuration was created', {
        propertyId,
        configId,
        syncError,
      });
      // Don't fail the configuration creation if initial sync fails
    }

    return NextResponse.json({
      success: true,
      configId,
      message: 'Sincronização de calendário configurada com sucesso',
    });
  } catch (error) {
    logger.error('Error in calendar sync configuration API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Erro ao configurar sincronização de calendário',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
