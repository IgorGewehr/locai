/**
 * Property Bulk Import API
 * Handles bulk property import with media processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import PropertyImportService, { ImportProgress, ImportResult } from '@/lib/services/property-import-service';
import { BulkImportData } from '@/lib/validation/property-import-schema';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

// In-memory storage for import progress (in production, use Redis or database)
const importProgressMap = new Map<string, ImportProgress>();

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

    // Create import service
    const importService = new PropertyImportService(tenantId);

    // Start import process (async)
    const importPromise = importService.importProperties(
      importData,
      (progress: ImportProgress) => {
        // Store progress for status endpoint
        importProgressMap.set(tenantId, progress);
      }
    );

    // Return import ID immediately (don't wait for completion)
    const importResult = await Promise.race([
      importPromise,
      new Promise<ImportResult>((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            importId: `async_${Date.now()}`,
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
      // Clean up progress tracking
      importProgressMap.delete(tenantId);

      logger.info('✅ [PropertyImport API] Import completed quickly', {
        tenantId,
        importId: importResult.importId,
        completed: importResult.progress.completed,
        failed: importResult.progress.failed
      });

      return NextResponse.json({
        success: importResult.success,
        importId: importResult.importId,
        completed: true,
        result: importResult,
        message: importResult.message
      });
    }

    // Continue processing in background
    importPromise.then((finalResult) => {
      logger.info('🎯 [PropertyImport API] Background import completed', {
        tenantId,
        importId: finalResult.importId,
        completed: finalResult.progress.completed,
        failed: finalResult.progress.failed
      });

      // Keep final result for 10 minutes
      setTimeout(() => {
        importProgressMap.delete(tenantId);
      }, 10 * 60 * 1000);
    }).catch((error) => {
      logger.error('💥 [PropertyImport API] Background import failed', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update progress with error
      importProgressMap.set(tenantId, {
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
    });

    return NextResponse.json({
      success: true,
      importId: importResult.importId,
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
    const progress = importProgressMap.get(tenantId);

    if (!progress) {
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
      progress,
      completed: progress.stage === 'completed' || progress.stage === 'failed'
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