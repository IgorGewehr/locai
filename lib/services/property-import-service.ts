/**
 * Property Import Service
 * Handles bulk import of properties with media processing
 */

import {
  BulkImportData,
  PropertyImportData,
  bulkImportSchema
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
    this.tenantServices = new TenantServiceFactory(tenantId);
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

      // Continue even with validation errors - try to import valid properties
      const validationErrorCount = progress.errors.length;
      if (validationErrorCount > 0) {
        logger.warn('⚠️ [PropertyImport] Validation errors found, continuing with valid properties', {
          importId,
          errorCount: validationErrorCount,
          totalProperties: importData.properties.length
        });
      }

      // Stage 2: Process each property
      progress.stage = 'processing_media';
      onProgress?.(progress);

      for (let i = 0; i < importData.properties.length; i++) {
        const propertyData = importData.properties[i];
        progress.currentProperty = propertyData.title;
        onProgress?.(progress);

        try {
          // Skip property if it has validation errors
          const hasValidationErrors = progress.errors.some(
            error => error.propertyIndex === i && error.type === 'validation'
          );

          if (hasValidationErrors) {
            progress.failed++;
            result.skippedProperties.push(`${propertyData.title} (validation error)`);
            logger.warn('⚠️ [PropertyImport] Skipping property due to validation errors', {
              importId,
              propertyIndex: i,
              propertyTitle: propertyData.title
            });
            continue;
          }

          await this.processProperty(propertyData, importData.settings, progress, i);
          progress.completed++;
          result.createdProperties.push(propertyData.title);

          logger.debug('✅ [PropertyImport] Property processed successfully', {
            importId,
            propertyIndex: i,
            propertyTitle: propertyData.title,
            completed: progress.completed,
            total: progress.total
          });

        } catch (error) {
          progress.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          progress.errors.push({
            propertyIndex: i,
            propertyTitle: propertyData.title,
            message: errorMessage,
            type: 'database'
          });

          result.skippedProperties.push(`${propertyData.title} (${errorMessage})`);

          logger.error('❌ [PropertyImport] Failed to process property', {
            importId,
            propertyIndex: i,
            propertyTitle: propertyData.title,
            error: errorMessage,
            tenantId: this.tenantId
          });
        }

        // Update progress after each property
        onProgress?.(progress);
      }

      // Stage 3: Complete
      progress.stage = 'completed';
      progress.currentProperty = undefined;
      onProgress?.(progress);

      result.success = progress.completed > 0;

      if (progress.completed === 0) {
        result.message = `Import failed: No properties could be imported. ${progress.failed} failed, ${result.skippedProperties.length} skipped.`;
        progress.stage = 'failed';
      } else if (progress.failed > 0 || result.skippedProperties.length > 0) {
        result.message = `Import partially completed: ${progress.completed} created, ${progress.failed} failed, ${result.skippedProperties.length} skipped.`;
      } else {
        result.message = `Import completed successfully: ${progress.completed} properties created.`;
      }

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
          const propertyIndex = this.extractPropertyIndex(validationError.path);
          progress.errors.push({
            propertyIndex: propertyIndex ?? -1,
            field: validationError.path,
            message: this.getUserFriendlyValidationMessage(validationError.message),
            type: 'validation'
          });
        }
      } else {
        progress.errors.push({
          propertyIndex: -1,
          message: this.getUserFriendlyValidationMessage(error.message) || 'Validation failed',
          type: 'validation'
        });
      }
    }

    // Additional individual property validation
    await this.validateIndividualProperties(importData.properties, progress);

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
    const existingProperties = await this.tenantServices.properties.getAll();

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

      try {
        // Process photos with error tolerance
        if (propertyData.photos?.length) {
          try {
            const photoResults = await Promise.allSettled(
              propertyData.photos.map(async (photo, photoIndex) => {
                try {
                  const result = await this.mediaService.processMediaUrls([photo], 'photo', tempPropertyId);
                  return { result: result[0], photoIndex };
                } catch (error) {
                  logger.warn('⚠️ [PropertyImport] Photo processing failed', {
                    propertyIndex: index,
                    photoIndex,
                    photoUrl: photo,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  });
                  return { result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }, photoIndex };
                }
              })
            );

            photoResults.forEach((promiseResult, photoIndex) => {
              if (promiseResult.status === 'fulfilled') {
                const { result } = promiseResult.value;
                if (result.success && result.newUrl) {
                  processedPhotos.push(result.newUrl);
                } else {
                  progress.errors.push({
                    propertyIndex: index,
                    propertyTitle: propertyData.title,
                    message: `Foto ${photoIndex + 1}: ${result.error || 'Falha no processamento'}`,
                    type: 'media'
                  });
                }
              } else {
                progress.errors.push({
                  propertyIndex: index,
                  propertyTitle: propertyData.title,
                  message: `Foto ${photoIndex + 1}: ${promiseResult.reason}`,
                  type: 'media'
                });
              }
            });
          } catch (error) {
            logger.error('💥 [PropertyImport] Photo processing batch failed', {
              propertyIndex: index,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            // Fallback to original URLs
            processedPhotos = propertyData.photos.filter(this.isValidUrl);
          }
        }

        // Process videos with error tolerance
        if (propertyData.videos?.length) {
          try {
            const videoResults = await Promise.allSettled(
              propertyData.videos.map(async (video, videoIndex) => {
                try {
                  const result = await this.mediaService.processMediaUrls([video], 'video', tempPropertyId);
                  return { result: result[0], videoIndex };
                } catch (error) {
                  logger.warn('⚠️ [PropertyImport] Video processing failed', {
                    propertyIndex: index,
                    videoIndex,
                    videoUrl: video,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  });
                  return { result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }, videoIndex };
                }
              })
            );

            videoResults.forEach((promiseResult, videoIndex) => {
              if (promiseResult.status === 'fulfilled') {
                const { result } = promiseResult.value;
                if (result.success && result.newUrl) {
                  processedVideos.push(result.newUrl);
                } else {
                  progress.errors.push({
                    propertyIndex: index,
                    propertyTitle: propertyData.title,
                    message: `Vídeo ${videoIndex + 1}: ${result.error || 'Falha no processamento'}`,
                    type: 'media'
                  });
                }
              } else {
                progress.errors.push({
                  propertyIndex: index,
                  propertyTitle: propertyData.title,
                  message: `Vídeo ${videoIndex + 1}: ${promiseResult.reason}`,
                  type: 'media'
                });
              }
            });
          } catch (error) {
            logger.error('💥 [PropertyImport] Video processing batch failed', {
              propertyIndex: index,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            // Fallback to original URLs
            processedVideos = propertyData.videos.filter(this.isValidUrl);
          }
        }
      } catch (error) {
        logger.error('💥 [PropertyImport] Media processing completely failed', {
          propertyIndex: index,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Fallback to original URLs if they're valid
        processedPhotos = (propertyData.photos || []).filter(this.isValidUrl);
        processedVideos = (propertyData.videos || []).filter(this.isValidUrl);
      }
    } else {
      // Use original URLs if media processing is disabled, but validate them first
      processedPhotos = (propertyData.photos || []).filter(this.isValidUrl);
      processedVideos = (propertyData.videos || []).filter(this.isValidUrl);

      // Log invalid URLs
      (propertyData.photos || []).forEach((photo, index) => {
        if (!this.isValidUrl(photo)) {
          progress.errors.push({
            propertyIndex: index,
            propertyTitle: propertyData.title,
            message: `Foto ${index + 1}: URL inválida - ${photo}`,
            type: 'media'
          });
        }
      });

      (propertyData.videos || []).forEach((video, index) => {
        if (!this.isValidUrl(video)) {
          progress.errors.push({
            propertyIndex: index,
            propertyTitle: propertyData.title,
            message: `Vídeo ${index + 1}: URL inválida - ${video}`,
            type: 'media'
          });
        }
      });
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
      // Payment method surcharges removed - now managed at tenant level via Negotiation Settings
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
    await this.tenantServices.properties.create(property);

    logger.debug('✅ [PropertyImport] Property saved successfully', {
      propertyIndex: index,
      propertyTitle: propertyData.title,
      photosProcessed: processedPhotos.length,
      videosProcessed: processedVideos.length,
      tenantId: this.tenantId
    });
  }

  /**
   * Extract property index from validation error path
   */
  private extractPropertyIndex(path?: string): number | null {
    if (!path) return null;
    const match = path.match(/properties\[(\d+)\]/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Convert technical validation messages to user-friendly ones
   */
  private getUserFriendlyValidationMessage(message: string): string {
    const friendlyMessages: Record<string, string> = {
      'is a required field': 'é obrigatório',
      'must be a valid email': 'deve ser um email válido',
      'must be a number': 'deve ser um número',
      'must be a string': 'deve ser um texto',
      'must be a boolean': 'deve ser verdadeiro ou falso',
      'must be at least': 'deve ser pelo menos',
      'must be at most': 'deve ser no máximo',
      'must be positive': 'deve ser um número positivo',
      'must be an array': 'deve ser uma lista',
      'Invalid URL': 'URL inválida'
    };

    let friendlyMessage = message;
    Object.entries(friendlyMessages).forEach(([key, value]) => {
      friendlyMessage = friendlyMessage.replace(new RegExp(key, 'gi'), value);
    });

    return friendlyMessage;
  }

  /**
   * Validate individual properties for common issues
   */
  private async validateIndividualProperties(
    properties: PropertyImportData[],
    progress: ImportProgress
  ): Promise<void> {
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const errors: string[] = [];

      // Required fields validation
      if (!property.title?.trim()) {
        errors.push('Título é obrigatório');
      }
      if (!property.address?.trim()) {
        errors.push('Endereço é obrigatório');
      }
      if (!property.city?.trim()) {
        errors.push('Cidade é obrigatória');
      }

      // Numeric validations
      if (property.basePrice <= 0) {
        errors.push('Preço base deve ser maior que zero');
      }
      if (property.bedrooms < 0) {
        errors.push('Número de quartos deve ser positivo');
      }
      if (property.bathrooms < 0) {
        errors.push('Número de banheiros deve ser positivo');
      }
      if (property.maxGuests <= 0) {
        errors.push('Número máximo de hóspedes deve ser maior que zero');
      }

      // URL validation for photos and videos
      if (property.photos) {
        property.photos.forEach((photo, photoIndex) => {
          if (photo && !this.isValidUrl(photo)) {
            errors.push(`Foto ${photoIndex + 1}: URL inválida`);
          }
        });
      }

      if (property.videos) {
        property.videos.forEach((video, videoIndex) => {
          if (video && !this.isValidUrl(video)) {
            errors.push(`Vídeo ${videoIndex + 1}: URL inválida`);
          }
        });
      }

      // Add errors for this property
      errors.forEach(error => {
        progress.errors.push({
          propertyIndex: i,
          propertyTitle: property.title,
          message: error,
          type: 'validation'
        });
      });
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate import file format (JSON) with improved error handling
   */
  static async validateImportFile(fileContent: string): Promise<{
    valid: boolean;
    data?: BulkImportData;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Check if content looks like HTML (common error when getting HTML instead of JSON)
      if (fileContent.trim().startsWith('<!DOCTYPE') || fileContent.trim().startsWith('<html')) {
        errors.push('O arquivo parece ser HTML, não JSON. Verifique se você está enviando o arquivo correto.');
        return { valid: false, errors };
      }

      // Check if content is empty
      if (!fileContent.trim()) {
        errors.push('O arquivo está vazio.');
        return { valid: false, errors };
      }

      // Parse JSON with better error handling
      let data;
      try {
        data = JSON.parse(fileContent);
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          const message = parseError.message;
          if (message.includes('Unexpected token')) {
            errors.push(`Erro de sintaxe JSON: ${message}. Verifique se o arquivo JSON está bem formatado.`);
          } else {
            errors.push(`Formato JSON inválido: ${message}`);
          }
        } else {
          errors.push('Não foi possível interpretar o arquivo como JSON.');
        }
        return { valid: false, errors };
      }

      // Check if data is an object
      if (!data || typeof data !== 'object') {
        errors.push('O arquivo JSON deve conter um objeto válido.');
        return { valid: false, errors };
      }

      // Check for required top-level properties
      if (!data.properties || !Array.isArray(data.properties)) {
        errors.push('O arquivo deve conter um array "properties" com as propriedades a serem importadas.');
        return { valid: false, errors };
      }

      if (data.properties.length === 0) {
        errors.push('O array "properties" está vazio. Adicione pelo menos uma propriedade.');
        return { valid: false, errors };
      }

      // Validate against schema
      try {
        await bulkImportSchema.validate(data, { abortEarly: false });
      } catch (validationError: any) {
        if (validationError.inner) {
          errors.push(...validationError.inner.map((e: any) => {
            const field = e.path || 'campo desconhecido';
            const message = e.message || 'erro de validação';
            return `${field}: ${message}`;
          }));
        } else {
          errors.push(validationError.message || 'Erro de validação desconhecido');
        }
      }

      // If we have validation errors, return them
      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return { valid: true, data, errors };
    } catch (error: any) {
      errors.push(`Erro inesperado ao processar o arquivo: ${error.message || 'erro desconhecido'}`);
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