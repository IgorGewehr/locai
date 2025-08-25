// app/api/metrics/route.ts
// Endpoint para métricas do agente IA + CRM

import { NextRequest, NextResponse } from 'next/server';
import { AgentMonitor } from '@/lib/monitoring/agent-monitor';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Validar autenticação
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obter métricas formatadas para dashboard
    const metrics = AgentMonitor.getMetricsForDashboard();

    logger.info('📊 [Metrics API] Métricas solicitadas', {
      userId: authContext.userId,
      tenantId: authContext.tenantId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ [Metrics API] Erro ao obter métricas', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validar autenticação
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'reset') {
      AgentMonitor.resetDaily();
      logger.info('🔄 [Metrics API] Reset manual executado', {
        userId: authContext.userId,
        tenantId: authContext.tenantId
      });

      return NextResponse.json({
        success: true,
        message: 'Métricas resetadas com sucesso'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('❌ [Metrics API] Erro no POST', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}