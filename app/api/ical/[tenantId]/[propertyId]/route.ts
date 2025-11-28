/**
 * iCal Feed Export API
 *
 * GET /api/ical/[tenantId]/[propertyId]?token=[securityToken]
 *
 * Serves iCal (.ics) feed for a specific property
 * This endpoint is public but requires a security token
 *
 * Usage by Airbnb/Booking:
 * https://yourdomain.com/api/ical/[tenantId]/[propertyId]?token=secure-random-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { iCalGeneratorService } from '@/lib/services/ical-generator-service';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { getRateLimiter, rateLimitConfigs, getClientIdentifier } from '@/lib/utils/rate-limiter';

interface RouteParams {
  params: {
    tenantId: string;
    propertyId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();
  const { tenantId, propertyId } = params;

  try {
    // ✅ MÉDIO 7: Rate limiting para feed iCal público
    const clientIp = getClientIdentifier(request);
    const rateLimitKey = `ical:${propertyId}:${clientIp}`;
    const limiter = getRateLimiter('ical');
    const rateCheck = limiter.isAllowed(rateLimitKey, rateLimitConfigs.icalFeed);

    if (!rateCheck.allowed) {
      logger.warn('iCal feed rate limit exceeded', {
        propertyId,
        clientIp: clientIp.substring(0, 10) + '***',
        retryAfter: rateCheck.retryAfter,
      });

      return new NextResponse(
        JSON.stringify({ error: rateLimitConfigs.icalFeed.message }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateCheck.retryAfter?.toString() || '3600',
            'X-RateLimit-Limit': rateLimitConfigs.icalFeed.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Get security token from query params
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    logger.info('iCal feed request received', {
      tenantId: tenantId?.substring(0, 8) + '***',
      propertyId,
      hasToken: !!token,
      userAgent: request.headers.get('user-agent')?.substring(0, 50),
    });

    // Validate required parameters
    if (!tenantId || !propertyId) {
      logger.warn('Missing required parameters', { tenantId, propertyId });
      return NextResponse.json(
        { error: 'Missing required parameters: tenantId and propertyId' },
        { status: 400 }
      );
    }

    if (!token) {
      logger.warn('Missing security token', { tenantId, propertyId });
      return NextResponse.json(
        { error: 'Missing security token. Add ?token=YOUR_TOKEN to the URL' },
        { status: 401 }
      );
    }

    // Verify property exists and token is valid
    const services = new TenantServiceFactory(tenantId);
    const property = await services.properties.get(propertyId);

    if (!property) {
      logger.warn('Property not found', { tenantId, propertyId });
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Validate security token
    const expectedToken = (property as any).iCalExportToken;
    if (!expectedToken || expectedToken !== token) {
      logger.warn('Invalid security token', {
        tenantId,
        propertyId,
        hasExpectedToken: !!expectedToken,
      });
      return NextResponse.json(
        { error: 'Invalid security token' },
        { status: 403 }
      );
    }

    // Generate iCal feed
    const iCalContent = await iCalGeneratorService.generatePropertyFeed(
      propertyId,
      tenantId
    );

    // Validate generated content
    const validation = iCalGeneratorService.validateICalContent(iCalContent);
    if (!validation.valid) {
      logger.error('Generated invalid iCal content', {
        tenantId,
        propertyId,
        errors: validation.errors,
      });
      throw new Error('Failed to generate valid iCal content');
    }

    const processingTime = Date.now() - startTime;

    logger.info('iCal feed generated successfully', {
      tenantId: tenantId.substring(0, 8) + '***',
      propertyId,
      size: iCalContent.length,
      processingTime: `${processingTime}ms`,
    });

    // Return iCal content with proper headers
    return new NextResponse(iCalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${propertyId}.ics"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Processing-Time': `${processingTime}ms`,
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Error generating iCal feed', {
      tenantId: tenantId?.substring(0, 8) + '***',
      propertyId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        error: 'Failed to generate iCal feed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
