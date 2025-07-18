/**
 * Test API endpoint for mini-site functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { miniSiteService } from '@/lib/services/mini-site-service';
import { settingsService } from '@/lib/services/settings-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'test-user';
    
    console.log(`🧪 Testing mini-site for tenant: ${tenantId}`);

    // Test 1: Check if settings exist
    const settings = await settingsService.getSettings(tenantId);
    console.log('Settings found:', !!settings);
    console.log('Mini-site active:', settings?.miniSite?.active);

    // Test 2: Get mini-site config
    const config = await miniSiteService.getConfig(tenantId);
    console.log('Config found:', !!config);
    console.log('Config active:', config?.isActive);

    // Test 3: Get properties
    const properties = await miniSiteService.getPublicProperties(tenantId);
    console.log('Properties found:', properties.length);

    const debugInfo = {
      tenantId,
      timestamp: new Date().toISOString(),
      hasSettings: !!settings,
      miniSiteActive: settings?.miniSite?.active || false,
      hasConfig: !!config,
      configActive: config?.isActive || false,
      propertiesCount: properties.length,
      settingsKeys: settings ? Object.keys(settings) : [],
      miniSiteKeys: settings?.miniSite ? Object.keys(settings.miniSite) : [],
      config: config ? {
        isActive: config.isActive,
        businessName: config.contactInfo.businessName,
        title: config.seo.title,
        description: config.seo.description,
        theme: config.theme,
        contactInfo: config.contactInfo,
      } : null,
      properties: properties.map(p => ({
        id: p.id,
        name: p.name,
        tenantId: p.tenantId,
        type: p.type,
        bedrooms: p.bedrooms,
        maxGuests: p.maxGuests,
        basePrice: p.pricing.basePrice,
        isActive: p.isActive,
        featured: p.featured,
        hasPhotos: p.media.photos.length > 0,
        city: p.location.city,
        isDemo: p.id.startsWith('demo-')
      })),
      urls: {
        miniSite: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/site/${tenantId}`,
        api: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mini-site/${tenantId}`,
        activate: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/activate-mini-site-simple`
      }
    };

    // Retornar HTML se for uma requisição do browser
    const userAgent = request.headers.get('user-agent') || '';
    const isHtmlRequest = userAgent.includes('Mozilla') && !userAgent.includes('fetch');

    if (isHtmlRequest) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mini-Site Debug - ${tenantId}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #1976d2; margin-bottom: 30px; }
            h2 { color: #333; border-bottom: 2px solid #1976d2; padding-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .info-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #1976d2; }
            .status { padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
            .status.active { background: #d4edda; color: #155724; }
            .status.inactive { background: #f8d7da; color: #721c24; }
            .property-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
            .property-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; }
            .property-card.demo { border-left: 4px solid #ffc107; }
            .button { display: inline-block; padding: 10px 20px; background: #1976d2; color: white; text-decoration: none; border-radius: 6px; margin: 5px; }
            .button:hover { background: #1565c0; }
            .button.success { background: #28a745; }
            .button.success:hover { background: #218838; }
            .code { background: #f8f9fa; padding: 15px; border-radius: 8px; font-family: 'Courier New', monospace; overflow-x: auto; }
            .alert { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔍 Mini-Site Debug - ${tenantId}</h1>
            
            <div class="info-grid">
              <div class="info-card">
                <h3>📋 Status Geral</h3>
                <p><strong>Tenant ID:</strong> ${tenantId}</p>
                <p><strong>Configuração:</strong> <span class="status ${config?.isActive ? 'active' : 'inactive'}">${config?.isActive ? 'Ativa' : 'Inativa'}</span></p>
                <p><strong>Propriedades:</strong> ${properties.length} encontradas</p>
                <p><strong>Propriedades Demo:</strong> ${properties.filter(p => p.id.startsWith('demo-')).length}</p>
              </div>
              
              <div class="info-card">
                <h3>🏢 Informações do Negócio</h3>
                <p><strong>Nome:</strong> ${config?.contactInfo.businessName || 'Não definido'}</p>
                <p><strong>Título:</strong> ${config?.seo.title || 'Não definido'}</p>
                <p><strong>Descrição:</strong> ${config?.seo.description || 'Não definida'}</p>
                <p><strong>WhatsApp:</strong> ${config?.contactInfo.whatsappNumber || 'Não definido'}</p>
              </div>
              
              <div class="info-card">
                <h3>🎨 Tema</h3>
                <p><strong>Cor Primária:</strong> <span style="background: ${config?.theme.primaryColor || '#1976d2'}; padding: 2px 8px; border-radius: 4px; color: white;">${config?.theme.primaryColor || '#1976d2'}</span></p>
                <p><strong>Cor Secundária:</strong> <span style="background: ${config?.theme.secondaryColor || '#dc004e'}; padding: 2px 8px; border-radius: 4px; color: white;">${config?.theme.secondaryColor || '#dc004e'}</span></p>
                <p><strong>Família da Fonte:</strong> ${config?.theme.fontFamily || 'Inter'}</p>
              </div>
              
              <div class="info-card">
                <h3>🔗 Ações</h3>
                <div>
                  <a href="${debugInfo.urls.miniSite}" class="button" target="_blank">🌐 Ver Mini-Site</a>
                  <a href="${debugInfo.urls.api}" class="button" target="_blank">🔌 API Endpoint</a>
                  <button onclick="activateMiniSite()" class="button success">🚀 Ativar Mini-Site</button>
                </div>
              </div>
            </div>
            
            ${properties.length === 0 ? `
              <div class="alert error">
                <h3>⚠️ Nenhuma propriedade encontrada</h3>
                <p>Não foram encontradas propriedades para este tenant. O mini-site pode não funcionar corretamente.</p>
                <p>Recomendações:</p>
                <ul>
                  <li>Adicione propriedades no dashboard</li>
                  <li>Ou use o botão "Ativar Mini-Site" acima para criar propriedades demo</li>
                </ul>
              </div>
            ` : ''}
            
            ${properties.some(p => p.id.startsWith('demo-')) ? `
              <div class="alert">
                <h3>🎭 Propriedades Demo Detectadas</h3>
                <p>Foram encontradas ${properties.filter(p => p.id.startsWith('demo-')).length} propriedades de demonstração. Estas são criadas automaticamente para fins de teste.</p>
              </div>
            ` : ''}
            
            <h2>🏠 Propriedades (${properties.length})</h2>
            <div class="property-grid">
              ${properties.map(p => `
                <div class="property-card ${p.id.startsWith('demo-') ? 'demo' : ''}">
                  <h4>${p.name} ${p.id.startsWith('demo-') ? '(Demo)' : ''}</h4>
                  <p><strong>Tipo:</strong> ${p.type}</p>
                  <p><strong>Quartos:</strong> ${p.bedrooms} | <strong>Hóspedes:</strong> ${p.maxGuests}</p>
                  <p><strong>Preço:</strong> R$ ${p.pricing.basePrice}/noite</p>
                  <p><strong>Cidade:</strong> ${p.location.city}</p>
                  <p><strong>Fotos:</strong> ${p.media.photos.length}</p>
                  <p><strong>Status:</strong> <span class="status ${p.isActive ? 'active' : 'inactive'}">${p.isActive ? 'Ativa' : 'Inativa'}</span></p>
                </div>
              `).join('')}
            </div>
            
            <h2>🛠️ Dados Técnicos</h2>
            <div class="code">
              <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
            
            <p><small>Gerado em: ${new Date().toLocaleString('pt-BR')}</small></p>
          </div>
          
          <script>
            async function activateMiniSite() {
              try {
                const response = await fetch('${debugInfo.urls.activate}', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ tenantId: '${tenantId}' })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  alert('Mini-site ativado com sucesso!\\n\\nPropriedades criadas: ' + data.propertiesCreated + '\\n\\nRecarregando a página...');
                  window.location.reload();
                } else {
                  alert('Erro ao ativar mini-site: ' + data.error);
                }
              } catch (error) {
                alert('Erro de conexão: ' + error.message);
              }
            }
          </script>
        </body>
        </html>
      `;
      
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // Retornar JSON para requisições de API
    return NextResponse.json({
      success: true,
      debug: debugInfo,
      data: {
        settings: settings?.miniSite || null,
        config,
        properties
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId = 'test-user' } = await request.json();
    
    console.log(`🧪 Force-activating mini-site for tenant: ${tenantId}`);

    // Force activate mini-site
    await settingsService.updateMiniSiteSettings(tenantId, {
      active: true,
      title: 'Minha Imobiliária - Teste',
      description: 'Site de teste para imóveis',
      whatsappNumber: '5511999999999',
      companyEmail: 'test@example.com',
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      accentColor: '#ed6c02',
      fontFamily: 'modern',
      borderRadius: 'rounded',
      showPrices: true,
      showAvailability: true,
      showReviews: true,
      seoKeywords: 'imóveis, aluguel, temporada, férias, propriedades',
    });

    // Test the result
    const settings = await settingsService.getSettings(tenantId);
    const config = await miniSiteService.getConfig(tenantId);
    
    const miniSiteUrl = `${new URL(request.url).origin}/site/${tenantId}`;

    return NextResponse.json({
      success: true,
      message: 'Mini-site force-activated successfully',
      tenantId,
      miniSiteUrl,
      debug: {
        hasSettings: !!settings,
        miniSiteActive: settings?.miniSite?.active || false,
        hasConfig: !!config,
        configActive: config?.isActive || false,
      }
    });

  } catch (error) {
    console.error('Force activation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}