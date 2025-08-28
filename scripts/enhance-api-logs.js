#!/usr/bin/env node

/**
 * Script para melhorar logs em todas as rotas /api/ai/functions
 * Adiciona logs detalhados com requestId, timing e dados estruturados
 */

const fs = require('fs');
const path = require('path');

// Template do novo handler com logs detalhados
const createEnhancedHandler = (functionName, logPrefix) => `
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = \`${functionName.toLowerCase()}_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`;
  
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('🔥 [${logPrefix}] Iniciando execução', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: args,
      paramsCount: Object.keys(args).length,
      source: request.headers.get('x-source') || 'unknown',
      userAgent: request.headers.get('user-agent')
    });

    if (!tenantId) {
      logger.warn('⚠️ [${logPrefix}] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await ${functionName}(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [${logPrefix}] Execução concluída', {
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
    
    logger.error('❌ [${logPrefix}] Falha na execução', {
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
}`.trim();

// Funções a serem atualizadas (excluindo as já feitas)
const functionsToUpdate = [
  { file: 'register-client', func: 'registerClient', prefix: 'REGISTER-CLIENT' },
  { file: 'create-lead', func: 'createLead', prefix: 'CREATE-LEAD' },
  { file: 'update-lead', func: 'updateLead', prefix: 'UPDATE-LEAD' },
  { file: 'classify-lead', func: 'classifyLead', prefix: 'CLASSIFY-LEAD' },
  { file: 'update-lead-status', func: 'updateLeadStatus', prefix: 'UPDATE-LEAD-STATUS' },
  { file: 'get-property-details', func: 'getPropertyDetails', prefix: 'GET-PROPERTY-DETAILS' },
  { file: 'send-property-media', func: 'sendPropertyMedia', prefix: 'SEND-PROPERTY-MEDIA' },
  { file: 'check-availability', func: 'checkAvailability', prefix: 'CHECK-AVAILABILITY' },
  { file: 'schedule-visit', func: 'scheduleVisit', prefix: 'SCHEDULE-VISIT' },
  { file: 'check-visit-availability', func: 'checkVisitAvailability', prefix: 'CHECK-VISIT-AVAILABILITY' },
  { file: 'cancel-reservation', func: 'cancelReservation', prefix: 'CANCEL-RESERVATION' },
  { file: 'modify-reservation', func: 'modifyReservation', prefix: 'MODIFY-RESERVATION' },
  { file: 'create-transaction', func: 'createTransaction', prefix: 'CREATE-TRANSACTION' },
  { file: 'generate-quote', func: 'generateQuote', prefix: 'GENERATE-QUOTE' },
  { file: 'get-policies', func: 'getPolicies', prefix: 'GET-POLICIES' },
  { file: 'create-goal', func: 'createGoal', prefix: 'CREATE-GOAL' },
  { file: 'update-goal-progress', func: 'updateGoalProgress', prefix: 'UPDATE-GOAL-PROGRESS' },
  { file: 'analyze-performance', func: 'analyzePerformance', prefix: 'ANALYZE-PERFORMANCE' },
  { file: 'track-metrics', func: 'trackMetrics', prefix: 'TRACK-METRICS' },
  { file: 'generate-report', func: 'generateReport', prefix: 'GENERATE-REPORT' },
  { file: 'create-task', func: 'createTask', prefix: 'CREATE-TASK' },
  { file: 'update-task', func: 'updateTask', prefix: 'UPDATE-TASK' }
];

const basePath = '/mnt/c/Users/Administrador/Documents/Projetos/locai/app/api/ai/functions';

console.log('🚀 Iniciando atualização dos logs das funções API...\n');

functionsToUpdate.forEach(({ file, func, prefix }) => {
  const filePath = path.join(basePath, file, 'route.ts');
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${file}/route.ts`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se já foi atualizado
    if (content.includes('const requestId = ')) {
      console.log(`✅ ${file} já está atualizado`);
      return;
    }

    // Extrair os imports
    const importLines = content.split('\\n').filter(line => 
      line.startsWith('import') || line.trim() === ''
    ).join('\\n');

    // Criar novo conteúdo
    const newContent = `${importLines}

${createEnhancedHandler(func, prefix)}
`;

    // Escrever arquivo
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Atualizado: ${file}`);

  } catch (error) {
    console.error(`❌ Erro ao atualizar ${file}:`, error.message);
  }
});

console.log('\\n🎉 Atualização dos logs concluída!');
console.log('\\n📋 Para testar:');
console.log('1. Faça uma chamada para qualquer função API');
console.log('2. Verifique os logs com grep: grep "🔥\\|✅\\|❌" logs/app.log');
console.log('3. Cada requisição terá um requestId único para tracking');