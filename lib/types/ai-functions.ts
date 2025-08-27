// Type definitions for AI function parameters and responses

export interface SearchPropertiesArgs {
  location?: string;
  checkIn: string; // YYYY-MM-DD format
  checkOut: string; // YYYY-MM-DD format
  guests: number;
  budget?: number;
  amenities?: string[];
  propertyType?: string;
}

export interface SearchPropertiesResponse {
  success: boolean;
  data?: {
    properties: Property[];
    total: number;
    filtered: number;
  };
  error?: string;
}

export interface SendPropertyMediaArgs {
  propertyId: string;
  mediaType: 'photos' | 'videos' | 'both';
}

export interface SendPropertyMediaResponse {
  success: boolean;
  data?: {
    mediaUrls: string[];
    mediaCount: number;
  };
  error?: string;
}

export interface CalculateTotalPriceArgs {
  propertyId: string;
  checkIn: string; // YYYY-MM-DD format
  checkOut: string; // YYYY-MM-DD format
  guests: number;
  couponCode?: string;
}

export interface CalculateTotalPriceResponse {
  success: boolean;
  data?: {
    basePrice: number;
    nights: number;
    subtotal: number;
    taxes: number;
    fees: number;
    discounts: number;
    total: number;
    breakdown: PriceBreakdown[];
  };
  error?: string;
}

export interface CheckAvailabilityArgs {
  propertyId: string;
  checkIn: string; // YYYY-MM-DD format
  checkOut: string; // YYYY-MM-DD format
}

export interface CheckAvailabilityResponse {
  success: boolean;
  data?: {
    available: boolean;
    conflictingDates?: string[];
    alternativeDates?: string[];
  };
  error?: string;
}

export interface CreateReservationArgs {
  propertyId: string;
  checkIn: string; // YYYY-MM-DD format
  checkOut: string; // YYYY-MM-DD format
  guests: number;
  clientId: string;
  specialRequests?: string;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'pix';
}

export interface CreateReservationResponse {
  success: boolean;
  data?: {
    reservationId: string;
    confirmationCode: string;
    totalPrice: number;
    paymentStatus: string;
  };
  error?: string;
}

export interface ApplyDiscountArgs {
  propertyId: string;
  discountCode: string;
  totalPrice: number;
}

export interface ApplyDiscountResponse {
  success: boolean;
  data?: {
    discountAmount: number;
    discountPercentage: number;
    newTotal: number;
    discountType: string;
  };
  error?: string;
}

export interface ScheduleFollowUpArgs {
  clientId: string;
  followUpDate: string; // YYYY-MM-DD format
  followUpTime: string; // HH:MM format
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ScheduleFollowUpResponse {
  success: boolean;
  data?: {
    followUpId: string;
    scheduledAt: string;
  };
  error?: string;
}

export interface GetPropertyDetailsArgs {
  propertyName: string;
  propertyIndex?: number;
  propertyReference?: string;
}

export interface GetPropertyDetailsResponse {
  success: boolean;
  data?: Property;
  error?: string;
}

export interface SuggestAlternativesArgs {
  originalPropertyId: string;
  checkIn: string; // YYYY-MM-DD format
  checkOut: string; // YYYY-MM-DD format
  guests: number;
  budget?: number;
  maxAlternatives?: number;
}

export interface SuggestAlternativesResponse {
  success: boolean;
  data?: {
    alternatives: Property[];
    reasons: string[];
  };
  error?: string;
}

export interface CreatePendingTransactionArgs {
  reservationId: string;
  clientId: string;
  propertyId: string;
  amount: number;
  paymentMethod: 'stripe' | 'pix' | 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card';
  description: string;
  installments?: number; // Número de parcelas (opcional para parcelamento)
  conversationId?: string; // ID da conversa do WhatsApp
}

export interface CreatePendingTransactionResponse {
  success: boolean;
  data?: {
    transactionIds: string[]; // Array de IDs das transações criadas
    totalAmount: number;
    installmentAmount?: number; // Valor de cada parcela
    installments?: number; // Número de parcelas
    paymentMethod: string;
    description: string;
  };
  error?: string;
}

export interface ScheduleMeetingArgs {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  scheduledDate: string;      // YYYY-MM-DD format
  scheduledTime: string;      // HH:MM format
  duration?: number;          // minutos, padrão 60
  title: string;
  description: string;
  type?: string;              // padrão 'consultation'
  isOnline?: boolean;         // padrão false
  meetingLink?: string;       // se isOnline = true
  location?: string;          // se isOnline = false
}

export interface ScheduleMeetingResponse {
  success: boolean;
  data?: {
    meetingId: string;
    scheduledDate: string;
    scheduledTime: string;
    title: string;
    clientName: string;
    confirmationMessage: string;
  };
  error?: string;
}

// Union type for all function arguments
export type AIFunctionArgs = 
  | SearchPropertiesArgs
  | SendPropertyMediaArgs
  | CalculateTotalPriceArgs
  | CheckAvailabilityArgs
  | CreateReservationArgs
  | ApplyDiscountArgs
  | ScheduleFollowUpArgs
  | GetPropertyDetailsArgs
  | SuggestAlternativesArgs
  | CreatePendingTransactionArgs
  | ScheduleMeetingArgs;

// Union type for all function responses
export type AIFunctionResponse = 
  | SearchPropertiesResponse
  | SendPropertyMediaResponse
  | CalculateTotalPriceResponse
  | CheckAvailabilityResponse
  | CreateReservationResponse
  | ApplyDiscountResponse
  | ScheduleFollowUpResponse
  | GetPropertyDetailsResponse
  | SuggestAlternativesResponse
  | CreatePendingTransactionResponse
  | ScheduleMeetingResponse;

// Helper type for function execution
export interface AIFunctionCall {
  name: string;
  arguments: AIFunctionArgs;
}

export interface AIFunctionResult {
  functionName: string;
  result: AIFunctionResponse;
  executionTime: number;
}

// Price breakdown interface
export interface PriceBreakdown {
  type: 'base' | 'tax' | 'fee' | 'discount';
  name: string;
  amount: number;
  description?: string;
}

// Property interface reference (should be imported from main types)
export interface Property {
  id: string;
  name: string;
  description: string;
  location: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  images: string[];
  videos?: string[];
  amenities: string[];
  pricing: {
    basePrice: number;
    currency: string;
    taxRate: number;
    cleaningFee: number;
    serviceRate: number;
  };
  availability: {
    isActive: boolean;
    blockedDates: string[];
    minimumStay: number;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  rating?: {
    average: number;
    reviews: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Validation schemas (can be used with zod or similar)
export const AIFunctionSchemas = {
  searchProperties: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'Localização desejada' },
      checkIn: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Data check-in (YYYY-MM-DD)' },
      checkOut: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Data check-out (YYYY-MM-DD)' },
      guests: { type: 'number', minimum: 1, maximum: 20, description: 'Número de hóspedes' },
      budget: { type: 'number', minimum: 0, description: 'Orçamento máximo por noite' },
      amenities: { type: 'array', items: { type: 'string' }, description: 'Comodidades desejadas' },
      propertyType: { type: 'string', description: 'Tipo de propriedade' }
    },
    required: ['checkIn', 'checkOut', 'guests']
  },
  
  sendPropertyMedia: {
    type: 'object',
    properties: {
      propertyId: { type: 'string', description: 'ID da propriedade' },
      mediaType: { type: 'string', enum: ['photos', 'videos', 'both'], description: 'Tipo de mídia' }
    },
    required: ['propertyId', 'mediaType']
  },
  
  calculateTotalPrice: {
    type: 'object',
    properties: {
      propertyId: { type: 'string', description: 'ID da propriedade' },
      checkIn: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Data check-in (YYYY-MM-DD)' },
      checkOut: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Data check-out (YYYY-MM-DD)' },
      guests: { type: 'number', minimum: 1, maximum: 20, description: 'Número de hóspedes' },
      couponCode: { type: 'string', description: 'Código de cupom (opcional)' }
    },
    required: ['propertyId', 'checkIn', 'checkOut', 'guests']
  },
  
  checkAvailability: {
    type: 'object',
    properties: {
      propertyId: { type: 'string', description: 'ID da propriedade' },
      checkIn: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Data check-in (YYYY-MM-DD)' },
      checkOut: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Data check-out (YYYY-MM-DD)' }
    },
    required: ['propertyId', 'checkIn', 'checkOut']
  },
  
  createReservation: {
    type: 'object',
    properties: {
      propertyId: { type: 'string', description: 'ID da propriedade' },
      checkIn: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Data check-in (YYYY-MM-DD)' },
      checkOut: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Data check-out (YYYY-MM-DD)' },
      guests: { type: 'number', minimum: 1, maximum: 20, description: 'Número de hóspedes' },
      clientId: { type: 'string', description: 'ID do cliente' },
      specialRequests: { type: 'string', description: 'Solicitações especiais (opcional)' },
      paymentMethod: { type: 'string', enum: ['credit_card', 'bank_transfer', 'pix'], description: 'Método de pagamento' }
    },
    required: ['propertyId', 'checkIn', 'checkOut', 'guests', 'clientId', 'paymentMethod']
  },
  
  createPendingTransaction: {
    type: 'object',
    properties: {
      reservationId: { type: 'string', description: 'ID da reserva' },
      clientId: { type: 'string', description: 'ID do cliente' },
      propertyId: { type: 'string', description: 'ID da propriedade' },
      amount: { type: 'number', minimum: 0, description: 'Valor total da transação' },
      paymentMethod: { 
        type: 'string', 
        enum: ['stripe', 'pix', 'cash', 'bank_transfer', 'credit_card', 'debit_card'],
        description: 'Método de pagamento escolhido' 
      },
      description: { type: 'string', description: 'Descrição da transação' },
      installments: { type: 'number', minimum: 1, maximum: 24, description: 'Número de parcelas (opcional para parcelamento)' },
      conversationId: { type: 'string', description: 'ID da conversa do WhatsApp' }
    },
    required: ['reservationId', 'clientId', 'propertyId', 'amount', 'paymentMethod', 'description']
  }
} as const;