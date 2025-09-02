import { z } from 'zod'
import { PropertyCategory, PropertyType, PropertyStatus } from '@/lib/types/property'
import { PaymentMethod } from '@/lib/types/common'

// ============================================================================
// SCHEMAS ULTRA-PERMISSIVOS - NUNCA FALHAM
// ============================================================================

// Helper para transformar qualquer coisa em string válida
const anyToString = z.any().transform(val => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
});

// Helper para transformar qualquer coisa em número válido
const anyToNumber = z.any().transform(val => {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
});

// Helper para transformar qualquer coisa em boolean válido
const anyToBoolean = z.any().transform(val => {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
  }
  return Boolean(val);
});

// Helper para transformar qualquer coisa em array válido
const anyToArray = z.any().transform(val => {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined || val === '') return [];
  return [val];
});

// Helper para transformar qualquer coisa em objeto válido
const anyToObject = z.any().transform(val => {
  if (val && typeof val === 'object' && !Array.isArray(val)) return val;
  return {};
});

// Helper para datas ultra-permissivo
const anyToDate = z.any().transform(val => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val.toDate && typeof val.toDate === 'function') return val.toDate();
  try {
    const date = new Date(val);
    return isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
});

// Schema ultra-permissivo para URLs de mídia
export const UltraPermissiveMediaUrlSchema = z.any()
  .transform(val => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (val.url) return val.url;
    return String(val);
  });

// Schema ultra-permissivo para criação de propriedade
export const UltraPermissiveCreatePropertySchema = z.object({
  // Campos básicos - sempre geram valores válidos
  title: anyToString.refine(val => val.length > 0, { message: 'Title generated' }).transform(val => val || 'Propriedade Sem Nome'),
  description: anyToString.transform(val => val || 'Descrição da propriedade'),
  address: anyToString.transform(val => val || ''),
  
  // Enums com fallback
  category: z.any().transform(val => {
    if (Object.values(PropertyCategory).includes(val)) return val;
    return PropertyCategory.APARTMENT; // Fallback padrão
  }),
  
  type: z.any().transform(val => {
    if (Object.values(PropertyType).includes(val)) return val;
    return PropertyType.RESIDENTIAL; // Fallback padrão
  }),
  
  status: z.any().transform(val => {
    if (Object.values(PropertyStatus).includes(val)) return val;
    return PropertyStatus.ACTIVE; // Fallback padrão
  }),
  
  // Números - sempre positivos e válidos
  bedrooms: anyToNumber.transform(val => Math.max(0, Math.min(20, Math.floor(val)))),
  bathrooms: anyToNumber.transform(val => Math.max(0, Math.min(20, Math.floor(val)))),
  maxGuests: anyToNumber.transform(val => Math.max(1, Math.min(50, Math.floor(val)))),
  basePrice: anyToNumber.transform(val => Math.max(1, Math.min(100000, val))),
  pricePerExtraGuest: anyToNumber.transform(val => Math.max(0, Math.min(10000, val))),
  minimumNights: anyToNumber.transform(val => Math.max(1, Math.min(365, Math.floor(val)))),
  cleaningFee: anyToNumber.transform(val => Math.max(0, Math.min(10000, val))),
  capacity: anyToNumber.transform(val => Math.max(1, Math.min(50, Math.floor(val)))),
  advancePaymentPercentage: anyToNumber.transform(val => Math.max(0, Math.min(100, val))),
  
  // Arrays - sempre arrays válidos
  amenities: anyToArray.transform(val => 
    val.filter(item => item && typeof item === 'string').slice(0, 50)
  ),
  photos: anyToArray.transform(val => 
    val.map(item => UltraPermissiveMediaUrlSchema.parse(item)).filter(url => url).slice(0, 30)
  ),
  videos: anyToArray.transform(val => 
    val.map(item => UltraPermissiveMediaUrlSchema.parse(item)).filter(url => url).slice(0, 5)
  ),
  unavailableDates: anyToArray.transform(val => 
    val.map(item => anyToDate.parse(item))
  ),
  highSeasonMonths: anyToArray.transform(val => 
    val.map(item => Math.max(1, Math.min(12, Math.floor(anyToNumber.parse(item)))))
  ),
  
  // Booleans
  isFeatured: anyToBoolean,
  allowsPets: anyToBoolean,
  isActive: anyToBoolean.transform(val => val !== false), // Default true
  
  // Objetos
  customPricing: anyToObject,
  paymentMethodSurcharges: z.any().transform(val => {
    const result: Record<PaymentMethod, number> = {} as any;
    Object.values(PaymentMethod).forEach(method => {
      result[method] = 0; // Default 0% para todos os métodos
    });
    
    if (val && typeof val === 'object') {
      Object.entries(val).forEach(([key, value]) => {
        if (Object.values(PaymentMethod).includes(key as PaymentMethod)) {
          result[key as PaymentMethod] = Math.max(-50, Math.min(100, Number(value) || 0));
        }
      });
    }
    
    return result;
  }),
  
  // Campos extras opcionais
  city: anyToString.optional(),
  neighborhood: anyToString.optional(),
  location: anyToString.optional(),
  pricingRules: anyToArray.optional(),
  
  // Surcharges opcionais
  weekendSurcharge: anyToNumber.optional(),
  holidaySurcharge: anyToNumber.optional(),
  decemberSurcharge: anyToNumber.optional(),
  highSeasonSurcharge: anyToNumber.optional(),
  
  // Timestamps
  createdAt: anyToDate.optional(),
  updatedAt: anyToDate.optional(),
  
  // IDs opcionais
  id: anyToString.optional(),
  tenantId: anyToString.optional(),
  
}).passthrough(); // Permite qualquer campo extra

// Schema ultra-permissivo para atualização de propriedade
export const UltraPermissiveUpdatePropertySchema = z.object({
  // Todos os campos são opcionais e ultra-flexíveis
  title: z.any().optional(),
  description: z.any().optional(),
  address: z.any().optional(),
  
  category: z.any().transform(val => {
    if (!val) return undefined;
    if (Object.values(PropertyCategory).includes(val)) return val;
    return PropertyCategory.APARTMENT;
  }).optional(),
  
  type: z.any().transform(val => {
    if (!val) return undefined;
    if (Object.values(PropertyType).includes(val)) return val;
    return PropertyType.RESIDENTIAL;
  }).optional(),
  
  status: z.any().transform(val => {
    if (!val) return undefined;
    if (Object.values(PropertyStatus).includes(val)) return val;
    return PropertyStatus.ACTIVE;
  }).optional(),
  
  // Números opcionais
  bedrooms: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Math.max(0, Math.min(20, Math.floor(Number(val) || 0)))).optional(),
  bathrooms: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Math.max(0, Math.min(20, Math.floor(Number(val) || 0)))).optional(),
  maxGuests: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Math.max(1, Math.min(50, Math.floor(Number(val) || 1)))).optional(),
  basePrice: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Math.max(0.01, Math.min(100000, Number(val) || 0.01))).optional(),
  pricePerExtraGuest: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Math.max(0, Math.min(10000, Number(val) || 0))).optional(),
  minimumNights: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Math.max(1, Math.min(365, Math.floor(Number(val) || 1)))).optional(),
  cleaningFee: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Math.max(0, Math.min(10000, Number(val) || 0))).optional(),
  capacity: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Math.max(1, Math.min(50, Math.floor(Number(val) || 1)))).optional(),
  advancePaymentPercentage: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Math.max(0, Math.min(100, Number(val) || 0))).optional(),
  
  // Surcharges opcionais
  weekendSurcharge: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Number(val) || 0).optional(),
  holidaySurcharge: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Number(val) || 0).optional(),
  decemberSurcharge: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Number(val) || 0).optional(),
  highSeasonSurcharge: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Number(val) || 0).optional(),
  
  // Arrays opcionais
  amenities: z.any().transform(val => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val.filter(item => item && typeof item === 'string').slice(0, 50);
    return [String(val)];
  }).optional(),
  
  photos: z.any().transform(val => {
    if (!val) return undefined;
    if (Array.isArray(val)) {
      return val.map(item => {
        if (typeof item === 'string') return item;
        if (item && item.url) return item.url;
        return String(item);
      }).filter(url => url).slice(0, 30);
    }
    return [String(val)];
  }).optional(),
  
  videos: z.any().transform(val => {
    if (!val) return undefined;
    if (Array.isArray(val)) {
      return val.map(item => {
        if (typeof item === 'string') return item;
        if (item && item.url) return item.url;
        return String(item);
      }).filter(url => url).slice(0, 5);
    }
    return [String(val)];
  }).optional(),
  
  unavailableDates: z.any().transform(val => {
    if (!val) return undefined;
    if (Array.isArray(val)) {
      return val.map(item => {
        if (item instanceof Date) return item;
        if (item && item.toDate) return item.toDate();
        try {
          const date = new Date(item);
          return isNaN(date.getTime()) ? new Date() : date;
        } catch {
          return new Date();
        }
      });
    }
    return [];
  }).optional(),
  
  highSeasonMonths: z.any().transform(val => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val.map(item => Math.max(1, Math.min(12, Math.floor(Number(item) || 1))));
    return [];
  }).optional(),
  
  // Booleans opcionais
  isFeatured: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Boolean(val)).optional(),
  allowsPets: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Boolean(val)).optional(),
  isActive: z.any().transform(val => val === null || val === undefined || val === '' ? undefined : Boolean(val)).optional(),
  
  // Objetos opcionais
  customPricing: z.any().transform(val => {
    if (!val) return undefined;
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    return {};
  }).optional(),
  
  paymentMethodSurcharges: z.any().transform(val => {
    if (!val) return undefined;
    const result: Record<PaymentMethod, number> = {} as any;
    Object.values(PaymentMethod).forEach(method => {
      result[method] = 0;
    });
    
    if (val && typeof val === 'object') {
      Object.entries(val).forEach(([key, value]) => {
        if (Object.values(PaymentMethod).includes(key as PaymentMethod)) {
          result[key as PaymentMethod] = Math.max(-50, Math.min(100, Number(value) || 0));
        }
      });
    }
    
    return result;
  }).optional(),
  
  // Campos extras
  city: z.any().transform(val => val ? String(val) : undefined).optional(),
  neighborhood: z.any().transform(val => val ? String(val) : undefined).optional(),
  location: z.any().transform(val => val ? String(val) : undefined).optional(),
  pricingRules: z.any().optional(),
  
  // Timestamps
  createdAt: z.any().transform(val => {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    if (val.toDate) return val.toDate();
    try {
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }).optional(),
  
  updatedAt: z.any().transform(val => {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    if (val.toDate) return val.toDate();
    try {
      const date = new Date(val);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  }).optional(),
  
  // IDs
  id: z.any().transform(val => val ? String(val) : undefined).optional(),
  tenantId: z.any().transform(val => val ? String(val) : undefined).optional(),
  
}).passthrough(); // Permite qualquer campo extra

// Type exports
export type UltraPermissiveCreatePropertyInput = z.infer<typeof UltraPermissiveCreatePropertySchema>
export type UltraPermissiveUpdatePropertyInput = z.infer<typeof UltraPermissiveUpdatePropertySchema>