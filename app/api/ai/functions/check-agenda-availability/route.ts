import { NextRequest, NextResponse } from 'next/server';
import { checkAgendaAvailability } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `check_agenda_availability_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    logger.info('📅 [CHECK-AGENDA-AVAILABILITY] Iniciando execução', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: args,
      paramsCount: Object.keys(args).length,
      source: request.headers.get('x-source') || 'unknown',
      requestType: args.day ? 'single_day' : 'full_month'
    });

    if (!tenantId) {
      logger.warn('⚠️ [CHECK-AGENDA-AVAILABILITY] TenantId não fornecido', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'TenantId is required',
          requestId 
        },
        { status: 400 }
      );
    }

    // Validar parâmetros obrigatórios
    if (!args.year || !args.month) {
      logger.warn('⚠️ [CHECK-AGENDA-AVAILABILITY] Parâmetros obrigatórios ausentes', { 
        requestId, 
        hasYear: !!args.year, 
        hasMonth: !!args.month 
      });
      return NextResponse.json(
        { 
          success: false,
          error: 'Year and month are required parameters',
          requestId 
        },
        { status: 400 }
      );
    }

    // Validar valores dos parâmetros
    const currentYear = new Date().getFullYear();
    if (args.year < currentYear - 1 || args.year > currentYear + 5) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Year must be between ' + (currentYear - 1) + ' and ' + (currentYear + 5),
          requestId 
        },
        { status: 400 }
      );
    }

    if (args.month < 1 || args.month > 12) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Month must be between 1 and 12',
          requestId 
        },
        { status: 400 }
      );
    }

    if (args.day && (args.day < 1 || args.day > 31)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Day must be between 1 and 31',
          requestId 
        },
        { status: 400 }
      );
    }

    const result = await checkAgendaAvailability(args, tenantId);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [CHECK-AGENDA-AVAILABILITY] Execução concluída com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        success: result.success,
        totalOccupied: result.totalOccupied,
        hasAvailableSuggestions: !!result.availableSuggestions,
        suggestionsCount: result.availableSuggestions?.length || 0,
        queryType: result.date ? 'single_day' : 'full_month'
      },
      performance: {
        processingTime: `${processingTime}ms`
      }
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
        queryType: result.date ? 'single_day' : 'full_month'
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('❌ [CHECK-AGENDA-AVAILABILITY] Falha na execução', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'check-agenda-availability failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}