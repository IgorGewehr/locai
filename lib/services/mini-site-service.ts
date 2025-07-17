/**
 * Mini-Site Service
 * Handles all mini-site related operations including configuration, analytics, and public data access
 */

import { FirestoreService } from '@/lib/firebase/firestore';
import { MiniSiteConfig, PublicProperty, MiniSiteInquiry, MiniSiteAnalytics } from '@/lib/types/mini-site';
import { Property } from '@/lib/types';
import { settingsService } from '@/lib/services/settings-service';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

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
      if (!settings || !settings.miniSite) {
        // Return default config if no mini-site settings exist
        return {
          tenantId,
          isActive: false,
          theme: {
            primaryColor: '#1976d2',
            secondaryColor: '#dc004e',
            accentColor: '#00bcd4',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            fontFamily: 'Inter',
            borderRadius: 8,
          },
          contactInfo: {
            whatsappNumber: '',
            email: '',
            businessName: 'Minha Imobiliária',
            businessDescription: 'Encontre o imóvel perfeito para você',
            businessLogo: undefined,
          },
          seo: {
            title: 'Minha Imobiliária',
            description: 'Encontre o imóvel perfeito para você',
            keywords: ['imóveis', 'aluguel', 'venda'],
            ogImage: undefined,
          },
        };
      }
      
      // Permitir mini-site mesmo se não estiver explicitamente ativo
      // para permitir configuração inicial e testes

      // Transform settings to MiniSiteConfig format
      const config: MiniSiteConfig = {
        tenantId,
        isActive: true, // Sempre ativo para permitir acesso inicial
        theme: {
          primaryColor: settings.miniSite?.primaryColor || '#1976d2',
          secondaryColor: settings.miniSite?.secondaryColor || '#dc004e',
          accentColor: settings.miniSite?.accentColor || '#ed6c02',
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          fontFamily: settings.miniSite?.fontFamily || 'Inter',
          borderRadius: 8,
        },
        contactInfo: {
          whatsappNumber: settings.miniSite?.whatsappNumber || '',
          email: settings.miniSite?.companyEmail || '',
          businessName: settings.company?.name || 'Minha Imobiliária',
          businessDescription: settings.miniSite?.description || 'Encontre o imóvel perfeito para você',
          businessLogo: settings.company?.logo || undefined,
        },
        seo: {
          title: settings.miniSite?.title || 'Minha Imobiliária',
          description: settings.miniSite?.description || 'Encontre o imóvel perfeito para você',
          keywords: (settings.miniSite?.seoKeywords || 'imóveis, aluguel, venda').split(',').map(k => k.trim()),
        },
        features: {
          showPricing: settings.miniSite?.showPrices ?? true,
          showAvailability: settings.miniSite?.showAvailability ?? true,
          enableVirtualTour: false,
          showReviews: settings.miniSite?.showReviews ?? true,
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
      // Use Firestore SDK directly for querying with multiple where clauses
      const propertiesQuery = query(
        collection(db, 'properties'),
        where('tenantId', '==', tenantId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(propertiesQuery);
      const properties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];

      return properties.map(this.transformToPublicProperty);
    } catch (error) {
      console.error('Error fetching public properties:', error);
      // Fallback to get all properties for the tenant
      try {
        const allProperties = await this.propertyService.getAll();
        const tenantProperties = allProperties.filter(p => p.tenantId === tenantId);
        return tenantProperties.map(this.transformToPublicProperty);
      } catch (fallbackError) {
        return []; // Return empty array instead of throwing error
      }
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

      // Use Firestore SDK directly for querying
      const analyticsQuery = query(
        collection(db, 'mini_site_analytics'),
        where('tenantId', '==', tenantId),
        where('date', '==', today)
      );
      const snapshot = await getDocs(analyticsQuery);
      const existingAnalytics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

        // Update existing analytics
        const analyticsRef = doc(db, 'mini_site_analytics', analytics.id);
        await updateDoc(analyticsRef, {
          'metrics.pageViews': analytics.metrics.pageViews,
          'metrics.propertyViews': analytics.metrics.propertyViews,
          'metrics.topProperties': analytics.metrics.topProperties,
          'metrics.trafficSources': analytics.metrics.trafficSources
        });
      } else {
        // Create new analytics entry
        const newAnalytics = {
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

        await addDoc(collection(db, 'mini_site_analytics'), newAnalytics);
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
      name: property.title,
      description: property.description || '',
      type: property.type,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      maxGuests: property.maxGuests,
      area: property.area || 0,
      location: {
        address: property.address,
        city: property.city,
        state: property.neighborhood,
        country: 'Brasil',
        zipCode: '',
        coordinates: undefined
      },
      media: {
        photos: (property.photos || []).map(photo => ({
          url: photo.url,
          alt: photo.caption || property.title,
          order: photo.order,
          isMain: photo.isMain
        })),
        videos: (property.videos || []).map(video => ({
          url: video.url,
          thumbnail: video.thumbnail,
          title: video.title || property.title
        })),
        virtualTour: undefined
      },
      amenities: property.amenities || [],
      pricing: {
        basePrice: property.basePrice,
        currency: 'BRL',
        pricePerNight: true,
        minimumStay: property.minimumNights || 1,
        cleaningFee: property.cleaningFee,
        extraGuestFee: property.pricePerExtraGuest
      },
      availability: {
        isAvailable: property.status === 'active',
        availableDates: [],
        blockedDates: property.unavailableDates || []
      },
      policies: {
        checkIn: '15:00',
        checkOut: '11:00',
        cancellationPolicy: 'Flexível',
        houseRules: []
      },
      isActive: property.isActive,
      featured: property.isFeatured || false,
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