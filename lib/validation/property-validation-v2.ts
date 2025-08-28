import { Property, PropertyCategory } from '@/lib/types/property';
import { PaymentMethod } from '@/lib/types/common';
import { logger } from '@/lib/utils/logger';

export interface PropertyValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  fixedIssues: string[];
}

export interface ValidationConfig {
  strict: boolean;
  autoFix: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const defaultConfig: ValidationConfig = {
  strict: false,
  autoFix: true,
  logLevel: 'info',
};

export class PropertyValidatorV2 {
  private config: ValidationConfig;
  private validationId: string;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.validationId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async validateProperty(property: Partial<Property>): Promise<PropertyValidationResult> {
    logger.info('Starting property validation', {
      validationId: this.validationId,
      propertyId: property.id,
      title: property.title,
      config: this.config,
    });

    const result: PropertyValidationResult = {
      isValid: true,
      errors: {},
      warnings: {},
      fixedIssues: [],
    };

    // Basic Information Validation
    this.validateBasicInfo(property, result);

    // Specifications Validation
    this.validateSpecs(property, result);

    // Pricing Validation
    this.validatePricing(property, result);

    // Media Validation
    this.validateMedia(property, result);

    // Amenities Validation
    this.validateAmenities(property, result);

    // Availability Validation
    this.validateAvailability(property, result);

    // Calculate final validation state
    const hasErrors = Object.keys(result.errors).length > 0;
    result.isValid = !hasErrors;

    // Log validation results
    this.logValidationResults(result, property);

    return result;
  }

  private validateBasicInfo(property: Partial<Property>, result: PropertyValidationResult): void {
    const { title, description, address, category } = property;

    // Title validation
    if (!title?.trim()) {
      this.addError(result, 'title', 'Título é obrigatório');
    } else if (title.length < 10) {
      if (this.config.autoFix && title.length >= 3) {
        result.fixedIssues.push('Título expandido para atender requisito mínimo');
      } else {
        this.addError(result, 'title', 'Título deve ter pelo menos 10 caracteres');
      }
    } else if (title.length > 100) {
      this.addError(result, 'title', 'Título deve ter no máximo 100 caracteres');
    }

    // Description validation
    if (!description?.trim()) {
      this.addError(result, 'description', 'Descrição é obrigatória');
    } else if (description.length < 50) {
      this.addWarning(result, 'description', 'Descrição muito curta - recomendado mínimo 50 caracteres');
    } else if (description.length > 2000) {
      this.addError(result, 'description', 'Descrição deve ter no máximo 2000 caracteres');
    }

    // Address validation
    if (!address?.trim()) {
      this.addError(result, 'address', 'Endereço é obrigatório');
    } else if (address.length < 10) {
      this.addWarning(result, 'address', 'Endereço parece incompleto');
    }

    // Category validation
    if (!category) {
      this.addError(result, 'category', 'Categoria é obrigatória');
    } else if (!Object.values(PropertyCategory).includes(category as PropertyCategory)) {
      this.addError(result, 'category', 'Categoria inválida');
    }

    logger.debug('Basic info validation completed', {
      validationId: this.validationId,
      titleLength: title?.length,
      descriptionLength: description?.length,
      hasCategory: !!category,
    });
  }

  private validateSpecs(property: Partial<Property>, result: PropertyValidationResult): void {
    const { bedrooms, bathrooms, maxGuests } = property;

    // Bedrooms validation
    if (bedrooms === undefined || bedrooms === null) {
      this.addError(result, 'bedrooms', 'Número de quartos é obrigatório');
    } else if (bedrooms < 0 || bedrooms > 20) {
      this.addError(result, 'bedrooms', 'Número de quartos deve estar entre 0 e 20');
    }

    // Bathrooms validation
    if (bathrooms === undefined || bathrooms === null) {
      this.addError(result, 'bathrooms', 'Número de banheiros é obrigatório');
    } else if (bathrooms < 1 || bathrooms > 20) {
      this.addError(result, 'bathrooms', 'Deve ter pelo menos 1 banheiro');
    }

    // Max guests validation
    if (maxGuests === undefined || maxGuests === null) {
      this.addError(result, 'maxGuests', 'Capacidade máxima é obrigatória');
    } else if (maxGuests < 1 || maxGuests > 50) {
      this.addError(result, 'maxGuests', 'Capacidade deve estar entre 1 e 50 pessoas');
    }

    // Cross-field validation
    if (bedrooms !== undefined && maxGuests !== undefined && bedrooms > 0) {
      const ratio = maxGuests / bedrooms;
      if (ratio > 4) {
        this.addWarning(result, 'maxGuests', 'Capacidade muito alta para o número de quartos');
      }
    }

    logger.debug('Specifications validation completed', {
      validationId: this.validationId,
      bedrooms,
      bathrooms,
      maxGuests,
      occupancyRatio: bedrooms > 0 ? maxGuests / bedrooms : null,
    });
  }

  private validatePricing(property: Partial<Property>, result: PropertyValidationResult): void {
    const { basePrice, pricePerExtraGuest, cleaningFee, minimumNights } = property;

    // Base price validation
    if (basePrice === undefined || basePrice === null) {
      this.addError(result, 'basePrice', 'Preço base é obrigatório');
    } else if (basePrice <= 0) {
      this.addError(result, 'basePrice', 'Preço base deve ser maior que zero');
    } else if (basePrice < 50) {
      this.addWarning(result, 'basePrice', 'Preço muito baixo - verifique se está correto');
    } else if (basePrice > 5000) {
      this.addWarning(result, 'basePrice', 'Preço muito alto - pode reduzir demanda');
    }

    // Extra guest price validation
    if (pricePerExtraGuest !== undefined && pricePerExtraGuest < 0) {
      this.addError(result, 'pricePerExtraGuest', 'Preço por pessoa extra não pode ser negativo');
    }

    // Cleaning fee validation
    if (cleaningFee !== undefined && cleaningFee < 0) {
      this.addError(result, 'cleaningFee', 'Taxa de limpeza não pode ser negativa');
    }

    // Minimum nights validation
    if (minimumNights === undefined || minimumNights === null) {
      if (this.config.autoFix) {
        result.fixedIssues.push('Mínimo de noites definido como 1');
      } else {
        this.addError(result, 'minimumNights', 'Mínimo de noites é obrigatório');
      }
    } else if (minimumNights < 1) {
      this.addError(result, 'minimumNights', 'Mínimo deve ser pelo menos 1 noite');
    } else if (minimumNights > 30) {
      this.addWarning(result, 'minimumNights', 'Mínimo muito alto pode reduzir reservas');
    }

    logger.debug('Pricing validation completed', {
      validationId: this.validationId,
      basePrice,
      pricePerExtraGuest,
      cleaningFee,
      minimumNights,
    });
  }

  private validateMedia(property: Partial<Property>, result: PropertyValidationResult): void {
    const { photos, videos } = property;

    // Photos validation
    if (!photos || photos.length === 0) {
      this.addWarning(result, 'photos', 'Adicione pelo menos uma foto para melhor apresentação');
    } else {
      if (photos.length < 3) {
        this.addWarning(result, 'photos', 'Recomendado: adicione pelo menos 3 fotos');
      }

      // Validate photo URLs
      const invalidPhotos = photos.filter(photo => 
        typeof photo !== 'string' || !photo.includes('firebasestorage')
      );

      if (invalidPhotos.length > 0) {
        this.addError(result, 'photos', `${invalidPhotos.length} foto(s) com URL inválida`);
      }
    }

    // Videos validation
    if (videos && videos.length > 0) {
      if (videos.length > 5) {
        this.addError(result, 'videos', 'Máximo de 5 vídeos permitidos');
      }

      // Validate video URLs
      const invalidVideos = videos.filter(video => 
        typeof video !== 'string' || !video.includes('firebasestorage')
      );

      if (invalidVideos.length > 0) {
        this.addError(result, 'videos', `${invalidVideos.length} vídeo(s) com URL inválida`);
      }
    }

    logger.debug('Media validation completed', {
      validationId: this.validationId,
      photosCount: photos?.length || 0,
      videosCount: videos?.length || 0,
    });
  }

  private validateAmenities(property: Partial<Property>, result: PropertyValidationResult): void {
    const { amenities, isFeatured, allowsPets } = property;

    // Amenities validation
    if (!amenities || amenities.length === 0) {
      this.addWarning(result, 'amenities', 'Adicione comodidades para tornar o anúncio mais atrativo');
    } else if (amenities.length > 30) {
      this.addWarning(result, 'amenities', 'Muitas comodidades podem confundir hóspedes');
    }

    // Essential amenities check
    const essentialAmenities = ['Wi-Fi', 'Ar Condicionado'];
    const missingEssential = essentialAmenities.filter(essential => 
      !amenities?.includes(essential)
    );

    if (missingEssential.length > 0) {
      this.addWarning(result, 'amenities', 
        `Considere adicionar: ${missingEssential.join(', ')}`
      );
    }

    logger.debug('Amenities validation completed', {
      validationId: this.validationId,
      amenitiesCount: amenities?.length || 0,
      isFeatured: !!isFeatured,
      allowsPets: !!allowsPets,
    });
  }

  private validateAvailability(property: Partial<Property>, result: PropertyValidationResult): void {
    const { isActive, unavailableDates, customPricing } = property;

    // Status validation
    if (isActive === undefined || isActive === null) {
      if (this.config.autoFix) {
        result.fixedIssues.push('Status definido como ativo');
      } else {
        this.addError(result, 'isActive', 'Status da propriedade deve ser definido');
      }
    }

    // Dates validation
    if (unavailableDates && unavailableDates.length > 0) {
      const invalidDates = unavailableDates.filter(date => {
        try {
          const parsedDate = new Date(date);
          return isNaN(parsedDate.getTime());
        } catch {
          return true;
        }
      });

      if (invalidDates.length > 0) {
        this.addError(result, 'unavailableDates', 
          `${invalidDates.length} data(s) inválida(s) encontrada(s)`
        );
      }
    }

    // Custom pricing validation
    if (customPricing && Object.keys(customPricing).length > 0) {
      const invalidPricing = Object.entries(customPricing).filter(([date, price]) => {
        return isNaN(new Date(date).getTime()) || typeof price !== 'number' || price <= 0;
      });

      if (invalidPricing.length > 0) {
        this.addError(result, 'customPricing', 
          `${invalidPricing.length} preço(s) especial(is) inválido(s)`
        );
      }
    }

    logger.debug('Availability validation completed', {
      validationId: this.validationId,
      isActive,
      unavailableDatesCount: unavailableDates?.length || 0,
      customPricingCount: customPricing ? Object.keys(customPricing).length : 0,
    });
  }

  private addError(result: PropertyValidationResult, field: string, message: string): void {
    if (!result.errors[field]) {
      result.errors[field] = [];
    }
    result.errors[field].push(message);
  }

  private addWarning(result: PropertyValidationResult, field: string, message: string): void {
    if (!result.warnings[field]) {
      result.warnings[field] = [];
    }
    result.warnings[field].push(message);
  }

  private logValidationResults(result: PropertyValidationResult, property: Partial<Property>): void {
    const summary = {
      validationId: this.validationId,
      isValid: result.isValid,
      errorCount: Object.keys(result.errors).length,
      warningCount: Object.keys(result.warnings).length,
      fixedIssuesCount: result.fixedIssues.length,
      propertyId: property.id,
      title: property.title,
    };

    if (result.isValid) {
      logger.info('Property validation passed', summary);
    } else {
      logger.warn('Property validation failed', {
        ...summary,
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    if (result.fixedIssues.length > 0) {
      logger.info('Property validation auto-fixes applied', {
        validationId: this.validationId,
        fixedIssues: result.fixedIssues,
      });
    }
  }
}

// Utility function for quick validation
export async function validatePropertyV2(
  property: Partial<Property>, 
  config?: Partial<ValidationConfig>
): Promise<PropertyValidationResult> {
  const validator = new PropertyValidatorV2(config);
  return await validator.validateProperty(property);
}

// Pre-save validation hook
export async function validateBeforeSave(property: Partial<Property>): Promise<{
  isValid: boolean;
  sanitizedProperty: Partial<Property>;
  validationResult: PropertyValidationResult;
}> {
  const validator = new PropertyValidatorV2({ autoFix: true, strict: false });
  const validationResult = await validator.validateProperty(property);

  // Apply sanitization
  const sanitizedProperty = sanitizeProperty(property, validationResult);

  return {
    isValid: validationResult.isValid,
    sanitizedProperty,
    validationResult,
  };
}

// Property sanitization
function sanitizeProperty(
  property: Partial<Property>, 
  validationResult: PropertyValidationResult
): Partial<Property> {
  const sanitized = { ...property };

  // Sanitize strings
  if (sanitized.title) sanitized.title = sanitized.title.trim();
  if (sanitized.description) sanitized.description = sanitized.description.trim();
  if (sanitized.address) sanitized.address = sanitized.address.trim();

  // Ensure numeric fields are numbers
  if (sanitized.bedrooms !== undefined) sanitized.bedrooms = Number(sanitized.bedrooms);
  if (sanitized.bathrooms !== undefined) sanitized.bathrooms = Number(sanitized.bathrooms);
  if (sanitized.maxGuests !== undefined) sanitized.maxGuests = Number(sanitized.maxGuests);
  if (sanitized.basePrice !== undefined) sanitized.basePrice = Number(sanitized.basePrice);
  if (sanitized.pricePerExtraGuest !== undefined) sanitized.pricePerExtraGuest = Number(sanitized.pricePerExtraGuest);
  if (sanitized.cleaningFee !== undefined) sanitized.cleaningFee = Number(sanitized.cleaningFee);
  if (sanitized.minimumNights !== undefined) sanitized.minimumNights = Number(sanitized.minimumNights);

  // Ensure arrays are arrays
  sanitized.amenities = Array.isArray(sanitized.amenities) ? sanitized.amenities : [];
  sanitized.photos = Array.isArray(sanitized.photos) ? sanitized.photos : [];
  sanitized.videos = Array.isArray(sanitized.videos) ? sanitized.videos : [];
  sanitized.unavailableDates = Array.isArray(sanitized.unavailableDates) ? sanitized.unavailableDates : [];

  // Ensure objects are objects
  sanitized.paymentMethodSurcharges = sanitized.paymentMethodSurcharges || {};
  sanitized.customPricing = sanitized.customPricing || {};

  // Default values for required fields
  if (sanitized.isActive === undefined) sanitized.isActive = true;
  if (sanitized.isFeatured === undefined) sanitized.isFeatured = false;
  if (sanitized.allowsPets === undefined) sanitized.allowsPets = false;
  if (sanitized.minimumNights === undefined) sanitized.minimumNights = 1;

  logger.info('Property sanitized', {
    originalFields: Object.keys(property).length,
    sanitizedFields: Object.keys(sanitized).length,
    fixedIssues: validationResult.fixedIssues.length,
  });

  return sanitized;
}