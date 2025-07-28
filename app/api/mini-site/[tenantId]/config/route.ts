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

    // Get mini-site configuration
    const config = await miniSiteService.getConfig(tenantId);

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Mini-site configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
      tenantId,
    });

  } catch (error) {
    console.error('Error fetching mini-site config:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch configuration' 
      },
      { status: 500 }
    );
  }
}