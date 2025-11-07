/**
 * Unified Property Edit Schema - Compatible with Backend
 * Matches the backend UpdatePropertySchema from property-schemas.ts
 */

import * as yup from 'yup';
import { PropertyCategory, PropertyStatus, PropertyType } from '@/lib/types/property';
import { PaymentMethod } from '@/lib/types/common';

// Helper to convert array of any to array of strings (for media)
const mediaArraySchema = yup.array().of(
  yup.mixed().transform((value) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && value.url) return value.url;
    return null;
  }).test('is-valid-url', 'URL inválida', (value) => {
    if (!value) return true; // Allow empty
    if (typeof value !== 'string') return false;
    return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:');
  })
).transform((arr) => arr.filter(Boolean)); // Remove null/undefined values

// Unified Edit Schema - Compatible with Backend UpdatePropertySchema
export const editPropertySchema = yup.object().shape({
  // Basic fields - optional with validation when provided
  title: yup.string().max(100, 'Título deve ter no máximo 100 caracteres').nullable(),
  description: yup.string().max(2000, 'Descrição deve ter no máximo 2000 caracteres').nullable(),
  address: yup.string().max(200, 'Endereço deve ter no máximo 200 caracteres').nullable(),
  neighborhood: yup.string().max(100, 'Bairro deve ter no máximo 100 caracteres').nullable(),
  city: yup.string().max(100, 'Cidade deve ter no máximo 100 caracteres').nullable(),
  
  // Enums - match backend exactly
  category: yup.mixed<PropertyCategory>()
    .oneOf(Object.values(PropertyCategory), 'Categoria inválida')
    .nullable(),
  status: yup.mixed<PropertyStatus>()
    .oneOf(Object.values(PropertyStatus), 'Status inválido')
    .nullable(),
  type: yup.mixed<PropertyType>()
    .oneOf([...Object.values(PropertyType), null, undefined], 'Tipo inválido')
    .nullable()
    .transform((value) => {
      // Se valor está vazio ou é null/undefined, permitir
      if (!value || value === '' || value === null || value === undefined) {
        return null;
      }
      return value;
    }),

  // Numeric fields - flexible transformation like backend
  bedrooms: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    })
    .test('is-valid-number', 'Número inválido', (value) => {
      if (value === undefined) return true;
      return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 20;
    }),
    
  bathrooms: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    })
    .test('is-valid-number', 'Número inválido', (value) => {
      if (value === undefined) return true;
      return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 20;
    }),
    
  maxGuests: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    })
    .test('is-valid-number', 'Número inválido', (value) => {
      if (value === undefined) return true;
      return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 50;
    }),
    
  capacity: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    })
    .test('is-valid-number', 'Número inválido', (value) => {
      if (value === undefined) return true;
      return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 50;
    }),
    
  basePrice: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    })
    .test('is-valid-price', 'Preço inválido', (value) => {
      if (value === undefined) return true;
      return typeof value === 'number' && value > 0 && value <= 100000;
    }),
    
  pricePerExtraGuest: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    })
    .test('is-valid-price', 'Preço inválido', (value) => {
      if (value === undefined) return true;
      return typeof value === 'number' && value >= 0 && value <= 10000;
    }),
    
  minimumNights: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    })
    .test('is-valid-number', 'Número inválido', (value) => {
      if (value === undefined) return true;
      return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 365;
    }),
    
  cleaningFee: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    })
    .test('is-valid-price', 'Taxa inválida', (value) => {
      if (value === undefined) return true;
      return typeof value === 'number' && value >= 0 && value <= 10000;
    }),
    
  advancePaymentPercentage: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    })
    .test('is-valid-percentage', 'Percentual inválido', (value) => {
      if (value === undefined) return true;
      return typeof value === 'number' && value >= 0 && value <= 100;
    }),

  // Boolean fields - flexible transformation
  isFeatured: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      return Boolean(value);
    }),
    
  allowsPets: yup.mixed()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      return Boolean(value);
    }),
    
  isActive: yup.boolean(),

  // Arrays
  amenities: yup.array().of(yup.string()).nullable(),
  unavailableDates: yup.array().of(yup.date()).nullable(),
  
  // Media - ultra flexible like backend
  photos: mediaArraySchema.max(30, 'Máximo de 30 fotos').nullable(),
  videos: mediaArraySchema.max(5, 'Máximo de 5 vídeos').nullable(),
  
  // Payment methods
  paymentMethodSurcharges: yup.object().shape(
    Object.values(PaymentMethod).reduce((acc, method) => {
      acc[method] = yup.number().min(-50, 'Desconto máximo de 50%').max(100, 'Acréscimo máximo de 100%');
      return acc;
    }, {} as Record<PaymentMethod, yup.NumberSchema>)
  ).nullable(),
  
  paymentMethodDiscounts: yup.object().nullable(),
  
  // Additional fields that might come from the form
  location: yup.string().nullable(),
  customPricing: yup.object().nullable(),
  highSeasonMonths: yup.array().of(yup.number()).nullable(),
  pricingRules: yup.array().nullable(),
  
  // System fields - flexible for Firebase Timestamps  
  id: yup.string().nullable(),
  tenantId: yup.string().nullable(),
  createdAt: yup.mixed().transform((value) => {
    // Handle Firestore Timestamp objects
    if (value && typeof value === 'object' && value.toDate) {
      return value.toDate();
    }
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    return value;
  }),
  updatedAt: yup.mixed().transform((value) => {
    // Handle Firestore Timestamp objects
    if (value && typeof value === 'object' && value.toDate) {
      return value.toDate();
    }
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    return value;
  }),
}).noUnknown(false); // Allow unknown fields like backend .passthrough()

export type EditPropertyFormData = yup.InferType<typeof editPropertySchema>;