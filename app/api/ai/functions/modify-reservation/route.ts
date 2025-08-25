import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Import the specific function - need to check the exact export
async function modifyReservation(args: any, tenantId: string): Promise<any> {
  // This function will need to be exported from tenant-aware-agent-functions
  const { executeTenantAwareFunction } = await import('@/lib/ai/tenant-aware-agent-functions');
  return await executeTenantAwareFunction('modify_reservation', args, tenantId);
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

    logger.info('✏️ [API] Modify Reservation called', {
      tenantId,
      args: JSON.stringify(args)
    });

    const result = await modifyReservation(args, tenantId);

    logger.info('✅ [API] Modify Reservation completed', {
      tenantId,
      reservationId: args.reservationId
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('❌ [API] Modify Reservation failed', {
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