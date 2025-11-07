/**
 * Property Import Validation API
 * Validates JSON file content before import
 */

import { NextRequest, NextResponse } from 'next/server';
import PropertyImportService from '@/lib/services/property-import-service';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/properties/import/validate
 * Validate import file content
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({
        valid: false,
        errors: ['Conteúdo do arquivo é obrigatório']
      });
    }

    const validation = await PropertyImportService.validateImportFile(body.content);

    logger.info('📋 [PropertyImport Validation] File validation completed', {
      valid: validation.valid,
      errorCount: validation.errors.length,
      propertiesCount: validation.data?.properties?.length || 0
    });

    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
      propertiesCount: validation.data?.properties?.length || 0,
      summary: validation.valid
        ? `${validation.data?.properties?.length || 0} propriedades encontradas`
        : `${validation.errors.length} erros encontrados`
    });

  } catch (error) {
    logger.error('💥 [PropertyImport Validation] Validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      valid: false,
      errors: ['Erro interno ao validar o arquivo']
    }, { status: 500 });
  }
}