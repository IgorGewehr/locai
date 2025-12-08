/**
 * CREATE-PAYMENT API ROUTE
 *
 * Endpoint para N8N criar cobranças PIX ou Link de pagamento via AbacatePay
 * Usado pela Sofia IA para coletar pagamentos (calção, reservas, etc)
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { getAbacatePayService } from '@/lib/services/abacatepay-service';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { WalletService } from '@/lib/services/wallet-service';
import { sanitizeUserInput } from '@/lib/utils/validation';
import {
  toCents,
  AbacatePayMethod,
  BillingFrequency,
  isAbacatePaySuccess,
} from '@/lib/types/abacatepay';

// Schema de validação
const CreatePaymentSchema = z.object({
  tenantId: z.string().min(1, 'TenantId é obrigatório'),

  // Método de pagamento
  paymentMethod: z.enum(['PIX', 'CARD', 'BOTH']).default('PIX'),

  // Valor em reais (será convertido para centavos)
  amount: z.number()
    .positive('Valor deve ser positivo')
    .min(1, 'Valor mínimo é R$ 1,00')
    .max(100000, 'Valor máximo é R$ 100.000,00'),

  // Dados do cliente
  customerPhone: z.string().min(10, 'Telefone inválido'),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerTaxId: z.string().optional(), // CPF/CNPJ

  // Descrição do pagamento
  description: z.string().max(140, 'Descrição deve ter no máximo 140 caracteres').optional(),

  // Referências externas
  reservationId: z.string().optional(),
  propertyId: z.string().optional(),

  // Configurações
  expiresInMinutes: z.number().min(5).max(1440).default(30), // 5 min a 24h

  // Metadados adicionais
  metadata: z.record(z.any()).optional(),
});

type CreatePaymentRequest = z.infer<typeof CreatePaymentSchema>;

/**
 * POST /api/ai/functions/create-payment
 *
 * Cria uma cobrança PIX ou Link de pagamento
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `create_payment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    // 1. Validar autenticação N8N
    const authHeader = request.headers.get('Authorization');
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

    if (n8nSecret && authHeader !== `Bearer ${n8nSecret}`) {
      logger.warn('[CREATE-PAYMENT] Unauthorized request', { requestId });
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Parse e validar body
    const body = await request.json();
    const validation = CreatePaymentSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('[CREATE-PAYMENT] Validation failed', {
        requestId,
        errors: validation.error.errors,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    logger.info('[CREATE-PAYMENT] Processing payment creation', {
      requestId,
      tenantId: data.tenantId.substring(0, 8) + '***',
      amount: data.amount,
      method: data.paymentMethod,
      customerPhone: data.customerPhone.substring(0, 6) + '***',
    });

    // 3. Garantir que a carteira do tenant existe
    await WalletService.getWallet(data.tenantId);

    // 4. Obter serviço AbacatePay
    const abacatepay = getAbacatePayService();

    // 5. Preparar dados do cliente
    const customerData = data.customerName && data.customerEmail && data.customerTaxId
      ? {
          name: sanitizeUserInput(data.customerName),
          cellphone: data.customerPhone,
          email: data.customerEmail,
          taxId: data.customerTaxId,
        }
      : undefined;

    // 6. Decidir tipo de cobrança
    let paymentResult;
    let paymentType: 'PIX' | 'BILLING';

    if (data.paymentMethod === 'PIX') {
      // Criar QR Code PIX direto
      paymentType = 'PIX';

      const pixResponse = await abacatepay.createPixQrCode({
        amount: toCents(data.amount),
        expiresIn: data.expiresInMinutes * 60, // Converter para segundos
        description: data.description || `Pagamento - ${data.customerPhone}`,
        customer: customerData,
        metadata: {
          tenantId: data.tenantId,
          customerPhone: data.customerPhone,
          reservationId: data.reservationId,
          propertyId: data.propertyId,
          source: 'n8n_agent',
          requestId,
          ...data.metadata,
        },
      });

      if (!isAbacatePaySuccess(pixResponse)) {
        logger.error('[CREATE-PAYMENT] PIX creation failed', {
          requestId,
          error: pixResponse.error,
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Falha ao criar PIX',
            code: 'PIX_CREATION_FAILED',
            details: pixResponse.error
          },
          { status: 500 }
        );
      }

      paymentResult = {
        paymentId: pixResponse.data.id,
        type: 'PIX' as const,
        amount: data.amount,
        amountCents: pixResponse.data.amount,
        status: pixResponse.data.status,
        brCode: pixResponse.data.brCode,
        qrCodeBase64: pixResponse.data.brCodeBase64,
        expiresAt: pixResponse.data.expiresAt,
        platformFee: pixResponse.data.platformFee,
      };

    } else {
      // Criar Link de pagamento (suporta PIX e/ou Cartão)
      paymentType = 'BILLING';

      const methods: AbacatePayMethod[] = data.paymentMethod === 'BOTH'
        ? [AbacatePayMethod.PIX, AbacatePayMethod.CARD]
        : [data.paymentMethod === 'CARD' ? AbacatePayMethod.CARD : AbacatePayMethod.PIX];

      // Buscar URLs de retorno do tenant config se disponível
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.locai.com.br';

      const billingResponse = await abacatepay.createBilling({
        frequency: BillingFrequency.ONE_TIME,
        methods,
        products: [{
          externalId: data.reservationId || `payment_${requestId}`,
          name: data.description || 'Pagamento',
          description: `Pagamento via IA - ${data.customerPhone}`,
          quantity: 1,
          price: toCents(data.amount),
        }],
        returnUrl: `${baseUrl}/pagamento/retorno`,
        completionUrl: `${baseUrl}/pagamento/sucesso`,
        customer: customerData,
        externalId: requestId,
        metadata: {
          tenantId: data.tenantId,
          customerPhone: data.customerPhone,
          reservationId: data.reservationId,
          propertyId: data.propertyId,
          source: 'n8n_agent',
          requestId,
          ...data.metadata,
        },
      });

      if (!isAbacatePaySuccess(billingResponse)) {
        logger.error('[CREATE-PAYMENT] Billing creation failed', {
          requestId,
          error: billingResponse.error,
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Falha ao criar link de pagamento',
            code: 'BILLING_CREATION_FAILED',
            details: billingResponse.error
          },
          { status: 500 }
        );
      }

      paymentResult = {
        paymentId: billingResponse.data.id,
        type: 'BILLING' as const,
        amount: data.amount,
        amountCents: billingResponse.data.amount,
        status: billingResponse.data.status,
        paymentUrl: billingResponse.data.url,
        methods: billingResponse.data.methods,
      };
    }

    // 7. Registrar pagamento pendente no Firestore para tracking
    try {
      const services = new TenantServiceFactory(data.tenantId);

      await services.transactions.create({
        type: 'income',
        amount: data.amount,
        status: 'pending',
        category: 'reservation_deposit',
        description: data.description || `Pagamento via IA - ${data.customerPhone}`,
        paymentMethod: paymentType === 'PIX' ? 'pix' : 'payment_link',
        clientPhone: data.customerPhone,
        clientName: data.customerName,
        propertyId: data.propertyId,
        reservationId: data.reservationId,
        abacatepayPixId: paymentType === 'PIX' ? paymentResult.paymentId : undefined,
        abacatepayBillingId: paymentType === 'BILLING' ? paymentResult.paymentId : undefined,
        abacatepayStatus: paymentResult.status,
        abacatepayExpiresAt: paymentType === 'PIX' ? new Date(paymentResult.expiresAt!) : undefined,
        date: new Date(),
        dueDate: new Date(),
        metadata: {
          requestId,
          source: 'n8n_agent',
          paymentType,
          ...data.metadata,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      logger.info('[CREATE-PAYMENT] Transaction recorded in Firestore', {
        requestId,
        paymentId: paymentResult.paymentId,
      });

    } catch (dbError) {
      // Log mas não falha - o pagamento foi criado
      logger.warn('[CREATE-PAYMENT] Failed to record transaction in Firestore', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info('[CREATE-PAYMENT] Payment created successfully', {
      requestId,
      paymentId: paymentResult.paymentId,
      type: paymentType,
      processingTime: `${processingTime}ms`,
    });

    // 8. Retornar resultado para N8N
    return NextResponse.json({
      success: true,
      data: {
        ...paymentResult,
        requestId,
        // Mensagem formatada para o cliente
        customerMessage: paymentType === 'PIX'
          ? `Escaneie o QR Code ou copie o código PIX para pagar R$ ${data.amount.toFixed(2).replace('.', ',')}. O pagamento expira em ${data.expiresInMinutes} minutos.`
          : `Acesse o link para realizar o pagamento de R$ ${data.amount.toFixed(2).replace('.', ',')}: ${paymentResult.paymentUrl}`,
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[CREATE-PAYMENT] Unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao criar pagamento',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/functions/create-payment
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    service: 'Create Payment API',
    status: 'active',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    methods: ['PIX', 'CARD', 'BOTH'],
    description: 'Cria cobranças PIX ou Link de pagamento via AbacatePay',
  });
}
