/**
 * Mini-Site Type Definitions
 * Professional mini-site types for tenant property showcases
 */

export interface MiniSiteTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  backgroundImage?: string;
  fontFamily: 'modern' | 'classic' | 'elegant' | string;
  borderRadius: 'sharp' | 'rounded' | 'extra-rounded' | number;
}

export interface MiniSiteConfig {
  id?: string;
  tenantId: string;
  isActive: boolean;
  enabled?: boolean;
  subdomain?: string;
  customDomain?: string;
  
  // Hero Section
  heroTitle?: string;
  heroSubtitle?: string;
  heroMedia?: {
    type: 'image' | 'video';
    url: string;
  };
  
  theme: MiniSiteTheme;
  contactInfo: {
    whatsappNumber: string;
    email?: string;
    businessName: string;
    businessDescription: string;
    businessLogo?: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
  };
  features: {
    showPricing: boolean;
    showAvailability: boolean;
    enableVirtualTour: boolean;
    showReviews: boolean;
    enableMultiLanguage: boolean;
  };
  analytics: {
    googleAnalyticsId?: string;
    enableTracking: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PublicProperty {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  area?: number;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  media: {
    photos: Array<{
      url: string;
      alt: string;
      order: number;
      isMain?: boolean;
    }>;
    videos?: Array<{
      url: string;
      thumbnail: string;
      title: string;
    }>;
    virtualTour?: string;
  };
  amenities: string[];
  pricing: {
    basePrice: number;
    currency: string;
    pricePerNight: boolean;
    minimumStay: number;
    cleaningFee?: number;
    extraGuestFee?: number;
  };
  availability: {
    isAvailable: boolean;
    availableDates?: Array<{
      start: Date;
      end: Date;
    }>;
    blockedDates?: Date[];
  };
  policies: {
    checkIn: string;
    checkOut: string;
    cancellationPolicy: string;
    houseRules: string[];
  };
  isActive: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MiniSiteInquiry {
  id: string;
  tenantId: string;
  propertyId: string;
  clientInfo: {
    name: string;
    email?: string;
    phone: string;
    preferredContact: 'whatsapp' | 'email' | 'phone';
  };
  inquiryDetails: {
    checkIn: Date;
    checkOut: Date;
    guests: number;
    message?: string;
    priceEstimate?: number;
  };
  source: 'mini-site';
  status: 'new' | 'contacted' | 'quoted' | 'booked' | 'cancelled';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MiniSiteAnalyticsEvent {
  id: string;
  tenantId: string;
  event: 'page_view' | 'property_view' | 'inquiry' | 'contact_click' | 'booking_conversion' | 'booking' | 'reservation';
  sessionId?: string;
  propertyId?: string;
  timestamp: Date;
  userAgent?: string;
  referrer?: string;
  location?: string;
  sessionDuration?: number;
  pageLoadTime?: number;
  createdAt: Date;
}

export interface MiniSiteAnalytics {
  id: string;
  tenantId: string;
  date: Date;
  metrics: {
    pageViews: number;
    uniqueVisitors: number;
    propertyViews: number;
    inquiries: number;
    bookingConversions: number;
    averageSessionDuration: number;
    topProperties: Array<{
      propertyId: string;
      views: number;
    }>;
    trafficSources: Array<{
      source: string;
      visitors: number;
    }>;
  };
}

export interface WhatsAppBookingMessage {
  tenantId: string;
  propertyId: string;
  propertyName: string;
  clientName?: string;
  checkIn?: Date;
  checkOut?: Date;
  guests?: number;
  priceEstimate?: number;
  source: 'mini-site';
  timestamp: Date;
}