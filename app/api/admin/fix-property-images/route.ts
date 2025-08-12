import { NextRequest, NextResponse } from 'next/server';
import { fixPropertyImages, validatePropertyImages, fixPropertyCapacity } from '@/lib/utils/fix-property-images';
import { authMiddleware } from '@/lib/middleware/auth';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await authMiddleware(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    
    logger.info('🔧 Starting property fixes via API', { tenantId });
    
    // Run both fixes
    const imagesResult = await fixPropertyImages(tenantId);
    const capacityResult = await fixPropertyCapacity(tenantId);
    
    return NextResponse.json({
      success: true,
      message: 'Property fixes completed',
      data: {
        images: imagesResult,
        capacity: capacityResult
      }
    });
    
  } catch (error) {
    logger.error('❌ Property images fix API error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await authMiddleware(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    
    // Validate current property images
    const validation = await validatePropertyImages(tenantId);
    
    return NextResponse.json({
      success: true,
      message: 'Property images validation completed',
      data: validation
    });
    
  } catch (error) {
    logger.error('❌ Property images validation API error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}