/**
 * Mini-Site Service
 * Handles all mini-site related operations including configuration, analytics, and public data access
 */

import { FirestoreService } from '@/lib/firebase/firestore';
import { MiniSiteConfig, PublicProperty, MiniSiteInquiry, MiniSiteAnalytics } from '@/lib/types/mini-site';
import { Property } from '@/lib/types';
import { settingsService } from '@/lib/services/settings-service';

class MiniSiteService {
  private configService = new FirestoreService<MiniSiteConfig>('mini_site_configs');
  private propertyService = new FirestoreService<Property>('properties');
  private inquiryService = new FirestoreService<MiniSiteInquiry>('mini_site_inquiries');
  private analyticsService = new FirestoreService<MiniSiteAnalytics>('mini_site_analytics');

  /**
   * Get mini-site configuration for a tenant
   */
  async getConfig(tenantId: string): Promise<MiniSiteConfig | null> {
    try {
      // Get mini-site config from settings service
      const settings = await settingsService.getSettings(tenantId);
      if (!settings || !settings.miniSite || !settings.miniSite.active) {
        return null;
      }

      // Transform settings to MiniSiteConfig format
      const config: MiniSiteConfig = {
        tenantId,
        isActive: settings.miniSite.active,
        theme: {
          primaryColor: settings.miniSite.primaryColor,
          secondaryColor: settings.miniSite.secondaryColor,
          accentColor: settings.miniSite.accentColor,
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          fontFamily: settings.miniSite.fontFamily,
          borderRadius: settings.miniSite.borderRadius,
        },
        contactInfo: {
          whatsappNumber: settings.miniSite.whatsappNumber,
          email: settings.miniSite.companyEmail,
          businessName: settings.company?.name || 'Minha Imobiliária',
          businessDescription: settings.miniSite.description,
          businessLogo: settings.company?.logo || undefined,
        },
        seo: {
          title: settings.miniSite.title,
          description: settings.miniSite.description,
          keywords: settings.miniSite.seoKeywords.split(',').map(k => k.trim()),
        },
        features: {
          showPricing: settings.miniSite.showPrices,
          showAvailability: settings.miniSite.showAvailability,
          enableVirtualTour: false,
          showReviews: settings.miniSite.showReviews,
          enableMultiLanguage: false,
        },
        analytics: {
          enableTracking: true,
        },
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      };

      return config;
    } catch (error) {
      console.error('Error fetching mini-site config:', error);
      throw new Error('Failed to fetch mini-site configuration');
    }
  }

  /**
   * Create or update mini-site configuration
   */
  async updateConfig(config: Partial<MiniSiteConfig> & { tenantId: string }): Promise<MiniSiteConfig> {
    try {
      const existingConfig = await this.getConfig(config.tenantId);
      
      if (existingConfig) {
        const updatedConfig = {
          ...existingConfig,
          ...config,
          updatedAt: new Date()
        };
        await this.configService.update(existingConfig.id!, updatedConfig);
        return updatedConfig;
      } else {
        const newConfig: MiniSiteConfig = {
          tenantId: config.tenantId,
          isActive: true,
          theme: {
            primaryColor: '#2563eb',
            secondaryColor: '#64748b',
            accentColor: '#f59e0b',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            fontFamily: 'modern',
            borderRadius: 'rounded'
          },
          contactInfo: {
            whatsappNumber: '',
            businessName: '',
            businessDescription: ''
          },
          seo: {
            title: 'Propriedades para Aluguel por Temporada',
            description: 'Encontre a propriedade perfeita para suas férias',
            keywords: ['aluguel', 'temporada', 'férias', 'propriedades']
          },
          features: {
            showPricing: true,
            showAvailability: true,
            enableVirtualTour: false,
            showReviews: false,
            enableMultiLanguage: false
          },
          analytics: {
            enableTracking: true
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          ...config
        };
        
        const id = await this.configService.create(newConfig);
        return { ...newConfig, id };
      }
    } catch (error) {
      console.error('Error updating mini-site config:', error);
      throw new Error('Failed to update mini-site configuration');
    }
  }

  /**
   * Get public properties for mini-site display
   */
  async getPublicProperties(tenantId: string): Promise<PublicProperty[]> {
    try {
      const properties = await this.propertyService.query(
        this.propertyService.where('tenantId', '==', tenantId),
        this.propertyService.where('isActive', '==', true),
        this.propertyService.orderBy('createdAt', 'desc')
      );

      return properties.map(this.transformToPublicProperty);
    } catch (error) {
      console.error('Error fetching public properties:', error);
      throw new Error('Failed to fetch properties');
    }
  }

  /**
   * Get a single public property
   */
  async getPublicProperty(tenantId: string, propertyId: string): Promise<PublicProperty | null> {
    try {
      const property = await this.propertyService.getById(propertyId);
      
      if (!property || property.tenantId !== tenantId || !property.isActive) {
        return null;
      }

      return this.transformToPublicProperty(property);
    } catch (error) {
      console.error('Error fetching public property:', error);
      throw new Error('Failed to fetch property');
    }
  }

  /**
   * Create inquiry from mini-site
   */
  async createInquiry(inquiry: Omit<MiniSiteInquiry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const newInquiry: MiniSiteInquiry = {
        ...inquiry,
        status: 'new',
        source: 'mini-site',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return await this.inquiryService.create(newInquiry);
    } catch (error) {
      console.error('Error creating inquiry:', error);
      throw new Error('Failed to create inquiry');
    }
  }

  /**
   * Record page view for analytics
   */
  async recordPageView(tenantId: string, propertyId?: string, utmParams?: Record<string, string>): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingAnalytics = await this.analyticsService.query(
        this.analyticsService.where('tenantId', '==', tenantId),
        this.analyticsService.where('date', '==', today)
      );

      if (existingAnalytics.length > 0) {
        const analytics = existingAnalytics[0];
        analytics.metrics.pageViews += 1;
        
        if (propertyId) {
          analytics.metrics.propertyViews += 1;
          const topProperty = analytics.metrics.topProperties.find(p => p.propertyId === propertyId);
          if (topProperty) {
            topProperty.views += 1;
          } else {
            analytics.metrics.topProperties.push({ propertyId, views: 1 });
          }
        }

        if (utmParams?.utm_source) {
          const trafficSource = analytics.metrics.trafficSources.find(s => s.source === utmParams.utm_source);
          if (trafficSource) {
            trafficSource.visitors += 1;
          } else {
            analytics.metrics.trafficSources.push({ source: utmParams.utm_source, visitors: 1 });
          }
        }

        await this.analyticsService.update(analytics.id!, analytics);
      } else {
        const newAnalytics: MiniSiteAnalytics = {
          tenantId,
          date: today,
          metrics: {
            pageViews: 1,
            uniqueVisitors: 1,
            propertyViews: propertyId ? 1 : 0,
            inquiries: 0,
            bookingConversions: 0,
            averageSessionDuration: 0,
            topProperties: propertyId ? [{ propertyId, views: 1 }] : [],
            trafficSources: utmParams?.utm_source ? [{ source: utmParams.utm_source, visitors: 1 }] : []
          }
        };

        await this.analyticsService.create(newAnalytics);
      }
    } catch (error) {
      console.error('Error recording page view:', error);
      // Don't throw error for analytics - it shouldn't break the user experience
    }
  }

  /**
   * Transform internal property to public property
   */
  private transformToPublicProperty(property: Property): PublicProperty {
    return {
      id: property.id!,
      tenantId: property.tenantId,
      name: property.name,
      description: property.description || '',
      type: property.type,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      maxGuests: property.maxGuests,
      area: property.area,
      location: {
        address: property.location.address,
        city: property.location.city,
        state: property.location.state,
        country: property.location.country || 'Brasil',
        zipCode: property.location.zipCode,
        coordinates: property.location.coordinates
      },
      media: {
        photos: property.photos.map(photo => ({
          url: photo.url,
          alt: photo.alt || property.name,
          order: photo.order,
          isMain: photo.isMain
        })),
        videos: property.videos?.map(video => ({
          url: video.url,
          thumbnail: video.thumbnail,
          title: video.title || property.name
        })),
        virtualTour: property.virtualTour
      },
      amenities: property.amenities,
      pricing: {
        basePrice: property.pricing.basePrice,
        currency: 'BRL',
        pricePerNight: true,
        minimumStay: property.pricing.minimumStay || 1,
        cleaningFee: property.pricing.cleaningFee,
        extraGuestFee: property.pricing.extraGuestFee
      },
      availability: {
        isAvailable: property.availability.isAvailable,
        availableDates: property.availability.availableDates,
        blockedDates: property.availability.blockedDates
      },
      policies: {
        checkIn: property.policies?.checkIn || '15:00',
        checkOut: property.policies?.checkOut || '11:00',
        cancellationPolicy: property.policies?.cancellationPolicy || 'Flexível',
        houseRules: property.policies?.houseRules || []
      },
      isActive: property.isActive,
      featured: property.featured || false,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt
    };
  }

  /**
   * Generate WhatsApp booking URL
   */
  generateWhatsAppBookingUrl(
    whatsappNumber: string,
    propertyName: string,
    checkIn?: string,
    checkOut?: string,
    guests?: number
  ): string {
    let message = `Olá! Tenho interesse na propriedade *${propertyName}*`;
    
    if (checkIn && checkOut) {
      message += ` para o período de ${checkIn} até ${checkOut}`;
    }
    
    if (guests) {
      message += ` para ${guests} hóspede${guests > 1 ? 's' : ''}`;
    }
    
    message += '. Gostaria de mais informações e verificar a disponibilidade. Obrigado!';
    
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
  }
}

export const miniSiteService = new MiniSiteService();