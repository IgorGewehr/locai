import { NextRequest, NextResponse } from 'next/server';
// TEMPORARILY DISABLED TO FIX BUILD ISSUES
// import { advancedMetricsService } from '@/lib/services/advanced-metrics-service';
// import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
// import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('Advanced metrics endpoint called - temporarily disabled');
    
    return NextResponse.json({
      success: false,
      error: 'Advanced metrics temporarily disabled to fix build issues',
      message: 'This endpoint will be re-enabled after resolving Firebase config issues',
      timestamp: new Date().toISOString()
    }, { status: 503 });

  } catch (error) {
    logger.error('Error in disabled advanced metrics endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Service temporarily unavailable'
    }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Advanced metrics POST endpoint called - temporarily disabled');
    
    return NextResponse.json({
      success: false,
      error: 'Advanced metrics temporarily disabled to fix build issues',
      message: 'This endpoint will be re-enabled after resolving Firebase config issues',
      timestamp: new Date().toISOString()
    }, { status: 503 });

  } catch (error) {
    logger.error('Error in disabled advanced metrics POST endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Service temporarily unavailable'
    }, { status: 503 });
  }
}