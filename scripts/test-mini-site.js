/**
 * Script para testar o mini-site
 */

const testTenantId = 'default';

async function testMiniSite() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Iniciando testes do mini-site...\n');

  try {
    // Test 1: Mini-site status
    console.log('1️⃣ Testando status do mini-site...');
    const statusResponse = await fetch(`${baseUrl}/api/mini-site-status?tenantId=${testTenantId}`);
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      console.log('✅ Status do mini-site:', statusData.status);
      console.log('📊 Propriedades encontradas:', statusData.status.propertiesCount);
      console.log('🔗 URL do mini-site:', statusData.urls.miniSite);
    } else {
      console.log('❌ Erro ao verificar status:', statusData.error);
    }

    // Test 2: Mini-site configuration
    console.log('\n2️⃣ Testando configuração do mini-site...');
    const configResponse = await fetch(`${baseUrl}/api/mini-site/${testTenantId}/config`);
    const configData = await configResponse.json();
    
    if (configData.success) {
      console.log('✅ Configuração carregada');
      console.log('🏢 Nome do negócio:', configData.data.contactInfo.businessName);
      console.log('🎨 Cor primária:', configData.data.theme.primaryColor);
    } else {
      console.log('❌ Erro ao carregar configuração:', configData.error);
    }

    // Test 3: Properties API
    console.log('\n3️⃣ Testando API de propriedades...');
    const propertiesResponse = await fetch(`${baseUrl}/api/mini-site/${testTenantId}/properties`);
    const propertiesData = await propertiesResponse.json();
    
    if (propertiesData.success) {
      console.log('✅ Propriedades carregadas:', propertiesData.count);
      if (propertiesData.data.length > 0) {
        const firstProperty = propertiesData.data[0];
        console.log('🏠 Primeira propriedade:', firstProperty.name);
        console.log('💰 Preço:', `R$ ${firstProperty.pricing.basePrice}`);
        
        // Test 4: Individual property
        console.log('\n4️⃣ Testando propriedade individual...');
        const propertyResponse = await fetch(`${baseUrl}/api/mini-site/${testTenantId}/property/${firstProperty.id}`);
        const propertyData = await propertyResponse.json();
        
        if (propertyData.success) {
          console.log('✅ Propriedade individual carregada');
          console.log('🏠 Nome:', propertyData.data.name);
          console.log('📍 Localização:', propertyData.data.location.city);
          console.log('🛏️ Quartos:', propertyData.data.bedrooms);
          console.log('🖼️ Fotos:', propertyData.data.media.photos.length);
        } else {
          console.log('❌ Erro ao carregar propriedade:', propertyData.error);
        }
      }
    } else {
      console.log('❌ Erro ao carregar propriedades:', propertiesData.error);
    }

    // Test 5: Mini-site page (basic HTML check)
    console.log('\n5️⃣ Testando página do mini-site...');
    try {
      const pageResponse = await fetch(`${baseUrl}/mini-site/${testTenantId}`);
      const pageHtml = await pageResponse.text();
      
      if (pageResponse.ok && pageHtml.includes('html')) {
        console.log('✅ Página do mini-site acessível');
        
        // Check for basic elements
        const hasTitle = pageHtml.includes('<title>');
        const hasNavigation = pageHtml.includes('nav') || pageHtml.includes('header');
        const hasContent = pageHtml.includes('propriedade') || pageHtml.includes('Property');
        
        console.log('📄 Elementos encontrados:');
        console.log('  - Título:', hasTitle ? '✅' : '❌');
        console.log('  - Navegação:', hasNavigation ? '✅' : '❌');
        console.log('  - Conteúdo:', hasContent ? '✅' : '❌');
      } else {
        console.log('❌ Página do mini-site não acessível');
        console.log('Status:', pageResponse.status);
      }
    } catch (error) {
      console.log('❌ Erro ao acessar página:', error.message);
    }

  } catch (error) {
    console.error('💥 Erro durante os testes:', error.message);
  }

  console.log('\n✨ Testes do mini-site concluídos!');
  console.log('\n📋 Para testar manualmente:');
  console.log(`   1. Acesse: ${baseUrl}/mini-site/${testTenantId}`);
  console.log(`   2. Configure: ${baseUrl}/dashboard/mini-site`);
  console.log(`   3. Adicione propriedades em: ${baseUrl}/dashboard/properties`);
}

testMiniSite().catch(console.error);