import { NextRequest, NextResponse } from 'next/server';
import { testQRGeneration } from '@/lib/whatsapp/qr-test';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 WhatsApp test endpoint called');
    
    const environment = {
      NODE_ENV: process.env.NODE_ENV,
      isNetlify: !!process.env.NETLIFY,
      isVercel: !!process.env.VERCEL,
      isAWS: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
    
    console.log('🌍 Environment info:', environment);
    
    // Test QR generation
    const qrTest = await testQRGeneration();
    
    // Test session manager availability
    let sessionManagerTest = { available: false, error: null };
    try {
      const { whatsappSessionManager } = await import('@/lib/whatsapp/session-manager');
      sessionManagerTest = {
        available: !!whatsappSessionManager,
        error: null
      };
    } catch (error) {
      sessionManagerTest = {
        available: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    const results = {
      environment,
      qrTest,
      sessionManagerTest,
      timestamp: new Date().toISOString()
    };
    
    console.log('📋 Test results:', results);
    
    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}