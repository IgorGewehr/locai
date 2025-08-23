import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { VisitAppointment, VisitStatus } from '@/lib/types/visit-appointment';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { safeParseDate, safeFormatDate } from '@/lib/utils/dateUtils';
import { isValid } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const tenantId = authContext.tenantId

    logger.info('Buscando visitas', {
      tenantId,
      component: 'VisitsAPI',
      operation: 'GET'
    });

    const factory = new TenantServiceFactory(tenantId);
    const visitsService = factory.createService<VisitAppointment>('visits');
    const visits = await visitsService.getAll();

    // Ordenar por data mais recente (com validação de datas)
    const sortedVisits = visits.sort((a, b) => {
      const dateA = safeParseDate(a.scheduledDate);
      const dateB = safeParseDate(b.scheduledDate);
      
      // Se ambas as datas são válidas, comparar normalmente
      if (dateA && dateB && isValid(dateA) && isValid(dateB)) {
        return dateB.getTime() - dateA.getTime();
      }
      
      // Se apenas uma data é válida, ela vem primeiro
      if (dateA && isValid(dateA) && (!dateB || !isValid(dateB))) {
        return -1; // dateA vem primeiro
      }
      if (dateB && isValid(dateB) && (!dateA || !isValid(dateA))) {
        return 1; // dateB vem primeiro
      }
      
      // Se ambas são inválidas, manter ordem original
      return 0;
    });

    // Add formatted dates for frontend consumption
    const visitsWithFormattedDates = sortedVisits.map(visit => ({
      ...visit,
      scheduledDateFormatted: safeFormatDate(visit.scheduledDate, 'dd/MM/yyyy'),
      scheduledDateTimeFormatted: safeFormatDate(visit.scheduledDate, 'dd/MM/yyyy HH:mm')
    }));

    return NextResponse.json({
      success: true,
      data: visitsWithFormattedDates
    });

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const tenantId = authContext.tenantId

    const body = await request.json();

    // Validações básicas
    if (!body.clientName || !body.clientPhone || !body.propertyId || !body.scheduledDate || !body.scheduledTime) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: clientName, clientPhone, propertyId, scheduledDate, scheduledTime' },
        { status: 400 }
      );
    }

    // Validate phone format (basic)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(body.clientPhone.replace(/\D/g, ''))) {
      return NextResponse.json(
        { error: 'Formato de telefone inválido' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(body.scheduledTime)) {
      return NextResponse.json(
        { error: 'Formato de horário inválido (use HH:MM)' },
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

    // Validate and parse scheduledDate safely
    const parsedDate = safeParseDate(body.scheduledDate);
    if (!parsedDate || !isValid(parsedDate)) {
      return NextResponse.json(
        { error: 'Data de agendamento inválida' },
        { status: 400 }
      );
    }

    // Prevent scheduling visits in the past (allow same day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return NextResponse.json(
        { error: 'Não é possível agendar visitas em datas passadas' },
        { status: 400 }
      );
    }

    const now = new Date();
    const visitData = {
      tenantId,
      clientName: body.clientName,
      clientPhone: body.clientPhone,
      clientId: body.clientId || `temp_${Date.now()}`,
      propertyId: body.propertyId,
      propertyName: body.propertyName || 'Propriedade',
      propertyAddress: body.propertyAddress || '',
      scheduledDate: parsedDate,
      scheduledTime: body.scheduledTime,
      duration: body.duration || 60,
      status: VisitStatus.SCHEDULED,
      notes: body.notes || '',
      source: body.source || 'manual',
      confirmedByClient: false,
      confirmedByAgent: false,
      createdAt: now,
      updatedAt: now
    };

    const visitId = await visitsService.create(visitData);
    const newVisit = await visitsService.get(visitId);

    return NextResponse.json({
      success: true,
      data: newVisit
    }, { status: 201 });

  } catch (error) {
    return handleApiError(error)
  }
}