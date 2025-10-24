import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get tenant settings directly (server-side only)
    const services = new TenantServiceFactory(tenantId);
    const settings = await services.settings.getSettings(tenantId);
    
    if (!settings || !settings.miniSite) {
      return NextResponse.json(
        { success: false, error: 'Mini-site configuration not found' },
        { status: 404 }
      );
    }

    // Return only public mini-site configuration
    const publicConfig = {
      isActive: settings.miniSite.active,
      title: settings.miniSite.title,
      description: settings.miniSite.description,
      primaryColor: settings.miniSite.primaryColor,
      secondaryColor: settings.miniSite.secondaryColor,
      accentColor: settings.miniSite.accentColor,
      fontFamily: settings.miniSite.fontFamily,
      borderRadius: settings.miniSite.borderRadius,
      showPrices: settings.miniSite.showPrices,
      showAvailability: settings.miniSite.showAvailability,
      showReviews: settings.miniSite.showReviews,
      whatsappNumber: settings.miniSite.whatsappNumber,
      companyEmail: settings.miniSite.companyEmail,
      seoKeywords: settings.miniSite.seoKeywords,
    };

    return NextResponse.json({
      success: true,
      data: publicConfig,
      tenantId,
    });

  } catch (error) {
    console.error('Error fetching mini-site config:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch configuration' 
      },
      { status: 500 }
    );
  }
}