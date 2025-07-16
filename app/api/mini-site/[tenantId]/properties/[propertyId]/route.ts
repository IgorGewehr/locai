/**
 * Individual Property API for Mini-Site
 * Public API endpoint for single property details
 */

import { NextRequest, NextResponse } from 'next/server';
import { miniSiteService } from '@/lib/services/mini-site-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; propertyId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId, propertyId } = await params;
    const { searchParams } = new URL(request.url);

    // Validate parameters
    if (!tenantId || tenantId.length < 3) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // Record property view
    const utmParams = {
      utm_source: searchParams.get('utm_source') || undefined,
      utm_medium: searchParams.get('utm_medium') || undefined,
      utm_campaign: searchParams.get('utm_campaign') || undefined
    };

    const filteredUtmParams = Object.fromEntries(
      Object.entries(utmParams).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>;

    await miniSiteService.recordPageView(tenantId, propertyId, filteredUtmParams);

    // Get mini-site configuration
    const config = await miniSiteService.getConfig(tenantId);
    if (!config) {
      return NextResponse.json(
        { error: 'Mini-site not found or inactive' },
        { status: 404 }
      );
    }

    // Get property details
    const property = await miniSiteService.getPublicProperty(tenantId, propertyId);
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        config,
        property
      }
    });

  } catch (error) {
    console.error('Error in property API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}