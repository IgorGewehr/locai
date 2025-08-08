import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability-service';
import { authMiddleware } from '@/lib/middleware/auth';
import { logger } from '@/lib/utils/logger';
import { AvailabilityStatus } from '@/lib/types/availability';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeReservations = searchParams.get('includeReservations') === 'true';
    const includePricing = searchParams.get('includePricing') === 'true';

    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: propertyId, startDate, endDate' },
        { status: 400 }
      );
    }

    const availabilityService = new AvailabilityService(authContext.tenantId);

    const response = await availabilityService.getAvailability({
      propertyId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      includeReservations,
      includePricing
    });

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('❌ Error in availability GET API', {
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

    const body = await request.json();
    
    const { propertyId, startDate, endDate, status, reason, notes } = body;

    if (!propertyId || !startDate || !endDate || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, startDate, endDate, status' },
        { status: 400 }
      );
    }

    // Validate status
    if (!Object.values(AvailabilityStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const availabilityService = new AvailabilityService(authContext.tenantId);

    await availabilityService.updateAvailability({
      propertyId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      reason,
      notes
    }, authContext.userId || 'user');

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully'
    });

  } catch (error) {
    logger.error('❌ Error in availability POST API', {
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