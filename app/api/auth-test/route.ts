// AUTH TEST ENDPOINT FOR DEBUGGING RAILWAY 401 ISSUES
// Simple endpoint to test Firebase Auth token verification

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/utils/auth';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🧪 [AUTH TEST] Starting authentication test...');
    
    // Get the authorization header directly
    const authHeader = request.headers.get('authorization');
    const userAgent = request.headers.get('user-agent');
    const origin = request.headers.get('origin');
    
    logger.info('🔍 [AUTH TEST] Request headers:', {
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length,
      authHeaderPrefix: authHeader?.substring(0, 20),
      userAgent: userAgent?.substring(0, 100),
      origin
    });
    
    // Test auth verification
    const user = await verifyAuth(request);
    
    if (!user) {
      logger.warn('❌ [AUTH TEST] Auth verification failed');
      return NextResponse.json({
        success: false,
        message: 'Authentication failed',
        debug: {
          hasAuthHeader: !!authHeader,
          authHeaderLength: authHeader?.length,
          timestamp: new Date().toISOString(),
          isRailway: !!process.env.RAILWAY_PROJECT_ID
        }
      }, { status: 401 });
    }
    
    logger.info('✅ [AUTH TEST] Auth verification successful', {
      uid: user.uid,
      email: user.email
    });
    
    // Parse the token to show expiry information
    let tokenInfo = null;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        tokenInfo = {
          iss: payload.iss,
          aud: payload.aud,
          auth_time: new Date(payload.auth_time * 1000).toISOString(),
          iat: new Date(payload.iat * 1000).toISOString(),
          exp: new Date(payload.exp * 1000).toISOString(),
          email: payload.email,
          email_verified: payload.email_verified,
          uid: payload.sub,
          timeToExpiry: Math.round((payload.exp * 1000 - Date.now()) / 1000 / 60) // minutes
        };
      } catch (parseError) {
        logger.warn('⚠️ [AUTH TEST] Could not parse token:', parseError);
        tokenInfo = { error: 'Could not parse token' };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        tenantId: user.tenantId
      },
      tokenInfo,
      debug: {
        timestamp: new Date().toISOString(),
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        environment: process.env.NODE_ENV,
        railwayProjectId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8) + '***'
      }
    });
    
  } catch (error) {
    logger.error('💥 [AUTH TEST] Test failed with error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Auth test failed',
      error: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        environment: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logger.info('🧪 [AUTH TEST POST] Testing with provided token...');
    
    // Create a new request with the provided token
    const testHeaders = new Headers(request.headers);
    if (body.token) {
      testHeaders.set('authorization', `Bearer ${body.token}`);
    }
    
    const testRequest = new Request(request.url, {
      method: 'GET',
      headers: testHeaders
    }) as NextRequest;
    
    // Test the auth with the provided token
    const user = await verifyAuth(testRequest);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Provided token is invalid',
        tokenProvided: !!body.token,
        tokenLength: body.token?.length || 0
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Provided token is valid',
      user: {
        uid: user.uid,
        email: user.email,
        tenantId: user.tenantId
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Auth test POST failed',
      error: error.message
    }, { status: 500 });
  }
}