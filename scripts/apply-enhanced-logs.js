#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const functionsPath = '/mnt/c/Users/Administrador/Documents/Projetos/locai/app/api/ai/functions';

// Mapear cada função com seu prefixo de log
const functionMappings = {
  'analyze-performance': { prefix: 'ANALYZE-PERFORMANCE', emoji: '📊' },
  'cancel-reservation': { prefix: 'CANCEL-RESERVATION', emoji: '🚫' },
  'check-availability': { prefix: 'CHECK-AVAILABILITY', emoji: '📅' },
  'check-visit-availability': { prefix: 'CHECK-VISIT-AVAILABILITY', emoji: '🏠' },
  'classify-lead': { prefix: 'CLASSIFY-LEAD', emoji: '🎯' },
  'create-goal': { prefix: 'CREATE-GOAL', emoji: '🎯' },
  'create-lead': { prefix: 'CREATE-LEAD', emoji: '🆕' },
  'create-task': { prefix: 'CREATE-TASK', emoji: '✅' },
  'create-transaction': { prefix: 'CREATE-TRANSACTION', emoji: '💳' },
  'generate-quote': { prefix: 'GENERATE-QUOTE', emoji: '📋' },
  'generate-report': { prefix: 'GENERATE-REPORT', emoji: '📊' },
  'get-policies': { prefix: 'GET-POLICIES', emoji: '📜' },
  'get-property-details': { prefix: 'GET-PROPERTY-DETAILS', emoji: '🏠' },
  'modify-reservation': { prefix: 'MODIFY-RESERVATION', emoji: '🔄' },
  'schedule-visit': { prefix: 'SCHEDULE-VISIT', emoji: '🗓️' },
  'send-property-media': { prefix: 'SEND-PROPERTY-MEDIA', emoji: '📸' },
  'track-metrics': { prefix: 'TRACK-METRICS', emoji: '📈' },
  'update-goal-progress': { prefix: 'UPDATE-GOAL-PROGRESS', emoji: '📈' },
  'update-lead': { prefix: 'UPDATE-LEAD', emoji: '🔄' },
  'update-lead-status': { prefix: 'UPDATE-LEAD-STATUS', emoji: '🔄' },
  'update-task': { prefix: 'UPDATE-TASK', emoji: '✏️' }
};

// Template aprimorado
const createTemplate = (functionName, prefix, emoji) => {
  const funcVarName = functionName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  const requestIdPrefix = functionName.replace(/-/g, '_').toLowerCase();
  
  return `export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = \`${requestIdPrefix}_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`;
  
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('${emoji} [${prefix}] Iniciando execução', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: args,
      paramsCount: Object.keys(args).length,
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [${prefix}] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await ${funcVarName}(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [${prefix}] Execução concluída com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        hasResult: !!result,
        resultType: typeof result,
        resultKeys: result && typeof result === 'object' ? Object.keys(result) : []
      },
      performance: {
        processingTime: \`\${processingTime}ms\`
      }
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('❌ [${prefix}] Falha na execução', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: \`\${processingTime}ms\`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: '${functionName} failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}`;
};

console.log('🚀 Aplicando logs aprimorados a todas as funções...\n');

let updatedCount = 0;
let skippedCount = 0;
let errorCount = 0;

Object.entries(functionMappings).forEach(([functionName, config]) => {
  const filePath = path.join(functionsPath, functionName, 'route.ts');
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${functionName}/route.ts não encontrado`);
      skippedCount++;
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se já foi atualizado
    if (content.includes('const requestId =')) {
      console.log(`✅ ${functionName} já atualizado`);
      skippedCount++;
      return;
    }

    // Extrair imports
    const lines = content.split('\n');
    const importLines = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('import') || line.trim() === '') {
        importLines.push(line);
      } else if (line.startsWith('export')) {
        break;
      }
      i++;
    }

    // Criar novo conteúdo
    const imports = importLines.join('\n');
    const newTemplate = createTemplate(functionName, config.prefix, config.emoji);
    const newContent = `${imports}\n\n${newTemplate}\n`;

    // Escrever arquivo
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ ${functionName} atualizado`);
    updatedCount++;

  } catch (error) {
    console.error(`❌ Erro ao atualizar ${functionName}:`, error.message);
    errorCount++;
  }
});

console.log(`\n🎉 Processo concluído!`);
console.log(`✅ Atualizados: ${updatedCount}`);
console.log(`⚠️  Já atualizados: ${skippedCount}`);
console.log(`❌ Erros: ${errorCount}`);
console.log(`\n📋 Para testar: curl -X POST localhost:3000/api/test/functions -d '{"testAll":true}'`);