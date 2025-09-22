/**
 * Property Import Validation Schema
 * Supports bulk property import from external systems (Airbnb, etc.)
 */

import * as yup from 'yup';
import { PropertyCategory, PropertyStatus, PropertyType } from '@/lib/types/property';
import { PaymentMethod } from '@/lib/types/common';

// Schema for individual property import
export const propertyImportSchema = yup.object().shape({
  // Required basic information
  title: yup.string()
    .required('Título é obrigatório')
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres'),

  description: yup.string()
    .required('Descrição é obrigatória')
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres'),

  // Location information
  address: yup.string()
    .required('Endereço é obrigatório')
    .max(200, 'Endereço deve ter no máximo 200 caracteres'),

  neighborhood: yup.string()
    .max(100, 'Bairro deve ter no máximo 100 caracteres')
    .nullable(),

  city: yup.string()
    .required('Cidade é obrigatória')
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),

  // Property specifications
  category: yup.mixed<PropertyCategory>()
    .oneOf(Object.values(PropertyCategory), 'Categoria inválida')
    .default(PropertyCategory.APARTMENT),

  type: yup.mixed<PropertyType>()
    .oneOf(Object.values(PropertyType), 'Tipo inválido')
    .default(PropertyType.VACATION),

  bedrooms: yup.number()
    .integer('Número de quartos deve ser inteiro')
    .min(0, 'Número de quartos não pode ser negativo')
    .max(20, 'Número máximo de quartos é 20')
    .required('Número de quartos é obrigatório'),

  bathrooms: yup.number()
    .integer('Número de banheiros deve ser inteiro')
    .min(0, 'Número de banheiros não pode ser negativo')
    .max(20, 'Número máximo de banheiros é 20')
    .required('Número de banheiros é obrigatório'),

  maxGuests: yup.number()
    .integer('Número de hóspedes deve ser inteiro')
    .min(1, 'Deve acomodar pelo menos 1 hóspede')
    .max(50, 'Número máximo de hóspedes é 50')
    .required('Número máximo de hóspedes é obrigatório'),

  // Pricing information
  basePrice: yup.number()
    .required('Preço base é obrigatório')
    .positive('Preço deve ser positivo')
    .max(100000, 'Preço máximo é R$ 100.000'),

  cleaningFee: yup.number()
    .min(0, 'Taxa de limpeza não pode ser negativa')
    .max(10000, 'Taxa máxima de limpeza é R$ 10.000')
    .default(0),

  pricePerExtraGuest: yup.number()
    .min(0, 'Preço por hóspede extra não pode ser negativo')
    .max(10000, 'Preço máximo por hóspede extra é R$ 10.000')
    .default(0),

  minimumNights: yup.number()
    .integer('Mínimo de noites deve ser inteiro')
    .min(1, 'Mínimo de noites deve ser pelo menos 1')
    .max(365, 'Máximo de noites é 365')
    .default(1),

  // Media URLs from external systems (will be downloaded and re-uploaded)
  photos: yup.array()
    .of(yup.string().url('URL de foto inválida'))
    .max(30, 'Máximo de 30 fotos')
    .default([]),

  videos: yup.array()
    .of(yup.string().url('URL de vídeo inválida'))
    .max(5, 'Máximo de 5 vídeos')
    .default([]),

  // Optional amenities
  amenities: yup.array()
    .of(yup.string())
    .max(50, 'Máximo de 50 comodidades')
    .default([]),

  // Optional settings
  allowsPets: yup.boolean().default(false),
  isFeatured: yup.boolean().default(false),

  // Status - imported properties are active by default
  status: yup.mixed<PropertyStatus>()
    .oneOf(Object.values(PropertyStatus), 'Status inválido')
    .default(PropertyStatus.ACTIVE),

  isActive: yup.boolean().default(true),

  // Optional pricing configurations
  weekendSurcharge: yup.number()
    .min(0, 'Acréscimo de fim de semana não pode ser negativo')
    .max(200, 'Acréscimo máximo é 200%')
    .default(0),

  holidaySurcharge: yup.number()
    .min(0, 'Acréscimo de feriado não pode ser negativo')
    .max(200, 'Acréscimo máximo é 200%')
    .default(0),

  decemberSurcharge: yup.number()
    .min(0, 'Acréscimo de dezembro não pode ser negativo')
    .max(200, 'Acréscimo máximo é 200%')
    .default(0),

  // Advanced payment percentage
  advancePaymentPercentage: yup.number()
    .min(0, 'Percentual não pode ser negativo')
    .max(100, 'Percentual máximo é 100%')
    .default(30), // Default 30% advance payment

  // External reference (optional - to track original ID from source system)
  externalId: yup.string()
    .max(100, 'ID externo deve ter no máximo 100 caracteres')
    .nullable(),

  externalSource: yup.string()
    .max(50, 'Fonte externa deve ter no máximo 50 caracteres')
    .nullable(), // e.g., "airbnb", "booking", etc.
});

// Schema for bulk import file
export const bulkImportSchema = yup.object().shape({
  properties: yup.array()
    .of(propertyImportSchema)
    .min(1, 'Deve conter pelo menos 1 propriedade')
    .max(100, 'Máximo de 100 propriedades por importação')
    .required('Lista de propriedades é obrigatória'),

  // Optional metadata
  source: yup.string()
    .max(50, 'Fonte deve ter no máximo 50 caracteres')
    .default('manual_import'),

  importedAt: yup.date().default(() => new Date()),

  // Settings for the import process
  settings: yup.object().shape({
    skipDuplicates: yup.boolean().default(true), // Skip if property with same external ID exists
    updateExisting: yup.boolean().default(false), // Update existing properties
    downloadMedia: yup.boolean().default(true), // Download and re-upload media
    validateMedia: yup.boolean().default(true), // Validate media URLs before download
    createThumbnails: yup.boolean().default(true), // Create thumbnails for images
  }).default({
    skipDuplicates: true,
    updateExisting: false,
    downloadMedia: true,
    validateMedia: true,
    createThumbnails: true,
  }),
});

// Export types for TypeScript
export type PropertyImportData = yup.InferType<typeof propertyImportSchema>;
export type BulkImportData = yup.InferType<typeof bulkImportSchema>;

// Helper function to create default payment method surcharges
export const createDefaultPaymentSurcharges = () => ({
  [PaymentMethod.PIX]: -5, // 5% discount for PIX
  [PaymentMethod.CREDIT_CARD]: 3, // 3% surcharge for credit card
  [PaymentMethod.DEBIT_CARD]: 0,
  [PaymentMethod.CASH]: -2, // 2% discount for cash
  [PaymentMethod.BANK_TRANSFER]: 0,
  [PaymentMethod.BANK_SLIP]: 0,
  [PaymentMethod.STRIPE]: 3,
});

// Sample import JSON structure for documentation
export const sampleImportData: BulkImportData = {
  source: "airbnb_export",
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
      title: "Apartamento Copacabana 2 Quartos",
      description: "Lindo apartamento em Copacabana com vista para o mar. Localizado próximo ao metrô e principais pontos turísticos.",
      address: "Rua Barata Ribeiro, 123",
      neighborhood: "Copacabana",
      city: "Rio de Janeiro",
      category: PropertyCategory.APARTMENT,
      type: PropertyType.VACATION,
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      basePrice: 250,
      cleaningFee: 80,
      pricePerExtraGuest: 50,
      minimumNights: 2,
      photos: [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg"
      ],
      videos: ["https://example.com/video1.mp4"],
      amenities: ["Wi-Fi", "Ar Condicionado", "TV a Cabo"],
      allowsPets: false,
      isFeatured: false,
      weekendSurcharge: 20,
      holidaySurcharge: 30,
      advancePaymentPercentage: 30,
      externalId: "airbnb_12345",
      externalSource: "airbnb"
    }
  ]
};