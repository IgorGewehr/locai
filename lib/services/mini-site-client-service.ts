/**
 * Mini-Site Client Service
 * Client-side service for mini-site operations (browser-safe)
 */

import { MiniSiteConfig, PublicProperty } from '@/lib/types/mini-site';

class MiniSiteClientService {
  /**
   * Get mini-site configuration for a tenant (client-side)
   */
  async getConfig(tenantId: string): Promise<MiniSiteConfig | null> {
    try {
      const response = await fetch(`/api/mini-site/${tenantId}`);
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data.success ? data.data.config : null;
    } catch (error) {
      console.error('Error fetching mini-site config:', error);
      return null;
    }
  }

  /**
   * Get public properties for a tenant (client-side)
   */
  async getProperties(tenantId: string): Promise<PublicProperty[]> {
    try {
      const response = await fetch(`/api/mini-site/${tenantId}`);
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return data.success ? data.data.properties : [];
    } catch (error) {
      console.error('Error fetching properties:', error);
      return [];
    }
  }

  /**
   * Get a single property (client-side)
   */
  async getProperty(tenantId: string, propertyId: string): Promise<PublicProperty | null> {
    try {
      const response = await fetch(`/api/mini-site/${tenantId}/properties/${propertyId}`);
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error fetching property:', error);
      return null;
    }
  }

  /**
   * Submit inquiry (client-side)
   */
  async submitInquiry(tenantId: string, inquiryData: any): Promise<{ success: boolean; whatsappUrl?: string }> {
    try {
      const response = await fetch(`/api/mini-site/${tenantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inquiryData),
      });

      const data = await response.json();
      return {
        success: data.success,
        whatsappUrl: data.data?.whatsappUrl,
      };
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      return { success: false };
    }
  }

  /**
   * Record page view for analytics (client-side)
   */
  async recordPageView(tenantId: string, propertyId?: string): Promise<void> {
    try {
      const utmParams = new URLSearchParams(window.location.search);
      const analyticsData = {
        event: 'page_view',
        propertyId,
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        utmSource: utmParams.get('utm_source'),
        utmMedium: utmParams.get('utm_medium'),
        utmCampaign: utmParams.get('utm_campaign'),
        timestamp: new Date().toISOString(),
      };

      await fetch('/api/analytics/mini-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analyticsData),
      });
    } catch (error) {
      console.error('Error recording page view:', error);
      // Don't throw error for analytics - it shouldn't break the user experience
    }
  }

  /**
   * Generate WhatsApp contact URL
   */
  generateWhatsAppUrl(
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
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
  }

  /**
   * Get or create session ID for analytics
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('minisite_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('minisite_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get device type for analytics
   */
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      if (/iPad/i.test(userAgent)) return 'tablet';
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Get location info (if available)
   */
  async getLocationInfo(): Promise<{ country?: string; city?: string } | null> {
    try {
      // Use a free IP geolocation service
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        return {
          country: data.country_name,
          city: data.city,
        };
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
    return null;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (format === 'long') {
      return dateObj.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    
    return dateObj.toLocaleDateString('pt-BR');
  }

  /**
   * Calculate nights between dates
   */
  calculateNights(checkIn: Date, checkOut: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((checkOut.getTime() - checkIn.getTime()) / oneDay);
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format (Brazilian)
   */
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^(?:\+55|55)?(?:\d{2})(?:\d{4,5}\d{4})$/;
    const cleanPhone = phone.replace(/\D/g, '');
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Format phone number for display
   */
  formatPhone(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 11) {
      return `(${cleanPhone.substr(0, 2)}) ${cleanPhone.substr(2, 5)}-${cleanPhone.substr(7, 4)}`;
    } else if (cleanPhone.length === 10) {
      return `(${cleanPhone.substr(0, 2)}) ${cleanPhone.substr(2, 4)}-${cleanPhone.substr(6, 4)}`;
    }
    
    return phone;
  }
}

export const miniSiteClientService = new MiniSiteClientService();