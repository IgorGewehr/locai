/**
 * AI FUNCTION: create-payment-link
 *
 * Creates a payment link (billing) for customer to pay online
 * Supports one-time and multiple payment options
 *
 * Sofia AI Usage Examples:
 * - "Crie um link de pagamento de R$ 1.500 para o cliente João"
 * - "Gere uma cobrança de R$ 3.000 referente à reserva #123"
 * - "Preciso de um link de pagamento para a propriedade XYZ"
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
  BillingFrequency,
  AbacatePayMethod,
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

const CreatePaymentLinkSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),

  // Payment details
  amount: z.number()
    .positive('Amount must be positive')
    .min(toBRL(MIN_PAYMENT_AMOUNT_CENTS), `Minimum amount is R$ ${toBRL(MIN_PAYMENT_AMOUNT_CENTS).toFixed(2)}`)
    .max(toBRL(MAX_PAYMENT_AMOUNT_CENTS), `Maximum amount is R$ ${toBRL(MAX_PAYMENT_AMOUNT_CENTS).toFixed(2)}`),

  description: z.string()
    .min(3, 'Description must be at least 3 characters')
    .max(200, 'Description must be at most 200 characters'),

  // Product details (for billing)
  productName: z.string()
    .min(3, 'Product name must be at least 3 characters')
    .max(100)
    .optional(),

  // Payment options
  frequency: z.enum(['ONE_TIME', 'MULTIPLE_PAYMENTS']).default('ONE_TIME').optional(),
  methods: z.array(z.enum(['PIX', 'CARD'])).default(['PIX']).optional(),

  // Due date
  dueDate: z.string().datetime().optional(),

  // Coupons
  allowCoupons: z.boolean().default(false).optional(),
  coupons: z.array(z.string()).max(10).optional(),

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

type CreatePaymentLinkInput = z.infer<typeof CreatePaymentLinkSchema>;

// ===== HANDLER =====

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `create_payment_link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();

    logger.info('[CREATE-PAYMENT-LINK] Starting execution', {
      requestId,
      tenantId: body.tenantId?.substring(0, 8) + '***',
      amount: body.amount,
      hasClientId: !!body.clientId,
    });

    // Validate input
    const validationResult = CreatePaymentLinkSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[CREATE-PAYMENT-LINK] Validation failed', {
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
    const sanitizedProductName = input.productName
      ? sanitizeUserInput(input.productName)
      : sanitizedDescription;
    const sanitizedNotes = input.notes ? sanitizeUserInput(input.notes) : undefined;

    // Get services
    const services = new TenantServiceFactory(input.tenantId);
    const abacatepay = getAbacatePayService();

    // Get client data if clientId provided
    let clientData = null;
    let clientName = '';
    let clientEmail = '';
    let clientPhone = '';
    let clientTaxId = '';

    if (input.clientId) {
      try {
        const client = await services.clients.get(input.clientId);
        if (client) {
          clientData = client;
          clientName = client.name;
          clientEmail = client.email || '';
          clientPhone = client.phone || '';
          clientTaxId = client.document || '';

          logger.info('[CREATE-PAYMENT-LINK] Client data retrieved', {
            requestId,
            clientId: input.clientId,
            clientName,
          });
        }
      } catch (error) {
        logger.warn('[CREATE-PAYMENT-LINK] Failed to get client data', {
          requestId,
          clientId: input.clientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Get property data if propertyId provided
    let propertyData = null;
    let propertyName = '';

    if (input.propertyId) {
      try {
        const property = await services.properties.getById(input.propertyId);
        if (property) {
          propertyData = property;
          propertyName = (property as any).name || '';

          logger.info('[CREATE-PAYMENT-LINK] Property data retrieved', {
            requestId,
            propertyId: input.propertyId,
            propertyName,
          });
        }
      } catch (error) {
        logger.warn('[CREATE-PAYMENT-LINK] Failed to get property data', {
          requestId,
          propertyId: input.propertyId,
        });
      }
    }

    // Prepare AbacatePay billing request
    const amountCents = toCents(input.amount);
    const externalId = `${input.tenantId}_${Date.now()}`;

    // URLs (você pode configurar essas URLs no .env)
    const returnUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/financeiro`
      : 'https://app.locai.com.br/dashboard/financeiro';

    const completionUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/pagamento/sucesso`
      : 'https://app.locai.com.br/pagamento/sucesso';

    const billingRequest = {
      frequency: (input.frequency || 'ONE_TIME') as BillingFrequency,
      methods: (input.methods || ['PIX']) as AbacatePayMethod[],
      products: [
        {
          externalId: `prod_${externalId}`,
          name: sanitizedProductName,
          description: sanitizedDescription,
          quantity: 1,
          price: amountCents,
        },
      ],
      returnUrl,
      completionUrl,
      customer: clientData ? {
        name: clientName,
        cellphone: clientPhone || '(00) 0000-0000',
        email: clientEmail || 'noreply@locai.app',
        taxId: clientTaxId || '000.000.000-00',
      } : {
        name: 'Cliente',
        cellphone: '(00) 0000-0000',
        email: 'noreply@locai.app',
        taxId: '000.000.000-00',
      },
      allowCoupons: input.allowCoupons || false,
      coupons: input.coupons || [],
      externalId,
      metadata: {
        tenantId: input.tenantId,
        externalId,
        clientId: input.clientId,
        reservationId: input.reservationId,
        propertyId: input.propertyId,
        propertyName,
      },
    };

    logger.info('[CREATE-PAYMENT-LINK] Creating billing via AbacatePay', {
      requestId,
      amountCents,
      frequency: billingRequest.frequency,
      methods: billingRequest.methods,
    });

    // Create billing via AbacatePay
    const billingResponse = await abacatepay.createBilling(billingRequest);

    if (!isAbacatePaySuccess(billingResponse)) {
      logger.error('[CREATE-PAYMENT-LINK] AbacatePay API error', {
        requestId,
        error: billingResponse.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create payment link',
          details: billingResponse.error,
          requestId,
        },
        { status: 500 }
      );
    }

    const billingData = billingResponse.data;

    logger.info('[CREATE-PAYMENT-LINK] Billing created successfully', {
      requestId,
      billingId: billingData.id,
      url: billingData.url,
      amount: billingData.amount,
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
      dueDate: input.dueDate ? new Date(input.dueDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),

      // Categorization
      category: input.category || TransactionCategory.RESERVATION,

      // Payment details
      paymentMethod: PaymentMethod.PIX, // Default, can be updated

      // Relations
      clientId: input.clientId,
      clientName: clientName || undefined,
      reservationId: input.reservationId,
      propertyId: input.propertyId,
      propertyName: propertyName || undefined,

      // Recurrence
      isRecurring: false,

      // Audit
      createdBy: 'sofia_ai',
      notes: sanitizedNotes,
      tags: input.tags || ['payment-link', 'generated-by-ai'],

      // AI metadata
      createdByAI: true,

      // Tenant
      tenantId: input.tenantId,

      // AbacatePay integration
      abacatepayBillingId: billingData.id,
      abacatepayStatus: billingData.status,
      abacatepayUrl: billingData.url,
      abacatepayCustomerId: billingData.customer.id,
      abacatepayExternalId: externalId,
      abacatepayMetadata: {
        frequency: billingData.frequency,
        methods: billingData.methods,
        productsCount: billingData.products.length,
      },
    };

    const transactionId = await services.transactions.create(transactionData);

    logger.info('[CREATE-PAYMENT-LINK] Transaction created in Firestore', {
      requestId,
      transactionId,
      billingId: billingData.id,
    });

    // Prepare response
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        transactionId,
        billingId: billingData.id,
        paymentUrl: billingData.url,
        amount: input.amount,
        amountFormatted: `R$ ${input.amount.toFixed(2)}`,
        description: sanitizedDescription,
        status: 'pending',

        // Payment options
        frequency: billingData.frequency,
        methods: billingData.methods,

        // Client info
        clientId: input.clientId,
        clientName: clientName || undefined,

        // Property info
        propertyId: input.propertyId,
        propertyName: propertyName || undefined,

        // Instructions for customer
        instructions: {
          message: 'Compartilhe este link com o cliente para que ele possa realizar o pagamento.',
          url: billingData.url,
          validUntil: input.dueDate || 'Sem prazo definido',
        },
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    };

    logger.info('[CREATE-PAYMENT-LINK] Execution completed successfully', {
      requestId,
      transactionId,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[CREATE-PAYMENT-LINK] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create payment link',
        requestId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined,
      },
      { status: 500 }
    );
  }
}
