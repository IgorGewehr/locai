import { MultiTenantFirestoreService } from '@/lib/firebase/firestore-v2';
import { adminDb } from '@/lib/firebase/admin';

export interface CompanySettings {
  name: string;
  logo: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
  updatedAt?: Date;
}

export interface AISettings {
  personalityPrompt: string;
  responseStyle: 'formal' | 'friendly' | 'casual';
  customInstructions: string;
  greetingMessage: string;
  unavailableMessage: string;
  autoReply: boolean;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  updatedAt?: Date;
}

export interface BillingSettings {
  automaticBilling: boolean;
  reminderDays: number;
  paymentMethods: string[];
  lateFeePercentage: number;
  customMessage: string;
  updatedAt?: Date;
}

export interface WhatsAppSettings {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  connected: boolean;
  businessName?: string;
  webhookUrl?: string;
  mode?: 'business_api' | 'web';
  lastSync?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface MiniSiteSettings {
  active: boolean;
  title: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: 'modern' | 'classic' | 'elegant';
  borderRadius: 'sharp' | 'rounded' | 'extra-rounded';
  showPrices: boolean;
  showAvailability: boolean;
  showReviews: boolean;
  whatsappNumber: string;
  companyEmail: string;
  seoKeywords: string;
  customDomain?: string;
  updatedAt?: Date;
}

export interface TenantSettings {
  id: string;
  company: CompanySettings;
  ai: AISettings;
  billing: BillingSettings;
  whatsapp: WhatsAppSettings;
  miniSite: MiniSiteSettings;
  createdAt: Date;
  updatedAt: Date;
}

class SettingsService {
  private service: MultiTenantFirestoreService<TenantSettings>;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.service = new MultiTenantFirestoreService<TenantSettings>(tenantId, 'settings');
  }

  // Get all settings for a tenant
  async getSettings(tenantId: string): Promise<TenantSettings | null> {
    try {
      const doc = await this.service.getById(tenantId);
      if (!doc) {
        // Return default settings if none exist
        return this.getDefaultSettings(tenantId);
      }
      return doc;
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.getDefaultSettings(tenantId);
    }
  }

  // Update company settings
  async updateCompanySettings(tenantId: string, settings: Partial<CompanySettings>): Promise<void> {
    await this.service.update(tenantId, {
      company: {
        ...settings,
        updatedAt: new Date(),
      },
      updatedAt: new Date(),
    });
  }

  // Update AI settings
  async updateAISettings(tenantId: string, settings: Partial<AISettings>): Promise<void> {
    await this.service.update(tenantId, {
      ai: {
        ...settings,
        updatedAt: new Date(),
      },
      updatedAt: new Date(),
    });
  }

  // Update billing settings
  async updateBillingSettings(tenantId: string, settings: Partial<BillingSettings>): Promise<void> {
    await this.service.update(tenantId, {
      billing: {
        ...settings,
        updatedAt: new Date(),
      },
      updatedAt: new Date(),
    });
  }

  // Update WhatsApp settings
  async updateWhatsAppSettings(tenantId: string, settings: Partial<WhatsAppSettings>): Promise<void> {
    await this.service.update(tenantId, {
      whatsapp: {
        ...settings,
        updatedAt: new Date(),
      },
      updatedAt: new Date(),
    });
  }

  // Update mini-site settings
  async updateMiniSiteSettings(tenantId: string, settings: Partial<MiniSiteSettings>): Promise<void> {
    try {
      console.log(`🔧 Updating mini-site settings for tenant: ${tenantId}`);
      console.log('🔧 Settings to update:', settings);
      
      // Filter out undefined values from settings
      const filteredSettings = Object.fromEntries(
        Object.entries(settings).filter(([_, value]) => {
          return value !== undefined && 
                 value !== null && 
                 !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
        })
      );
      
      console.log('🔧 Filtered settings:', filteredSettings);
      
      // Try to get existing settings first
      const existingSettings = await this.getSettings(tenantId);
      
      if (existingSettings) {
        console.log('🔧 Updating existing settings document');
        // Update existing document
        const updateData = {
          miniSite: {
            ...existingSettings.miniSite,
            ...filteredSettings,
            updatedAt: new Date(),
          },
          updatedAt: new Date(),
        };
        
        // Filter the entire update data object
        const filteredUpdateData = Object.fromEntries(
          Object.entries(updateData).filter(([_, value]) => {
            return value !== undefined && 
                   value !== null && 
                   !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
          })
        );
        
        await this.service.update(tenantId, filteredUpdateData);
      } else {
        console.log('🔧 Creating new settings document');
        // Create new document with default settings
        const defaultSettings = this.getDefaultSettings(tenantId);
        const newSettings = {
          ...defaultSettings,
          id: tenantId,
          miniSite: {
            ...defaultSettings.miniSite,
            ...filteredSettings,
            updatedAt: new Date(),
          },
          updatedAt: new Date(),
        };
        
        await this.service.set(tenantId, newSettings);
      }
      
      console.log('✅ Mini-site settings updated successfully');
    } catch (error) {
      console.error('❌ Error updating mini-site settings:', error);
      throw error;
    }
  }

  // Create or update all settings
  async saveSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<void> {
    try {
      const existing = await this.service.getById(tenantId);
      
      if (existing) {
        await this.service.update(tenantId, {
          ...settings,
          updatedAt: new Date(),
        });
      } else {
        // Use set instead of create to ensure document ID matches tenantId
        const newSettings = {
          ...this.getDefaultSettings(tenantId),
          ...settings,
          id: tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Use Firestore set method directly for better control
        await this.service.set(tenantId, newSettings);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // Get WhatsApp credentials securely (server-side only)
  async getWhatsAppCredentials(tenantId: string): Promise<WhatsAppSettings | null> {
    try {
      // Use admin SDK for secure access
      const doc = await adminDb.collection('settings').doc(tenantId).get();
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      return data?.whatsapp || null;
    } catch (error) {
      console.error('Error getting WhatsApp credentials:', error);
      return null;
    }
  }

  // Subscribe to settings changes
  subscribeToSettings(tenantId: string, callback: (settings: TenantSettings | null) => void): () => void {
    return this.service.subscribeToDocument(tenantId, callback);
  }

  // Get default settings
  private getDefaultSettings(tenantId: string): TenantSettings {
    return {
      id: tenantId,
      company: {
        name: '',
        logo: null,
        address: '',
        phone: '',
        email: '',
        website: '',
      },
      ai: {
        personalityPrompt: 'Você é um assistente imobiliário profissional e atencioso.',
        responseStyle: 'friendly',
        customInstructions: '',
        greetingMessage: 'Olá! Sou o assistente virtual da {company}. Como posso ajudá-lo hoje?',
        unavailableMessage: 'Desculpe, não tenho imóveis disponíveis com essas características no momento.',
        autoReply: true,
        businessHours: {
          enabled: false,
          start: '09:00',
          end: '18:00',
        },
      },
      billing: {
        automaticBilling: false,
        reminderDays: 3,
        paymentMethods: ['PIX', 'Cartão de Crédito'],
        lateFeePercentage: 2,
        customMessage: 'Olá {nome}, seu aluguel de {valor} vence em {dias} dias. Utilize o código PIX abaixo para pagamento.',
      },
      whatsapp: {
        phoneNumberId: '',
        accessToken: '',
        verifyToken: '',
        connected: false,
        businessName: '',
        webhookUrl: '',
        mode: 'business_api',
      },
      miniSite: {
        active: true, // Ativo por padrão para permitir configuração e uso inicial
        title: 'Minha Imobiliária',
        description: 'Encontre o imóvel perfeito para você',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        accentColor: '#ed6c02',
        fontFamily: 'modern',
        borderRadius: 'rounded',
        showPrices: true,
        showAvailability: true,
        showReviews: true,
        whatsappNumber: '',
        companyEmail: '',
        seoKeywords: 'imóveis, aluguel, venda, imobiliária',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

// Factory function for creating tenant-scoped settings service
export const createSettingsService = (tenantId: string) => new SettingsService(tenantId);