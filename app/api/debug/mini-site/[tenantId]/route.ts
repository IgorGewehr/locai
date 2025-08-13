import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';

// MINI-SITE DEBUGGING ENDPOINT - PRODUCTION SAFE
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    
    if (!tenantId || tenantId.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Invalid tenant ID',
        tenantId: tenantId || 'MISSING'
      }, { status: 400 });
    }

    const services = new TenantServiceFactory(tenantId);
    
    const diagnostics = {
      tenantId,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID ? 'SET' : 'NOT_SET',
      },
      tests: {
        config: null as any,
        properties: null as any,
        settings: null as any,
        miniSiteService: null as any
      },
      errors: [] as string[],
      timestamp: new Date().toISOString()
    };

    // Test 1: Check if mini-site service loads
    try {
      const miniSiteService = services.miniSite;
      diagnostics.tests.miniSiteService = {
        loaded: !!miniSiteService,
        type: typeof miniSiteService
      };
      logger.info('✅ [MiniSite Debug] Service loaded', { tenantId });
    } catch (error) {
      diagnostics.errors.push(`Mini-site service failed to load: ${error.message}`);
      logger.error('❌ [MiniSite Debug] Service load failed', { tenantId, error: error.message });
    }

    // Test 2: Try to get config
    try {
      const config = await services.miniSite.getConfig(tenantId);
      diagnostics.tests.config = {
        exists: !!config,
        isActive: config?.isActive,
        hasContactInfo: !!(config?.contactInfo?.businessName),
        whatsappNumber: config?.contactInfo?.whatsappNumber ? 'SET' : 'NOT_SET',
        data: config ? {
          tenantId: config.tenantId,
          isActive: config.isActive,
          businessName: config.contactInfo?.businessName,
          theme: config.theme
        } : null
      };
      logger.info('✅ [MiniSite Debug] Config loaded', { tenantId, hasConfig: !!config });
    } catch (error) {
      diagnostics.errors.push(`Config fetch failed: ${error.message}`);
      logger.error('❌ [MiniSite Debug] Config failed', { tenantId, error: error.message });
    }

    // Test 3: Try to get properties
    try {
      const properties = await services.miniSite.getPublicProperties(tenantId);
      diagnostics.tests.properties = {
        count: properties?.length || 0,
        hasData: Array.isArray(properties) && properties.length > 0,
        isDemo: properties?.some(p => p.id?.startsWith('demo-')),
        firstProperty: properties?.[0] ? {
          id: properties[0].id,
          name: properties[0].name,
          isActive: properties[0].isActive
        } : null
      };
      logger.info('✅ [MiniSite Debug] Properties loaded', { tenantId, count: properties?.length });
    } catch (error) {
      diagnostics.errors.push(`Properties fetch failed: ${error.message}`);
      logger.error('❌ [MiniSite Debug] Properties failed', { tenantId, error: error.message });
    }

    // Test 4: Try to get raw settings
    try {
      const settings = await services.settings.getSettings(tenantId);
      diagnostics.tests.settings = {
        exists: !!settings,
        hasMiniSite: !!(settings?.miniSite),
        miniSiteActive: settings?.miniSite?.active,
        company: settings?.company ? {
          name: settings.company.name,
          hasLogo: !!settings.company.logo
        } : null,
        data: settings ? {
          id: settings.id,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt
        } : null
      };
      logger.info('✅ [MiniSite Debug] Settings loaded', { tenantId, hasSettings: !!settings });
    } catch (error) {
      diagnostics.errors.push(`Settings fetch failed: ${error.message}`);
      logger.error('❌ [MiniSite Debug] Settings failed', { tenantId, error: error.message });
    }

    // Determine readiness
    const hasConfig = diagnostics.tests.config?.exists;
    const hasProperties = diagnostics.tests.properties?.count > 0;
    const miniSiteServiceWorks = diagnostics.tests.miniSiteService?.loaded;
    const hasMinimumSettings = diagnostics.tests.settings?.exists;

    const readiness = {
      miniSiteService: miniSiteServiceWorks,
      config: hasConfig,
      properties: hasProperties,
      settings: hasMinimumSettings,
      overall: miniSiteServiceWorks && (hasConfig || hasMinimumSettings) && hasProperties
    };

    logger.info('🔍 [MiniSite Debug] Diagnostic completed', {
      tenantId,
      readiness: readiness.overall ? 'READY' : 'NOT_READY',
      errors: diagnostics.errors.length
    });

    return NextResponse.json({
      success: true,
      diagnostics,
      readiness,
      recommendations: readiness.overall 
        ? ['✅ Mini-site is ready!', 'Check the actual route at /site/' + tenantId]
        : [
            !miniSiteServiceWorks && '❌ Mini-site service not loading properly',
            !hasConfig && !hasMinimumSettings && '❌ No mini-site configuration found',
            !hasProperties && '❌ No properties available for display',
            diagnostics.errors.length > 0 && `❌ ${diagnostics.errors.length} error(s) detected`
          ].filter(Boolean)
    });

  } catch (error) {
    logger.error('❌ [MiniSite Debug] Critical diagnostic error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Diagnostic check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}