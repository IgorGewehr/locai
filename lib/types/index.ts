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
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  preferences: {
    location?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    amenities?: string[];
    bedrooms?: number;
    maxGuests?: number;
  };
  reservations: string[];
  totalSpent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  clientId: string;
  whatsappNumber: string;
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