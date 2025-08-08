import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability-service';
import { authMiddleware } from '@/lib/middleware/auth';
import { logger } from '@/lib/utils/logger';

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

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    if (!propertyId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required parameters: propertyId, checkIn, checkOut' },
        { status: 400 }
      );
    }

    const availabilityService = new AvailabilityService(authContext.tenantId);

    const isAvailable = await availabilityService.checkAvailability(
      propertyId,
      new Date(checkIn),
      new Date(checkOut)
    );

    return NextResponse.json({
      success: true,
      available: isAvailable,
      propertyId,
      checkIn,
      checkOut
    });

  } catch (error) {
    logger.error('❌ Error in availability check API', {
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