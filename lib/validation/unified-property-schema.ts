/**
 * Unified Property Validation Schema
 * Adaptable for both create and edit modes
 */

import * as yup from 'yup';
import { PropertyCategory, PropertyStatus, PropertyType } from '@/lib/types/property';
import { PaymentMethod } from '@/lib/types/common';

/**
 * Create a property validation schema based on the mode
 * @param mode - 'create' for new properties, 'edit' for existing properties
 */
export const createPropertyValidationSchema = (mode: 'create' | 'edit' = 'edit') => {
  const isCreateMode = mode === 'create';

  // Base schema with conditional requirements
  const schema = yup.object().shape({
    // Required fields for creation, optional for editing
    description: isCreateMode 
      ? yup.string()
          .required('Descrição é obrigatória')
          .min(10, 'Descrição deve ter pelo menos 10 caracteres')
          .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
      : yup.string()
          .min(10, 'Descrição deve ter pelo menos 10 caracteres')
          .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
          .nullable(),
    
    basePrice: isCreateMode
      ? yup.number()
          .required('Preço base é obrigatório')
          .positive('Preço deve ser positivo')
          .max(100000, 'Preço máximo é R$ 100.000')
      : yup.number()
          .positive('Preço deve ser positivo')
          .max(100000, 'Preço máximo é R$ 100.000')
          .nullable(),

    // Text fields - always optional but with validation when provided
    title: yup.string()
      .max(100, 'Título deve ter no máximo 100 caracteres')
      .nullable(),
    
    address: yup.string()
      .max(200, 'Endereço deve ter no máximo 200 caracteres')
      .nullable(),
    
    neighborhood: yup.string()
      .max(100, 'Bairro deve ter no máximo 100 caracteres')
      .nullable(),
    
    city: yup.string()
      .max(100, 'Cidade deve ter no máximo 100 caracteres')
      .nullable(),

    // Enums with proper validation
    category: yup.mixed<PropertyCategory>()
      .oneOf(Object.values(PropertyCategory), 'Categoria inválida')
      .default(PropertyCategory.APARTMENT)
      .nullable(),
    
    status: yup.mixed<PropertyStatus>()
      .oneOf(Object.values(PropertyStatus), 'Status inválido')
      .default(PropertyStatus.ACTIVE)
      .nullable(),
    
    type: yup.mixed<PropertyType>()
      .oneOf(Object.values(PropertyType), 'Tipo inválido')
      .default(PropertyType.RESIDENTIAL)
      .nullable(),

    // Numeric fields with sensible defaults and ranges
    bedrooms: yup.number()
      .integer('Número de quartos deve ser inteiro')
      .min(0, 'Número de quartos não pode ser negativo')
      .max(20, 'Número máximo de quartos é 20')
      .default(1)
      .nullable(),
    
    bathrooms: yup.number()
      .integer('Número de banheiros deve ser inteiro')
      .min(0, 'Número de banheiros não pode ser negativo')
      .max(20, 'Número máximo de banheiros é 20')
      .default(1)
      .nullable(),
    
    maxGuests: yup.number()
      .integer('Número de hóspedes deve ser inteiro')
      .min(1, 'Deve acomodar pelo menos 1 hóspede')
      .max(50, 'Número máximo de hóspedes é 50')
      .default(2)
      .nullable(),
    
    capacity: yup.number()
      .integer('Capacidade deve ser inteira')
      .min(1, 'Capacidade mínima é 1')
      .max(50, 'Capacidade máxima é 50')
      .default(2)
      .nullable(),
    
    pricePerExtraGuest: yup.number()
      .min(0, 'Preço por hóspede extra não pode ser negativo')
      .max(10000, 'Preço máximo por hóspede extra é R$ 10.000')
      .default(0)
      .nullable(),
    
    minimumNights: yup.number()
      .integer('Mínimo de noites deve ser inteiro')
      .min(1, 'Mínimo de noites deve ser pelo menos 1')
      .max(365, 'Máximo de noites é 365')
      .default(1)
      .nullable(),
    
    cleaningFee: yup.number()
      .min(0, 'Taxa de limpeza não pode ser negativa')
      .max(10000, 'Taxa máxima de limpeza é R$ 10.000')
      .default(0)
      .nullable(),
    
    advancePaymentPercentage: yup.number()
      .min(0, 'Percentual não pode ser negativo')
      .max(100, 'Percentual máximo é 100%')
      .default(0)
      .nullable(),

    // Boolean fields
    isFeatured: yup.boolean().default(false).nullable(),
    allowsPets: yup.boolean().default(false).nullable(),
    isActive: yup.boolean().default(true).nullable(),

    // Array fields - flexible validation
    amenities: yup.array()
      .of(yup.string())
      .max(50, 'Máximo de 50 comodidades')
      .default([])
      .nullable(),
    
    // Media arrays - now properly handle string arrays
    photos: yup.array()
      .of(yup.string().url('URL de foto inválida'))
      .max(30, 'Máximo de 30 fotos')
      .default([])
      .nullable(),
    
    videos: yup.array()
      .of(yup.string().url('URL de vídeo inválida'))
      .max(5, 'Máximo de 5 vídeos')
      .default([])
      .nullable(),

    // Payment surcharges - complex object with defaults
    paymentMethodSurcharges: yup.object().shape({
      [PaymentMethod.PIX]: yup.number().min(-50).max(100).default(0),
      [PaymentMethod.CREDIT_CARD]: yup.number().min(-50).max(100).default(0),
      [PaymentMethod.DEBIT_CARD]: yup.number().min(-50).max(100).default(0),
      [PaymentMethod.CASH]: yup.number().min(-50).max(100).default(0),
      [PaymentMethod.BANK_TRANSFER]: yup.number().min(-50).max(100).default(0),
      [PaymentMethod.BANK_SLIP]: yup.number().min(-50).max(100).default(0),
      [PaymentMethod.STRIPE]: yup.number().min(-50).max(100).default(0),
    }).default({
      [PaymentMethod.PIX]: 0,
      [PaymentMethod.CREDIT_CARD]: 0,
      [PaymentMethod.DEBIT_CARD]: 0,
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.BANK_TRANSFER]: 0,
      [PaymentMethod.BANK_SLIP]: 0,
      [PaymentMethod.STRIPE]: 0,
    }).nullable(),

    // Custom pricing - flexible object
    customPricing: yup.object()
      .default({})
      .nullable(),

    // Date fields
    unavailableDates: yup.array()
      .of(yup.date())
      .default([])
      .nullable(),

    // System fields - usually not edited directly
    createdAt: yup.date().nullable(),
    updatedAt: yup.date().nullable(),
    tenantId: yup.string().nullable(),
    id: yup.string().nullable(),

    // Location field for search - generated automatically
    location: yup.string().nullable(),

    // Seasonal pricing fields
    weekendSurcharge: yup.number()
      .min(0, 'Acréscimo de fim de semana não pode ser negativo')
      .max(200, 'Acréscimo máximo é 200%')
      .default(0)
      .nullable(),
    
    holidaySurcharge: yup.number()
      .min(0, 'Acréscimo de feriado não pode ser negativo')
      .max(200, 'Acréscimo máximo é 200%')
      .default(0)
      .nullable(),
    
    decemberSurcharge: yup.number()
      .min(0, 'Acréscimo de dezembro não pode ser negativo')
      .max(200, 'Acréscimo máximo é 200%')
      .default(0)
      .nullable(),
    
    highSeasonSurcharge: yup.number()
      .min(0, 'Acréscimo de alta temporada não pode ser negativo')
      .max(200, 'Acréscimo máximo é 200%')
      .default(0)
      .nullable(),
    
    highSeasonMonths: yup.array()
      .of(yup.string())
      .max(12, 'Máximo de 12 meses')
      .default([])
      .nullable(),
  });

  // For edit mode, make all fields optional by default
  if (!isCreateMode) {
    return schema.shape({
      ...schema.fields,
    });
  }

  return schema;
};

// Export pre-configured schemas for convenience
export const createPropertySchema = createPropertyValidationSchema('create');
export const editPropertySchema = createPropertyValidationSchema('edit');

// Export type for TypeScript inference
export type PropertyFormData = yup.InferType<ReturnType<typeof createPropertyValidationSchema>>;