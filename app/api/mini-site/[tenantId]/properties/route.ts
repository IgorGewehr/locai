import { NextRequest, NextResponse } from 'next/server';
import { miniSiteService } from '@/lib/services/mini-site-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get public properties for the tenant
    const properties = await miniSiteService.getPublicProperties(tenantId);

    return NextResponse.json({
      success: true,
      data: properties,
      count: properties.length,
      tenantId,
    });

  } catch (error) {
    console.error('Error fetching mini-site properties:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch properties' 
      },
      { status: 500 }
    );
  }
}