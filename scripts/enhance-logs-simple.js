#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Funções para atualizar (apenas algumas principais)
const functions = [
  'register-client',
  'create-lead', 
  'get-property-details',
  'check-availability',
  'cancel-reservation'
];

const basePath = '/mnt/c/Users/Administrador/Documents/Projetos/locai/app/api/ai/functions';

console.log('🚀 Adicionando logs básicos às funções...\n');

functions.forEach(funcName => {
  const filePath = path.join(basePath, funcName, 'route.ts');
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${funcName} não encontrado`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('const requestId =')) {
      console.log(`✅ ${funcName} já atualizado`);
      return;
    }

    // Adicionar apenas log de início e fim
    const updatedContent = content
      .replace(
        /logger\.info\('.*? \[API\].*? called',.*?\);/,
        `logger.info('🔥 [${funcName.toUpperCase()}] Função executada', {
      tenantId: tenantId?.substring(0, 8) + '***',
      params: Object.keys(args),
      timestamp: new Date().toISOString()
    });`
      )
      .replace(
        /logger\.info\('.*? \[API\].*? completed',.*?\);/,
        `logger.info('✅ [${funcName.toUpperCase()}] Execução concluída', {
      tenantId,
      hasResult: !!result,
      timestamp: new Date().toISOString()
    });`
      );

    fs.writeFileSync(filePath, updatedContent);
    console.log(`✅ ${funcName} atualizado`);

  } catch (error) {
    console.error(`❌ Erro em ${funcName}:`, error.message);
  }
});

console.log('\n🎉 Logs básicos adicionados!');
console.log('\nPara ver os logs: grep "🔥\\|✅" logs/app.log');