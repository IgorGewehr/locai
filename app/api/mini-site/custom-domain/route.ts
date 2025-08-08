import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';

// GET /api/mini-site/custom-domain - Get custom domain configuration
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId') || 'default';
    
    logger.info('🌐 [MiniSite] Obtendo configuração de domínio personalizado', { tenantId });
    
    const { miniSiteConfigs } = new TenantServiceFactory(tenantId);
    const configs = await miniSiteConfigs.getAll();
    
    if (configs.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          customDomain: null,
          enabled: false,
          ssl: false
        }
      });
    }
    
    const config = configs[0];
    
    return NextResponse.json({
      success: true,
      data: {
        customDomain: config.customDomain || null,
        enabled: config.enabled || false,
        ssl: config.sslEnabled || false,
        subdomain: config.subdomain || null
      }
    });
  } catch (error) {
    logger.error('❌ [MiniSite] Erro ao obter configuração de domínio', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { success: false, error: 'Failed to get custom domain configuration' },
      { status: 500 }
    );
  }
}

// POST /api/mini-site/custom-domain - Set custom domain configuration  
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId = 'default', customDomain, enabled = false } = body;
    
    logger.info('🌐 [MiniSite] Configurando domínio personalizado', { 
      tenantId, 
      customDomain,
      enabled 
    });
    
    const { miniSiteConfigs } = new TenantServiceFactory(tenantId);
    const configs = await miniSiteConfigs.getAll();
    
    const configData = {
      tenantId,
      customDomain,
      enabled,
      sslEnabled: false, // SSL needs to be configured separately
      subdomain: `${tenantId}.locai.app`, // Default subdomain
      updatedAt: new Date()
    };
    
    if (configs.length === 0) {
      // Create new config
      const configId = await miniSiteConfigs.create(configData);
      
      logger.info('✅ [MiniSite] Configuração de domínio criada', { 
        tenantId, 
        configId 
      });
    } else {
      // Update existing config
      const config = configs[0];
      await miniSiteConfigs.update(config.id!, configData);
      
      logger.info('✅ [MiniSite] Configuração de domínio atualizada', { 
        tenantId, 
        configId: config.id 
      });
    }
    
    return NextResponse.json({
      success: true,
      data: configData
    });
  } catch (error) {
    logger.error('❌ [MiniSite] Erro ao configurar domínio personalizado', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { success: false, error: 'Failed to configure custom domain' },
      { status: 500 }
    );
  }
}