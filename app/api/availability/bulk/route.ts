import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityService } from '@/lib/services/availability-service';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { AvailabilityStatus } from '@/lib/types/availability';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const { propertyId, updates } = body;

    if (!propertyId || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId and updates array' },
        { status: 400 }
      );
    }

    // Validate updates structure
    for (const update of updates) {
      if (!update.date || !update.status) {
        return NextResponse.json(
          { error: 'Each update must have date and status' },
          { status: 400 }
        );
      }

      if (!Object.values(AvailabilityStatus).includes(update.status)) {
        return NextResponse.json(
          { error: 'Invalid status value in updates' },
          { status: 400 }
        );
      }
    }

    const availabilityService = new AvailabilityService(authContext.tenantId);

    await availabilityService.bulkUpdateAvailability({
      propertyId,
      updates: updates.map(update => ({
        ...update,
        date: new Date(update.date)
      }))
    }, authContext.userId || 'user');

    return NextResponse.json({
      success: true,
      message: `Bulk update completed for ${updates.length} date(s)`
    });

  } catch (error) {
    logger.error('❌ Error in availability bulk POST API', {
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