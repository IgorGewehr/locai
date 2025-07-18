/**
 * Debug API Complete - Investigação profunda do mini-site
 */

import { NextRequest, NextResponse } from 'next/server';
import { miniSiteService } from '@/lib/services/mini-site-service';
import { settingsService } from '@/lib/services/settings-service';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Property } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'default-tenant';
    
    console.log('🔍 Iniciando debug completo para tenant:', tenantId);
    
    const debug = {
      tenantId,
      timestamp: new Date().toISOString(),
      step1_settings: { success: false, data: null, error: null },
      step2_config: { success: false, data: null, error: null },
      step3_properties: { success: false, data: null, error: null },
      step4_minisite_api: { success: false, data: null, error: null },
      step5_widget_check: { success: false, data: null, error: null },
    };

    // Step 1: Verificar configurações
    try {
      console.log('📋 Step 1: Verificando configurações...');
      const settings = await settingsService.getSettings(tenantId);
      debug.step1_settings = {
        success: true,
        data: {
          exists: !!settings,
          miniSiteExists: !!settings?.miniSite,
          active: settings?.miniSite?.active || false,
          title: settings?.miniSite?.title || 'N/A',
          description: settings?.miniSite?.description || 'N/A',
          whatsappNumber: settings?.miniSite?.whatsappNumber || 'N/A',
          primaryColor: settings?.miniSite?.primaryColor || 'N/A',
          fullSettings: settings?.miniSite
        },
        error: null
      };
    } catch (error) {
      debug.step1_settings = {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    // Step 2: Verificar configuração do mini-site
    try {
      console.log('🎨 Step 2: Verificando configuração do mini-site...');
      const config = await miniSiteService.getConfig(tenantId);
      debug.step2_config = {
        success: true,
        data: {
          exists: !!config,
          isActive: config?.isActive || false,
          theme: config?.theme || 'N/A',
          contactInfo: config?.contactInfo || 'N/A',
          seo: config?.seo || 'N/A',
          fullConfig: config
        },
        error: null
      };
    } catch (error) {
      debug.step2_config = {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    // Step 3: Verificar propriedades
    try {
      console.log('🏠 Step 3: Verificando propriedades...');
      
      // Verificar propriedades reais
      const propertyService = new FirestoreService<Property>('properties');
      const allProperties = await propertyService.getAll();
      const tenantProperties = allProperties.filter(p => p.tenantId === tenantId);
      const activeProperties = tenantProperties.filter(p => p.isActive !== false);
      
      // Verificar propriedades públicas
      const publicProperties = await miniSiteService.getPublicProperties(tenantId);
      
      debug.step3_properties = {
        success: true,
        data: {
          totalProperties: allProperties.length,
          tenantProperties: tenantProperties.length,
          activeProperties: activeProperties.length,
          publicProperties: publicProperties.length,
          firstProperty: tenantProperties[0] || null,
          publicPropertiesPreview: publicProperties.slice(0, 2),
          isDemoProperties: publicProperties.every(p => p.id.startsWith('demo-'))
        },
        error: null
      };
    } catch (error) {
      debug.step3_properties = {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    // Step 4: Testar API do mini-site
    try {
      console.log('🌐 Step 4: Testando API do mini-site...');
      const origin = new URL(request.url).origin;
      const apiUrl = `${origin}/api/mini-site/${tenantId}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      debug.step4_minisite_api = {
        success: response.ok,
        data: {
          status: response.status,
          responseData: data,
          hasConfig: !!data.data?.config,
          hasProperties: !!data.data?.properties,
          propertiesCount: data.data?.properties?.length || 0
        },
        error: response.ok ? null : data.error || 'Erro na API'
      };
    } catch (error) {
      debug.step4_minisite_api = {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    // Step 5: Verificar widget no dashboard
    try {
      console.log('📱 Step 5: Verificando widget...');
      const origin = new URL(request.url).origin;
      const settingsUrl = `${origin}/api/settings`;
      
      const response = await fetch(settingsUrl);
      const settingsData = await response.json();
      
      debug.step5_widget_check = {
        success: response.ok,
        data: {
          settingsApiWorks: response.ok,
          hasMiniSiteConfig: !!settingsData?.miniSite,
          widgetShouldShow: settingsData?.miniSite?.active || false,
          miniSiteUrl: `${origin}/site/${tenantId}`,
          dashboardUrl: `${origin}/dashboard/mini-site`
        },
        error: response.ok ? null : 'Erro ao verificar settings'
      };
    } catch (error) {
      debug.step5_widget_check = {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    // Gerar relatório
    const issues = [];
    const solutions = [];
    
    if (!debug.step1_settings.success) {
      issues.push('❌ Configurações não encontradas');
      solutions.push('Execute a ativação do mini-site');
    }
    
    if (!debug.step2_config.success) {
      issues.push('❌ Configuração do mini-site falhou');
      solutions.push('Verifique o serviço de mini-site');
    }
    
    if (!debug.step3_properties.success) {
      issues.push('❌ Propriedades não encontradas');
      solutions.push('Adicione propriedades ou use propriedades demo');
    } else if (debug.step3_properties.data?.publicProperties === 0) {
      issues.push('⚠️ Nenhuma propriedade pública encontrada');
      solutions.push('Ative propriedades existentes ou crie novas');
    }
    
    if (!debug.step4_minisite_api.success) {
      issues.push('❌ API do mini-site não funciona');
      solutions.push('Verifique a configuração da API');
    }
    
    if (!debug.step5_widget_check.success) {
      issues.push('❌ Widget do dashboard não funciona');
      solutions.push('Verifique a API de settings');
    }

    const summary = {
      status: issues.length === 0 ? '✅ FUNCIONANDO' : '❌ COM PROBLEMAS',
      issues: issues.length,
      solutions: solutions.length,
      issuesList: issues,
      solutionsList: solutions
    };

    return NextResponse.json({
      success: true,
      summary,
      debugDetails: debug,
      quickFixes: [
        {
          name: 'Ativar Mini-Site',
          url: `${new URL(request.url).origin}/api/activate-mini-site-simple`,
          method: 'POST',
          body: { tenantId }
        },
        {
          name: 'Ver Mini-Site',
          url: `${new URL(request.url).origin}/site/${tenantId}`,
          method: 'GET'
        },
        {
          name: 'Dashboard Mini-Site',
          url: `${new URL(request.url).origin}/dashboard/mini-site`,
          method: 'GET'
        }
      ]
    });

  } catch (error) {
    console.error('Error in debug API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}