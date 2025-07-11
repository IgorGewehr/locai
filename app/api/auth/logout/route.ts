import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { apiResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    // Clear the auth cookie
    const response = apiResponse.success({
      message: 'Logout realizado com sucesso',
    });

    // Clear auth cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;

  } catch (error) {

    return apiResponse.error(
      'Erro interno do servidor',
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }
}