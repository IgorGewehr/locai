/**
 * TENANT FINANCIAL INFO API
 *
 * Gerencia informações financeiras do tenant (dados bancários para TED)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

// Validation Schema
const FinancialInfoSchema = z.object({
  bankName: z.string().min(1, 'Nome do banco é obrigatório'),
  bankCode: z.string().min(1, 'Código do banco é obrigatório'),
  agencyNumber: z.string().min(1, 'Número da agência é obrigatório'),
  agencyDigit: z.string().optional(),
  accountNumber: z.string().min(1, 'Número da conta é obrigatório'),
  accountDigit: z.string().min(1, 'Dígito da conta é obrigatório'),
  accountType: z.enum(['corrente', 'poupanca']),
  pixKey: z.string().optional(),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']).optional(),
  accountHolderName: z.string().min(1, 'Nome do titular é obrigatório'),
  accountHolderDocument: z.string().min(1, 'CPF/CNPJ do titular é obrigatório'),
});

/**
 * GET - Buscar informações financeiras do tenant
 */
export async function GET(request: NextRequest) {
  const requestId = `financial_info_get_${Date.now()}`;

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    const services = new TenantServiceFactory(tenantId);

    // Buscar documento financial_info do tenant
    const configService = services.createService('tenant_config');
    const configs = await configService.getAll();

    let financialInfo = null;
    if (configs.length > 0 && configs[0].financialInfo) {
      financialInfo = configs[0].financialInfo;
    }

    logger.info('[FINANCIAL-INFO] Info retrieved', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      hasInfo: !!financialInfo,
    });

    return NextResponse.json({
      success: true,
      data: financialInfo,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[FINANCIAL-INFO] GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return handleApiError(error);
  }
}

/**
 * POST - Salvar informações financeiras do tenant
 */
export async function POST(request: NextRequest) {
  const requestId = `financial_info_post_${Date.now()}`;

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    const body = await request.json();

    // Validate
    const result = FinancialInfoSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', code: 'VALIDATION_ERROR', details: result.error.issues },
        { status: 400 }
      );
    }

    const financialInfo = result.data;

    const services = new TenantServiceFactory(tenantId);
    const configService = services.createService('tenant_config');

    // Buscar ou criar config
    const configs = await configService.getAll();
    let configId: string;

    if (configs.length > 0) {
      // Update existing
      configId = configs[0].id!;
      await configService.update(configId, {
        financialInfo,
        updatedAt: new Date(),
      });
    } else {
      // Create new
      configId = await configService.create({
        tenantId,
        financialInfo,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    logger.info('[FINANCIAL-INFO] Info saved', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      configId,
    });

    return NextResponse.json({
      success: true,
      message: 'Informações financeiras salvas com sucesso',
      data: financialInfo,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[FINANCIAL-INFO] POST failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return handleApiError(error);
  }
}
