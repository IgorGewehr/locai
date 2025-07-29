import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/settings-service';
import { useTenant } from '@/contexts/TenantContext';

export async function GET(request: NextRequest) {
  try {
    // Get tenant ID from URL params or default
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId') || 'default';
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }
    console.log('Ensuring mini-site config for tenant:', tenantId);

    // Get current settings
    const currentSettings = await settingsService.getSettings(tenantId);
    
    // If no settings exist or no mini-site config, create default
    if (!currentSettings || !currentSettings.miniSite) {
      console.log('Creating default mini-site settings');
      
      await settingsService.saveSettings(tenantId, {
        miniSite: {
          active: false,
          title: currentSettings?.company?.name || 'Minha Imobiliária',
          description: 'Encontre o imóvel perfeito para você',
          primaryColor: '#1976d2',
          secondaryColor: '#dc004e',
          accentColor: '#ed6c02',
          fontFamily: 'modern',
          borderRadius: 'rounded',
          showPrices: true,
          showAvailability: true,
          showReviews: true,
          whatsappNumber: currentSettings?.whatsapp?.phoneNumberId || '',
          companyEmail: currentSettings?.company?.email || '',
          seoKeywords: 'imóveis, aluguel, temporada',
          updatedAt: new Date()
        }
      });
    }

    // Return mini-site config
    const updatedSettings = await settingsService.getSettings(tenantId);
    const miniSiteUrl = `${request.nextUrl.origin}/site/${tenantId}`;
    
    return NextResponse.json({
      success: true,
      config: updatedSettings?.miniSite,
      miniSiteUrl,
      isActive: updatedSettings?.miniSite?.active || false
    });

  } catch (error) {
    console.error('Error ensuring mini-site config:', error);
    return NextResponse.json(
      { error: 'Failed to ensure mini-site configuration' },
      { status: 500 }
    );
  }
}