import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// GET /api/debug - Debug endpoint to test API responses
export async function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const referer = request.headers.get('referer') || 'unknown';
  
  logger.info('🔍 [Debug] API Debug endpoint accessed', {
    userAgent: userAgent.substring(0, 100),
    referer,
    url: request.url,
    method: request.method
  });

  return NextResponse.json({
    success: true,
    message: 'Debug endpoint working correctly',
    timestamp: new Date().toISOString(),
    headers: {
      userAgent: userAgent.substring(0, 100),
      referer
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL
    }
  });
}

// POST /api/debug - Test POST requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logger.info('🔍 [Debug] POST request received', {
      body,
      contentType: request.headers.get('content-type')
    });

    return NextResponse.json({
      success: true,
      message: 'POST request processed successfully',
      receivedBody: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ [Debug] Error processing POST request', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to process POST request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}