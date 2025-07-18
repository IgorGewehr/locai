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
        isActive: settings.miniSite?.active || false, // Check actual status
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
      console.log('Fetching properties for tenant:', tenantId);
      
      // Use Firestore SDK directly for querying with multiple where clauses
      const propertiesQuery = query(
        collection(db, 'properties'),
        where('tenantId', '==', tenantId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(propertiesQuery);
      const properties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];

      console.log('Found properties:', properties.length);
      return properties.map(this.transformToPublicProperty);
    } catch (error) {
      console.error('Error fetching public properties:', error);
      // Fallback to get all properties for the tenant
      try {
        console.log('Trying fallback method...');
        const allProperties = await this.propertyService.getAll();
        const tenantProperties = allProperties.filter(p => 
          p.tenantId === tenantId && p.isActive !== false
        );
        console.log('Fallback found properties:', tenantProperties.length);
        
        if (tenantProperties.length === 0) {
          // Create demo properties for first-time users
          console.log('No properties found, creating demo properties...');
          return this.createDemoProperties(tenantId);
        }
        
        return tenantProperties.map(this.transformToPublicProperty);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        // Return demo properties as last resort
        return this.createDemoProperties(tenantId);
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
   * Create demo properties for first-time users
   */
  private createDemoProperties(tenantId: string): PublicProperty[] {
    const demoProperties: PublicProperty[] = [
      {
        id: 'demo-1',
        tenantId,
        name: 'Casa de Praia Aconchegante',
        description: 'Linda casa de praia com vista para o mar, perfeita para relaxar e aproveitar as férias em família. Localizada a poucos metros da praia.',
        type: 'Casa',
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 6,
        area: 120,
        location: {
          address: 'Rua das Ondas, 123',
          city: 'Ubatuba',
          state: 'SP',
          country: 'Brasil',
          zipCode: '11680-000',
          coordinates: undefined
        },
        media: {
          photos: [
            {
              url: 'https://images.unsplash.com/photo-1520637836862-4d197d17c795?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              alt: 'Casa de Praia Aconchegante',
              order: 1,
              isMain: true
            },
            {
              url: 'https://images.unsplash.com/photo-1505015920881-0f83c2f7c95e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              alt: 'Sala de estar',
              order: 2,
              isMain: false
            }
          ],
          videos: [],
          virtualTour: undefined
        },
        amenities: ['Wi-Fi', 'Piscina', 'Ar Condicionado', 'Cozinha', 'Estacionamento', 'Varanda'],
        pricing: {
          basePrice: 350,
          currency: 'BRL',
          pricePerNight: true,
          minimumStay: 2,
          cleaningFee: 50,
          extraGuestFee: 30
        },
        availability: {
          isAvailable: true,
          availableDates: [],
          blockedDates: []
        },
        policies: {
          checkIn: '15:00',
          checkOut: '11:00',
          cancellationPolicy: 'Flexível',
          houseRules: ['Não fumar', 'Não são permitidos animais', 'Festas não são permitidas']
        },
        isActive: true,
        featured: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'demo-2',
        tenantId,
        name: 'Apartamento Moderno no Centro',
        description: 'Apartamento moderno e bem localizado no centro da cidade, com fácil acesso a restaurantes, comércio e pontos turísticos.',
        type: 'Apartamento',
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        area: 80,
        location: {
          address: 'Avenida Central, 456',
          city: 'São Paulo',
          state: 'SP',
          country: 'Brasil',
          zipCode: '01000-000',
          coordinates: undefined
        },
        media: {
          photos: [
            {
              url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              alt: 'Apartamento Moderno no Centro',
              order: 1,
              isMain: true
            },
            {
              url: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              alt: 'Sala moderna',
              order: 2,
              isMain: false
            }
          ],
          videos: [],
          virtualTour: undefined
        },
        amenities: ['Wi-Fi', 'Ar Condicionado', 'Cozinha', 'Elevador', 'Segurança', 'TV'],
        pricing: {
          basePrice: 180,
          currency: 'BRL',
          pricePerNight: true,
          minimumStay: 1,
          cleaningFee: 30,
          extraGuestFee: 20
        },
        availability: {
          isAvailable: true,
          availableDates: [],
          blockedDates: []
        },
        policies: {
          checkIn: '14:00',
          checkOut: '12:00',
          cancellationPolicy: 'Moderada',
          houseRules: ['Não fumar', 'Respeitar os vizinhos', 'Máximo 4 pessoas']
        },
        isActive: true,
        featured: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'demo-3',
        tenantId,
        name: 'Chalé na Montanha',
        description: 'Chalé aconchegante na montanha, perfeito para quem busca tranquilidade e contato com a natureza. Ideal para casais e famílias.',
        type: 'Chalé',
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        area: 90,
        location: {
          address: 'Estrada da Montanha, 789',
          city: 'Campos do Jordão',
          state: 'SP',
          country: 'Brasil',
          zipCode: '12460-000',
          coordinates: undefined
        },
        media: {
          photos: [
            {
              url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              alt: 'Chalé na Montanha',
              order: 1,
              isMain: true
            },
            {
              url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              alt: 'Interior do chalé',
              order: 2,
              isMain: false
            }
          ],
          videos: [],
          virtualTour: undefined
        },
        amenities: ['Wi-Fi', 'Lareira', 'Cozinha', 'Estacionamento', 'Varanda', 'Jardim'],
        pricing: {
          basePrice: 220,
          currency: 'BRL',
          pricePerNight: true,
          minimumStay: 2,
          cleaningFee: 40,
          extraGuestFee: 25
        },
        availability: {
          isAvailable: true,
          availableDates: [],
          blockedDates: []
        },
        policies: {
          checkIn: '16:00',
          checkOut: '10:00',
          cancellationPolicy: 'Flexível',
          houseRules: ['Não fumar', 'Animais permitidos', 'Cuidar da natureza']
        },
        isActive: true,
        featured: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    return demoProperties;
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