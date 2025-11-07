// lib/validation/propertySchema.ts
import * as yup from 'yup'
import { PropertyCategory } from '@/lib/types/property'
import { PaymentMethod } from '@/lib/types/common'

export const propertySchema = yup.object({
  title: yup
    .string()
    .max(100, 'Título deve ter no máximo 100 caracteres'),
  
  description: yup
    .string()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres'),
  
  address: yup
    .string(),
  
  category: yup
    .string()
    .oneOf(Object.values(PropertyCategory), 'Categoria inválida'),
  
  bedrooms: yup
    .number()
    .min(0, 'Deve ter pelo menos 0 quartos')
    .max(20, 'Máximo de 20 quartos')
    .integer('Deve ser um número inteiro'),
  
  bathrooms: yup
    .number()
    .min(0, 'Não pode ser negativo')
    .max(20, 'Máximo de 20 banheiros')
    .integer('Deve ser um número inteiro'),
  
  maxGuests: yup
    .number()
    .min(0, 'Não pode ser negativo')
    .max(50, 'Máximo de 50 hóspedes')
    .integer('Deve ser um número inteiro'),
  
  basePrice: yup
    .number()
    .min(0, 'Preço não pode ser negativo')
    .max(10000, 'Preço máximo é R$ 10.000'),
  
  pricePerExtraGuest: yup
    .number()
    .min(0, 'Preço por hóspede extra não pode ser negativo')
    .max(1000, 'Preço por hóspede extra máximo é R$ 1.000'),
  
  minimumNights: yup
    .number()
    .min(0, 'Não pode ser negativo')
    .max(30, 'Máximo de 30 diárias')
    .integer('Deve ser um número inteiro'),
  
  cleaningFee: yup
    .number()
    .min(0, 'Taxa de limpeza não pode ser negativa')
    .max(1000, 'Taxa de limpeza máxima é R$ 1.000'),
  
  amenities: yup
    .array()
    .of(yup.string())
    .max(20, 'Máximo de 20 comodidades'),
  
  isFeatured: yup
    .boolean()
    .default(false),
  
  allowsPets: yup
    .boolean()
    .default(false),
  
  paymentMethodSurcharges: yup
    .object()
    .shape({
      [PaymentMethod.CREDIT_CARD]: yup.number().min(-50, 'Desconto máximo de 50%').max(100, 'Acréscimo máximo de 100%'),
      [PaymentMethod.PIX]: yup.number().min(-50, 'Desconto máximo de 50%').max(100, 'Acréscimo máximo de 100%'),
      [PaymentMethod.CASH]: yup.number().min(-50, 'Desconto máximo de 50%').max(100, 'Acréscimo máximo de 100%'),
      [PaymentMethod.BANK_TRANSFER]: yup.number().min(-50, 'Desconto máximo de 50%').max(100, 'Acréscimo máximo de 100%'),
    }),
  
  photos: yup
    .array()
    .max(20, 'Máximo de 20 fotos'),
  
  videos: yup
    .array()
    .max(5, 'Máximo de 5 vídeos'),
  
  isActive: yup
    .boolean()
    .default(true),
})

export const stepValidationSchemas = {
  0: yup.object({
    title: propertySchema.fields.title,
    description: propertySchema.fields.description,
    address: propertySchema.fields.address,
    category: propertySchema.fields.category,
  }),
  
  1: yup.object({
    bedrooms: propertySchema.fields.bedrooms,
    bathrooms: propertySchema.fields.bathrooms,
    maxGuests: propertySchema.fields.maxGuests,
  }),
  
  2: yup.object({
    basePrice: propertySchema.fields.basePrice,
    pricePerExtraGuest: propertySchema.fields.pricePerExtraGuest,
    minimumNights: propertySchema.fields.minimumNights,
    cleaningFee: propertySchema.fields.cleaningFee,
    paymentMethodSurcharges: propertySchema.fields.paymentMethodSurcharges,
  }),
  
  3: yup.object({
    amenities: propertySchema.fields.amenities,
    isFeatured: propertySchema.fields.isFeatured,
    allowsPets: propertySchema.fields.allowsPets,
  }),
  
  4: yup.object({
    photos: propertySchema.fields.photos,
    videos: propertySchema.fields.videos,
  }),
}