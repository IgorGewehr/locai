/**
 * Default configuration for MiniSite
 * Provides safe defaults to prevent undefined errors
 */

import { MiniSiteConfig } from '@/lib/types/mini-site';

export function getDefaultMiniSiteConfig(tenantId: string): MiniSiteConfig {
  return {
    tenantId,
    isActive: false,
    enabled: false,
    theme: {
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      accentColor: '#00bcd4',
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      fontFamily: 'modern',
      borderRadius: 'rounded',
    },
    contactInfo: {
      whatsappNumber: '',
      businessName: 'Carregando...',
      businessDescription: 'Encontre o imóvel perfeito para você',
    },
    seo: {
      title: 'Carregando...',
      description: 'Encontre o imóvel perfeito para você',
      keywords: [],
    },
    features: {
      showPricing: true,
      showAvailability: true,
      enableVirtualTour: false,
      showReviews: false,
      enableMultiLanguage: false,
    },
    analytics: {
      enableTracking: true,
    },
  };
}