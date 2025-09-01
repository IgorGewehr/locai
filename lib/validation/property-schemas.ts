import { z } from 'zod'
import { PropertyCategory, PropertyType, PropertyStatus } from '@/lib/types/property'
import { PaymentMethod } from '@/lib/types/common'

// ============================================================================
// SCHEMAS SIMPLIFICADOS - Compatível com estrutura do Dart
// ============================================================================

// Schema simples para URLs de mídia (como List<String> no Dart)
export const MediaUrlSchema = z.string()
  .min(1, 'URL é obrigatória')
  .refine(
    (url) => {
      try {
        // Aceitar URLs válidas (HTTP/HTTPS) e blob URLs para preview
        return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:');
      } catch {
        return false;
      }
    },
    'URL deve ser válida (http, https ou blob)'
  )

// DEPRECATED: Schemas antigos mantidos para compatibilidade
export const PropertyPhotoSchema = z.object({
  id: z.string().optional(),
  url: MediaUrlSchema, // ✅ Usa validação simplificada
  filename: z.string().optional(),
  order: z.number().int().min(0).optional(),
  isMain: z.boolean().optional(),
  caption: z.string().optional(),
})

export const PropertyVideoSchema = z.object({
  id: z.string().optional(),
  url: MediaUrlSchema, // ✅ Usa validação simplificada
  filename: z.string().optional(),
  title: z.string().optional(),
  duration: z.number().optional(),
  order: z.number().int().min(0).optional(),
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
export const UpdatePropertySchema = z.object({
  // ✅ CAMPOS BÁSICOS - ULTRA FLEXÍVEIS PARA UPDATE  
  title: z.union([z.string(), z.undefined(), z.null()]).optional(),
  description: z.union([z.string(), z.undefined(), z.null()]).optional(),
  address: z.union([z.string(), z.undefined(), z.null()]).optional(),
  category: z.nativeEnum(PropertyCategory).optional(),
  type: z.nativeEnum(PropertyType).optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  
  // ✅ NÚMEROS - CONVERSÃO AUTOMÁTICA E VALIDAÇÃO FLEXÍVEL
  bedrooms: z.union([z.number(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Number(val))
    .pipe(z.number().int().min(0).max(20).optional()),
  bathrooms: z.union([z.number(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Number(val))
    .pipe(z.number().int().min(0).max(20).optional()),
  maxGuests: z.union([z.number(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Number(val))
    .pipe(z.number().int().min(1).max(50).optional()),
  basePrice: z.union([z.number(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Number(val))
    .pipe(z.number().positive().max(100000).optional()),
  pricePerExtraGuest: z.union([z.number(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Number(val))
    .pipe(z.number().min(0).max(10000).optional()),
  minimumNights: z.union([z.number(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Number(val))
    .pipe(z.number().int().min(1).max(365).optional()),
  cleaningFee: z.union([z.number(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Number(val))
    .pipe(z.number().min(0).max(10000).optional()),
  
  // ✅ ARRAYS E OUTROS - FLEXÍVEIS
  amenities: z.union([z.array(z.string()), z.undefined(), z.null()]).optional(),
  isFeatured: z.union([z.boolean(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Boolean(val))
    .optional(),
  allowsPets: z.union([z.boolean(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Boolean(val))
    .optional(),
  paymentMethodSurcharges: PaymentSurchargesSchema.optional(),
  
  // ✅ MÍDIA - ULTRA FLEXÍVEL PARA UPDATE
  photos: z.union([
    z.array(z.string()),  // Array de strings
    z.array(z.any()),     // Array de qualquer coisa
    z.undefined(),        // Pode ser undefined
    z.null()              // Pode ser null
  ]).optional(),
  videos: z.union([
    z.array(z.string()),  // Array de strings  
    z.array(z.any()),     // Array de qualquer coisa
    z.undefined(),        // Pode ser undefined
    z.null()              // Pode ser null
  ]).optional(),
  
  // ✅ DATAS E PREÇOS CUSTOMIZADOS
  unavailableDates: z.array(z.coerce.date()).optional(),
  customPricing: z.record(z.string(), z.number().positive()).optional(),
  isActive: z.boolean().optional(),
  
  // ✅ CAMPOS EXTRAS (que podem vir do formulário)
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  capacity: z.union([z.number(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Number(val))
    .pipe(z.number().int().min(1).max(50).optional()),
  location: z.string().optional(),
  advancePaymentPercentage: z.union([z.number(), z.string(), z.undefined(), z.null()])
    .transform(val => val === null || val === undefined || val === '' ? undefined : Number(val))
    .pipe(z.number().min(0).max(100).optional()),
  paymentMethodDiscounts: z.record(z.nativeEnum(PaymentMethod), z.number()).optional(),
  highSeasonMonths: z.array(z.number()).optional(),
  pricingRules: z.array(z.any()).optional(),
  createdAt: z.union([z.date(), z.string().datetime(), z.undefined(), z.null()]).optional(),
  updatedAt: z.union([z.date(), z.string().datetime(), z.undefined(), z.null()]).optional(),
  id: z.string().optional(),
  tenantId: z.string().optional(),
  
  // DEPRECATED: Compatibilidade
  photos_legacy: z.array(PropertyPhotoSchema).optional(),
  videos_legacy: z.array(PropertyVideoSchema).optional(),
}).passthrough() // ✅ PERMITE CAMPOS EXTRAS NÃO DECLARADOS

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