// DEBUG ENDPOINT FOR RAILWAY WHATSAPP AUTH ISSUES
// This endpoint will help us see exactly what's happening with auth

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Track logs in memory for debugging
const debugLogs: string[] = [];
const maxLogs = 100;

function addDebugLog(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  debugLogs.unshift(logEntry);
  if (debugLogs.length > maxLogs) {
    debugLogs.splice(maxLogs);
  }
  
  // Also log normally
  console.log(logEntry);
  logger.info(message);
}

export async function GET(request: NextRequest) {
  try {
    addDebugLog('🔍 [DEBUG] Auth debug endpoint called');
    
    // Test environment detection
    const isRailway = !!process.env.RAILWAY_PROJECT_ID;
    const nodeEnv = process.env.NODE_ENV;
    const isRailwayProduction = isRailway && nodeEnv === 'production';
    
    addDebugLog(`🌍 [DEBUG] Environment: isRailway=${isRailway}, nodeEnv=${nodeEnv}, isRailwayProduction=${isRailwayProduction}`);
    
    // Test auth imports
    let authTestResults: any = {};
    
    try {
      // Test standard auth import
      addDebugLog('📦 [DEBUG] Testing standard auth import...');
      const standardAuth = require('@/lib/utils/auth');
      authTestResults.standardAuth = {
        imported: !!standardAuth,
        hasVerifyAuth: !!standardAuth.verifyAuth,
        type: typeof standardAuth.verifyAuth
      };
      addDebugLog(`✅ [DEBUG] Standard auth imported successfully`);
    } catch (error) {
      addDebugLog(`❌ [DEBUG] Standard auth import failed: ${error.message}`);
      authTestResults.standardAuth = { error: error.message };
    }
    
    try {
      // Test Railway auth import
      addDebugLog('📦 [DEBUG] Testing Railway auth import...');
      const railwayAuth = require('@/lib/utils/auth-railway');
      authTestResults.railwayAuth = {
        imported: !!railwayAuth,
        hasVerifyAuthRailway: !!railwayAuth.verifyAuthRailway,
        type: typeof railwayAuth.verifyAuthRailway
      };
      addDebugLog(`✅ [DEBUG] Railway auth imported successfully`);
    } catch (error) {
      addDebugLog(`❌ [DEBUG] Railway auth import failed: ${error.message}`);
      authTestResults.railwayAuth = { error: error.message };
    }
    
    // Skip Firebase Admin test during build to avoid build errors
    let firebaseTestResults: any = {
      adminAuth: { skipped: 'Skipped during build to avoid projectId errors' }
    };
    
    // Test auth header parsing
    const authHeader = request.headers.get('authorization');
    const authTestResults2 = {
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length || 0,
      authHeaderPrefix: authHeader?.substring(0, 20) || 'none',
      startsWithBearer: authHeader?.startsWith('Bearer ') || false
    };
    
    addDebugLog(`🔐 [DEBUG] Auth header test: ${JSON.stringify(authTestResults2)}`);
    
    // Test which auth method would be selected
    const selectedAuthMethod = isRailwayProduction ? 'Railway Hardcoded' : 'Standard';
    addDebugLog(`🎯 [DEBUG] Selected auth method: ${selectedAuthMethod}`);
    
    return NextResponse.json({
      success: true,
      debug: {
        environment: {
          isRailway,
          nodeEnv,
          isRailwayProduction,
          railwayProjectId: process.env.RAILWAY_PROJECT_ID?.substring(0, 8) + '***' || 'none'
        },
        authImports: authTestResults,
        firebaseTests: firebaseTestResults,
        authHeader: authTestResults2,
        selectedAuthMethod,
        recentLogs: debugLogs.slice(0, 20),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    addDebugLog(`💥 [DEBUG] Debug endpoint error: ${error.message}`);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: {
        recentLogs: debugLogs.slice(0, 10),
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    addDebugLog('🔍 [DEBUG POST] Auth debug POST endpoint called');
    
    // Test actual auth verification
    const isRailway = !!process.env.RAILWAY_PROJECT_ID;
    const nodeEnv = process.env.NODE_ENV;
    const isRailwayProduction = isRailway && nodeEnv === 'production';
    
    let authResult: any = {};
    
    if (isRailwayProduction) {
      addDebugLog('🚂 [DEBUG POST] Testing Railway auth...');
      try {
        const railwayAuth = require('@/lib/utils/auth-railway');
        const user = await railwayAuth.verifyAuthRailway(request);
        authResult = {
          method: 'Railway',
          success: !!user,
          user: user ? {
            uid: user.uid,
            email: user.email,
            tenantId: user.tenantId
          } : null
        };
        addDebugLog(`🚂 [DEBUG POST] Railway auth result: success=${!!user}`);
      } catch (error) {
        addDebugLog(`❌ [DEBUG POST] Railway auth error: ${error.message}`);
        authResult = {
          method: 'Railway',
          success: false,
          error: error.message
        };
      }
    } else {
      addDebugLog('🔐 [DEBUG POST] Testing standard auth...');
      try {
        const standardAuth = require('@/lib/utils/auth');
        const user = await standardAuth.verifyAuth(request);
        authResult = {
          method: 'Standard',
          success: !!user,
          user: user ? {
            uid: user.uid,
            email: user.email,
            tenantId: user.tenantId
          } : null
        };
        addDebugLog(`🔐 [DEBUG POST] Standard auth result: success=${!!user}`);
      } catch (error) {
        addDebugLog(`❌ [DEBUG POST] Standard auth error: ${error.message}`);
        authResult = {
          method: 'Standard',
          success: false,
          error: error.message
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      authTest: authResult,
      environment: {
        isRailway,
        nodeEnv,
        isRailwayProduction
      },
      recentLogs: debugLogs.slice(0, 15)
    });
    
  } catch (error) {
    addDebugLog(`💥 [DEBUG POST] Debug POST error: ${error.message}`);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      recentLogs: debugLogs.slice(0, 10)
    }, { status: 500 });
  }
}