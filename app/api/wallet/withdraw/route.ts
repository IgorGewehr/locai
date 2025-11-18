import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { WalletServiceFactory } from '@/lib/services/wallet-service';
import { WithdrawalMethod } from '@/lib/types/wallet';
import { logger } from '@/lib/utils/logger';
import { sanitizeUserInput } from '@/lib/utils/validation';

const WithdrawRequestSchema = z.object({
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum([WithdrawalMethod.PIX, WithdrawalMethod.BANK_TRANSFER, WithdrawalMethod.STRIPE]),
  pixKey: z.string().optional(),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']).optional(),
  bankDetails: z.object({
    bankCode: z.string(),
    bankName: z.string(),
    accountType: z.enum(['checking', 'savings']),
    accountNumber: z.string(),
    accountDigit: z.string(),
    agency: z.string(),
    agencyDigit: z.string().optional(),
    holderName: z.string(),
    holderDocument: z.string(),
    holderDocumentType: z.enum(['cpf', 'cnpj']),
  }).optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `withdraw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = WithdrawRequestSchema.safeParse(body);

    if (!result.success) {
      logger.warn('[WALLET-WITHDRAW] Validation failed', {
        requestId,
        errors: result.error.errors,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid data',
          details: result.error.errors,
          requestId
        },
        { status: 400 }
      );
    }

    const data = result.data;

    // Sanitize text inputs
    const sanitized = {
      ...data,
      clientName: sanitizeUserInput(data.clientName),
      notes: data.notes ? sanitizeUserInput(data.notes) : undefined,
      bankDetails: data.bankDetails ? {
        ...data.bankDetails,
        bankName: sanitizeUserInput(data.bankDetails.bankName),
        holderName: sanitizeUserInput(data.bankDetails.holderName),
      } : undefined,
    };

    logger.info('[WALLET-WITHDRAW] Processing withdrawal request', {
      requestId,
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      clientId: sanitized.clientId.substring(0, 8) + '***',
      amount: sanitized.amount,
      method: sanitized.method,
    });

    const walletService = WalletServiceFactory.getInstance(authContext.tenantId);
    const withdrawal = await walletService.requestWithdrawal({
      ...sanitized,
      tenantId: authContext.tenantId,
      walletId: '', // Will be set by service
    });

    const processingTime = Date.now() - startTime;

    logger.info('[WALLET-WITHDRAW] Withdrawal requested successfully', {
      requestId,
      withdrawalId: withdrawal.id,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json({
      success: true,
      data: withdrawal,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[WALLET-WITHDRAW] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process withdrawal',
        requestId,
      },
      { status: 500 }
    );
  }
}
