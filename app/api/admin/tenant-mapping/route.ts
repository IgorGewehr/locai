// app/api/admin/tenant-mapping/route.ts
// API administrativa para gerenciar mapeamentos de telefone -> tenant

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndTenant } from '@/lib/utils/tenant-extractor';
import { tenantPhoneMappingService } from '@/lib/services/tenant-phone-mapping';
import { logger } from '@/lib/utils/logger';

// GET - Listar mapeamentos ativos
export async function GET(request: NextRequest) {
  const requestId = `mapping_get_${Date.now()}`;
  
  try {
    logger.info('📋 [Admin] Listando mapeamentos de telefone', { requestId });

    // Verificar autenticação e role admin
    const authResult = await requireAuthAndTenant(request);
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 });
    }

    const { tenantContext } = authResult;
    
    // Verificar se é admin
    if (tenantContext.userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem acessar mapeamentos.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    // Listar mapeamentos
    const mappings = await tenantPhoneMappingService.listActiveMappings();

    logger.info('✅ [Admin] Mapeamentos listados', {
      requestId,
      count: mappings.length,
      tenantId: tenantContext.tenantId
    });

    return NextResponse.json({
      success: true,
      data: {
        mappings: mappings.map(mapping => ({
          phone: mapping.phone.substring(0, 6) + '***',
          tenantId: mapping.tenantId,
          isActive: mapping.isActive,
          createdAt: mapping.createdAt,
          updatedAt: mapping.updatedAt
        })),
        total: mappings.length,
        currentTenant: tenantContext.tenantId
      },
      request: {
        id: requestId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('❌ [Admin] Erro ao listar mapeamentos', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      request: { id: requestId }
    }, { status: 500 });
  }
}

// POST - Criar/atualizar configuração de WhatsApp para tenant
export async function POST(request: NextRequest) {
  const requestId = `mapping_post_${Date.now()}`;
  
  try {
    logger.info('📝 [Admin] Configurando WhatsApp para tenant', { requestId });

    // Verificar autenticação
    const authResult = await requireAuthAndTenant(request);
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 });
    }

    const { tenantContext } = authResult;
    
    // Verificar se é admin
    if (tenantContext.userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem configurar mapeamentos.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    // Parse do body
    const body = await request.json();
    const { whatsappNumbers, targetTenantId } = body;

    if (!whatsappNumbers || !Array.isArray(whatsappNumbers)) {
      return NextResponse.json({
        success: false,
        error: 'Campo whatsappNumbers é obrigatório e deve ser um array',
        code: 'INVALID_PAYLOAD'
      }, { status: 400 });
    }

    // Usar tenantId do contexto ou permitir especificar outro (para super admins)
    const tenantId = targetTenantId || tenantContext.tenantId;

    // Atualizar configuração
    await tenantPhoneMappingService.updateTenantWhatsAppConfig(tenantId, whatsappNumbers);

    logger.info('✅ [Admin] Configuração WhatsApp atualizada', {
      requestId,
      tenantId,
      numbersCount: whatsappNumbers.length,
      updatedBy: tenantContext.userId
    });

    return NextResponse.json({
      success: true,
      message: 'Configuração WhatsApp atualizada com sucesso',
      data: {
        tenantId,
        whatsappNumbers: whatsappNumbers.map((num: string) => num.substring(0, 6) + '***'),
        updatedAt: new Date().toISOString()
      },
      request: {
        id: requestId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('❌ [Admin] Erro ao configurar WhatsApp', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      request: { id: requestId }
    }, { status: 500 });
  }
}

// PUT - Criar mapeamento manual de telefone -> tenant
export async function PUT(request: NextRequest) {
  const requestId = `mapping_put_${Date.now()}`;
  
  try {
    logger.info('🔗 [Admin] Criando mapeamento manual', { requestId });

    // Verificar autenticação
    const authResult = await requireAuthAndTenant(request);
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 });
    }

    const { tenantContext } = authResult;
    
    // Verificar se é admin
    if (tenantContext.userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem criar mapeamentos.',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    // Parse do body
    const body = await request.json();
    const { phone, targetTenantId } = body;

    if (!phone) {
      return NextResponse.json({
        success: false,
        error: 'Campo phone é obrigatório',
        code: 'INVALID_PAYLOAD'
      }, { status: 400 });
    }

    // Usar tenantId do contexto ou permitir especificar outro
    const tenantId = targetTenantId || tenantContext.tenantId;

    // Criar mapeamento
    await tenantPhoneMappingService.createMapping(phone, tenantId);

    logger.info('✅ [Admin] Mapeamento manual criado', {
      requestId,
      phone: phone.substring(0, 6) + '***',
      tenantId,
      createdBy: tenantContext.userId
    });

    return NextResponse.json({
      success: true,
      message: 'Mapeamento criado com sucesso',
      data: {
        phone: phone.substring(0, 6) + '***',
        tenantId,
        createdAt: new Date().toISOString()
      },
      request: {
        id: requestId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('❌ [Admin] Erro ao criar mapeamento', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      request: { id: requestId }
    }, { status: 500 });
  }
}