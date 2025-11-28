/**
 * Property Bulk Import API
 * Handles bulk property import with media processing
 *
 * ✅ MÉDIO 9: Migrado progresso de importação para Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import PropertyImportService, { ImportProgress, ImportResult } from '@/lib/services/property-import-service';
import { BulkImportData } from '@/lib/validation/property-import-schema';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import { ImportProgressService } from '@/lib/services/import-progress-service';

/**
 * POST /api/properties/import
 * Start bulk import process
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const tenantId = auth.tenantId;

    logger.info('🚀 [PropertyImport API] Import request received', {
      tenantId,
      userId: auth.userId,
      userAgent: request.headers.get('user-agent')?.slice(0, 100)
    });

    // Parse request body
    const body = await request.json();

    // Validate import data
    const validation = await PropertyImportService.validateImportFile(
      JSON.stringify(body)
    );

    if (!validation.valid) {
      logger.warn('❌ [PropertyImport API] Validation failed', {
        tenantId,
        errors: validation.errors
      });

      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Import data is invalid',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    const importData = validation.data as BulkImportData;

    // Check import limits (max 100 properties per import)
    if (importData.properties.length > 100) {
      return NextResponse.json(
        {
          error: 'Import too large',
          message: 'Maximum 100 properties per import',
          limit: 100,
          received: importData.properties.length
        },
        { status: 400 }
      );
    }

    // ✅ MÉDIO 9: Criar job de importação no Firestore
    const jobId = await ImportProgressService.createJob(
      tenantId,
      importData.properties.length,
      auth.userId,
      importData.source
    );

    // Create import service
    const importService = new PropertyImportService(tenantId);

    // Start import process (async) with Firestore progress tracking
    const importPromise = importService.importProperties(
      importData,
      async (progress: ImportProgress) => {
        // ✅ MÉDIO 9: Persistir progresso no Firestore
        await ImportProgressService.updateProgress(jobId, progress);
      }
    );

    // Return import ID immediately (don't wait for completion)
    const importResult = await Promise.race([
      importPromise,
      new Promise<ImportResult>((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            importId: jobId,
            progress: {
              total: importData.properties.length,
              completed: 0,
              failed: 0,
              stage: 'processing_media',
              errors: []
            },
            createdProperties: [],
            skippedProperties: [],
            message: 'Import started successfully'
          });
        }, 1000); // Wait 1 second to see if import completes quickly
      })
    ]);

    // If import completed quickly, return full result
    if (importResult.progress.stage === 'completed' || importResult.progress.stage === 'failed') {
      // ✅ MÉDIO 9: Marcar job como concluído no Firestore
      await ImportProgressService.completeJob(
        jobId,
        importResult.message,
        importResult.success
      );

      logger.info('✅ [PropertyImport API] Import completed quickly', {
        tenantId,
        importId: jobId,
        completed: importResult.progress.completed,
        failed: importResult.progress.failed
      });

      return NextResponse.json({
        success: importResult.success,
        importId: jobId,
        completed: true,
        result: importResult,
        message: importResult.message
      });
    }

    // Continue processing in background
    importPromise.then(async (finalResult) => {
      logger.info('🎯 [PropertyImport API] Background import completed', {
        tenantId,
        importId: jobId,
        completed: finalResult.progress.completed,
        failed: finalResult.progress.failed
      });

      // ✅ MÉDIO 9: Marcar job como concluído no Firestore
      await ImportProgressService.completeJob(
        jobId,
        finalResult.message,
        finalResult.success
      );
    }).catch(async (error) => {
      logger.error('💥 [PropertyImport API] Background import failed', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // ✅ MÉDIO 9: Atualizar progresso com erro no Firestore
      await ImportProgressService.updateProgress(jobId, {
        total: importData.properties.length,
        completed: 0,
        failed: importData.properties.length,
        stage: 'failed',
        errors: [{
          propertyIndex: -1,
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'database'
        }]
      });

      await ImportProgressService.completeJob(
        jobId,
        error instanceof Error ? error.message : 'Unknown error',
        false
      );
    });

    return NextResponse.json({
      success: true,
      importId: jobId,
      completed: false,
      message: 'Import started successfully. Use the status endpoint to track progress.',
      statusEndpoint: `/api/properties/import/status`,
      propertiesCount: importData.properties.length
    });

  } catch (error) {
    logger.error('💥 [PropertyImport API] Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during import'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/properties/import/status
 * Get import progress status
 *
 * ✅ MÉDIO 9: Agora busca do Firestore ao invés de memória
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = auth.tenantId;

    // ✅ MÉDIO 9: Buscar job do Firestore
    // Primeiro tenta buscar job ativo, depois o mais recente
    let job = await ImportProgressService.getActiveJob(tenantId);

    if (!job) {
      // Buscar o job mais recente (pode estar concluído)
      job = await ImportProgressService.getLatestJob(tenantId);
    }

    if (!job) {
      return NextResponse.json(
        {
          error: 'No import in progress',
          message: 'No active import found for this tenant'
        },
        { status: 404 }
      );
    }

    // Verificar se o job expirou (muito antigo)
    const now = Date.now();
    const jobAge = now - job.createdAt.toMillis();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    if (jobAge > maxAge && job.status !== 'running') {
      return NextResponse.json(
        {
          error: 'No import in progress',
          message: 'No active import found for this tenant'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      importId: job.id,
      progress: job.progress,
      completed: job.status === 'completed' || job.status === 'failed',
      createdProperties: job.createdProperties,
      skippedProperties: job.skippedProperties,
      message: job.message,
    });

  } catch (error) {
    logger.error('💥 [PropertyImport API] Status check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}