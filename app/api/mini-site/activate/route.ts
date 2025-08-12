import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  let tenantId: string | undefined;
  
  try {
    // Get tenant ID from request body
    const body = await request.json();
    tenantId = body.tenantId || 'default';
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }
    logger.info('🚀 [MiniSite] Activating mini-site', { tenantId });

    // Get current settings
    const services = new TenantServiceFactory(tenantId);
    const currentSettings = await services.settings.getSettings(tenantId);
    
    // Update mini-site settings to activate
    await services.settings.updateMiniSiteSettings(tenantId, {
      active: true,
      whatsappNumber: currentSettings?.whatsapp?.phoneNumberId || '',
      companyEmail: currentSettings?.company?.email || '',
    });

    // Return success with mini-site URL
    const miniSiteUrl = `${request.nextUrl.origin}/site/${tenantId}`;
    
    return NextResponse.json({
      success: true,
      miniSiteUrl,
      message: 'Mini-site ativado com sucesso!'
    });

  } catch (error) {
    logger.error('❌ [MiniSite] Error activating', {
      tenantId: tenantId || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Failed to activate mini-site' },
      { status: 500 }
    );
  }
}