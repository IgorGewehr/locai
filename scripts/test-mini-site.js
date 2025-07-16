#!/usr/bin/env node

/**
 * Script para testar a funcionalidade do mini-site
 * Usage: node scripts/test-mini-site.js
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

async function testMiniSite() {
  console.log('🧪 Testando funcionalidade do Mini-Site...\n');

  try {
    // 1. Teste de Health Check
    console.log('1️⃣ Verificando se o servidor está respondendo...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    if (healthResponse.ok) {
      console.log('✅ Servidor respondendo corretamente\n');
    } else {
      console.log('❌ Servidor não está respondendo\n');
    }

    // 2. Teste de Mini-Site API
    console.log('2️⃣ Testando API do Mini-Site...');
    const tenantIds = ['default-tenant', 'demo', 'test-user'];
    
    for (const tenantId of tenantIds) {
      console.log(`\n   Testando tenant: ${tenantId}`);
      
      try {
        const response = await fetch(`${BASE_URL}/api/mini-site/${tenantId}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          console.log(`   ✅ Mini-site ativo para ${tenantId}`);
          console.log(`   📄 Título: ${data.data.config.seo.title}`);
          console.log(`   🏠 Propriedades: ${data.data.properties.length}`);
        } else {
          console.log(`   ⚠️  Mini-site não encontrado ou inativo para ${tenantId}`);
        }
      } catch (error) {
        console.log(`   ❌ Erro ao testar ${tenantId}: ${error.message}`);
      }
    }

    // 3. Teste de Página do Mini-Site
    console.log('\n3️⃣ Testando páginas do Mini-Site...');
    
    for (const tenantId of tenantIds) {
      console.log(`\n   Testando página: /site/${tenantId}`);
      
      try {
        const response = await fetch(`${BASE_URL}/site/${tenantId}`);
        
        if (response.ok) {
          const html = await response.text();
          const hasContent = html.includes('<!DOCTYPE html>') && 
                           (html.includes('property') || html.includes('propriedade'));
          
          if (hasContent) {
            console.log(`   ✅ Página carregada com sucesso`);
          } else {
            console.log(`   ⚠️  Página carregada mas pode estar vazia`);
          }
        } else {
          console.log(`   ❌ Erro ao carregar página: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Erro ao testar página: ${error.message}`);
      }
    }

    // 4. Teste de Recursos Estáticos
    console.log('\n4️⃣ Verificando recursos estáticos...');
    const staticResources = [
      '/_next/static/chunks/webpack.js',
      '/favicon.ico'
    ];
    
    for (const resource of staticResources) {
      try {
        const response = await fetch(`${BASE_URL}${resource}`);
        console.log(`   ${response.ok ? '✅' : '❌'} ${resource}: ${response.status}`);
      } catch (error) {
        console.log(`   ❌ ${resource}: Erro de conexão`);
      }
    }

    console.log('\n✨ Teste concluído!\n');

  } catch (error) {
    console.error('❌ Erro geral durante os testes:', error);
  }
}

// Executar testes
testMiniSite();