import { NextRequest, NextResponse } from 'next/server';
import { miniSiteService } from '@/lib/services/mini-site-service';
import { settingsService } from '@/lib/services/settings-service';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Property } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'default-tenant';

    console.log('🔍 Debug Mini-Site - Tenant:', tenantId);

    // 1. Verificar configuração do mini-site
    const config = await miniSiteService.getConfig(tenantId);
    console.log('📋 Mini-site config:', config);

    // 2. Verificar settings
    const settings = await settingsService.getSettings(tenantId);
    console.log('⚙️ Settings:', settings);

    // 3. Verificar propriedades no banco
    const propertyService = new FirestoreService<Property>('properties');
    const allProperties = await propertyService.getAll();
    const tenantProperties = allProperties.filter(p => p.tenantId === tenantId);
    console.log('🏠 All properties count:', allProperties.length);
    console.log('🏠 Tenant properties count:', tenantProperties.length);
    console.log('🏠 Tenant properties:', tenantProperties.map(p => ({
      id: p.id,
      title: p.title,
      tenantId: p.tenantId,
      isActive: p.isActive,
      status: p.status
    })));

    // 4. Verificar propriedades públicas
    const publicProperties = await miniSiteService.getPublicProperties(tenantId);
    console.log('🌐 Public properties count:', publicProperties.length);
    console.log('🌐 Public properties:', publicProperties.map(p => ({
      id: p.id,
      name: p.name,
      tenantId: p.tenantId,
      isActive: p.isActive
    })));

    // 5. Verificar se há propriedades demo
    const demoProperties = publicProperties.filter(p => p.id.startsWith('demo-'));
    console.log('🎭 Demo properties count:', demoProperties.length);

    return NextResponse.json({
      success: true,
      debug: {
        tenantId,
        config: config ? {
          isActive: config.isActive,
          businessName: config.contactInfo.businessName,
          title: config.seo.title
        } : null,
        settings: settings ? {
          miniSiteActive: settings.miniSite?.active,
          miniSiteTitle: settings.miniSite?.title,
          companyName: settings.company?.name
        } : null,
        properties: {
          total: allProperties.length,
          tenant: tenantProperties.length,
          public: publicProperties.length,
          demo: demoProperties.length,
          tenantList: tenantProperties.map(p => ({
            id: p.id,
            title: p.title,
            tenantId: p.tenantId,
            isActive: p.isActive,
            status: p.status
          })),
          publicList: publicProperties.map(p => ({
            id: p.id,
            name: p.name,
            tenantId: p.tenantId,
            isActive: p.isActive
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error in debug mini-site API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        tenantId: searchParams.get('tenantId') || 'default-tenant',
        error: error instanceof Error ? error.stack : String(error)
      }
    });
  }
}