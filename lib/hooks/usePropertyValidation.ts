import { useState, useCallback, useEffect } from 'react';
import { Property } from '@/lib/types/property';
import { 
  PropertyValidatorV2, 
  PropertyValidationResult, 
  ValidationConfig 
} from '@/lib/validation/property-validation-v2';
import { logger } from '@/lib/utils/logger';

interface UsePropertyValidationOptions extends Partial<ValidationConfig> {
  realTimeValidation?: boolean;
  debounceMs?: number;
}

interface UsePropertyValidationReturn {
  validationResult: PropertyValidationResult | null;
  isValidating: boolean;
  validateProperty: (property: Partial<Property>) => Promise<PropertyValidationResult>;
  validateField: (property: Partial<Property>, field: keyof Property) => Promise<boolean>;
  clearValidation: () => void;
  getFieldErrors: (field: keyof Property) => string[];
  getFieldWarnings: (field: keyof Property) => string[];
  hasFieldError: (field: keyof Property) => boolean;
  hasFieldWarning: (field: keyof Property) => boolean;
  isFieldValid: (field: keyof Property) => boolean;
}

const defaultOptions: UsePropertyValidationOptions = {
  strict: false,
  autoFix: true,
  logLevel: 'info',
  realTimeValidation: true,
  debounceMs: 500,
};

export function usePropertyValidation(
  options: UsePropertyValidationOptions = {}
): UsePropertyValidationReturn {
  const config = { ...defaultOptions, ...options };
  const [validationResult, setValidationResult] = useState<PropertyValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validator] = useState(() => new PropertyValidatorV2(config));

  // Clear validation results
  const clearValidation = useCallback(() => {
    setValidationResult(null);
    logger.debug('Property validation cleared');
  }, []);

  // Validate entire property
  const validateProperty = useCallback(async (property: Partial<Property>): Promise<PropertyValidationResult> => {
    setIsValidating(true);
    
    try {
      logger.debug('Starting property validation', { 
        propertyId: property.id,
        hasTitle: !!property.title 
      });

      const result = await validator.validateProperty(property);
      setValidationResult(result);

      logger.debug('Property validation completed', {
        isValid: result.isValid,
        errorCount: Object.keys(result.errors).length,
        warningCount: Object.keys(result.warnings).length,
      });

      return result;
    } catch (error) {
      logger.error('Property validation failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      const errorResult: PropertyValidationResult = {
        isValid: false,
        errors: { general: ['Erro interno de validação'] },
        warnings: {},
        fixedIssues: [],
      };
      
      setValidationResult(errorResult);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, [validator]);

  // Validate specific field
  const validateField = useCallback(async (
    property: Partial<Property>, 
    field: keyof Property
  ): Promise<boolean> => {
    try {
      const result = await validator.validateProperty(property);
      const hasError = !!result.errors[field];
      
      logger.debug('Field validation completed', { 
        field, 
        hasError, 
        errors: result.errors[field] 
      });
      
      return !hasError;
    } catch (error) {
      logger.error('Field validation failed', { 
        field, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }, [validator]);

  // Get field errors
  const getFieldErrors = useCallback((field: keyof Property): string[] => {
    return validationResult?.errors[field] || [];
  }, [validationResult]);

  // Get field warnings
  const getFieldWarnings = useCallback((field: keyof Property): string[] => {
    return validationResult?.warnings[field] || [];
  }, [validationResult]);

  // Check if field has errors
  const hasFieldError = useCallback((field: keyof Property): boolean => {
    return (validationResult?.errors[field]?.length || 0) > 0;
  }, [validationResult]);

  // Check if field has warnings
  const hasFieldWarning = useCallback((field: keyof Property): boolean => {
    return (validationResult?.warnings[field]?.length || 0) > 0;
  }, [validationResult]);

  // Check if field is valid (no errors)
  const isFieldValid = useCallback((field: keyof Property): boolean => {
    return !hasFieldError(field);
  }, [hasFieldError]);

  return {
    validationResult,
    isValidating,
    validateProperty,
    validateField,
    clearValidation,
    getFieldErrors,
    getFieldWarnings,
    hasFieldError,
    hasFieldWarning,
    isFieldValid,
  };
}

// Hook for real-time field validation
export function useFieldValidation(
  property: Partial<Property>,
  field: keyof Property,
  options: UsePropertyValidationOptions = {}
) {
  const { validateField, getFieldErrors, getFieldWarnings, hasFieldError, hasFieldWarning } = 
    usePropertyValidation(options);
  
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Debounced validation
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const fieldIsValid = await validateField(property, field);
      setIsValid(fieldIsValid);
      setErrors(getFieldErrors(field));
      setWarnings(getFieldWarnings(field));
    }, options.debounceMs || 500);

    return () => clearTimeout(timeoutId);
  }, [property[field], field, property, validateField, getFieldErrors, getFieldWarnings, options.debounceMs]);

  return {
    isValid,
    errors,
    warnings,
    hasError: hasFieldError(field),
    hasWarning: hasFieldWarning(field),
  };
}

// Hook for form-wide validation status
export function useFormValidationStatus(validationResult: PropertyValidationResult | null) {
  const totalErrors = validationResult ? Object.keys(validationResult.errors).length : 0;
  const totalWarnings = validationResult ? Object.keys(validationResult.warnings).length : 0;
  const totalFixedIssues = validationResult?.fixedIssues.length || 0;

  const getValidationSummary = useCallback(() => {
    if (!validationResult) {
      return {
        status: 'not-validated' as const,
        message: 'Aguardando validação',
        canSave: false,
      };
    }

    if (validationResult.isValid) {
      if (totalWarnings > 0) {
        return {
          status: 'valid-with-warnings' as const,
          message: `Válido com ${totalWarnings} aviso${totalWarnings > 1 ? 's' : ''}`,
          canSave: true,
        };
      }
      return {
        status: 'valid' as const,
        message: 'Tudo válido',
        canSave: true,
      };
    }

    return {
      status: 'invalid' as const,
      message: `${totalErrors} erro${totalErrors > 1 ? 's' : ''} encontrado${totalErrors > 1 ? 's' : ''}`,
      canSave: false,
    };
  }, [validationResult, totalErrors, totalWarnings]);

  const getCompletionPercentage = useCallback(() => {
    if (!validationResult) return 0;

    const totalFields = [
      'title', 'description', 'address', 'category',
      'bedrooms', 'bathrooms', 'maxGuests',
      'basePrice', 'minimumNights',
      'amenities', 'photos'
    ];

    const completedFields = totalFields.filter(field => {
      const errors = validationResult.errors[field];
      return !errors || errors.length === 0;
    });

    return Math.round((completedFields.length / totalFields.length) * 100);
  }, [validationResult]);

  return {
    totalErrors,
    totalWarnings,
    totalFixedIssues,
    isValid: validationResult?.isValid || false,
    getValidationSummary,
    getCompletionPercentage,
    validationResult,
  };
}