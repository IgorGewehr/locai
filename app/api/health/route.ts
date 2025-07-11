import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { db } from '@/lib/firebase/config';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'up' | 'down' | 'warn';
      responseTime?: number;
      message?: string;
      lastCheck: string;
    };
  };
}

// Health check with caching
let lastHealthCheck: HealthCheck | null = null;
let lastCheckTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

async function checkFirebaseConnection(): Promise<{ status: 'up' | 'down' | 'warn'; responseTime: number; message?: string }> {
  const start = Date.now();
  
  try {
    // Test Firebase Admin connection
    await adminDb.collection('health_check').doc('test').set({
      timestamp: new Date(),
      test: true,
    });
    
    // Test Firebase client connection
    const testDoc = await adminDb.collection('health_check').doc('test').get();
    
    if (!testDoc.exists) {
      return {
        status: 'warn',
        responseTime: Date.now() - start,
        message: 'Firebase connection works but test document not found',
      };
    }
    
    // Clean up test document
    await adminDb.collection('health_check').doc('test').delete();
    
    return {
      status: 'up',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Firebase connection failed',
    };
  }
}

async function checkOpenAIConnection(): Promise<{ status: 'up' | 'down' | 'warn'; responseTime: number; message?: string }> {
  const start = Date.now();
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        status: 'warn',
        responseTime: Date.now() - start,
        message: 'OpenAI API key not configured',
      };
    }
    
    // Simple API key validation (doesn't make actual API call)
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      return {
        status: 'warn',
        responseTime: Date.now() - start,
        message: 'OpenAI API key format invalid',
      };
    }
    
    return {
      status: 'up',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'OpenAI check failed',
    };
  }
}

async function checkWhatsAppConnection(): Promise<{ status: 'up' | 'down' | 'warn'; responseTime: number; message?: string }> {
  const start = Date.now();
  
  try {
    const requiredEnvVars = [
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_VERIFY_TOKEN',
      'WHATSAPP_APP_SECRET',
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        status: 'warn',
        responseTime: Date.now() - start,
        message: `Missing WhatsApp environment variables: ${missingVars.join(', ')}`,
      };
    }
    
    return {
      status: 'up',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'WhatsApp check failed',
    };
  }
}

async function checkEnvironmentVariables(): Promise<{ status: 'up' | 'down' | 'warn'; responseTime: number; message?: string }> {
  const start = Date.now();
  
  try {
    const criticalEnvVars = [
      'NEXT_PUBLIC_APP_URL',
      'JWT_SECRET',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'FIREBASE_PROJECT_ID',
      'OPENAI_API_KEY',
    ];
    
    const missingVars = criticalEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        message: `Missing critical environment variables: ${missingVars.join(', ')}`,
      };
    }
    
    // Check JWT secret length
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      return {
        status: 'warn',
        responseTime: Date.now() - start,
        message: 'JWT_SECRET should be at least 32 characters long',
      };
    }
    
    return {
      status: 'up',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Environment check failed',
    };
  }
}

async function performHealthCheck(): Promise<HealthCheck> {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  
  // Run all checks in parallel
  const [firebaseCheck, openaiCheck, whatsappCheck, envCheck] = await Promise.all([
    checkFirebaseConnection(),
    checkOpenAIConnection(),
    checkWhatsAppConnection(),
    checkEnvironmentVariables(),
  ]);
  
  const checks = {
    firebase: {
      ...firebaseCheck,
      lastCheck: timestamp,
    },
    openai: {
      ...openaiCheck,
      lastCheck: timestamp,
    },
    whatsapp: {
      ...whatsappCheck,
      lastCheck: timestamp,
    },
    environment: {
      ...envCheck,
      lastCheck: timestamp,
    },
  };
  
  // Determine overall status
  const statuses = Object.values(checks).map(check => check.status);
  const hasDown = statuses.includes('down');
  const hasWarn = statuses.includes('warn');
  
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  if (hasDown) {
    overallStatus = 'unhealthy';
  } else if (hasWarn) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }
  
  return {
    status: overallStatus,
    timestamp,
    version: process.env.npm_package_version || '1.0.0',
    uptime,
    checks,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const now = Date.now();
    const detailed = request.nextUrl.searchParams.get('detailed') === 'true';
    
    // Use cached result if available and not expired
    if (lastHealthCheck && (now - lastCheckTime) < CACHE_DURATION && !detailed) {
      return NextResponse.json(lastHealthCheck, {
        status: lastHealthCheck.status === 'healthy' ? 200 : 503,
        headers: {
          'Cache-Control': 'public, max-age=30',
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Perform health check
    const healthCheck = await performHealthCheck();
    
    // Cache the result
    lastHealthCheck = healthCheck;
    lastCheckTime = now;
    
    // Return appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    
    // Return detailed or summary response
    const response = detailed ? healthCheck : {
      status: healthCheck.status,
      timestamp: healthCheck.timestamp,
      version: healthCheck.version,
      uptime: healthCheck.uptime,
    };
    
    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'public, max-age=30',
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Health check failed',
    }, {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Simple ping endpoint for basic availability check
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=60',
    },
  });
}