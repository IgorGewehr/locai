import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { VisitStatus, VisitResult, VisitAppointment } from '@/lib/types/visit-appointment';

export async function POST(
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
    const { result } = body;

    if (!result) {
      return NextResponse.json(
        { error: 'Resultado da visita é obrigatório' },
        { status: 400 }
      );
    }

    logger.info('Completando visita', {
      tenantId,
      visitId,
      component: 'VisitsAPI',
      operation: 'POST_COMPLETE'
    });

    const factory = new TenantServiceFactory(tenantId);
    const visitsService = factory.createService<VisitAppointment>('visits');
    
    const visitResult: VisitResult = {
      ...result,
      completedAt: new Date()
    };

    const updateData: Partial<VisitAppointment> = {
      status: VisitStatus.COMPLETED,
      visitResult
    };

    await visitsService.update(visitId, updateData);
    const updatedVisit = await visitsService.get(visitId);

    return NextResponse.json({
      success: true,
      data: updatedVisit
    });

  } catch (error) {
    logger.error('Erro ao completar visita', error instanceof Error ? error : undefined, {
      visitId: params.id,
      component: 'VisitsAPI',
      operation: 'POST_COMPLETE'
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}