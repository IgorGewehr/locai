import { NextRequest, NextResponse } from 'next/server';
import { miniSiteService } from '@/lib/services/mini-site-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; propertyId: string } }
) {
  try {
    const { tenantId, propertyId } = params;
    
    if (!tenantId || !propertyId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID and Property ID are required' },
        { status: 400 }
      );
    }

    // Get specific property
    const property = await miniSiteService.getPublicProperty(tenantId, propertyId);

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Record page view
    await miniSiteService.recordPageView(tenantId, propertyId);

    return NextResponse.json({
      success: true,
      data: property,
      tenantId,
    });

  } catch (error) {
    console.error('Error fetching mini-site property:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch property' 
      },
      { status: 500 }
    );
  }
}