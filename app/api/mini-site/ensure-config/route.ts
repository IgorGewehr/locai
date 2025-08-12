import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Get tenant ID from URL params or default
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    
    if (!tenantId || tenantId === 'null' || tenantId === 'undefined') {
      return NextResponse.json(
        { error: 'Valid tenant ID required' },
        { status: 400 }
      );
    }
    
    logger.info('🌐 [MiniSite] Ensuring config', { tenantId });

    // Get current settings
    const services = new TenantServiceFactory(tenantId);
    let currentSettings = await services.settings.getSettings(tenantId);
    
    // If no settings exist or no mini-site config, create default
    if (!currentSettings || !currentSettings.miniSite) {
      logger.info('🏗️ [MiniSite] Creating default settings', { tenantId });
      
      const defaultMiniSiteConfig = {
        active: false,
        title: currentSettings?.company?.name || 'Minha Imobiliária',
        description: 'Encontre o imóvel perfeito para você',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        accentColor: '#ed6c02',
        fontFamily: 'modern' as const,
        borderRadius: 'rounded' as const,
        showPrices: true,
        showAvailability: true,
        showReviews: true,
        whatsappNumber: currentSettings?.whatsapp?.phoneNumberId || '',
        companyEmail: currentSettings?.company?.email || '',
        seoKeywords: 'imóveis, aluguel, temporada',
        updatedAt: new Date()
      };
      
      await services.settings.saveSettings(tenantId, {
        miniSite: defaultMiniSiteConfig
      });
      
      // Refetch to ensure we have the updated settings
      currentSettings = await services.settings.getSettings(tenantId);
    }

    const miniSiteUrl = `${request.nextUrl.origin}/site/${tenantId}`;
    
    logger.info('✅ [MiniSite] Config loaded successfully', {
      tenantId,
      isActive: currentSettings.miniSite?.active || false,
      miniSiteUrl
    });
    
    return NextResponse.json({
      success: true,
      config: currentSettings.miniSite,
      miniSiteUrl,
      isActive: currentSettings.miniSite?.active || false
    });

  } catch (error) {
    logger.error('❌ [MiniSite] Error ensuring config', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to ensure mini-site configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}