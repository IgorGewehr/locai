/**
 * Status rápido do mini-site
 */

import { NextRequest, NextResponse } from 'next/server';
import { miniSiteService } from '@/lib/services/mini-site-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'default-tenant';
    
    // Buscar configuração
    const config = await miniSiteService.getConfig(tenantId);
    
    // Buscar propriedades
    const properties = await miniSiteService.getPublicProperties(tenantId);
    
    // Calcular status
    const isActive = config?.isActive || false;
    const hasProperties = properties.length > 0;
    const isReady = isActive && hasProperties;
    
    return NextResponse.json({
      success: true,
      tenantId,
      status: {
        isActive,
        hasProperties,
        isReady,
        propertiesCount: properties.length,
        configExists: !!config
      },
      config: config ? {
        title: config.seo?.title || 'Mini-Site',
        description: config.seo?.description || '',
        primaryColor: config.theme?.primaryColor || '#1976d2'
      } : null,
      properties: properties.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        basePrice: p.pricing?.basePrice || 0
      })),
      urls: {
        miniSite: `${new URL(request.url).origin}/mini-site/${tenantId}`,
        dashboard: `${new URL(request.url).origin}/dashboard/mini-site`
      }
    });
    
  } catch (error) {
    console.error('Error in mini-site status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}