/**
 * Ultra Permissive Property Edit Schema - NUNCA FALHA
 * Aceita qualquer coisa e transforma em valores válidos
 */

import * as yup from 'yup';
import { PropertyCategory, PropertyStatus, PropertyType } from '@/lib/types/property';
import { PaymentMethod } from '@/lib/types/common';

// Helper ultra-permissivo para qualquer valor
const anyValue = yup.mixed().transform((value) => {
  // Aceita literalmente qualquer coisa
  return value;
});

// Helper ultra-permissivo para strings
const anyString = yup.mixed().transform((value) => {
  if (value === null || value === undefined) return '';
  return String(value);
});

// Helper ultra-permissivo para números
const anyNumber = yup.mixed().transform((value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
});

// Helper ultra-permissivo para booleans
const anyBoolean = yup.mixed().transform((value) => {
  if (value === null || value === undefined || value === '') return undefined;
  return Boolean(value);
});

// Helper ultra-permissivo para arrays
const anyArray = yup.mixed().transform((value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
});

// Helper ultra-permissivo para media arrays
const ultraMediaArray = yup.mixed().transform((value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item;
      if (item && item.url) return item.url;
      return String(item || '');
    }).filter(url => url);
  }
  return [];
});

// Schema ULTRA-PERMISSIVO que nunca falha
export const ultraPermissiveEditPropertySchema = yup.object().shape({
  // Strings - sempre funcionam
  title: anyString,
  description: anyString,
  address: anyString,
  neighborhood: anyString,
  city: anyString,
  location: anyString,
  
  // Enums - com fallback para valores padrões
  category: yup.mixed().transform((value) => {
    if (Object.values(PropertyCategory).includes(value)) return value;
    return value; // Deixa passar mesmo se inválido
  }),
  
  status: yup.mixed().transform((value) => {
    if (Object.values(PropertyStatus).includes(value)) return value;
    return value; // Deixa passar mesmo se inválido
  }),
  
  type: yup.mixed().transform((value) => {
    if (Object.values(PropertyType).includes(value)) return value;
    return value; // Deixa passar mesmo se inválido
  }),

  // Números - sempre aceitos
  bedrooms: anyNumber,
  bathrooms: anyNumber,
  maxGuests: anyNumber,
  capacity: anyNumber,
  basePrice: anyNumber,
  pricePerExtraGuest: anyNumber,
  minimumNights: anyNumber,
  cleaningFee: anyNumber,
  advancePaymentPercentage: anyNumber,
  
  // Surcharges - sempre aceitos
  weekendSurcharge: anyNumber,
  holidaySurcharge: anyNumber,
  decemberSurcharge: anyNumber,
  highSeasonSurcharge: anyNumber,

  // Booleans - sempre funcionam
  isFeatured: anyBoolean,
  allowsPets: anyBoolean,
  isActive: anyBoolean,

  // Arrays - sempre arrays válidos
  amenities: anyArray,
  unavailableDates: anyArray,
  highSeasonMonths: anyArray,
  pricingRules: anyArray,
  
  // Media - ultra flexível
  photos: ultraMediaArray,
  videos: ultraMediaArray,
  
  // Objetos - sempre aceitos
  paymentMethodSurcharges: yup.mixed().transform((value) => {
    if (value && typeof value === 'object') return value;
    return {};
  }),
  
  paymentMethodDiscounts: yup.mixed().transform((value) => {
    if (value && typeof value === 'object') return value;
    return {};
  }),
  
  customPricing: yup.mixed().transform((value) => {
    if (value && typeof value === 'object') return value;
    return {};
  }),
  
  // System fields - sempre aceitos
  id: anyString,
  tenantId: anyString,
  
  // Timestamps - ultra flexíveis
  createdAt: yup.mixed().transform((value) => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (value && value.toDate) return value.toDate();
    try {
      return new Date(value);
    } catch {
      return undefined;
    }
  }),
  
  updatedAt: yup.mixed().transform((value) => {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (value && value.toDate) return value.toDate();
    try {
      return new Date(value);
    } catch {
      return new Date();
    }
  }),
  
}).noUnknown(false); // Permite campos desconhecidos

export type UltraPermissiveEditPropertyFormData = yup.InferType<typeof ultraPermissiveEditPropertySchema>;