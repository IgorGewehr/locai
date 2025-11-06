import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createReservation } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { sanitizeUserInput } from '@/lib/utils/validation';

// 🛡️ ZOD VALIDATION SCHEMA
const CreateReservationSchema = z.object({
  tenantId: z.string().min(10).max(100, 'TenantId inválido'),

  propertyId: z.string().min(1, 'PropertyId é obrigatório').max(100),

  clientPhone: z.string()
    .min(10, 'Telefone deve ter no mínimo 10 dígitos')
    .max(20, 'Telefone inválido')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Telefone contém caracteres inválidos'),

  checkIn: z.string()
    .refine((val) => !isNaN(Date.parse(val)), 'Check-in deve ser uma data válida')
    .refine((val) => new Date(val) > new Date(), 'Check-in deve ser uma data futura'),

  checkOut: z.string()
    .refine((val) => !isNaN(Date.parse(val)), 'Check-out deve ser uma data válida'),

  guests: z.number()
    .int('Número de hóspedes deve ser inteiro')
    .positive('Número de hóspedes deve ser positivo')
    .min(1, 'Deve haver pelo menos 1 hóspede')
    .max(50, 'Número de hóspedes excede limite permitido'),

  totalPrice: z.number()
    .positive('Preço total deve ser positivo')
    .max(1000000, 'Preço total excede limite permitido'),

  // Optional fields
  specialRequests: z.string().max(1000, 'Pedidos especiais muito longos').optional(),
  paidAmount: z.number().min(0).max(1000000).optional(),
  paymentMethod: z.enum(['pix', 'credit_card', 'debit_card', 'bank_transfer', 'cash', 'stripe']).optional(),

}).refine((data) => {
  // Check-out must be after check-in
  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);
  return checkOutDate > checkInDate;
}, {
  message: 'Check-out deve ser posterior ao check-in',
  path: ['checkOut']
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `reservation_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();

    // 🛡️ VALIDAÇÃO COM ZOD
    const validationResult = CreateReservationSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      logger.warn('⚠️ [CREATE-RESERVATION] Dados inválidos', {
        requestId,
        errors: errors.fieldErrors,
        receivedData: {
          tenantId: body.tenantId?.substring(0, 8) + '***',
          propertyId: body.propertyId,
          clientPhone: body.clientPhone?.substring(0, 6) + '***'
        }
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: errors.fieldErrors,
          requestId
        },
        { status: 400 }
      );
    }

    const { tenantId, ...args } = validationResult.data;

    // 🛡️ SANITIZAÇÃO DE INPUTS DE TEXTO
    const sanitizedArgs = {
      ...args,
      specialRequests: args.specialRequests ? sanitizeUserInput(args.specialRequests) : undefined
    };

    logger.info('📅 [CREATE-RESERVATION] Criando nova reserva', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      reservationDetails: {
        propertyId: sanitizedArgs.propertyId,
        clientPhone: sanitizedArgs.clientPhone.substring(0, 6) + '***',
        checkIn: sanitizedArgs.checkIn,
        checkOut: sanitizedArgs.checkOut,
        guests: sanitizedArgs.guests,
        totalPrice: sanitizedArgs.totalPrice,
        hasSpecialRequests: !!sanitizedArgs.specialRequests
      },
      source: request.headers.get('x-source') || 'unknown'
    });

    // Timeout protection: 30 segundos
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Reservation creation timeout after 30s')), 30000);
    });

    const result = await Promise.race([
      createReservation(sanitizedArgs, tenantId),
      timeoutPromise
    ]);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [CREATE-RESERVATION] Reserva criada com sucesso', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      result: {
        reservationId: result?.reservationId,
        status: result?.status,
        totalAmount: result?.totalPrice,
        propertyName: result?.propertyName,
        created: !!result?.reservationId
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
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('❌ [CREATE-RESERVATION] Falha na criação da reserva', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Create reservation failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error' : 
          undefined
      },
      { status: 500 }
    );
  }
}