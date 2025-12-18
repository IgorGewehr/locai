/**
 * RECONCILE-PAYMENTS API ROUTE
 *
 * Endpoint para reconciliação de pagamentos entre AbacatePay e carteiras internas
 * Pode ser chamado manualmente ou via cron job para garantir consistência
 *
 * Features:
 * - Reconciliação global (todas as carteiras)
 * - Reconciliação por tenant específico
 * - Sync de pagamentos pendentes
 * - Detecção de discrepâncias
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import {
  runReconciliation,
  runTenantReconciliation,
  getRecentReconciliations,
  getPendingDiscrepancies,
} from '@/lib/services/abacatepay-reconciliation-service';

// Schema de validação
const ReconcileSchema = z.object({
  // Tipo de reconciliação
  type: z.enum(['global', 'tenant', 'status']).default('tenant'),

  // TenantId (obrigatório para tipo 'tenant')
  tenantId: z.string().optional(),

  // Incluir histórico de reconciliações
  includeHistory: z.boolean().optional().default(false),

  // Incluir discrepâncias pendentes
  includeDiscrepancies: z.boolean().optional().default(false),
});

type ReconcileRequest = z.infer<typeof ReconcileSchema>;

/**
 * POST /api/ai/functions/reconcile-payments
 *
 * Executa reconciliação de pagamentos
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `reconcile_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    // 1. Autenticar (N8N secret ou Firebase Auth)
    const authHeader = request.headers.get('Authorization');
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;
    const cronSecret = process.env.CRON_SECRET;

    let isN8nAuth = false;
    let isCronAuth = false;
    let authenticatedTenantId: string | null = null;

    // Verificar se é chamada do N8N
    if (n8nSecret && authHeader === `Bearer ${n8nSecret}`) {
      isN8nAuth = true;
      logger.info('[RECONCILE] N8N authenticated request', { requestId });
    }
    // Verificar se é cron job
    else if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isCronAuth = true;
      logger.info('[RECONCILE] Cron authenticated request', { requestId });
    }
    // Verificar Firebase Auth
    else {
      const authContext = await validateFirebaseAuth(request);

      if (!authContext.authenticated || !authContext.tenantId) {
        logger.warn('[RECONCILE] Unauthorized request', { requestId });
        return NextResponse.json(
          { success: false, error: 'Não autorizado', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }

      authenticatedTenantId = authContext.tenantId;
    }

    // 2. Parse e validar body
    const body = await request.json();
    const validation = ReconcileSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('[RECONCILE] Validation failed', {
        requestId,
        errors: validation.error.errors,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // 3. Verificar permissões
    // - Global reconciliation só pode ser feita via N8N ou Cron
    // - Tenant reconciliation pode ser feita pelo próprio tenant
    if (data.type === 'global' && !isN8nAuth && !isCronAuth) {
      logger.warn('[RECONCILE] Global reconciliation requires N8N/Cron auth', {
        requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Reconciliação global requer autenticação administrativa',
          code: 'PERMISSION_DENIED',
        },
        { status: 403 }
      );
    }

    // Se é tenant reconciliation, garantir que o tenant está autenticado
    if (data.type === 'tenant') {
      const targetTenantId = data.tenantId || authenticatedTenantId;

      if (!targetTenantId) {
        return NextResponse.json(
          {
            success: false,
            error: 'TenantId é obrigatório para reconciliação de tenant',
            code: 'TENANT_REQUIRED',
          },
          { status: 400 }
        );
      }

      // Se não é N8N/Cron, verificar se o tenant corresponde
      if (!isN8nAuth && !isCronAuth && authenticatedTenantId !== targetTenantId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Não autorizado para este tenant',
            code: 'TENANT_MISMATCH',
          },
          { status: 403 }
        );
      }

      data.tenantId = targetTenantId;
    }

    logger.info('[RECONCILE] Starting reconciliation', {
      requestId,
      type: data.type,
      tenantId: data.tenantId?.substring(0, 8) + '***',
      isN8nAuth,
      isCronAuth,
    });

    // 4. Executar reconciliação
    let result;
    let history = null;
    let discrepancies = null;

    switch (data.type) {
      case 'global':
        result = await runReconciliation();
        break;

      case 'tenant':
        result = await runTenantReconciliation(data.tenantId!);
        break;

      case 'status':
        // Apenas retorna histórico e status
        result = {
          status: 'ok',
          message: 'Reconciliation service is running',
        };
        break;
    }

    // 5. Incluir dados adicionais se solicitado
    if (data.includeHistory) {
      history = await getRecentReconciliations(5);
    }

    if (data.includeDiscrepancies && (isN8nAuth || isCronAuth)) {
      discrepancies = await getPendingDiscrepancies();
    }

    const processingTime = Date.now() - startTime;

    logger.info('[RECONCILE] Reconciliation completed', {
      requestId,
      type: data.type,
      processingTime: `${processingTime}ms`,
      status: (result as any).status || 'completed',
    });

    // 6. Retornar resultado
    return NextResponse.json({
      success: true,
      data: {
        type: data.type,
        result,
        ...(history && { history }),
        ...(discrepancies && { discrepancies }),
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[RECONCILE] Reconciliation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao executar reconciliação',
        code: 'RECONCILIATION_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/functions/reconcile-payments
 *
 * Health check e status do serviço
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar auth para informações detalhadas
    const authHeader = request.headers.get('Authorization');
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;
    const cronSecret = process.env.CRON_SECRET;

    const isAdmin =
      (n8nSecret && authHeader === `Bearer ${n8nSecret}`) ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`);

    const baseResponse = {
      service: 'Reconcile Payments API',
      status: 'active',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        global: 'POST with type=global (admin only)',
        tenant: 'POST with type=tenant and tenantId',
        status: 'POST with type=status',
      },
      description: 'Reconcilia pagamentos entre AbacatePay e carteiras internas',
    };

    // Se é admin, incluir estatísticas
    if (isAdmin) {
      const recentReconciliations = await getRecentReconciliations(3);
      const pendingDiscrepancies = await getPendingDiscrepancies();

      return NextResponse.json({
        ...baseResponse,
        stats: {
          recentReconciliations: recentReconciliations.length,
          pendingDiscrepancies: pendingDiscrepancies.length,
          lastReconciliation: recentReconciliations[0]?.timestamp || null,
        },
      });
    }

    return NextResponse.json(baseResponse);

  } catch (error) {
    logger.error('[RECONCILE] Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({
      service: 'Reconcile Payments API',
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
}
