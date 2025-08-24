import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Import the specific function - need to check the exact export
async function getPolicies(args: any, tenantId: string): Promise<any> {
  // This function will need to be exported from tenant-aware-agent-functions
  const { executeTenantAwareFunction } = await import('@/lib/ai/tenant-aware-agent-functions');
  return await executeTenantAwareFunction('get_policies', args, tenantId);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'TenantId is required' },
        { status: 400 }
      );
    }

    logger.info('📋 [API] Get Policies called', {
      tenantId,
      args: JSON.stringify(args)
    });

    const result = await getPolicies(args, tenantId);

    logger.info('✅ [API] Get Policies completed', {
      tenantId,
      policyType: args.policyType
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('❌ [API] Get Policies failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}