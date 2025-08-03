// test-api-direct.mjs
// Teste direto da API do agent

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const API_URL = 'http://localhost:3000/api/agent';
const TENANT_ID = process.env.TENANT_ID || 'test_tenant';

async function testAPI(message) {
  console.log(`\n📤 Testando: "${message}"`);
  console.log('URL:', API_URL);
  console.log('TenantID:', TENANT_ID);
  
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        clientPhone: '+5511999887766',
        tenantId: TENANT_ID,
        isTest: true,
        metadata: { 
          source: 'test',
          priority: 'normal'
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    console.log(`⏱️ Tempo de resposta: ${responseTime}ms`);
    
    const responseText = await response.text();
    console.log(`📥 Status: ${response.status}`);
    console.log(`📥 Response Headers:`, Object.fromEntries(response.headers));
    
    try {
      const data = JSON.parse(responseText);
      
      if (response.ok) {
        console.log(`✅ Sucesso!`);
        console.log(`📝 Resposta:`, data.message || data.data?.response || 'Sem resposta');
        
        if (data.data?.functionsExecuted?.length > 0) {
          console.log(`🔧 Funções executadas:`, data.data.functionsExecuted);
        }
        
        if (data.data?.conversationStage) {
          console.log(`📊 Stage:`, data.data.conversationStage);
        }
        
        return data;
      } else {
        console.error(`❌ Erro ${response.status}:`, data.error || responseText);
        return null;
      }
    } catch (parseError) {
      console.error(`❌ Erro ao parsear JSON:`, parseError.message);
      console.log(`📄 Response raw:`, responseText.substring(0, 500));
      return null;
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      console.error(`⏱️ Timeout após ${responseTime}ms`);
    } else {
      console.error(`❌ Erro:`, error.message);
    }
    return null;
  }
}

// Executar teste
async function main() {
  console.log('🚀 Iniciando teste direto da API...\n');
  
  // Teste simples
  await testAPI('ola');
  
  // Teste com busca
  await testAPI('quero alugar um apartamento em florianopolis');
  
  console.log('\n✅ Testes concluídos!');
}

main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});