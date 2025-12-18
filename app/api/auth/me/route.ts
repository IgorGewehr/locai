import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { apiResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);

    if (!authContext.authenticated || !authContext.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return apiResponse.success({
      user: {
        id: authContext.userId,
        email: authContext.email,
        tenantId: authContext.tenantId,
      },
    });

  } catch (error) {
    return apiResponse.error(
      'Erro interno do servidor',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
}
