import { z } from 'zod'
import { PropertyCategory } from '@/lib/types/property'
import { PaymentMethod } from '@/lib/types/common'

// ============================================================================
// SCHEMAS SIMPLIFICADOS - Compatível com estrutura do Dart
// ============================================================================

// Schema simples para URLs de mídia (como List<String> no Dart)
export const MediaUrlSchema = z.string()
  .min(1, 'URL é obrigatória')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:'),
    'URL deve ser válida (http, https ou blob)'
  )

// DEPRECATED: Schemas antigos mantidos para compatibilidade
export const PropertyPhotoSchema = z.object({
  id: z.string(),
  url: MediaUrlSchema, // ✅ Usa validação simplificada
  filename: z.string(),
  order: z.number().int().min(0),
  isMain: z.boolean(),
  caption: z.string().optional(),
})

export const PropertyVideoSchema = z.object({
  id: z.string(),
  url: MediaUrlSchema, // ✅ Usa validação simplificada
  filename: z.string(),
  title: z.string(),
  duration: z.number().optional(),
  order: z.number().int().min(0),
  thumbnail: z.string().optional(),
})

// Aliases for backward compatibility
export const PropertyPhotoUpdateSchema = PropertyPhotoSchema
export const PropertyVideoUpdateSchema = PropertyVideoSchema

// Schema for payment surcharges (permite valores negativos para descontos)
export const PaymentSurchargesSchema = z.record(
  z.nativeEnum(PaymentMethod),
  z.number().min(-50, 'Desconto máximo de 50%').max(100, 'Acréscimo máximo de 100%')
)

// Schema for creating a property
export const CreatePropertySchema = z.object({
  title: z.string()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres'),
  
  description: z.string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres'),
  
  address: z.string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(200, 'Endereço deve ter no máximo 200 caracteres'),
  
  category: z.nativeEnum(PropertyCategory, {
    errorMap: () => ({ message: 'Categoria inválida' })
  }),
  
  bedrooms: z.number()
    .int('Número de quartos deve ser inteiro')
    .min(0, 'Número de quartos não pode ser negativo')
    .max(20, 'Número de quartos deve ser no máximo 20'),
  
  bathrooms: z.number()
    .int('Número de banheiros deve ser inteiro')
    .min(0, 'Número de banheiros não pode ser negativo')
    .max(20, 'Número de banheiros deve ser no máximo 20'),
  
  maxGuests: z.number()
    .int('Número máximo de hóspedes deve ser inteiro')
    .min(1, 'Deve acomodar pelo menos 1 hóspede')
    .max(50, 'Número máximo de hóspedes deve ser no máximo 50'),
  
  basePrice: z.number()
    .positive('Preço base deve ser positivo')
    .max(100000, 'Preço base deve ser no máximo R$ 100.000'),
  
  pricePerExtraGuest: z.number()
    .min(0, 'Preço por hóspede extra não pode ser negativo')
    .max(10000, 'Preço por hóspede extra deve ser no máximo R$ 10.000')
    .default(0),
  
  minimumNights: z.number()
    .int('Mínimo de noites deve ser inteiro')
    .min(1, 'Mínimo de noites deve ser pelo menos 1')
    .max(365, 'Mínimo de noites deve ser no máximo 365')
    .default(1),
  
  cleaningFee: z.number()
    .min(0, 'Taxa de limpeza não pode ser negativa')
    .max(10000, 'Taxa de limpeza deve ser no máximo R$ 10.000')
    .default(0),
  
  amenities: z.array(z.string())
    .max(50, 'Máximo de 50 comodidades')
    .default([]),
  
  isFeatured: z.boolean().default(false),
  allowsPets: z.boolean().default(false),
  
  paymentMethodSurcharges: PaymentSurchargesSchema.default({}),
  
  // ✅ NOVA ESTRUTURA SIMPLIFICADA (como Dart)
  photos: z.array(MediaUrlSchema)
    .max(30, 'Máximo de 30 fotos')
    .default([]),
  
  videos: z.array(MediaUrlSchema)
    .max(5, 'Máximo de 5 vídeos')
    .default([]),
  
  // DEPRECATED: Compatibilidade com estrutura antiga
  photos_legacy: z.array(PropertyPhotoSchema).optional(),
  videos_legacy: z.array(PropertyVideoSchema).optional(),
  
  unavailableDates: z.array(z.coerce.date()).default([]),
  
  customPricing: z.record(z.string(), z.number().positive())
    .default({}),
  
  isActive: z.boolean().default(true),
})

// Schema for updating a property (all fields optional with flexible media)
export const UpdatePropertySchema = CreatePropertySchema.partial().extend({
  // ✅ NOVA ESTRUTURA SIMPLIFICADA (como Dart)
  photos: z.array(MediaUrlSchema)
    .max(30, 'Máximo de 30 fotos')
    .optional(),
  
  videos: z.array(MediaUrlSchema)
    .max(5, 'Máximo de 5 vídeos')
    .optional(),
  
  // DEPRECATED: Compatibilidade com estrutura antiga
  photos_legacy: z.array(PropertyPhotoSchema).optional(),
  videos_legacy: z.array(PropertyVideoSchema).optional(),
})

// Schema for property search/filter
export const PropertySearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  location: z.string().optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  maxGuests: z.coerce.number().int().min(1).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  amenities: z.string().transform(val => val ? val.split(',').filter(Boolean) : []).optional(),
  category: z.nativeEnum(PropertyCategory).optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  allowsPets: z.coerce.boolean().optional(),
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
  sortBy: z.enum(['price', 'createdAt', 'title', 'maxGuests']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// Type exports
export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>
export type PropertySearchInput = z.infer<typeof PropertySearchSchema>