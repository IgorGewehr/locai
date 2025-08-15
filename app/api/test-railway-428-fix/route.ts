// RAILWAY 428 ERROR FIX TEST
// Tests the specific fix for "Connection closed before QR: 428" error

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { Railway428Fix } from '@/lib/whatsapp/railway-428-fix';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info('🧪 [428-FIX-TEST] Starting Railway 428 error fix test...');
    
    // Test the 428 fix
    const result = await Railway428Fix.testConnection();
    
    logger.info('✅ [428-FIX-TEST] 428 fix test completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: '428 fix test completed successfully - QR code generated!',
      duration: Date.now() - startTime,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        railwayId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8) || 'none',
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString()
      },
      result,
      fix: {
        applied: true,
        type: '428_precondition_required_fix',
        description: 'Added proper headers and WebSocket configuration to avoid 428 errors'
      }
    });
    
  } catch (error) {
    logger.error('❌ [428-FIX-TEST] 428 fix test failed', { 
      error: error.message, 
      stack: error.stack 
    });
    
    const is428Error = error.message.includes('428');
    
    return NextResponse.json({
      success: false,
      message: is428Error 
        ? '428 error persists - fix needs refinement' 
        : 'Test failed for other reasons',
      duration: Date.now() - startTime,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        railwayId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8) || 'none',
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString()
      },
      error: error.message,
      is428Error,
      fix: {
        applied: true,
        type: '428_precondition_required_fix',
        status: 'needs_refinement'
      }
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    logger.info('📋 [428-FIX-TEST] Getting 428 fix information...');
    
    return NextResponse.json({
      fix: {
        name: 'Railway 428 Error Fix',
        description: 'Fixes "Connection closed before QR: 428" error in Railway',
        errorCode: 428,
        errorMeaning: 'Precondition Required - Missing headers or conditions',
        solution: {
          headers: 'Added proper User-Agent, Origin, and WebSocket headers',
          version: 'Using stable WhatsApp version [2, 2413, 1]',
          timeouts: 'Extended timeouts for Railway stability',
          websocket: 'Custom WebSocket creation with proper headers'
        },
        features: [
          'RFC 6455 compliant WebSocket key generation',
          'Proper Origin and User-Agent headers',
          'Extended timeouts for Railway environment',
          'Custom socket creation with 428-specific headers',
          'Reduced retries to avoid rate limiting'
        ]
      },
      usage: {
        test: 'POST /api/test-railway-428-fix',
        integration: 'Use Railway428Fix.create428CompatibleSocket() in your code'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isRailway: !!process.env.RAILWAY_PROJECT_ID,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('❌ [428-FIX-TEST] Failed to get fix information', { error: error.message });
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}