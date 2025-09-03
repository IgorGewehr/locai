export interface Property {
  id: string;
  name: string;
  description: string;
  location: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  minimumNights: number;
  amenities: string[];
  photos: Array<{
    url: string;
    order: number;
    isMain: boolean;
  }>;
  videos: Array<{
    url: string;
    title: string;
    order: number;
  }>;
  pricing: {
    basePrice: number;
    weekendMultiplier: number;
    holidayMultiplier: number;
    cleaningFee: number;
    securityDeposit: number;
    seasonalPrices: Array<{
      startDate: Date;
      endDate: Date;
      pricePerNight: number;
      description: string;
    }>;
  };
  // Analytics fields
  status: 'active' | 'inactive' | 'maintenance' | 'occupied';
  type: 'residential' | 'commercial' | 'vacation' | 'mixed';
  neighborhood: string;
  city: string;
  capacity: number;
  basePrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  propertyId: string;
  clientId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  stripePaymentIntentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Analytics fields
  totalAmount: number;
  nights: number;
  source: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  document?: string;
  documentType?: 'cpf' | 'cnpj';
  whatsappNumber?: string;
  tenantId?: string;
  source?: 'whatsapp' | 'website' | 'manual' | 'referral' | 'other';
  preferences?: {
    location?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    amenities?: string[];
    bedrooms?: number;
    maxGuests?: number;
    communicationPreference?: 'whatsapp' | 'email' | 'phone' | 'sms';
    preferredPaymentMethod?: any;
    petOwner?: boolean;
    smoker?: boolean;
    marketingOptIn?: boolean;
  };
  reservations?: string[];
  totalSpent: number;
  totalReservations: number;
  isActive: boolean;
  isVip?: boolean;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  clientId: string;
  whatsappNumber: string;
  tenantId?: string;
  messages: Message[];
  isActive: boolean;
  lastMessageAt: Date;
  context: {
    currentSearchFilters?: PropertySearchFilters;
    interestedProperties?: string[];
    pendingReservation?: Partial<Reservation>;
  };
  createdAt: Date;
  updatedAt: Date;
  // Analytics fields
  whatsappPhone: string;
  source: string;
}

export interface Message {
  id: string;
  conversationId: string;
  from: 'client' | 'agent';
  content: string;
  messageType: 'text' | 'image' | 'video' | 'document';
  mediaUrl?: string;
  timestamp: Date;
  isRead: boolean;
  whatsappMessageId?: string;
  tenantId?: string;
  metadata?: {
    functionCalls?: string[];
    processingTime?: number;
  };
}

export interface PropertySearchFilters {
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  amenities?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  checkIn?: Date;
  checkOut?: Date;
}

export interface PriceCalculation {
  basePrice: number;
  nights: number;
  subtotal: number;
  weekendSurcharge: number;
  holidaySurcharge: number;
  seasonalAdjustment: number;
  cleaningFee: number;
  securityDeposit: number;
  totalPrice: number;
  breakdown: Array<{
    date: Date;
    pricePerNight: number;
    isWeekend: boolean;
    isHoliday: boolean;
    seasonalRate?: number;
  }>;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: 'basic' | 'entertainment' | 'kitchen' | 'outdoor' | 'safety' | 'accessibility';
  description?: string;
  isActive: boolean;
}

export interface Payment {
  id: string;
  reservationId: string;
  clientId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  paymentMethod: 'stripe' | 'pix' | 'cash';
  stripePaymentIntentId?: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
  method: 'stripe' | 'pix' | 'cash';
}

export interface AgentFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  text?: {
    body: string;
  };
  image?: {
    id: string;
    caption?: string;
  };
  video?: {
    id: string;
    caption?: string;
  };
  document?: {
    id: string;
    filename?: string;
    caption?: string;
  };
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'document';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AgentContext {
  clientId: string;
  conversationId: string;
  currentSearchFilters?: PropertySearchFilters;
  interestedProperties?: string[];
  pendingReservation?: {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    totalPrice?: number;
  };
  clientPreferences?: {
    budget?: number;
    location?: string;
    amenities?: string[];
    propertyType?: string;
  };
}

export interface AIResponse {
  message: string;
  functionCall?: {
    name: string;
    arguments: any;
  };
  functionCalls?: Array<{
    name: string;
    arguments: any;
  }>;
  confidence?: number;
  sentiment?: string;
}

export interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  totalReservations: number;
  pendingReservations: number;
  totalRevenue: number;
  monthlyRevenue: number;
  occupancyRate: number;
  averageRating: number;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  newReservations: boolean;
  paymentUpdates: boolean;
  propertyInquiries: boolean;
  systemAlerts: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'pt' | 'en' | 'es';
  notifications: NotificationSettings;
  dashboardLayout: 'grid' | 'list';
  dateFormat: 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
  currency: 'BRL' | 'USD' | 'EUR';
}

export interface Transaction {
  // Campos básicos
  id: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'pending' | 'completed' | 'cancelled';
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Categorização
  category: 'reservation' | 'maintenance' | 'cleaning' | 'commission' | 'refund' | 'other';
  subcategory?: string;
  
  // Método de pagamento
  paymentMethod: 'stripe' | 'pix' | 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card';
  
  // Campos de relacionamento
  reservationId?: string;
  clientId?: string;
  propertyId?: string;
  
  // Campos para recorrência
  isRecurring: boolean;
  recurringType?: 'monthly' | 'weekly' | 'yearly';
  recurringEndDate?: Date;
  parentTransactionId?: string;
  
  // Campos de controle
  confirmedBy?: string; // ID do admin que confirmou
  confirmedAt?: Date;
  notes?: string;
  
  // Metadados para integração com IA
  createdByAI: boolean;
  aiConversationId?: string;
  
  // Dados adicionais para relatórios
  tenantId?: string;
  attachments?: Array<{
    url: string;
    filename: string;
    uploadedAt: Date;
  }>;
  tags?: string[];
}

// Export notification types
export * from './notification'