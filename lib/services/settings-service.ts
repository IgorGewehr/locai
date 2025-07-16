import { FirestoreService } from '@/lib/firebase/firestore';
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
  lastSync?: Date;
  updatedAt?: Date;
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
  private service: FirestoreService<TenantSettings>;

  constructor() {
    this.service = new FirestoreService<TenantSettings>('settings');
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
      // Try to get existing settings first
      const existingSettings = await this.getSettings(tenantId);
      
      if (existingSettings) {
        // Update existing document
        await this.service.update(tenantId, {
          miniSite: {
            ...existingSettings.miniSite,
            ...settings,
            updatedAt: new Date(),
          },
          updatedAt: new Date(),
        });
      } else {
        // Create new document with default settings
        const defaultSettings = this.getDefaultSettings(tenantId);
        await this.service.set(tenantId, {
          ...defaultSettings,
          id: tenantId,
          miniSite: {
            ...defaultSettings.miniSite,
            ...settings,
            updatedAt: new Date(),
          },
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error updating mini-site settings:', error);
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
      },
      miniSite: {
        active: false,
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

export const settingsService = new SettingsService();