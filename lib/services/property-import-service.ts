/**
 * Property Import Service
 * Handles bulk import of properties with media processing
 */

import {
  BulkImportData,
  PropertyImportData,
  bulkImportSchema,
  createDefaultPaymentSurcharges
} from '@/lib/validation/property-import-schema';
import MediaProcessingService, { MediaProcessingResult } from './media-processing-service';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { Property, PropertyCategory, PropertyStatus, PropertyType } from '@/lib/types/property';
import { logger } from '@/lib/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ImportProgress {
  total: number;
  completed: number;
  failed: number;
  currentProperty?: string;
  stage: 'validating' | 'processing_media' | 'saving_properties' | 'completed' | 'failed';
  errors: ImportError[];
}

export interface ImportError {
  propertyIndex: number;
  propertyTitle?: string;
  field?: string;
  message: string;
  type: 'validation' | 'media' | 'database' | 'duplicate';
}

export interface ImportResult {
  success: boolean;
  importId: string;
  progress: ImportProgress;
  createdProperties: string[]; // Property IDs
  skippedProperties: string[]; // Property titles/external IDs
  message: string;
}

export class PropertyImportService {
  private mediaService: MediaProcessingService;
  private tenantServices: ReturnType<typeof TenantServiceFactory>;

  constructor(private tenantId: string) {
    this.tenantServices = TenantServiceFactory(tenantId);
    this.mediaService = new MediaProcessingService({
      tenantId,
      maxFileSize: 50, // 50MB
      createThumbnails: true,
      validateUrls: true,
      timeout: 60000 // 60 seconds per file
    });
  }

  /**
   * Import properties from bulk data
   */
  async importProperties(
    importData: BulkImportData,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    const importId = uuidv4();

    logger.info('🚀 [PropertyImport] Starting bulk import', {
      importId,
      tenantId: this.tenantId,
      propertiesCount: importData.properties.length,
      source: importData.source
    });

    const progress: ImportProgress = {
      total: importData.properties.length,
      completed: 0,
      failed: 0,
      stage: 'validating',
      errors: []
    };

    const result: ImportResult = {
      success: false,
      importId,
      progress,
      createdProperties: [],
      skippedProperties: [],
      message: ''
    };

    try {
      // Stage 1: Validate import data
      progress.stage = 'validating';
      onProgress?.(progress);

      await this.validateImportData(importData, progress);

      if (progress.errors.length > 0) {
        result.message = `Validation failed with ${progress.errors.length} errors`;
        progress.stage = 'failed';
        onProgress?.(progress);
        return result;
      }

      // Stage 2: Process each property
      progress.stage = 'processing_media';
      onProgress?.(progress);

      for (let i = 0; i < importData.properties.length; i++) {
        const propertyData = importData.properties[i];
        progress.currentProperty = propertyData.title;
        onProgress?.(progress);

        try {
          await this.processProperty(propertyData, importData.settings, progress, i);
          progress.completed++;
          result.createdProperties.push(propertyData.title);
        } catch (error) {
          progress.failed++;
          progress.errors.push({
            propertyIndex: i,
            propertyTitle: propertyData.title,
            message: error instanceof Error ? error.message : 'Unknown error',
            type: 'database'
          });
          logger.error('❌ [PropertyImport] Failed to process property', {
            importId,
            propertyIndex: i,
            propertyTitle: propertyData.title,
            error: error instanceof Error ? error.message : 'Unknown error',
            tenantId: this.tenantId
          });
        }
      }

      // Stage 3: Complete
      progress.stage = 'completed';
      progress.currentProperty = undefined;
      onProgress?.(progress);

      result.success = progress.completed > 0;
      result.message = `Import completed: ${progress.completed} created, ${progress.failed} failed`;

      logger.info('✅ [PropertyImport] Bulk import completed', {
        importId,
        tenantId: this.tenantId,
        total: progress.total,
        completed: progress.completed,
        failed: progress.failed,
        errors: progress.errors.length
      });

      return result;

    } catch (error) {
      progress.stage = 'failed';
      progress.currentProperty = undefined;
      onProgress?.(progress);

      logger.error('💥 [PropertyImport] Import failed catastrophically', {
        importId,
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      result.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return result;
    }
  }

  /**
   * Validate the entire import data structure
   */
  private async validateImportData(
    importData: BulkImportData,
    progress: ImportProgress
  ): Promise<void> {
    try {
      await bulkImportSchema.validate(importData, { abortEarly: false });
    } catch (error: any) {
      if (error.inner) {
        for (const validationError of error.inner) {
          progress.errors.push({
            propertyIndex: -1,
            field: validationError.path,
            message: validationError.message,
            type: 'validation'
          });
        }
      } else {
        progress.errors.push({
          propertyIndex: -1,
          message: error.message || 'Validation failed',
          type: 'validation'
        });
      }
    }

    // Check for duplicates if enabled
    if (importData.settings?.skipDuplicates) {
      await this.checkForDuplicates(importData.properties, progress);
    }
  }

  /**
   * Check for duplicate properties based on external ID or title
   */
  private async checkForDuplicates(
    properties: PropertyImportData[],
    progress: ImportProgress
  ): Promise<void> {
    const existingProperties = await this.tenantServices.propertyService.getAll();

    for (let i = 0; i < properties.length; i++) {
      const propertyData = properties[i];

      // Check by external ID
      if (propertyData.externalId) {
        const duplicate = existingProperties.find(
          p => (p as any).externalId === propertyData.externalId
        );
        if (duplicate) {
          progress.errors.push({
            propertyIndex: i,
            propertyTitle: propertyData.title,
            message: `Duplicate external ID: ${propertyData.externalId}`,
            type: 'duplicate'
          });
        }
      }

      // Check by title + address (fuzzy match)
      const titleAddressMatch = existingProperties.find(
        p => p.title?.toLowerCase() === propertyData.title.toLowerCase() &&
             p.address?.toLowerCase() === propertyData.address.toLowerCase()
      );
      if (titleAddressMatch) {
        progress.errors.push({
          propertyIndex: i,
          propertyTitle: propertyData.title,
          message: `Duplicate property: same title and address`,
          type: 'duplicate'
        });
      }
    }
  }

  /**
   * Process a single property: media processing + database save
   */
  private async processProperty(
    propertyData: PropertyImportData,
    settings: BulkImportData['settings'],
    progress: ImportProgress,
    index: number
  ): Promise<void> {
    logger.debug('🏠 [PropertyImport] Processing property', {
      propertyIndex: index,
      propertyTitle: propertyData.title,
      tenantId: this.tenantId
    });

    // Process media if enabled
    let processedPhotos: string[] = [];
    let processedVideos: string[] = [];

    if (settings?.downloadMedia && (propertyData.photos?.length || propertyData.videos?.length)) {
      const tempPropertyId = `import_${Date.now()}_${index}`;

      // Process photos
      if (propertyData.photos?.length) {
        const photoResults = await this.mediaService.processMediaUrls(
          propertyData.photos,
          'photo',
          tempPropertyId
        );
        processedPhotos = photoResults
          .filter(r => r.success && r.newUrl)
          .map(r => r.newUrl!);

        // Log any media processing errors
        photoResults
          .filter(r => !r.success)
          .forEach(r => {
            progress.errors.push({
              propertyIndex: index,
              propertyTitle: propertyData.title,
              message: `Photo processing failed: ${r.error}`,
              type: 'media'
            });
          });
      }

      // Process videos
      if (propertyData.videos?.length) {
        const videoResults = await this.mediaService.processMediaUrls(
          propertyData.videos,
          'video',
          tempPropertyId
        );
        processedVideos = videoResults
          .filter(r => r.success && r.newUrl)
          .map(r => r.newUrl!);

        // Log any media processing errors
        videoResults
          .filter(r => !r.success)
          .forEach(r => {
            progress.errors.push({
              propertyIndex: index,
              propertyTitle: propertyData.title,
              message: `Video processing failed: ${r.error}`,
              type: 'media'
            });
          });
      }
    } else {
      // Use original URLs if media processing is disabled
      processedPhotos = propertyData.photos || [];
      processedVideos = propertyData.videos || [];
    }

    // Convert import data to Property model
    const property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'> = {
      title: propertyData.title,
      description: propertyData.description,
      address: propertyData.address,
      location: `${propertyData.address} ${propertyData.neighborhood || ''} ${propertyData.city}`.trim(),
      neighborhood: propertyData.neighborhood || '',
      city: propertyData.city,
      category: propertyData.category || PropertyCategory.APARTMENT,
      type: propertyData.type || PropertyType.VACATION,
      status: propertyData.status || PropertyStatus.ACTIVE,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      maxGuests: propertyData.maxGuests,
      capacity: propertyData.maxGuests, // Same as maxGuests for imported properties
      basePrice: propertyData.basePrice,
      cleaningFee: propertyData.cleaningFee || 0,
      pricePerExtraGuest: propertyData.pricePerExtraGuest || 0,
      minimumNights: propertyData.minimumNights || 1,
      amenities: propertyData.amenities || [],
      photos: processedPhotos,
      videos: processedVideos,
      allowsPets: propertyData.allowsPets || false,
      isFeatured: propertyData.isFeatured || false,
      isActive: propertyData.isActive !== false, // Default to true
      paymentMethodSurcharges: createDefaultPaymentSurcharges(),
      advancePaymentPercentage: propertyData.advancePaymentPercentage || 30,
      weekendSurcharge: propertyData.weekendSurcharge || 0,
      holidaySurcharge: propertyData.holidaySurcharge || 0,
      decemberSurcharge: propertyData.decemberSurcharge || 0,
      highSeasonSurcharge: 0,
      highSeasonMonths: [],
      unavailableDates: [],
      customPricing: {},
      tenantId: this.tenantId,
      // Store import metadata
      ...(propertyData.externalId && { externalId: propertyData.externalId }),
      ...(propertyData.externalSource && { externalSource: propertyData.externalSource })
    } as any;

    // Save to database
    await this.tenantServices.propertyService.create(property);

    logger.debug('✅ [PropertyImport] Property saved successfully', {
      propertyIndex: index,
      propertyTitle: propertyData.title,
      photosProcessed: processedPhotos.length,
      videosProcessed: processedVideos.length,
      tenantId: this.tenantId
    });
  }

  /**
   * Validate import file format (JSON)
   */
  static async validateImportFile(fileContent: string): Promise<{
    valid: boolean;
    data?: BulkImportData;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Parse JSON
      const data = JSON.parse(fileContent);

      // Validate against schema
      await bulkImportSchema.validate(data, { abortEarly: false });

      return { valid: true, data, errors };
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        errors.push('Invalid JSON format');
      } else if (error.inner) {
        errors.push(...error.inner.map((e: any) => e.message));
      } else {
        errors.push(error.message || 'Unknown validation error');
      }

      return { valid: false, errors };
    }
  }

  /**
   * Generate sample import template
   */
  static generateImportTemplate(): BulkImportData {
    return {
      source: "manual_import",
      importedAt: new Date(),
      settings: {
        skipDuplicates: true,
        updateExisting: false,
        downloadMedia: true,
        validateMedia: true,
        createThumbnails: true,
      },
      properties: [
        {
          title: "Exemplo - Apartamento 2 Quartos",
          description: "Apartamento mobiliado em ótima localização, próximo ao centro e transporte público. Ideal para estadias de lazer ou negócios.",
          address: "Rua Exemplo, 123",
          neighborhood: "Centro",
          city: "São Paulo",
          category: PropertyCategory.APARTMENT,
          type: PropertyType.VACATION,
          bedrooms: 2,
          bathrooms: 1,
          maxGuests: 4,
          basePrice: 200,
          cleaningFee: 50,
          pricePerExtraGuest: 30,
          minimumNights: 2,
          photos: [
            "https://example.com/photo1.jpg",
            "https://example.com/photo2.jpg"
          ],
          videos: [],
          amenities: ["Wi-Fi", "Ar Condicionado", "TV", "Cozinha Equipada"],
          allowsPets: false,
          isFeatured: false,
          weekendSurcharge: 15,
          holidaySurcharge: 25,
          advancePaymentPercentage: 30,
          externalId: "ext_001",
          externalSource: "airbnb"
        }
      ]
    };
  }
}

export default PropertyImportService;