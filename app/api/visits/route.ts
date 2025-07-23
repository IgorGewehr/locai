import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { VisitAppointment, VisitStatus } from '@/lib/types/visit-appointment';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId é obrigatório' },
        { status: 400 }
      );
    }

    logger.info('Buscando visitas', {
      tenantId,
      component: 'VisitsAPI',
      operation: 'GET'
    });

    const factory = new TenantServiceFactory(tenantId);
    const visitsService = factory.createService<VisitAppointment>('visits');
    const visits = await visitsService.getAll();

    // Ordenar por data mais recente
    const sortedVisits = visits.sort((a, b) => {
      const dateA = new Date(a.scheduledDate);
      const dateB = new Date(b.scheduledDate);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      success: true,
      data: sortedVisits
    });

  } catch (error) {
    logger.error('Erro ao buscar visitas', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      component: 'VisitsAPI',
      operation: 'GET'
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId é obrigatório' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validações básicas
    if (!body.clientName || !body.clientPhone || !body.propertyId || !body.scheduledDate || !body.scheduledTime) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: clientName, clientPhone, propertyId, scheduledDate, scheduledTime' },
        { status: 400 }
      );
    }

    logger.info('Criando nova visita', {
      tenantId,
      clientName: body.clientName,
      propertyId: body.propertyId,
      component: 'VisitsAPI',
      operation: 'POST'
    });

    const factory = new TenantServiceFactory(tenantId);
    const visitsService = factory.createService<VisitAppointment>('visits');

    const visitData = {
      tenantId,
      clientName: body.clientName,
      clientPhone: body.clientPhone,
      clientId: body.clientId || `temp_${Date.now()}`,
      propertyId: body.propertyId,
      propertyName: body.propertyName || 'Propriedade',
      propertyAddress: body.propertyAddress || '',
      scheduledDate: new Date(body.scheduledDate),
      scheduledTime: body.scheduledTime,
      duration: body.duration || 60,
      status: VisitStatus.SCHEDULED,
      notes: body.notes || '',
      source: body.source || 'manual',
      confirmedByClient: false,
      confirmedByAgent: false
    };

    const visitId = await visitsService.create(visitData);
    const newVisit = await visitsService.get(visitId);

    return NextResponse.json({
      success: true,
      data: newVisit
    }, { status: 201 });

  } catch (error) {
    logger.error('Erro ao criar visita', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      component: 'VisitsAPI',
      operation: 'POST'
    });

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}