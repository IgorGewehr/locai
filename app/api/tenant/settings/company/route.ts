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
  state: z.string().max(2).optional(),
  zipCode: z.string().max(10).optional(),
  country: z.string().max(100).optional(),
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

    logger.info('[GET-COMPANY-INFO] Request received', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      userId: authContext.uid,
    });

    // Load settings from Firestore
    const services = new TenantServiceFactory(tenantId);
    const infoDoc = await services.db
      .collection('tenants')
      .doc(tenantId)
      .collection('config')
      .doc('company-info')
      .get();

    let companyInfo: CompanyInfo;

    if (infoDoc.exists) {
      companyInfo = infoDoc.data() as CompanyInfo;
      logger.info('[GET-COMPANY-INFO] Info loaded from Firestore', {
        requestId,
      });
    } else {
      // Return default info if doesn't exist
      companyInfo = DEFAULT_COMPANY_INFO;

      logger.info('[GET-COMPANY-INFO] No info found - returning defaults', {
        requestId,
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info('[GET-COMPANY-INFO] Request completed', {
      requestId,
      processingTime: `${processingTime}ms`,
    });

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

    logger.error('[GET-COMPANY-INFO] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return handleApiError(error);
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

    logger.info('[UPDATE-COMPANY-INFO] Request received', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      userId: authContext.uid,
    });

    // Parse and validate body
    const body = await request.json();
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

    // Save to Firestore
    const services = new TenantServiceFactory(tenantId);
    await services.db
      .collection('tenants')
      .doc(tenantId)
      .collection('config')
      .doc('company-info')
      .set({
        ...sanitizedInfo,
        updatedAt: new Date(),
        updatedBy: authContext.uid || 'system',
      });

    logger.info('[UPDATE-COMPANY-INFO] Info updated', {
      requestId,
      tradeName: sanitizedInfo.tradeName,
    });

    const processingTime = Date.now() - startTime;

    logger.info('[UPDATE-COMPANY-INFO] Request completed', {
      requestId,
      processingTime: `${processingTime}ms`,
    });

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

    logger.error('[UPDATE-COMPANY-INFO] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return handleApiError(error);
  }
}
