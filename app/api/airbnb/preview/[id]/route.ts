/**
 * Airbnb Property Preview API
 *
 * This endpoint fetches property data from Airbnb and returns the mapped JSON
 * WITHOUT creating the property in the database.
 *
 * This is used by the iOS app to preview properties before importing.
 *
 * Usage: GET /api/airbnb/preview/{airbnbPropertyId}
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { fetchAirbnbPropertyData } from '@/lib/services/airbnb-import-service';
import { mapAirbnbToProperty, validateMappedProperty } from '@/lib/utils/airbnb-mapper';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing properties (Next.js 15 requirement)
    const { id: propertyId } = await params;

    // Validate property ID format
    if (!propertyId || !/^\d+$/.test(propertyId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de propriedade inválido',
          message: 'O ID deve ser um número válido do Airbnb'
        },
        { status: 400 }
      );
    }

    // Authenticate user (required for security)
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated || !auth.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required'
        },
        { status: 401 }
      );
    }

    const tenantId = auth.tenantId;

    logger.info('🔍 [Airbnb Preview] Fetching property preview', {
      propertyId,
      tenantId,
      userId: auth.userId,
    });

    // Step 1: Fetch Airbnb property data via hasdata.com API
    const airbnbData = await fetchAirbnbPropertyData(propertyId);

    if (!airbnbData) {
      logger.warn('⚠️ [Airbnb Preview] Property not found', { propertyId });
      return NextResponse.json(
        {
          success: false,
          error: 'Propriedade não encontrada',
          message: 'Não foi possível obter os dados da propriedade do Airbnb. Verifique o ID e tente novamente.',
        },
        { status: 404 }
      );
    }

    // Step 2: Map Airbnb data to our Property interface
    const mappedProperty = mapAirbnbToProperty(airbnbData, tenantId);

    // Step 3: Validate the mapped property
    const validation = validateMappedProperty(mappedProperty);

    logger.info('✅ [Airbnb Preview] Property preview generated successfully', {
      propertyId,
      tenantId,
      title: mappedProperty.title,
      photosCount: mappedProperty.photos.length,
      amenitiesCount: mappedProperty.amenities.length,
      validationPassed: validation.valid,
    });

    // Return the preview with validation results
    return NextResponse.json({
      success: true,
      propertyId,
      data: {
        // Original Airbnb data (for reference)
        airbnbData: {
          id: airbnbData.id,
          title: airbnbData.title,
          description: airbnbData.description,
          address: airbnbData.address,
          photos: airbnbData.photos.map(p => ({
            url: p.url,
            caption: p.caption,
          })),
          amenities: airbnbData.amenities.map(a => ({
            name: a.name,
            category: a.category,
          })),
          guestCapacity: airbnbData.guestCapacity,
          propertyType: airbnbData.propertyType,
        },

        // Mapped property (ready for import)
        mappedProperty,

        // Validation results
        validation: {
          isValid: validation.valid,
          errors: validation.errors,
          warnings: generateWarnings(mappedProperty),
        },

        // Import metadata
        metadata: {
          source: 'airbnb',
          sourceId: propertyId,
          importedAt: new Date().toISOString(),
          tenantId,
        },
      },
    });

  } catch (error) {
    // Get propertyId safely for error logging
    const { id: propertyId } = await params;

    logger.error('❌ [Airbnb Preview] Error generating preview', {
      propertyId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao gerar preview da propriedade',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate warnings for the user about the mapped property
 */
function generateWarnings(property: any): string[] {
  const warnings: string[] = [];

  // Check if price is set to default (0)
  if (property.basePrice === 0) {
    warnings.push('O preço base está definido como R$ 0. Por favor, configure o preço antes de ativar a propriedade.');
  }

  // Check if cleaning fee is 0
  if (property.cleaningFee === 0) {
    warnings.push('A taxa de limpeza está definida como R$ 0. Considere adicionar uma taxa de limpeza.');
  }

  // Check if photos are present
  if (!property.photos || property.photos.length === 0) {
    warnings.push('Nenhuma foto foi importada. Adicione fotos manualmente após a importação.');
  } else if (property.photos.length < 5) {
    warnings.push(`Apenas ${property.photos.length} foto(s) importada(s). Recomendamos adicionar mais fotos para melhor apresentação.`);
  }

  // Check if amenities are present
  if (!property.amenities || property.amenities.length === 0) {
    warnings.push('Nenhuma comodidade foi importada. Adicione comodidades manualmente após a importação.');
  }

  // Check if description is empty
  if (!property.description || property.description.trim() === '') {
    warnings.push('A descrição está vazia. Adicione uma descrição detalhada da propriedade.');
  }

  return warnings;
}
