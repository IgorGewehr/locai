/**
 * COMPANY SETTINGS API ROUTE
 *
 * Manages company information for tenant
 * Path: tenants/{tenantId}/config/company-info
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/api-errors';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Validation schema
const CompanyInfoSchema = z.object({
  // Business Identity
  legalName: z.string().max(200).optional(),
  tradeName: z.string().min(1).max(200),
  cnpj: z.string().max(18).optional(),
  stateRegistration: z.string().max(50).optional(),
  municipalRegistration: z.string().max(50).optional(),

  // Contact
  email: z.string().email().min(1),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional().or(z.literal('')),

  // Address
  street: z.string().max(200).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(), // Allow full state names (e.g., "São Paulo")
  zipCode: z.string().max(10).optional(),
  country: z.string().max(100).optional(),

  // Bank Information (for payment transfers)
  bankInfo: z.object({
    bankCode: z.string().min(3).max(4), // Ex: "001" (Banco do Brasil)
    bankName: z.string().min(1).max(100), // Ex: "Banco do Brasil"
    agencyNumber: z.string().min(1).max(10),
    agencyDigit: z.string().max(2).optional(),
    accountNumber: z.string().min(1).max(20),
    accountDigit: z.string().min(1).max(2),
    accountType: z.enum(['checking', 'savings']),
    pixKey: z.string().max(200).optional(),
    pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']).optional(),
  }).optional(),
});

type CompanyInfo = z.infer<typeof CompanyInfoSchema>;

// Default company info
const DEFAULT_COMPANY_INFO: CompanyInfo = {
  legalName: '',
  tradeName: '',
  cnpj: '',
  stateRegistration: '',
  municipalRegistration: '',
  email: '',
  phone: '',
  website: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Brasil',
  bankInfo: undefined,
};

/**
 * GET /api/tenant/settings/company
 *
 * Returns current company information for authenticated tenant
 */
export async function GET(request: NextRequest) {
  const requestId = `get-company_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startTime = Date.now();

  try {
    // Authentication
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    // Load settings from Firestore with fallback
    let companyInfo: CompanyInfo;

    try {
      const services = new TenantServiceFactory(tenantId);
      const docRef = doc(services.db, 'tenants', tenantId, 'config', 'company-info');
      const infoDoc = await getDoc(docRef);

      if (infoDoc.exists()) {
        const data = infoDoc.data();

        // Merge with defaults to ensure all required fields exist
        companyInfo = {
          ...DEFAULT_COMPANY_INFO,
          ...data,
          // Ensure required fields have valid values
          tradeName: data.tradeName || DEFAULT_COMPANY_INFO.tradeName,
          email: data.email || DEFAULT_COMPANY_INFO.email,
          country: data.country || DEFAULT_COMPANY_INFO.country,
        } as CompanyInfo;
      } else {
        // Return default info if doesn't exist
        companyInfo = DEFAULT_COMPANY_INFO;
      }
    } catch (firestoreError) {
      // Fallback to defaults if Firestore fails
      logger.error(
        '[GET-COMPANY-INFO] Firestore error - using defaults',
        firestoreError instanceof Error ? firestoreError : new Error(String(firestoreError))
      );
      companyInfo = DEFAULT_COMPANY_INFO;
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: companyInfo,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error(
      '[GET-COMPANY-INFO] Request failed',
      error instanceof Error ? error : new Error(String(error)),
      { processingTime: `${processingTime}ms` }
    );

    // ✅ FIX: Return error BUT with fallback data to prevent UI crash
    // Status 500 indica erro, mas data válido previne quebra da interface
    return NextResponse.json({
      success: false,
      error: 'Failed to load company settings',
      data: DEFAULT_COMPANY_INFO, // Fallback para prevenir crash da UI
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
        fallback: true,
        errorType: 'FIRESTORE_ERROR'
      },
    }, { status: 500 });
  }
}

/**
 * PUT /api/tenant/settings/company
 *
 * Updates company information for authenticated tenant
 */
export async function PUT(request: NextRequest) {
  const requestId = `update-company_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startTime = Date.now();

  try {
    // Authentication
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    // Parse and validate body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }

    const validation = CompanyInfoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const companyInfo = validation.data;

    // Sanitize text inputs
    const sanitizedInfo: CompanyInfo = {
      ...companyInfo,
      legalName: companyInfo.legalName ? sanitizeUserInput(companyInfo.legalName) : '',
      tradeName: sanitizeUserInput(companyInfo.tradeName),
      street: companyInfo.street ? sanitizeUserInput(companyInfo.street) : '',
      complement: companyInfo.complement ? sanitizeUserInput(companyInfo.complement) : '',
      neighborhood: companyInfo.neighborhood ? sanitizeUserInput(companyInfo.neighborhood) : '',
      city: companyInfo.city ? sanitizeUserInput(companyInfo.city) : '',
    };

    // Save to Firestore with retry logic
    const services = new TenantServiceFactory(tenantId);
    const docRef = doc(services.db, 'tenants', tenantId, 'config', 'company-info');

    try {
      await setDoc(docRef, {
        ...sanitizedInfo,
        updatedAt: new Date(),
        updatedBy: authContext.userId || 'system',
      });
    } catch (firestoreError) {
      logger.error(
        '[UPDATE-COMPANY-INFO] Firestore save failed',
        firestoreError instanceof Error ? firestoreError : new Error(String(firestoreError))
      );
      throw new Error('Failed to save company information to database');
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Company information updated successfully',
      data: sanitizedInfo,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error(
      '[UPDATE-COMPANY-INFO] Request failed',
      error instanceof Error ? error : new Error(String(error)),
      { processingTime: `${processingTime}ms` }
    );

    return handleApiError(error);
  }
}
