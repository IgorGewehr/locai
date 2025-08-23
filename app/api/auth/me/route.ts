import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { apiResponse } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authService.requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed, return error response
    }

    const { user } = authResult;

    return apiResponse.success({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
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