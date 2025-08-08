import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { VisitStatus, VisitAppointment } from '@/lib/types/visit-appointment';

export async function PATCH(
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
    const { status } = body;

    if (!status || !Object.values(VisitStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    logger.info('Atualizando status da visita', {
      tenantId,
      visitId,
      newStatus: status,
      component: 'VisitsAPI',
      operation: 'PATCH_STATUS'
    });

    const factory = new TenantServiceFactory(tenantId);
    const visitsService = factory.createService<VisitAppointment>('visits');
    
    const updateData: Partial<VisitAppointment> = { status };

    // Se estiver confirmando, marcar como confirmado
    if (status === VisitStatus.CONFIRMED) {
      updateData.confirmedByClient = true;
      updateData.confirmedByAgent = true;
    }

    await visitsService.update(visitId, updateData);
    const updatedVisit = await visitsService.get(visitId);

    return NextResponse.json({
      success: true,
      data: updatedVisit
    });

  } catch (error) {
    logger.error('Erro ao atualizar status da visita', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      visitId: params.id,
      component: 'VisitsAPI',
      operation: 'PATCH_STATUS'
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}