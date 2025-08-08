import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { VisitAppointment } from '@/lib/types/visit-appointment';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId é obrigatório' },
        { status: 400 }
      );
    }

    const visitId = params.id;

    logger.info('Buscando visita por ID', {
      tenantId,
      visitId,
      component: 'VisitsAPI',
      operation: 'GET_BY_ID'
    });

    const factory = new TenantServiceFactory(tenantId);
    const visitsService = factory.createService<VisitAppointment>('visits');
    const visit = await visitsService.get(visitId);

    if (!visit) {
      return NextResponse.json(
        { error: 'Visita não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: visit
    });

  } catch (error) {
    logger.error('Erro ao buscar visita', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      visitId: params.id,
      component: 'VisitsAPI',
      operation: 'GET_BY_ID'
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId é obrigatório' },
        { status: 400 }
      );
    }

    const visitId = params.id;
    const body = await request.json();

    logger.info('Atualizando visita', {
      tenantId,
      visitId,
      component: 'VisitsAPI',
      operation: 'PUT'
    });

    const factory = new TenantServiceFactory(tenantId);
    const visitsService = factory.createService<VisitAppointment>('visits');
    
    await visitsService.update(visitId, body);
    const updatedVisit = await visitsService.get(visitId);

    return NextResponse.json({
      success: true,
      data: updatedVisit
    });

  } catch (error) {
    logger.error('Erro ao atualizar visita', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      visitId: params.id,
      component: 'VisitsAPI',
      operation: 'PUT'
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId é obrigatório' },
        { status: 400 }
      );
    }

    const visitId = params.id;

    logger.info('Excluindo visita', {
      tenantId,
      visitId,
      component: 'VisitsAPI',
      operation: 'DELETE'
    });

    const factory = new TenantServiceFactory(tenantId);
    const visitsService = factory.createService<VisitAppointment>('visits');
    await visitsService.delete(visitId);

    return NextResponse.json({
      success: true,
      message: 'Visita excluída com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao excluir visita', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      visitId: params.id,
      component: 'VisitsAPI',
      operation: 'DELETE'
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}