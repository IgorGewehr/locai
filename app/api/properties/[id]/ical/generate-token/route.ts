/**
 * Generate iCal Export Token API
 *
 * POST /api/properties/[id]/ical/generate-token
 *
 * Generates a secure token for iCal export feed
 * This token is required to access the public iCal feed
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { randomBytes } from 'crypto';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  return randomBytes(32).toString('base64url'); // 43 characters, URL-safe
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // ✅ Next.js 15: await params before accessing properties
    const { id: propertyId } = await params;

    logger.info('iCal token generation request', { propertyId });

    // Authenticate user
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { tenantId } = authContext;

    // Get property
    const services = new TenantServiceFactory(tenantId);
    const property = await services.properties.get(propertyId);

    if (!property) {
      logger.warn('Property not found for token generation', {
        propertyId,
        tenantId,
      });
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Generate new token
    const newToken = generateSecureToken();

    // Update property with new token
    await services.properties.update(propertyId, {
      iCalExportToken: newToken,
      iCalExportTokenGeneratedAt: new Date(),
      updatedAt: new Date(),
    });

    // Construct iCal feed URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const iCalFeedUrl = `${baseUrl}/api/ical/${tenantId}/${propertyId}?token=${newToken}`;

    logger.info('iCal token generated successfully', {
      propertyId,
      tenantId: tenantId.substring(0, 8) + '***',
    });

    return NextResponse.json({
      success: true,
      token: newToken,
      feedUrl: iCalFeedUrl,
      message: 'Token generated successfully',
      instructions: {
        airbnb: `Go to your Airbnb calendar settings and import this URL: ${iCalFeedUrl}`,
        booking: `Go to your Booking.com calendar settings and import this URL: ${iCalFeedUrl}`,
        generic: 'Copy this URL and paste it in your calendar platform\'s import settings',
      },
    });
  } catch (error) {
    const { id: propertyId } = await params;
    logger.error('Error generating iCal token', {
      propertyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to generate token',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/properties/[id]/ical/generate-token
 * Get current iCal export information
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // ✅ Next.js 15: await params before accessing properties
    const { id: propertyId } = await params;

    // Authenticate user
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { tenantId } = authContext;

    // Get property
    const services = new TenantServiceFactory(tenantId);
    const property = await services.properties.get(propertyId) as any;

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Check if token exists
    if (!property.iCalExportToken) {
      return NextResponse.json({
        success: true,
        hasToken: false,
        message: 'No iCal export token configured. Generate one to enable export.',
      });
    }

    // Construct iCal feed URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const iCalFeedUrl = `${baseUrl}/api/ical/${tenantId}/${propertyId}?token=${property.iCalExportToken}`;

    return NextResponse.json({
      success: true,
      hasToken: true,
      feedUrl: iCalFeedUrl,
      generatedAt: property.iCalExportTokenGeneratedAt,
      message: 'iCal export is configured',
    });
  } catch (error) {
    const { id: propertyId } = await params;
    logger.error('Error getting iCal token info', {
      propertyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to get token info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
