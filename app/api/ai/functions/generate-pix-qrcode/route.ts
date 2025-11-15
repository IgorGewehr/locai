/**
 * AI FUNCTION: generate-pix-qrcode
 *
 * Generates instant PIX QR Code for payment
 * Creates transaction in Firestore and returns QR code for customer
 *
 * Sofia AI Usage Examples:
 * - "Gere um QR Code PIX de R$ 500 para o cliente Maria"
 * - "Crie um pagamento PIX de R$ 1.500 que expire em 60 minutos"
 * - "Preciso de um PIX de R$ 2.000 referente à reserva #123"
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { getAbacatePayService } from '@/lib/services/abacatepay-service';
import {
  toCents,
  toBRL,
  isAbacatePaySuccess,
  DEFAULT_PIX_EXPIRATION_MINUTES,
  MAX_PIX_EXPIRATION_MINUTES,
  MIN_PAYMENT_AMOUNT_CENTS,
  MAX_PAYMENT_AMOUNT_CENTS,
} from '@/lib/types/abacatepay';
import {
  TransactionType,
  TransactionStatus,
  TransactionCategory,
  PaymentMethod,
} from '@/lib/types/transaction-unified';

// ===== VALIDATION SCHEMA =====

const GeneratePixQrCodeSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),

  // Payment details
  amount: z.number()
    .positive('Amount must be positive')
    .min(toBRL(MIN_PAYMENT_AMOUNT_CENTS), `Minimum amount is R$ ${toBRL(MIN_PAYMENT_AMOUNT_CENTS).toFixed(2)}`)
    .max(toBRL(MAX_PAYMENT_AMOUNT_CENTS), `Maximum amount is R$ ${toBRL(MAX_PAYMENT_AMOUNT_CENTS).toFixed(2)}`),

  description: z.string()
    .min(3, 'Description must be at least 3 characters')
    .max(200, 'Description must be at most 200 characters'),

  // Expiration (in minutes)
  expiresIn: z.number()
    .int('Expiration must be an integer')
    .positive('Expiration must be positive')
    .max(MAX_PIX_EXPIRATION_MINUTES, `Maximum expiration is ${MAX_PIX_EXPIRATION_MINUTES} minutes`)
    .default(DEFAULT_PIX_EXPIRATION_MINUTES)
    .optional(),

  // Relations (optional)
  clientId: z.string().optional(),
  reservationId: z.string().optional(),
  propertyId: z.string().optional(),

  // Additional metadata
  category: z.enum([
    'reservation',
    'rent',
    'maintenance',
    'cleaning',
    'utilities',
    'commission',
    'marketing',
    'refund',
    'other',
  ] as const).default('reservation').optional(),

  notes: z.string().max(500).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

type GeneratePixQrCodeInput = z.infer<typeof GeneratePixQrCodeSchema>;

// ===== HANDLER =====

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `generate_pix_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();

    logger.info('[GENERATE-PIX-QRCODE] Starting execution', {
      requestId,
      tenantId: body.tenantId?.substring(0, 8) + '***',
      amount: body.amount,
      hasClientId: !!body.clientId,
      hasReservationId: !!body.reservationId,
    });

    // Validate input
    const validationResult = GeneratePixQrCodeSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[GENERATE-PIX-QRCODE] Validation failed', {
        requestId,
        errors: validationResult.error.flatten(),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Sanitize text inputs
    const sanitizedDescription = sanitizeUserInput(input.description);
    const sanitizedNotes = input.notes ? sanitizeUserInput(input.notes) : undefined;

    // Get services
    const services = new TenantServiceFactory(input.tenantId);
    const abacatepay = getAbacatePayService();

    // Get client data if clientId provided
    let clientData = null;
    let clientName = '';
    let clientEmail = '';
    let clientPhone = '';

    if (input.clientId) {
      try {
        const client = await services.clients.get(input.clientId);
        if (client) {
          clientData = client;
          clientName = client.name;
          clientEmail = client.email || '';
          clientPhone = client.phone || '';

          logger.info('[GENERATE-PIX-QRCODE] Client data retrieved', {
            requestId,
            clientId: input.clientId,
            clientName,
          });
        }
      } catch (error) {
        logger.warn('[GENERATE-PIX-QRCODE] Failed to get client data', {
          requestId,
          clientId: input.clientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Prepare AbacatePay request
    const amountCents = toCents(input.amount);
    const expiresInMinutes = input.expiresIn || DEFAULT_PIX_EXPIRATION_MINUTES;

    const pixRequest = {
      amount: amountCents,
      expiresIn: expiresInMinutes,
      description: sanitizedDescription,
      customer: clientData ? {
        name: clientName,
        cellphone: clientPhone || '(00) 0000-0000',
        email: clientEmail || 'noreply@locai.app',
        taxId: clientData.document || '000.000.000-00',
      } : undefined,
      metadata: {
        tenantId: input.tenantId,
        externalId: `${input.tenantId}_${Date.now()}`,
        clientId: input.clientId,
        reservationId: input.reservationId,
        propertyId: input.propertyId,
      },
    };

    logger.info('[GENERATE-PIX-QRCODE] Creating PIX QR Code via AbacatePay', {
      requestId,
      amountCents,
      expiresInMinutes,
    });

    // Create PIX QR Code via AbacatePay
    const pixResponse = await abacatepay.createPixQrCode(pixRequest);

    if (!isAbacatePaySuccess(pixResponse)) {
      logger.error('[GENERATE-PIX-QRCODE] AbacatePay API error', {
        requestId,
        error: pixResponse.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate PIX QR Code',
          details: pixResponse.error,
          requestId,
        },
        { status: 500 }
      );
    }

    const pixData = pixResponse.data;

    logger.info('[GENERATE-PIX-QRCODE] PIX QR Code created successfully', {
      requestId,
      pixId: pixData.id,
      amount: pixData.amount,
      expiresAt: pixData.expiresAt,
    });

    // Create transaction in Firestore
    const transactionData = {
      // Core fields
      amount: input.amount,
      type: TransactionType.INCOME,
      status: TransactionStatus.PENDING,
      description: sanitizedDescription,

      // Dates
      date: new Date(),
      dueDate: new Date(pixData.expiresAt),
      createdAt: new Date(),
      updatedAt: new Date(),

      // Categorization
      category: input.category || TransactionCategory.RESERVATION,

      // Payment details
      paymentMethod: PaymentMethod.PIX,

      // Relations
      clientId: input.clientId,
      clientName: clientName || undefined,
      reservationId: input.reservationId,
      propertyId: input.propertyId,

      // Recurrence
      isRecurring: false,

      // Audit
      createdBy: 'sofia_ai',
      notes: sanitizedNotes,
      tags: input.tags || ['pix', 'generated-by-ai'],

      // AI metadata
      createdByAI: true,

      // Tenant
      tenantId: input.tenantId,

      // AbacatePay integration
      abacatepayPixId: pixData.id,
      abacatepayStatus: pixData.status,
      abacatepayQrCodeBase64: pixData.brCodeBase64,
      abacatepayBrCode: pixData.brCode,
      abacatepayExpiresAt: new Date(pixData.expiresAt),
      abacatepayFee: pixData.platformFee,
      abacatepayExternalId: pixRequest.metadata.externalId,
      abacatepayMetadata: {
        customerId: pixData.customer?.id,
      },
    };

    const transactionId = await services.transactions.create(transactionData);

    logger.info('[GENERATE-PIX-QRCODE] Transaction created in Firestore', {
      requestId,
      transactionId,
      pixId: pixData.id,
    });

    // Prepare response
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        transactionId,
        pixId: pixData.id,
        amount: input.amount,
        amountFormatted: `R$ ${input.amount.toFixed(2)}`,
        description: sanitizedDescription,
        status: 'pending',

        // QR Code data
        qrCodeBase64: pixData.brCodeBase64,
        brCode: pixData.brCode,

        // Expiration
        expiresAt: pixData.expiresAt,
        expiresInMinutes: expiresInMinutes,

        // Client info
        clientId: input.clientId,
        clientName: clientName || undefined,

        // Additional info
        fee: toBRL(pixData.platformFee),
        feeFormatted: `R$ ${toBRL(pixData.platformFee).toFixed(2)}`,
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    };

    logger.info('[GENERATE-PIX-QRCODE] Execution completed successfully', {
      requestId,
      transactionId,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[GENERATE-PIX-QRCODE] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate PIX QR Code',
        requestId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined,
      },
      { status: 500 }
    );
  }
}
