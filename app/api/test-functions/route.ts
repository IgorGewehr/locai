// Endpoint temporário para testar funções individualmente
import { NextRequest, NextResponse } from 'next/server';
import { AgentFunctions } from '@/lib/ai/agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { functionName, args, tenantId = 'default-tenant' } = body;

    if (!functionName) {
      return NextResponse.json(
        { success: false, error: 'functionName is required' },
        { status: 400 }
      );
    }

    logger.info('🧪 [TestFunctions] Testando função', {
      functionName,
      args,
      tenantId
    });

    const startTime = Date.now();
    const result = await AgentFunctions.executeFunction(functionName, args || {}, tenantId);
    const executionTime = Date.now() - startTime;

    logger.info('✅ [TestFunctions] Função executada', {
      functionName,
      success: result.success,
      executionTime: `${executionTime}ms`
    });

    return NextResponse.json({
      success: true,
      functionName,
      result,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('❌ [TestFunctions] Erro na execução', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    }, { status: 500 });
  }
}