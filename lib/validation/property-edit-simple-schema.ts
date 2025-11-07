/**
 * Simplified Property Edit Schema - Only validates editable fields
 * Ignores system fields to prevent validation errors
 */

import * as yup from 'yup';
import { PropertyCategory, PropertyStatus, PropertyType } from '@/lib/types/property';
import { PaymentMethod } from '@/lib/types/common';

// Ultra-simple schema that only validates what users can actually edit
export const editPropertySchema = yup.object().shape({
  // Basic editable fields
  title: yup.string()
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .when('$mode', {
      is: 'create',
      then: (schema) => schema.required('Título é obrigatório'),
      otherwise: (schema) => schema.nullable()
    }),
    
  description: yup.string()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
    .when('$mode', {
      is: 'create', 
      then: (schema) => schema.required('Descrição é obrigatória'),
      otherwise: (schema) => schema.nullable()
    }),
    
  address: yup.string().max(200, 'Endereço deve ter no máximo 200 caracteres').nullable(),
  neighborhood: yup.string().max(100, 'Bairro deve ter no máximo 100 caracteres').nullable(),
  city: yup.string().max(100, 'Cidade deve ter no máximo 100 caracteres').nullable(),

  // Enums - mais permissivos
  category: yup.string().nullable(),
  status: yup.string().nullable(), 
  type: yup.string().nullable(),

  // Numbers - super flexível
  bedrooms: yup.number().min(0).max(20).nullable().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) return null;
    return value;
  }),
  
  bathrooms: yup.number().min(0).max(20).nullable().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) return null;
    return value;
  }),
  
  maxGuests: yup.number().min(1).max(50).nullable().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) return null;
    return value;
  }),
  
  capacity: yup.number().min(1).max(50).nullable().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) return null;
    return value;
  }),
  
  basePrice: yup.number().positive().max(100000).nullable().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) return null;
    return value;
  }),
  
  pricePerExtraGuest: yup.number().min(0).max(10000).nullable().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) return null;
    return value;
  }),
  
  minimumNights: yup.number().min(1).max(365).nullable().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) return null;
    return value;
  }),
  
  cleaningFee: yup.number().min(0).max(10000).nullable().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) return null;
    return value;
  }),

  // Booleans
  isFeatured: yup.boolean().nullable(),
  allowsPets: yup.boolean().nullable(), 
  isActive: yup.boolean().nullable(),

  // Arrays - super permissivos
  amenities: yup.array().nullable(),
  photos: yup.array().nullable(),
  videos: yup.array().nullable(),
  unavailableDates: yup.array().nullable(),
  
  // Objects
  paymentMethodSurcharges: yup.object().nullable(),
  customPricing: yup.object().nullable(),

}).noUnknown(false); // Permite campos desconhecidos

export type EditPropertyFormData = yup.InferType<typeof editPropertySchema>;